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

# -------------------------------
# ⚙️ CONFIGURACIÓN BASE
# -------------------------------
load_dotenv()
app = Flask(__name__)
app.secret_key = "cine_voice_secret"
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# -------------------------------
# ⚙️ CONFIGURACIÓN AssemblyAI
# -------------------------------
aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")

# -------------------------------
# 🎬 CARGA DE DATOS DE PELÍCULAS
# -------------------------------
def load_movie_data():
    try:
        movies_df = pd.read_csv('data/movies.csv')
        print("✅ CSV cargado correctamente")
        print(f"📊 Total de películas cargadas: {len(movies_df)}")

        movies_df = movies_df.dropna(subset=['title', 'genres', 'year'])
        movies_df['year'] = pd.to_numeric(movies_df['year'], errors='coerce').fillna(2000).astype(int)

        # Completar columnas faltantes
        for col, default in {
            'actors': 'Desconocido',
            'director': 'Desconocido',
            'plot': 'Descripción no disponible',
            'mood': 'varios',
            'rating': 7.0,
        }.items():
            if col not in movies_df.columns:
                movies_df[col] = default

        return movies_df
    except Exception as e:
        print(f"❌ ERROR cargando CSV: {e}")
        raise SystemExit(1)

movies_df = load_movie_data()

# -------------------------------
# 🧠 SISTEMA DE RECOMENDACIÓN
# -------------------------------
def prepare_recommendation_system():
    try:
        movies_df['features'] = (
            movies_df['title'] + ' ' +
            movies_df['genres'] + ' ' +
            movies_df['actors'] + ' ' +
            movies_df['director'] + ' ' +
            movies_df['mood'] + ' ' +
            movies_df['plot']
        )

        vectorizer = TfidfVectorizer(
            stop_words=['de', 'la', 'el', 'y', 'en', 'un', 'una'],
            max_features=2000
        )
        feature_matrix = vectorizer.fit_transform(movies_df['features'])
        print("✅ Sistema de recomendación listo")

        return vectorizer, feature_matrix
    except Exception as e:
        print(f"❌ Error en sistema de recomendación: {e}")
        return None, None

vectorizer, feature_matrix = prepare_recommendation_system()

# -------------------------------
# 🔊 TRANSCRIPCIÓN CON AssemblyAI
# -------------------------------
@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No se recibió archivo de audio', 'success': False})

        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'error': 'No se seleccionó archivo', 'success': False})

        temp_path = 'temp_audio.wav'
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
            return jsonify({'text': text, 'action': voice_action, 'success': True})

        return jsonify({'text': text, 'success': True})
    except Exception as e:
        print(f"❌ Error en transcripción: {e}")
        if os.path.exists('temp_audio.wav'):
            os.remove('temp_audio.wav')
        return jsonify({'error': str(e), 'success': False})

# -------------------------------
# 🧭 DETECCIÓN DE COMANDOS DE VOZ
# -------------------------------
def detect_voice_action(text):
    text = text.lower()
    if "asiento" in text or "silla" in text:
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

    year_match = re.search(r'\b(19|20)\d{2}\b', text)
    if year_match:
        year = int(year_match.group())
        filtered_movies = filtered_movies[filtered_movies['year'] == year]
        print(f"📅 Filtrando por año: {year}")

    genre_keywords = {
        'acción': 'accion', 'aventura': 'aventura', 'comedia': 'comedia',
        'drama': 'drama', 'romance': 'romance', 'terror': 'terror',
        'thriller': 'thriller', 'ficción': 'ciencia ficcion',
        'animación': 'animacion', 'familiar': 'familiar'
    }
    for keyword, genre in genre_keywords.items():
        if keyword in text:
            filtered_movies = filtered_movies[filtered_movies['genres'].str.contains(genre, case=False, na=False)]
            print(f"🎬 Filtrando por género: {genre}")

    return filtered_movies

@app.route('/recommend', methods=['POST'])
def recommend_movies():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No se recibió texto', 'success': False})

        user_text = data['text'].strip()
        processed_text = user_text.lower()
        recommendations = []

        filtered_movies = apply_precise_filters(user_text)
        if len(filtered_movies) > 0:
            filtered_movies = filtered_movies.sort_values('rating', ascending=False).head(6)
            for _, movie in filtered_movies.iterrows():
                recommendations.append(movie.to_dict())

        if not recommendations:
            user_vector = vectorizer.transform([processed_text])
            similarities = cosine_similarity(user_vector, feature_matrix)
            top_indices = np.argsort(similarities[0])[-6:][::-1]
            for idx in top_indices:
                movie = movies_df.iloc[idx]
                recommendations.append(movie.to_dict())

        return jsonify({'recommendations': recommendations, 'success': True})
    except Exception as e:
        print(f"❌ Error en recomendaciones: {e}")
        return jsonify({'error': str(e), 'success': False})

# -------------------------------
# 🍿 RUTAS DE SESIONES DE CINE
# -------------------------------
@app.route('/asientos', methods=['GET', 'POST'])
def asientos():
    if request.method == 'POST':
        session['asientos'] = request.form.getlist('asientos')
        return redirect(url_for('comida'))
    return render_template('asientos.html')

@app.route('/comida', methods=['GET', 'POST'])
def comida():
    if request.method == 'POST':
        session['comida'] = request.form.getlist('comida')
        return redirect(url_for('resumen'))
    return render_template('comida.html')

@app.route('/resumen')
def resumen():
    asientos = session.get('asientos', [])
    comida = session.get('comida', [])
    total = len(asientos) * 15000 + len(comida) * 8000
    return render_template('resumen.html', asientos=asientos, comida=comida, total=total)
# ✅ NUEVA RUTA: Consultar datos actuales de la sesión
@app.route('/get_session')
def get_session():
    return jsonify({
        'success': True,
        'session': {
            'movie': session.get('movie', 'Desconocida'),
            'seats': session.get('asientos', []),
            'food': session.get('comida', [])
        }
    })
@app.route('/set_demo_session')
def set_demo_session():
    session['movie'] = 'Avatar 2'
    session['seats'] = ['A1', 'A2']
    session['food'] = ['Crispetas', 'Gaseosa']
    return jsonify({'success': True, 'msg': 'Sesión de prueba configurada'})

# -------------------------------
# 🏠 PÁGINA PRINCIPAL
# -------------------------------
@app.route('/')
def index():
    return render_template('index.html')


# -------------------------------
# 🚀 EJECUCIÓN
# -------------------------------
if __name__ == '__main__':
    print("🚀 Iniciando servidor Flask con AssemblyAI + Sesiones de voz...")
    print("📍 Abre http://localhost:5000 en tu navegador")
    app.run(debug=True, port=5000)

