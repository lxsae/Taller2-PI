class VoiceRecorder {
    constructor() {
        // Coincidir los IDs con tu HTML
        this.recordButton = document.getElementById("recordBtn");
        this.stopButton = document.getElementById("stopBtn");
        this.transcriptionDiv = document.getElementById("transcription");
        this.moviesList = document.getElementById("moviesList");

        this.mediaRecorder = null;
        this.audioChunks = [];

        this.init();
    }

    init() {
        this.recordButton.addEventListener("click", () => this.startRecording());
        this.stopButton.addEventListener("click", () => this.stopRecording());
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: "audio/wav" });
                const formData = new FormData();
                formData.append("audio", audioBlob, "voz_usuario.wav");

                this.transcriptionDiv.textContent = "🎙️ Analizando tu voz...";

                const response = await fetch("/transcribe", {
                    method: "POST",
                    body: formData,
                });

                const result = await response.json();
                console.log("🎤 Respuesta del servidor:", result);

                if (result.success) {
                    const voiceText = result.text.toLowerCase().trim();
                    this.transcriptionDiv.textContent = `🗣️ ${voiceText}`;

                    // 🔍 Detección de comandos de voz
                    if (voiceText.includes("asiento") || voiceText.includes("silla")) {
                        this.redirigirA("/asientos");
                        return;
                    }
                    if (voiceText.includes("comida") || voiceText.includes("snack")) {
                        this.redirigirA("/comida");
                        return;
                    }
                    if (voiceText.includes("pagar") || voiceText.includes("comprar")) {
                        this.redirigirA("/resumen");
                        return;
                    }

                    // Si no es comando, buscar películas
                    this.getRecommendations(voiceText);
                } else {
                    this.transcriptionDiv.textContent = "❌ Error en la transcripción. Intenta de nuevo.";
                }
            };

            this.mediaRecorder.start();
            this.recordButton.disabled = true;
            this.stopButton.disabled = false;
            this.transcriptionDiv.textContent = "🎧 Grabando... habla ahora";

        } catch (error) {
            console.error("Error al iniciar grabación:", error);
            this.transcriptionDiv.textContent = "🚫 No se pudo acceder al micrófono.";
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
            this.mediaRecorder.stop();
            this.recordButton.disabled = false;
            this.stopButton.disabled = true;
        }
    }

    // 🔄 Redirigir con mensaje de voz
    redirigirA(url) {
        const mensajes = {
            "/asientos": "Llevándote a la selección de asientos 🎟️",
            "/comida": "Vamos a la sección de comida 🍿",
            "/resumen": "Mostrando el resumen de tu compra 💳"
        };
        const mensaje = mensajes[url] || "Redirigiendo...";

        this.transcriptionDiv.textContent = mensaje;
        const utter = new SpeechSynthesisUtterance(mensaje);
        utter.lang = "es-ES";
        window.speechSynthesis.speak(utter);

        setTimeout(() => {
            window.location.href = url;
        }, 2000);
    }

    // 🎬 Obtener recomendaciones
    async getRecommendations(text) {
        try {
            const response = await fetch("/recommend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });

            const result = await response.json();
            if (result.success && result.recommendations.length > 0) {
                this.showRecommendations(result.recommendations);
            } else {
                this.moviesList.innerHTML = "<p>No se encontraron resultados.</p>";
            }
        } catch (error) {
            console.error("Error en recomendación:", error);
        }
    }

    // 🎞 Mostrar películas recomendadas
    showRecommendations(movies) {
        this.moviesList.innerHTML = "";
        movies.forEach((movie) => {
            const div = document.createElement("div");
            div.classList.add("movie-card", "p-3", "mb-3", "border", "rounded");
            div.innerHTML = `
                <h5>${movie.title} (${movie.year})</h5>
                <p><strong>Géneros:</strong> ${movie.genres}</p>
                <p><strong>Actores:</strong> ${movie.actors}</p>
                <p><strong>Director:</strong> ${movie.director}</p>
                <p><strong>Rating:</strong> ⭐ ${movie.rating}/10</p>
                <p><strong>Ambiente:</strong> ${movie.mood}</p>
                <p>${movie.plot}</p>
            `;
            this.moviesList.appendChild(div);
        });
    }
}

window.addEventListener("DOMContentLoaded", () => new VoiceRecorder());
