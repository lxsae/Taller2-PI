# 🎬 CineVoice - Sistema Inteligente de Reservas de Cine con Control por Voz

![CineVoice](https://img.shields.io/badge/CineVoice-v1.0-yellow)
![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![Flask](https://img.shields.io/badge/Flask-2.3.0-green)
![License](https://img.shields.io/badge/Licencia-MIT-orange)

Sistema completo de reservas de cine que combina inteligencia artificial de voz con un sistema de recomendaciones personalizado para ofrecer una experiencia cinematográfica única e intuitiva.

## ✨ Características Principales

### 🎤 Control por Voz Avanzado

- **Reconocimiento de Voz en Tiempo Real**: Interactúa con el sistema usando comandos de voz en español.
- **Procesamiento con AssemblyAI**: Tecnología de vanguardia para transcripción precisa.
- **Comandos Inteligentes**: Detecta automáticamente acciones como "ir a asientos", "seleccionar comida", "pagar".

### 🎬 Sistema de Recomendación Inteligente

- **Búsqueda por Género y Año**: Filtra películas según tus preferencias específicas.
- **Recomendación por Similitud**: Algoritmo ML que encuentra películas similares a tus gustos.
- **Integración con TMDB**: Base de datos actualizada con las películas más populares.

### 🎟️ Experiencia Completa de Reserva

- **Selección de Asientos Interactiva**: Mapa visual de butacas con selección en tiempo real.
- **Pedido de Comida Integrado**: Catálogo de snacks con precios reales.
- **Proceso de Pago Seguro**: Múltiples métodos de pago (tarjeta, efectivo, transferencia).
- **Gestión de Sesiones**: Estado persistente durante toda la experiencia.

### 🎨 Interfaz Moderna y Responsive

- **Diseño con Tailwind CSS**: Interfaz elegante y adaptable a cualquier dispositivo.
- **Animaciones Suaves**: Transiciones y efectos visuales atractivos.
- **Experiencia de Usuario Intuitiva**: Navegación fluida entre secciones.

## 🛠️ Tecnologías Utilizadas

### Backend

- **Python 3.8+** - Lenguaje principal
- **Flask** - Framework web
- **Flask-Session** - Gestión de sesiones
- **AssemblyAI** - API de reconocimiento de voz
- **Scikit-learn** - Machine learning para recomendaciones
- **Pandas** - Procesamiento de datos
- **Python-dotenv** - Gestión de variables de entorno

### Frontend

- **JavaScript ES6+** - Interactividad del cliente
- **Tailwind CSS** - Framework de estilos
- **HTML5** - Estructura semántica
- **CSS3** - Animaciones y diseño responsive

### APIs Externas

- **TMDB API** - Base de datos de películas
- **AssemblyAI** - Procesamiento de voz

## 🚀 Instalación y Configuración

### Prerrequisitos

- Python 3.8 o superior
- Git
- Micrófono funcionando
- Navegador web moderno
- Conexión a internet

### 📥 Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/tu-usuario/CineVoice.git](https://github.com/tu-usuario/CineVoice.git)
    cd CineVoice
    ```

2.  **(Recomendado) Crear y activar un entorno virtual:**
    ```bash
    # En Windows
    python -m venv venv
    .\venv\Scripts\activate
    
    # En macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Instalar las dependencias:**
    ```bash
    pip install -r requirements.txt
    ```

### 🔑 Configuración de APIs (Variables de Entorno)

Este proyecto necesita claves de API para conectarse a los servicios de voz y películas.

1.  Crea un archivo llamado `.env` en la raíz del proyecto.
2.  Añade tus claves de API al archivo de la siguiente manera:

    ```ini
    # Tu clave de API de AssemblyAI
    ASSEMBLYAI_API_KEY="tu_clave_aqui"
    
    # Tu clave de API de The Movie Database (TMDB)
    TMDB_API_KEY="tu_clave_aqui"
    ```

### 🏃 Ejecución

1.  **Iniciar la aplicación Flask:**
    ```bash
    python app.py
    ```
2.  Abre tu navegador y ve a `http://127.0.0.1:5000`
