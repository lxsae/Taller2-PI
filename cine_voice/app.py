from flask import Flask, render_template, request, jsonify
import whisper
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import os
import re

app = Flask(__name__)

# Cargar modelo Whisper
print("Cargando modelo Whisper...")
model = whisper.load_model("base")
print("✅ Modelo Whisper cargado")

# Función para cargar SOLO desde CSV
def load_movie_data():
    try:
        movies_df = pd.read_csv('data/movies.csv')
        print("✅ CSV cargado correctamente")
        print(f"📊 Total de películas cargadas: {len(movies_df)}")
        
        # Limpiar y preparar datos
        movies_df = movies_df.dropna(subset=['title', 'genres', 'year'])
        movies_df['year'] = pd.to_numeric(movies_df['year'], errors='coerce').fillna(2000).astype(int)
        
        # Rellenar columnas opcionales si faltan
        if 'actors' not in movies_df.columns:
            movies_df['actors'] = 'Desconocido'
        if 'director' not in movies_df.columns:
            movies_df['director'] = 'Desconocido'
        if 'plot' not in movies_df.columns:
            movies_df['plot'] = 'Descripción no disponible'
        if 'mood' not in movies_df.columns:
            movies_df['mood'] = 'varios'
        if 'rating' not in movies_df.columns:
            movies_df['rating'] = 7.0
            
        return movies_df
        
    except Exception as e:
        print(f"❌ ERROR cargando CSV: {e}")
        raise SystemExit(1)

# Cargar datos
movies_df = load_movie_data()

# Sistema de recomendación
def prepare_recommendation_system():
    try:
        # Crear características combinadas para búsqueda por similitud
        movies_df['features'] = (
            movies_df['title'] + ' ' +
            movies_df['genres'] + ' ' +
            movies_df['actors'] + ' ' +
            movies_df['director'] + ' ' +
            movies_df['mood'] + ' ' +
            movies_df['plot']
        )
        
        vectorizer = TfidfVectorizer(stop_words=['de', 'la', 'el', 'y', 'en', 'un', 'una'], max_features=2000)
        feature_matrix = vectorizer.fit_transform(movies_df['features'])
        
        print("✅ Sistema de recomendación listo")
        return vectorizer, feature_matrix
        
    except Exception as e:
        print(f"❌ Error en sistema de recomendación: {e}")
        return None, None

vectorizer, feature_matrix = prepare_recommendation_system()

# MEJORADO: Sistema de filtrado preciso para TODOS los campos
def apply_precise_filters(user_text, movies_subset=None):
    """
    Aplica filtros precisos basados en comandos específicos para todos los campos
    """
    if movies_subset is None:
        movies_subset = movies_df.copy()
    
    text = user_text.lower()
    filtered_movies = movies_subset.copy()
    
    print(f"🎯 Aplicando filtros precisos para: {text}")
    
    # 1. Filtrar por AÑO exacto
    year_match = re.search(r'\b(19|20)\d{2}\b', text)
    if year_match:
        year = int(year_match.group())
        filtered_movies = filtered_movies[filtered_movies['year'] == year]
        print(f"   📅 Filtrado por año: {year} → {len(filtered_movies)} películas")
    
    # 2. Filtrar por GÉNERO específico
    genre_keywords = {
        'accion': 'accion', 'aventura': 'aventura', 'comedia': 'comedia',
        'drama': 'drama', 'romance': 'romance', 'terror': 'terror',
        'thriller': 'thriller', 'suspenso': 'thriller', 
        'ciencia ficcion': 'ciencia ficcion', 'ciencia ficción': 'ciencia ficcion',
        'animacion': 'animacion', 'animación': 'animacion',
        'familiar': 'familiar', 'musical': 'musical', 'biografia': 'biografia'
    }
    
    genres_found = []
    for keyword, genre in genre_keywords.items():
        if keyword in text:
            genres_found.append(genre)
            filtered_movies = filtered_movies[filtered_movies['genres'].str.contains(genre, case=False, na=False)]
            print(f"   🎭 Filtrado por género: {genre} → {len(filtered_movies)} películas")
    
    # 3. Filtrar por TÍTULO exacto o parcial
    # Buscar nombres de películas en el texto
    movie_titles = movies_df['title'].str.lower().tolist()
    titles_found = []
    
    for title in movie_titles:
        # Buscar coincidencias exactas o parciales en el texto
        if title in text or any(word in text.split() for word in title.split()):
            titles_found.append(title)
    
    if titles_found:
        # Usar la primera coincidencia encontrada
        title_filter = titles_found[0]
        filtered_movies = filtered_movies[filtered_movies['title'].str.lower() == title_filter]
        print(f"   🎬 Filtrado por título: {title_filter} → {len(filtered_movies)} películas")
    
    # 4. Filtrar por ACTOR específico
    # Crear lista de actores únicos de la base de datos
    all_actors = set()
    for actors_str in movies_df['actors']:
        if pd.notna(actors_str):
            # Separar actores y limpiar nombres
            actors = [actor.strip().lower() for actor in re.split(r',|\s+y\s+', actors_str)]
            all_actors.update([actor for actor in actors if len(actor) > 2])
    
    actors_found = []
    for actor in all_actors:
        # Buscar coincidencias exactas del actor en el texto
        if (actor in text and len(actor) > 3) or (f" {actor} " in f" {text} "):
            actors_found.append(actor)
            filtered_movies = filtered_movies[filtered_movies['actors'].str.contains(actor, case=False, na=False)]
            print(f"   👤 Filtrado por actor: {actor} → {len(filtered_movies)} películas")
            break  # Solo usar el primer actor encontrado
    
    # 5. Filtrar por DIRECTOR específico
    directors_in_db = set(movies_df['director'].str.lower().dropna())
    directors_found = []
    
    for director in directors_in_db:
        if director in text:
            directors_found.append(director)
            filtered_movies = filtered_movies[filtered_movies['director'].str.lower() == director]
            print(f"   🎥 Filtrado por director: {director} → {len(filtered_movies)} películas")
            break  # Solo usar el primer director encontrado
    
    # 6. Filtrar por MOOD/ESTADO DE ÁNIMO
    mood_keywords = {
        'divertida': 'divertido', 'graciosa': 'divertido', 'comica': 'divertido',
        'triste': 'tragico', 'emocional': 'emocional', 'dramatica': 'dramatico',
        'romantica': 'romantico', 'emocionante': 'emocionante', 'intensa': 'intenso',
        'inspiradora': 'inspirador', 'epica': 'epico', 'oscura': 'oscuro'
    }
    
    for keyword, mood in mood_keywords.items():
        if keyword in text:
            filtered_movies = filtered_movies[filtered_movies['mood'].str.contains(mood, case=False, na=False)]
            print(f"   😊 Filtrado por mood: {mood} → {len(filtered_movies)} películas")
    
    return filtered_movies

# MEJORADO: Procesador de consultas más inteligente
def process_user_query(text):
    """
    Detecta el tipo de consulta y extrae parámetros específicos
    """
    text_lower = text.lower()
    
    # Detectar si es un comando específico (filtrado preciso)
    specific_commands = [
        r'\b(19|20)\d{2}\b',  # Años
        r'\baño\b', r'\baños\b', r'\bdel\s+\d{4}\b',
        r'\bgenero\b', r'\bgénero\b', r'\bde\s+(comedia|accion|drama|romance)\b',
        r'\bactor\b', r'\bactores\b', r'\bcon\s+[a-z]+\s+[a-z]+\b',  # "con [nombre actor]"
        r'\bdirector\b', r'\bde\s+[a-z]+\s+[a-z]+\b',  # "de [nombre director]"
        r'\btodas\b', r'\btodo\b', r'\bcuales\b',
        r'\bpeliculas\b', r'\bpeli[cs]ulas\b', r'\bpeli\b',
        r'\btitulo\b', r'\bllamada\b',  # "película llamada X"
        r'\bdonde\b', r'\baparece\b', r'\bactua\b'  # "donde aparece X"
    ]
    
    is_specific_command = any(re.search(pattern, text_lower) for pattern in specific_commands)
    
    # También es comando específico si menciona elementos concretos
    concrete_elements = [
        # Años
        any(str(year) in text_lower for year in movies_df['year'].unique()),
        # Géneros
        any(genre in text_lower for genre in ['accion', 'comedia', 'drama', 'romance', 'terror', 'thriller']),
        # Actores conocidos
        any(actor in text_lower for actor in ['leonardo', 'dicaprio', 'tom', 'hanks', 'robert', 'downey', 'christopher', 'nolan']),
        # Títulos de películas
        any(title.lower() in text_lower for title in movies_df['title'].tolist() if len(title) > 3)
    ]
    
    if any(concrete_elements):
        is_specific_command = True
    
    if is_specific_command:
        print("🎯 Usando FILTRADO PRECISO")
        # Para comandos específicos, extraer términos clave
        relevant_terms = []
        
        # Extraer año
        year_match = re.search(r'\b(19|20)\d{2}\b', text_lower)
        if year_match:
            relevant_terms.append(year_match.group())
        
        # Extraer géneros
        genre_keywords = ['accion', 'comedia', 'drama', 'romance', 'terror', 'thriller', 'ciencia ficcion', 'animacion']
        for genre in genre_keywords:
            if genre in text_lower:
                relevant_terms.append(genre)
        
        # Extraer posibles nombres propios (actores/directores)
        words = re.findall(r'\b[A-Z][a-z]+\b', text)  # Palabras con mayúscula (nombres propios)
        relevant_terms.extend([word.lower() for word in words if len(word) > 2])
        
        processed_text = ' '.join(relevant_terms) if relevant_terms else text_lower
        
    else:
        print("🎯 Usando RECOMENDACIÓN POR SIMILITUD")
        # Para consultas generales de recomendación
        search_terms = {
            'accion': 'accion', 'comedia': 'comedia', 'drama': 'drama', 'romance': 'romance',
            'divertida': 'comedia', 'graciosa': 'comedia', 'triste': 'drama',
            'emocionante': 'accion', 'intensa': 'thriller', 'romantica': 'romance',
            'famosa': 'popular', 'buena': 'alta calidad', 'mejor': 'alta calidad'
        }
        
        processed_text = text_lower
        for word, term in search_terms.items():
            if word in processed_text:
                processed_text += f" {term}"
    
    print(f"🔧 Consulta procesada: {processed_text}")
    return processed_text, is_specific_command

@app.route('/')
def index():
    return render_template('index.html')

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
        
        print("🎤 Transcribiendo audio...")
        result = model.transcribe(temp_path, language='es')
        text = result['text'].strip()
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        print(f"📝 Transcripción: {text}")
        return jsonify({'text': text, 'success': True})
    
    except Exception as e:
        print(f"❌ Error en transcripción: {e}")
        if os.path.exists('temp_audio.wav'):
            os.remove('temp_audio.wav')
        return jsonify({'error': str(e), 'success': False})

@app.route('/recommend', methods=['POST'])
def recommend_movies():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No se recibió texto', 'success': False})
        
        user_text = data['text'].strip()
        
        if not user_text:
            return jsonify({'error': 'Texto vacío', 'success': False})
        
        print(f"🎯 Consulta original: {user_text}")
        
        # Procesar consulta y determinar estrategia
        processed_text, is_specific_command = process_user_query(user_text)
        
        recommendations = []
        
        if is_specific_command:
            # 🎯 ESTRATEGIA 1: FILTRADO PRECISO para todos los campos
            filtered_movies = apply_precise_filters(user_text)
            
            if len(filtered_movies) > 0:
                # Ordenar por rating y tomar las mejores
                filtered_movies = filtered_movies.sort_values('rating', ascending=False)
                top_movies = filtered_movies.head(6)  # Más resultados para filtros precisos
                
                for _, movie in top_movies.iterrows():
                    movie_dict = {
                        'title': movie['title'],
                        'genres': movie['genres'],
                        'actors': movie['actors'],
                        'director': movie['director'],
                        'year': int(movie['year']),
                        'plot': movie['plot'],
                        'mood': movie['mood'],
                        'rating': float(movie['rating'])
                    }
                    recommendations.append(movie_dict)
        
        # 🎯 ESTRATEGIA 2: RECOMENDACIÓN POR SIMILITUD (fallback)
        if not recommendations:
            print("🔍 Usando recomendación por similitud (fallback)...")
            
            if vectorizer is not None and feature_matrix is not None:
                user_vector = vectorizer.transform([processed_text])
                similarities = cosine_similarity(user_vector, feature_matrix)
                
                top_indices = np.argsort(similarities[0])[-6:][::-1]  # Más resultados
                
                for idx in top_indices:
                    if similarities[0][idx] > 0.01:  # Umbral muy bajo para máximo coverage
                        movie = movies_df.iloc[idx]
                        movie_dict = {
                            'title': movie['title'],
                            'genres': movie['genres'],
                            'actors': movie['actors'],
                            'director': movie['director'],
                            'year': int(movie['year']),
                            'plot': movie['plot'],
                            'mood': movie['mood'],
                            'rating': float(movie['rating'])
                        }
                        # Evitar duplicados
                        if not any(rec['title'] == movie_dict['title'] for rec in recommendations):
                            recommendations.append(movie_dict)
        
        if not recommendations:
            return jsonify({
                'error': 'No encontré películas que coincidan. Ejemplos: "películas de 2010", "comedia", "acción", "Leonardo DiCaprio", "Christopher Nolan", "Inception"',
                'success': False
            })
        
        print(f"✅ Encontradas {len(recommendations)} recomendaciones")
        return jsonify({
            'recommendations': recommendations,
            'strategy': 'precise' if is_specific_command and recommendations else 'similarity',
            'success': True
        })
    
    except Exception as e:
        print(f"❌ Error en recomendaciones: {e}")
        return jsonify({'error': str(e), 'success': False})



if __name__ == '__main__':
    print("🚀 Iniciando servidor Flask...")
    print("📍 Abre http://localhost:5000 en tu navegador")
    app.run(debug=True, port=5000)