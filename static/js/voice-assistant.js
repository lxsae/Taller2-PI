// voice-assistant.js - Asistente simplificado para el Home
class VoiceAssistant {
    constructor() {
        this.recordButton = document.getElementById('recordBtn');
        this.stopButton = document.getElementById('stopBtn');
        this.transcriptionDiv = document.getElementById('transcription');
        
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        
        this.init();
    }

    init() {
        this.recordButton.addEventListener('click', () => this.startRecording());
        this.stopButton.addEventListener('click', () => this.stopRecording());
        this.updateButtonStates();
    }

    updateButtonStates() {
        if (this.isRecording) {
            this.recordButton.disabled = true;
            this.stopButton.disabled = false;
            this.recordButton.classList.add('pulse-recording');
            this.stopButton.classList.remove('cursor-not-allowed', 'bg-gray-600', 'text-gray-400');
            this.stopButton.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white');
        } else {
            this.recordButton.disabled = false;
            this.stopButton.disabled = true;
            this.recordButton.classList.remove('pulse-recording');
            this.stopButton.classList.add('cursor-not-allowed', 'bg-gray-600', 'text-gray-400');
            this.stopButton.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white');
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            this.audioChunks = [];
            this.isRecording = true;
            this.updateButtonStates();

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                await this.processAudio();
                this.isRecording = false;
                this.updateButtonStates();
            };

            this.mediaRecorder.start(100);
            this.transcriptionDiv.textContent = "🎧 Escuchando... di 'quiero buscar películas'";

        } catch (error) {
            console.error("Error al iniciar grabación:", error);
            this.transcriptionDiv.textContent = "🚫 Error al acceder al micrófono";
            this.isRecording = false;
            this.updateButtonStates();
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.transcriptionDiv.textContent = "⏳ Procesando...";
        }
    }

    async processAudio() {
        try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append("audio", audioBlob, "voz_usuario.webm");

            const response = await fetch("/transcribe", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();
            
            if (result.success) {
                const userText = result.text.trim().toLowerCase();
                this.transcriptionDiv.innerHTML = `<span class="text-green-400">🗣️ "${userText}"</span>`;
                this.handleUserInput(userText);
            } else {
                this.transcriptionDiv.innerHTML = '<span class="text-red-400">❌ No se pudo entender. Intenta de nuevo.</span>';
            }

        } catch (error) {
            console.error("Error procesando audio:", error);
            this.transcriptionDiv.innerHTML = '<span class="text-red-400">❌ Error de conexión.</span>';
        }
    }

    handleUserInput(userText) {
        // Detectar si el usuario quiere buscar películas
        if (this.containsAny(userText, ['película', 'películas', 'buscar', 'ver', 'cine', 'pelicula', 'peliculas'])) {
            this.transcriptionDiv.innerHTML = '<span class="text-blue-400">✅ ¡Perfecto! Te llevo a buscar películas...</span>';
            
            // Redirigir después de 2 segundos
            setTimeout(() => {
                showSection('peliculas');
            }, 2000);
        } else {
            this.transcriptionDiv.innerHTML = '<span class="text-yellow-400">🤔 No entendí. Di "quiero buscar películas"</span>';
        }
    }

    containsAny(text, words) {
        return words.some(word => text.includes(word));
    }
}

// Inicializar asistente cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    new VoiceAssistant();
});