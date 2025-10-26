from flask import Flask, render_template, request, jsonify
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from dotenv import load_dotenv
import os
import re
import assemblyai as aai  # ✅ Integración AssemblyAI

load_dotenv()
app = Flask(__name__)

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

        # Configuración de la transcripción
        config = aai.TranscriptionConfig(
            language_code="es",
            speaker_labels=True,
            
            #summarization=True,
            #summary_model="informative",
            #summary_type="bullets"
        )

        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(temp_path, config=config)

        # Manejo de errores
        if transcript.error:
            raise Exception(f"Error en AssemblyAI: {transcript.error}")

        text = transcript.text.strip()

        # Obtener resumen
        summary = getattr(transcript, "summary", None)
        if summary and isinstance(summary, dict):
            summary = summary.get("text")

        # Eliminar archivo temporal
        if os.path.exists(temp_path):
            os.remove(temp_path)

        print(f"📝 Transcripción AssemblyAI: {text[:120]}...")

        return jsonify({
            'text': text,
            'summary': summary,
            'success': True
        })

    except Exception as e:
        print(f"❌ Error en transcripción: {e}")
        if os.path.exists('temp_audio.wav'):
            os.remove('temp_audio.wav')
        return jsonify({'error': str(e), 'success': False})


# -------------------------------
# 🎯 FILTROS Y ANÁLISIS DE CONSULTA
# -------------------------------
def apply_precise_filters(user_text, movies_subset=None):
    if movies_subset is None:
        movies_subset = movies_df.copy()
    text = user_text.lower()
    filtered_movies = movies_subset.copy()
    print(f"🎯 Aplicando filtros precisos para: {text}")

    # ---------- FILTRO POR AÑO ----------
    year_match = re.search(r'\b(19|20)\d{2}\b', text)
    if year_match:
        year = int(year_match.group())
        filtered_movies = filtered_movies[filtered_movies['year'] == year]
        print(f"📅 Filtrando por año: {year}")

    # ---------- FILTRO POR GÉNERO ----------
    genre_keywords = {
        'acción': 'accion', 'accion': 'accion', 'aventura': 'aventura',
        'comedia': 'comedia', 'drama': 'drama', 'romance': 'romance',
        'terror': 'terror', 'thriller': 'thriller', 'suspenso': 'thriller',
        'ficción': 'ciencia ficcion', 'ciencia ficción': 'ciencia ficcion',
        'animación': 'animacion', 'familiar': 'familiar',
        'musical': 'musical', 'biografía': 'biografia'
    }
    for keyword, genre in genre_keywords.items():
        if keyword in text:
            filtered_movies = filtered_movies[filtered_movies['genres'].str.contains(genre, case=False, na=False)]
            print(f"🎬 Filtrando por género: {genre}")

    # ---------- FILTRO POR DIRECTOR ----------
    for director in movies_df['director'].dropna().unique():
        if isinstance(director, str) and director.lower() in text:
            filtered_movies = filtered_movies[filtered_movies['director'].str.contains(director, case=False, na=False)]
            print(f"🎥 Filtrando por director: {director}")
            break

    # ---------- FILTRO POR ACTORES ----------
    for actors_str in movies_df['actors']:
        if pd.notna(actors_str):
            for actor in re.split(r',|\s+y\s+', actors_str.lower()):
                actor = actor.strip()
                if actor and actor in text:
                    filtered_movies = filtered_movies[filtered_movies['actors'].str.contains(actor, case=False, na=False)]
                    print(f"⭐ Filtrando por actor: {actor}")
                    break

    # ---------- FILTRO POR RATING ----------
    rating_match = re.search(r'(mayor a|superior a|más de|rating de|calificación de)\s*(\d+(\.\d+)?)', text)
    if rating_match:
        rating = float(rating_match.group(2))
        filtered_movies = filtered_movies[filtered_movies['rating'] >= rating]
        print(f"⭐ Filtrando por rating mínimo: {rating}")

    return filtered_movies


def process_user_query(text):
    """
    Analiza si el texto es una consulta específica (por año, género, etc.)
    o una búsqueda general para el sistema de similitud.
    """
    text_lower = text.lower()
    # Palabras clave comunes en consultas precisas
    keywords = [
        'película', 'películas', 'ver', 'quiero', 'muéstrame', 'enseñame',
        'año', 'director', 'actor', 'acción', 'comedia', 'drama', 'terror',
        'romance', 'rating', 'puntaje', 'popular', 'recientes'
    ]
    is_specific = any(k in text_lower for k in keywords)
    return text_lower, is_specific



@app.route('/recommend', methods=['POST'])
def recommend_movies():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No se recibió texto', 'success': False})

        user_text = data['text'].strip()
        if not user_text:
            return jsonify({'error': 'Texto vacío', 'success': False})

        processed_text, is_specific_command = process_user_query(user_text)
        recommendations = []

        if is_specific_command:
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

        return jsonify({
            'recommendations': recommendations,
            'strategy': 'precise' if is_specific_command else 'similarity',
            'success': True
        })

    except Exception as e:
        print(f"❌ Error en recomendaciones: {e}")
        return jsonify({'error': str(e), 'success': False})


@app.route('/')
def index():
    return render_template('index.html')


if __name__ == '__main__':
    print("🚀 Iniciando servidor Flask con AssemblyAI...")
    print("📍 Abre http://localhost:5000 en tu navegador")
    app.run(debug=True, port=5000)
