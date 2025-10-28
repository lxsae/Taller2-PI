from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from dotenv import load_dotenv
import os
import re
import assemblyai as aai
from flask_session import Session
import requests
import secrets

# -------------------------------
# ⚙️ CONFIGURACIÓN BASE
# -------------------------------
load_dotenv()


# Generar o cargar clave secreta segura
def get_secret_key():
    # Intentar cargar desde variable de entorno
    env_key = os.environ.get("SECRET_KEY")
    if env_key:
        return env_key

    # Para desarrollo: crear archivo .secret_key si no existe
    secret_file = ".secret_key"
    if not os.path.exists(secret_file):
        with open(secret_file, "w") as f:
            f.write(secrets.token_hex(32))

    with open(secret_file, "r") as f:
        return f.read().strip()


app = Flask(__name__)
app.secret_key = get_secret_key()
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = False
app.config["PERMANENT_SESSION_LIFETIME"] = 1800  # 30 minutos

# Configuración adicional de sesión para producción
app.config.update(
    SESSION_COOKIE_SECURE=False,  # True en producción con HTTPS
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)

Session(app)

# -------------------------------
# ⚙️ CONFIGURACIÓN AssemblyAI
# -------------------------------
aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")

# -------------------------------
# ⚙️ MAPEO DE GÉNEROS TMDB
# -------------------------------
GENRE_MAPPING = {
    28: "Acción",
    12: "Aventura",
    16: "Animación",
    35: "Comedia",
    80: "Crimen",
    99: "Documental",
    18: "Drama",
    10751: "Familiar",
    14: "Fantasía",
    36: "Historia",
    27: "Terror",
    10402: "Música",
    9648: "Misterio",
    10749: "Romance",
    878: "Ciencia ficción",
    10770: "Película de TV",
    53: "Suspense",
    10752: "Bélica",
    37: "Western"
}


# -------------------------------
# 🎬 CARGA DE DATOS DE PELÍCULAS DESDE TMDB
# -------------------------------
def load_movie_data():
    try:
        api_key = os.getenv("TMDB_API_KEY")
        if not api_key:
            raise Exception("TMDB_API_KEY no encontrada en .env")

        url = f"https://api.themoviedb.org/3/movie/popular?api_key={api_key}&language=es-ES&page=1"
        response = requests.get(url)

        if response.status_code != 200:
            raise Exception(f"Error en TMDB API: {response.status_code} - {response.text}")

        data = response.json()
        movies = []

        for movie in data.get('results', []):
            # Mapear géneros usando el diccionario estático
            genres = [GENRE_MAPPING.get(gid, "Desconocido") for gid in movie.get('genre_ids', [])]
            genres_str = ', '.join(genres) if genres else 'Desconocido'

            # Crear diccionario con solo los campos requeridos
            movie_dict = {
                'title': movie.get('title', 'Título desconocido'),
                'genres': genres_str,
                'year': movie.get('release_date', '2000-01-01')[:10],  # Formato YYYY-MM-DD
                'plot': movie.get('overview', 'Descripción no disponible'),
                'rating': movie.get('vote_average', 7.0)
            }
            movies.append(movie_dict)

        movies_df = pd.DataFrame(movies)
        print("✅ Datos cargados desde TMDB correctamente")
        print(f"📊 Total de películas cargadas: {len(movies_df)}")

        return movies_df
    except Exception as e:
        print(f"❌ ERROR cargando datos de TMDB: {e}")
        raise SystemExit(1)


movies_df = load_movie_data()


# -------------------------------
# 🧠 SISTEMA DE RECOMENDACIÓN
# -------------------------------
def prepare_recommendation_system():
    try:
        movies_df["features"] = (
            movies_df["title"]
            + " "
            + movies_df["genres"]
            + " "
            + movies_df["plot"]
        )

        vectorizer = TfidfVectorizer(
            stop_words=["de", "la", "el", "y", "en", "un", "una"], max_features=2000
        )
        feature_matrix = vectorizer.fit_transform(movies_df["features"])
        print("✅ Sistema de recomendación listo")

        return vectorizer, feature_matrix
    except Exception as e:
        print(f"❌ Error en sistema de recomendación: {e}")
        return None, None


vectorizer, feature_matrix = prepare_recommendation_system()


# -------------------------------
# 🔊 TRANSCRIPCIÓN CON AssemblyAI
# -------------------------------
@app.route("/transcribe", methods=["POST"])
def transcribe_audio():
    try:
        if "audio" not in request.files:
            return jsonify(
                {"error": "No se recibió archivo de audio", "success": False}
            )

        audio_file = request.files["audio"]
        if audio_file.filename == "":
            return jsonify({"error": "No se seleccionó archivo", "success": False})

        temp_path = "temp_audio.wav"
        audio_file.save(temp_path)
        print("🎤 Enviando audio a AssemblyAI...")

        config = aai.TranscriptionConfig(language_code="es", speaker_labels=True)
        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(temp_path, config=config)

        if transcript.error:
            raise Exception(f"Error en AssemblyAI: {transcript.error}")

        text = transcript.text.strip()
        os.remove(temp_path)

        print(f"📝 Transcripción AssemblyAI: {text[:120]}...")

        # 🗣 Detección de comando por voz
        voice_action = detect_voice_action(text)
        if voice_action:
            return jsonify({"text": text, "action": voice_action, "success": True})

        return jsonify({"text": text, "success": True})
    except Exception as e:
        print(f"❌ Error en transcripción: {e}")
        if os.path.exists("temp_audio.wav"):
            os.remove("temp_audio.wav")
        return jsonify({"error": str(e), "success": False})


# -------------------------------
# 🧭 DETECCIÓN DE COMANDOS DE VOZ
# -------------------------------
def detect_voice_action(text):
    text = text.lower()
    if "asiento" in text or "silla" in text or "asientos" in text:
        return "ir_asientos"
    if "comida" in text or "combo" in text:
        return "ir_comida"
    if "pagar" in text or "comprar" in text or "confirmar" in text:
        return "ir_resumen"
    if "película" in text or "recomienda" in text or "ver" in text:
        return "buscar_pelicula"
    return None


# -------------------------------
# 🎯 FILTROS DE CONSULTA DE PELÍCULAS
# -------------------------------
def apply_precise_filters(user_text, movies_subset=None):
    if movies_subset is None:
        movies_subset = movies_df.copy()
    text = user_text.lower()
    filtered_movies = movies_subset.copy()
    print(f"🎯 Aplicando filtros precisos para: {text}")

    year_match = re.search(r"\b(19|20)\d{2}\b", text)
    if year_match:
        year = int(year_match.group())
        filtered_movies = filtered_movies[filtered_movies["year"].str.startswith(str(year))]
        print(f"📅 Filtrando por año: {year}")

    genre_keywords = {
        "acción": "accion",
        "aventura": "aventura",
        "comedia": "comedia",
        "drama": "drama",
        "romance": "romance",
        "terror": "terror",
        "thriller": "thriller",
        "ficción": "ciencia ficcion",
        "animación": "animacion",
        "familiar": "familiar",
    }
    for keyword, genre in genre_keywords.items():
        if keyword in text:
            filtered_movies = filtered_movies[
                filtered_movies["genres"].str.contains(genre, case=False, na=False)
            ]
            print(f"🎬 Filtrando por género: {genre}")

    return filtered_movies


@app.route("/recommend", methods=["POST"])
def recommend_movies():
    try:
        data = request.get_json()
        if not data or "text" not in data:
            return jsonify({"error": "No se recibió texto", "success": False})

        user_text = data["text"].strip()
        processed_text = user_text.lower()
        recommendations = []

        filtered_movies = apply_precise_filters(user_text)
        if len(filtered_movies) > 0:
            filtered_movies = filtered_movies.sort_values(
                "rating", ascending=False
            ).head(6)
            for _, movie in filtered_movies.iterrows():
                recommendations.append(movie.to_dict())

        if not recommendations:
            user_vector = vectorizer.transform([processed_text])
            similarities = cosine_similarity(user_vector, feature_matrix)
            top_indices = np.argsort(similarities[0])[-6:][::-1]
            for idx in top_indices:
                movie = movies_df.iloc[idx]
                recommendations.append(movie.to_dict())

        return jsonify({"recommendations": recommendations, "success": True})
    except Exception as e:
        print(f"❌ Error en recomendaciones: {e}")
        return jsonify({"error": str(e), "success": False})


# -------------------------------
# 🍿 RUTAS DE SESIONES DE CINE - CON VALIDACIONES
# -------------------------------


# Ruta para la página de asientos
@app.route("/asientos")
def asientos():
    # ✅ VALIDACIÓN: Verificar que el usuario haya seleccionado una película
    if not session.get("peliculaSeleccionada"):
        return redirect(url_for("index"))
    return render_template("asientos.html")


# Ruta para procesar la selección de asientos
@app.route("/select_seats", methods=["POST"])
def select_seats():
    try:
        # ✅ VALIDACIÓN: Verificar que el usuario haya seleccionado una película
        if not session.get("peliculaSeleccionada"):
            return jsonify(
                {"error": "Primero debes seleccionar una película", "success": False}
            )

        data = request.get_json()
        seats = data.get("seats", [])

        # Validar que haya asientos seleccionados
        if not seats:
            return jsonify({"error": "No se seleccionaron asientos", "success": False})

        # Guardar en sesión
        session["asientos"] = seats
        print(f"✅ Asientos guardados en sesión: {seats}")

        return jsonify(
            {
                "success": True,
                "message": f'Asientos {", ".join(seats)} guardados correctamente',
            }
        )

    except Exception as e:
        print(f"❌ Error guardando asientos: {e}")
        return jsonify({"error": str(e), "success": False})


# Ruta para obtener los asientos ocupados
@app.route("/get_occupied_seats", methods=["GET"])
def get_occupied_seats():
    # En una implementación real, esto vendría de una base de datos
    occupied_seats = ["A3", "B7", "C1", "D5", "E2"]
    return jsonify({"occupied_seats": occupied_seats, "success": True})


@app.route("/comida", methods=["GET", "POST"])
def comida():
    # ✅ VALIDACIÓN: Verificar que el usuario haya seleccionado una película
    if not session.get("peliculaSeleccionada"):
        return redirect(url_for("index"))

    if request.method == "POST":
        session["comida"] = request.form.getlist("comida")
        return redirect(url_for("asientos"))
    return render_template("comida.html")


# Agrega esta ruta a tu app.py
@app.route("/pago")
def pago():
    # Verificar que el usuario haya completado todos los pasos anteriores
    if not session.get("peliculaSeleccionada"):
        return redirect(url_for("index"))

    # Verificar que tenga asientos seleccionados
    if not session.get("asientos"):
        return redirect(url_for("asientos"))

    # Obtener datos de la sesión
    pelicula = session.get("peliculaActual", {})
    asientos = session.get("asientos", [])
    comida = session.get("comida", [])

    # Calcular totales
    total_asientos = len(asientos) * 15000
    total_comida = len(comida) * 8000
    total_general = total_asientos + total_comida

    return render_template(
        "pago.html",
        pelicula=pelicula,
        asientos=asientos,
        comida=comida,
        total_asientos=total_asientos,
        total_comida=total_comida,
        total_general=total_general,
    )


@app.route("/resumen")
def resumen():
    # ✅ VALIDACIÓN: Verificar que el usuario haya completado todos los pasos anteriores
    if not session.get("peliculaSeleccionada"):
        return redirect(url_for("index"))

    # Verificar que tenga asientos seleccionados
    if not session.get("asientos"):
        return redirect(url_for("asientos"))

    # CORRECCIÓN: Usar 'comida' en lugar de 'resumen'
    asientos = session.get("asientos", [])
    comida = session.get("comida", [])  # ✅ Corregido aquí
    total = len(asientos) * 15000 + len(comida) * 8000

    return render_template(
        "resumen.html", asientos=asientos, comida=comida, total=total
    )


# Ruta para guardar la película seleccionada
@app.route("/select_movie", methods=["POST"])
def select_movie():
    try:
        data = request.get_json()
        movie = data.get("movie")

        if not movie:
            return jsonify({"error": "No se recibió película", "success": False})

        # Guardar película en sesión
        session["peliculaSeleccionada"] = True
        session["peliculaActual"] = movie
        print(f"✅ Película guardada en sesión: {movie.get('title', 'Desconocida')}")

        return jsonify(
            {"success": True, "message": "Película seleccionada correctamente"}
        )

    except Exception as e:
        print(f"❌ Error guardando película: {e}")
        return jsonify({"error": str(e), "success": False})


# Ruta de pago
@app.route("/payment")
def payment():
    # ✅ VALIDACIÓN: Verificar que el usuario pueda acceder al pago
    if not session.get("peliculaSeleccionada") or not session.get("asientos"):
        return redirect(url_for("index"))
    return redirect(url_for("resumen"))


# ✅ NUEVA RUTA: Consultar datos actuales de la sesión
@app.route("/get_session")
def get_session():
    return jsonify(
        {
            "success": True,
            "session": {
                "peliculaSeleccionada": session.get("peliculaSeleccionada", False),
                "peliculaActual": session.get("peliculaActual", {}),
                "seats": session.get("asientos", []),
                "food": session.get("comida", []),
            },
        }
    )


@app.route("/clear_session", methods=["POST"])
def clear_session():
    """Limpiar completamente la sesión"""
    session.clear()
    return jsonify({"success": True, "message": "Sesión limpiada"})


@app.route("/set_demo_session")
def set_demo_session():
    session["peliculaSeleccionada"] = True
    session["peliculaActual"] = {
        "title": "Avatar 2",
        "year": 2022,
        "genres": "Ciencia Ficción, Aventura",
        "rating": 8.5,
    }
    session["asientos"] = ["A1", "A2"]
    session["comida"] = ["Crispetas", "Gaseosa"]
    return jsonify({"success": True, "msg": "Sesión de prueba configurada"})


# -------------------------------
# 🏠 PÁGINA PRINCIPAL
# -------------------------------
@app.route("/")
def index():
    return render_template("index.html")


# -------------------------------
# 🚀 EJECUCIÓN
# -------------------------------
if __name__ == "__main__":
    print("🚀 Iniciando servidor Flask con AssemblyAI + Sesiones de voz...")
    print(f"🔑 Clave secreta cargada: {'Sí' if app.secret_key else 'No'}")
    print("📍 Abre http://localhost:5000 en tu navegador")
    app.run(debug=True, port=5000)
