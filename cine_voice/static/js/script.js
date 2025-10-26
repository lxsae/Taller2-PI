class VoiceRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        
        this.recordBtn = document.getElementById('recordBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.transcriptionDiv = document.getElementById('transcription');
        this.moviesList = document.getElementById('moviesList');
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
    }
    
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = () => {
                this.sendAudioToServer();
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            
            this.recordBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.transcriptionDiv.textContent = "Escuchando... 🎤";
            
        } catch (error) {
            console.error("Error al acceder al micrófono:", error);
            alert("No se pudo acceder al micrófono. Permite el acceso e intenta de nuevo.");
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            this.recordBtn.disabled = false;
            this.stopBtn.disabled = true;
            this.transcriptionDiv.textContent = "Procesando tu voz... ⏳";
            
            // Detener todas las pistas de audio
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }
    
    async sendAudioToServer() {
        try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            
            // Enviar audio para transcripción
            const response = await fetch('/transcribe', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.transcriptionDiv.textContent = result.text;
                this.getRecommendations(result.text);
            } else {
                this.transcriptionDiv.textContent = "Error en la transcripción. Intenta de nuevo.";
            }
            
        } catch (error) {
            console.error("Error:", error);
            this.transcriptionDiv.textContent = "Error de conexión. Intenta de nuevo.";
        }
    }
    
    async getRecommendations(text) {
        try {
            const response = await fetch('/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.displayRecommendations(result.recommendations);
            } else {
                this.moviesList.innerHTML = '<div class="alert alert-warning">No pude encontrar recomendaciones. Intenta con otra descripción.</div>';
            }
            
        } catch (error) {
            console.error("Error:", error);
            this.moviesList.innerHTML = '<div class="alert alert-danger">Error al obtener recomendaciones.</div>';
        }
    }
    
    displayRecommendations(movies) {
        if (movies.length === 0) {
            this.moviesList.innerHTML = '<div class="alert alert-warning">No encontré películas que coincidan. Intenta con otra descripción.</div>';
            return;
        }
        
        let html = '';
        movies.forEach(movie => {
            html += `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">${movie.title} (${movie.year})</h5>
                        <p class="card-text"><strong>Géneros:</strong> ${movie.genres}</p>
                        <p class="card-text"><strong>Actores:</strong> ${movie.actors}</p>
                        <p class="card-text"><strong>Director:</strong> ${movie.director}</p>
                        <p class="card-text"><strong>Rating:</strong> ⭐ ${movie.rating}/10</p>
                        <p class="card-text"><strong>Ambiente:</strong> ${movie.mood}</p>
                        <p class="card-text">${movie.plot}</p>
                    </div>
                </div>
            `;
        });
        
        this.moviesList.innerHTML = html;
    }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new VoiceRecorder();
});