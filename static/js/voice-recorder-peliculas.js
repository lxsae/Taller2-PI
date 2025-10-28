// voice-recorder-peliculas.js - Búsqueda en sección Películas
class VoiceRecorderPeliculas {
  constructor() {
    this.recordButton = document.getElementById("recordBtnPeliculas");
    this.stopButton = document.getElementById("stopBtnPeliculas");
    this.transcriptionDiv = document.getElementById("transcriptionPeliculas");
    this.moviesList = document.getElementById("moviesList");

    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.peliculaSeleccionada = null;

    this.init();
  }

  init() {
    this.recordButton.addEventListener("click", () => this.startRecording());
    this.stopButton.addEventListener("click", () => this.stopRecording());
    this.updateButtonStates();

    // ✅ INICIAR SIEMPRE DESDE CERO
    this.verificarEstadoInicial();
  }

  async verificarEstadoInicial() {
    // ✅ FORZAR LIMPIEZA COMPLETA AL INICIAR
    await this.limpiarSesionCompleta();

    // Estado inicial - listo para buscar
    this.transcriptionDiv.textContent =
      "Presiona 'Grabar Audio' y di lo que buscas...";
    this.mostrarEstadoInicial();

    // ✅ Asegurar que la navegación esté deshabilitada
    this.deshabilitarNavegacion();

    console.log("🔄 Estado inicial: listo para nueva búsqueda");
  }

  async limpiarSesionCompleta() {
    try {
      // 1. Limpiar en el servidor
      await fetch("/clear_session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // 2. Limpiar sessionStorage completamente
      sessionStorage.removeItem("peliculaActual");
      sessionStorage.removeItem("peliculaSeleccionada");

      // 3. Limpiar variables locales
      this.peliculaSeleccionada = null;

      console.log("🧹 Sesión limpiada completamente - estado inicial");
    } catch (error) {
      console.error("Error limpiando sesión:", error);
      // Aún así limpiar localmente
      sessionStorage.removeItem("peliculaActual");
      sessionStorage.removeItem("peliculaSeleccionada");
      this.peliculaSeleccionada = null;
    }
  }

  mostrarEstadoInicial() {
    this.moviesList.innerHTML = `
            <div class="text-center text-gray-400 py-12 col-span-full">
                <p class="text-xl">🎬 Busca tu película ideal</p>
                <p class="text-lg mt-2">Di por ejemplo: "películas de acción", "comedia 2023"</p>
                <div class="mt-4 bg-gray-700/50 p-4 rounded-lg max-w-md mx-auto">
                    <p class="text-blue-400 text-sm font-semibold">💡 Instrucciones:</p>
                    <ol class="text-white text-sm mt-2 text-left list-decimal list-inside space-y-1">
                        <li>Presiona "Grabar Audio"</li>
                        <li>Di lo que quieres ver</li>
                        <li>Selecciona una película</li>
                        <li>Usa la voz para continuar</li>
                    </ol>
                </div>
            </div>
        `;
  }

  updateButtonStates() {
    if (this.isRecording) {
      this.recordButton.disabled = true;
      this.stopButton.disabled = false;
      this.recordButton.classList.add("pulse-recording");
      this.stopButton.classList.remove(
        "cursor-not-allowed",
        "bg-gray-600",
        "text-gray-400"
      );
      this.stopButton.classList.add(
        "bg-red-600",
        "hover:bg-red-700",
        "text-white"
      );
    } else {
      this.recordButton.disabled = false;
      this.stopButton.disabled = true;
      this.recordButton.classList.remove("pulse-recording");
      this.stopButton.classList.add(
        "cursor-not-allowed",
        "bg-gray-600",
        "text-gray-400"
      );
      this.stopButton.classList.remove(
        "bg-red-600",
        "hover:bg-red-700",
        "text-white"
      );
    }
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
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
        stream.getTracks().forEach((track) => track.stop());
        await this.processAudio();
        this.isRecording = false;
        this.updateButtonStates();
      };

      this.mediaRecorder.start(100);

      if (this.peliculaSeleccionada) {
        this.transcriptionDiv.innerHTML =
          '<span class="text-blue-400">🎧 Escuchando... di "continuar con comida"</span>';
      } else {
        this.transcriptionDiv.textContent = "🎧 Grabando... di lo que buscas";
      }
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
      const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", audioBlob, "voz_usuario.webm");

      const response = await fetch("/transcribe", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        const voiceText = result.text.trim();

        if (this.peliculaSeleccionada) {
          // Si ya hay película seleccionada, procesar comando de continuación
          this.procesarComandoContinuacion(voiceText);
        } else {
          // Si no hay película seleccionada, buscar películas
          this.transcriptionDiv.innerHTML = `<span class="text-green-400">🔍 Buscando: "${voiceText}"</span>`;
          this.getRecommendations(voiceText);
        }
      } else {
        this.transcriptionDiv.innerHTML =
          '<span class="text-red-400">❌ Error en la transcripción</span>';
      }
    } catch (error) {
      console.error("Error procesando audio:", error);
      this.transcriptionDiv.innerHTML =
        '<span class="text-red-400">❌ Error de conexión</span>';
    }
  }

  async procesarComandoContinuacion(voiceText) {
    const text = voiceText.toLowerCase();

    if (
      this.containsAny(text, [
        "comida",
        "continuar",
        "siguiente",
        "seguir",
        "avanzar",
        "ir a comida",
      ])
    ) {
      this.transcriptionDiv.innerHTML =
        '<span class="text-green-400">✅ ¡Perfecto! Continuando con comida...</span>';

      // Verificar que el servidor tenga la película guardada
      const sessionOk = await this.verificarSesionServidor();
      if (sessionOk) {
        setTimeout(() => {
          window.location.href = "/comida";
        }, 2000);
      } else {
        this.transcriptionDiv.innerHTML =
          '<span class="text-red-400">❌ Error: No hay película seleccionada</span>';
        this.deshabilitarNavegacion();
      }
    } else if (
      this.containsAny(text, [
        "asientos",
        "butacas",
        "lugares",
        "ir a asientos",
      ])
    ) {
      this.transcriptionDiv.innerHTML =
        '<span class="text-green-400">✅ Saltando a asientos...</span>';

      const sessionOk = await this.verificarSesionServidor();
      if (sessionOk) {
        setTimeout(() => {
          window.location.href = "/asientos";
        }, 2000);
      } else {
        this.transcriptionDiv.innerHTML =
          '<span class="text-red-400">❌ Error: No hay película seleccionada</span>';
        this.deshabilitarNavegacion();
      }
    } else if (
      this.containsAny(text, [
        "pagar",
        "pago",
        "comprar",
        "finalizar",
        "ir a pagos",
      ])
    ) {
      this.transcriptionDiv.innerHTML =
        '<span class="text-green-400">✅ Yendo al resumen...</span>';

      const sessionOk = await this.verificarSesionServidor();
      if (sessionOk) {
        setTimeout(() => {
          window.location.href = "/resumen";
        }, 2000);
      } else {
        this.transcriptionDiv.innerHTML =
          '<span class="text-red-400">❌ Error: No hay película seleccionada</span>';
        this.deshabilitarNavegacion();
      }
    } else if (
      this.containsAny(text, ["cambiar", "otra", "nueva", "buscar otra"])
    ) {
      // Permitir cambiar de película
      await this.limpiarSeleccion();
      this.transcriptionDiv.innerHTML =
        '<span class="text-blue-400">🔄 Busquemos otra película. Di lo que te gustaría ver.</span>';
    } else {
      this.transcriptionDiv.innerHTML = `
                <div class="bg-yellow-600/20 border border-yellow-600 p-4 rounded-lg">
                    <p class="text-yellow-400">🤔 No entendí el comando. Puedes decir:</p>
                    <ul class="text-white text-sm mt-2 list-disc list-inside">
                        <li>"Continuar con comida"</li>
                        <li>"Ir a asientos"</li>
                        <li>"Pagar"</li>
                        <li>"Buscar otra película"</li>
                    </ul>
                </div>
            `;
    }
  }

  async verificarSesionServidor() {
    try {
      const response = await fetch("/get_session");
      const result = await response.json();
      return result.success && result.session.peliculaSeleccionada;
    } catch (error) {
      console.error("Error verificando sesión:", error);
      return false;
    }
  }

  containsAny(text, words) {
    return words.some((word) => text.includes(word));
  }

  async getRecommendations(text) {
    try {
      const response = await fetch("/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const result = await response.json();
      if (result.success && result.recommendations.length > 0) {
        this.transcriptionDiv.innerHTML = `<span class="text-green-400">✅ Encontradas ${result.recommendations.length} películas</span>`;
        this.showRecommendations(result.recommendations);
      } else {
        this.moviesList.innerHTML = `
                    <div class="col-span-full text-center py-8">
                        <p class="text-xl text-gray-400">No se encontraron películas para: "${text}"</p>
                        <p class="text-lg mt-2">Intenta con otros términos como: "acción", "comedia", "aventura"</p>
                    </div>
                `;
      }
    } catch (error) {
      console.error("Error en recomendación:", error);
      this.transcriptionDiv.innerHTML =
        '<span class="text-red-400">❌ Error al buscar películas</span>';
    }
  }

  showRecommendations(movies) {
    this.moviesList.innerHTML = "";
    movies.forEach((movie) => {
      const movieCard = document.createElement("div");
      movieCard.className =
        "bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-500";
      movieCard.addEventListener("click", () =>
        this.seleccionarPelicula(movie)
      );

      const rating = parseFloat(movie.rating) || 7;
      const stars = "⭐".repeat(Math.min(5, Math.floor(rating / 2)));

      movieCard.innerHTML = `
                <div class="text-center mb-4">
                    <div class="text-4xl mb-2">🎬</div>
                    <h3 class="text-xl font-bold">${movie.title}</h3>
                    <p class="text-gray-400 text-sm">${
                      movie.year || "Año no disponible"
                    }</p>
                </div>
                
                <div class="flex justify-center mb-3">
                    <span class="text-yellow-400 text-lg">${stars}</span>
                    <span class="ml-2 text-gray-400">${
                      movie.rating || "N/A"
                    }/10</span>
                </div>
                
                <p class="text-gray-300 text-sm mb-3 text-center line-clamp-2">
                    ${movie.plot || "Descripción no disponible"}
                </p>
                
                <div class="flex flex-wrap gap-1 justify-center mb-3">
                    ${
                      movie.genres
                        ? movie.genres
                            .split(",")
                            .slice(0, 3)
                            .map(
                              (genre) =>
                                `<span class="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">${genre.trim()}</span>`
                            )
                            .join("")
                        : ""
                    }
                </div>
                
                <div class="text-xs text-gray-400 space-y-1">
                    <p><strong>Género:</strong> ${
                      movie.genres || "No disponible"
                    }</p>
                    <p><strong>Año:</strong> ${
                      movie.year || "No disponible"
                    }</p>
                </div>
                
                <div class="mt-4 text-center">
                    <button class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                        Seleccionar Esta Película
                    </button>
                </div>
            `;

      this.moviesList.appendChild(movieCard);
    });
  }

  async seleccionarPelicula(movie) {
    try {
      // Guardar en el servidor primero
      const response = await fetch("/select_movie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movie: movie }),
      });

      const result = await response.json();

      if (result.success) {
        // Guardar localmente solo si el servidor aceptó
        this.peliculaSeleccionada = movie;
        sessionStorage.setItem("peliculaSeleccionada", "true");
        sessionStorage.setItem("peliculaActual", JSON.stringify(movie));

        // Mostrar confirmación
        this.mostrarConfirmacionSeleccion(movie);

        // Habilitar navegación
        this.habilitarNavegacion();

        console.log("✅ Película seleccionada:", movie.title);
      } else {
        this.transcriptionDiv.innerHTML =
          '<span class="text-red-400">❌ Error al guardar la película</span>';
      }
    } catch (error) {
      console.error("Error seleccionando película:", error);
      this.transcriptionDiv.innerHTML =
        '<span class="text-red-400">❌ Error de conexión</span>';
    }
  }

  mostrarConfirmacionSeleccion(movie) {
    // Limpiar la lista de películas y mostrar solo la seleccionada
    this.moviesList.innerHTML = `
            <div class="col-span-full">
                <div class="bg-green-600/20 border-2 border-green-600 rounded-xl p-6 text-center">
                    <div class="text-4xl mb-4">🎉</div>
                    <h3 class="text-2xl font-bold text-green-400 mb-2">¡Película Seleccionada!</h3>
                    <p class="text-xl text-white mb-2">${movie.title}</p>
                    <p class="text-gray-300 mb-4">${movie.year || ""} • ${
      movie.genres || ""
    }</p>
                    <p class="text-gray-400 mb-4">"${
                      movie.plot || "Descripción no disponible"
                    }"</p>
                    <div class="bg-gray-700/50 p-4 rounded-lg">
                        <p class="text-blue-400 font-semibold">🎤 Presiona "Grabar Audio" y di:</p>
                        <p class="text-white text-sm mt-1">"continuar con comida" para avanzar</p>
                    </div>
                </div>
            </div>
        `;

    // Actualizar el área de transcripción
    this.transcriptionDiv.innerHTML = `
            <div class="bg-green-600/20 border border-green-600 p-4 rounded-lg">
                <p class="text-green-400 font-semibold">🎬 Película Seleccionada:</p>
                <p class="text-white">${movie.title}</p>
                <p class="text-gray-300 text-sm">Presiona "Grabar Audio" y di "continuar con comida"</p>
            </div>
        `;
  }

  async limpiarSeleccion() {
    try {
      // Limpiar en el servidor
      await fetch("/clear_session");

      // Limpiar localmente
      this.peliculaSeleccionada = null;
      sessionStorage.removeItem("peliculaActual");
      sessionStorage.removeItem("peliculaSeleccionada");
      this.deshabilitarNavegacion();

      // Restaurar estado inicial
      this.mostrarEstadoInicial();
      this.transcriptionDiv.textContent =
        "Presiona 'Grabar Audio' y di lo que buscas...";

      console.log("🔄 Selección limpiada - volviendo al estado inicial");
    } catch (error) {
      console.error("Error limpiando selección:", error);
    }
  }

  habilitarNavegacion() {
    const navComida = document.getElementById("navComida");
    const navAsientos = document.getElementById("navAsientos");
    const navPagos = document.getElementById("navPagos");

    console.log("🔓 HABILITANDO navegación...");

    if (navComida) {
      navComida.disabled = false;
      navComida.classList.remove("nav-disabled");
      navComida.classList.add("hover:text-blue-400");
      navComida.title = "Ir a selección de comida";
      navComida.onclick = () => {
        this.verificarAntesDeRedirigir("/comida");
      };
    }

    if (navAsientos) {
      navAsientos.disabled = false;
      navAsientos.classList.remove("nav-disabled");
      navAsientos.classList.add("hover:text-blue-400");
      navAsientos.title = "Ir a selección de asientos";
      navAsientos.onclick = () => {
        this.verificarAntesDeRedirigir("/asientos");
      };
    }

    if (navPagos) {
      navPagos.disabled = false;
      navPagos.classList.remove("nav-disabled");
      navPagos.classList.add("hover:text-blue-400");
      navPagos.title = "Ir a métodos de pago";
      navPagos.onclick = () => {
        this.verificarAntesDeRedirigir("/resumen");
      };
    }
  }

  async verificarAntesDeRedirigir(url) {
    try {
      const response = await fetch("/get_session");
      const result = await response.json();

      if (result.success && result.session.peliculaSeleccionada) {
        console.log("✅ Redirigiendo a:", url);
        window.location.href = url;
      } else {
        console.log("❌ No hay película seleccionada, bloqueando redirección");
        // Mostrar mensaje en la interfaz
        this.transcriptionDiv.innerHTML = `
                    <div class="bg-red-600/20 border border-red-600 p-4 rounded-lg">
                        <p class="text-red-400 font-semibold">❌ Primero selecciona una película</p>
                        <p class="text-white text-sm">Busca y selecciona una película antes de continuar</p>
                    </div>
                `;
        // Re-deshabilitar navegación por seguridad
        this.deshabilitarNavegacion();
      }
    } catch (error) {
      console.error("Error verificando antes de redirigir:", error);
      this.transcriptionDiv.innerHTML =
        '<span class="text-red-400">❌ Error de conexión. Intenta nuevamente.</span>';
    }
  }

  deshabilitarNavegacion() {
    const navComida = document.getElementById("navComida");
    const navAsientos = document.getElementById("navAsientos");
    const navPagos = document.getElementById("navPagos");

    console.log("🔒 DESHABILITANDO navegación...");
    console.log("📝 Estado sessionStorage:", {
      peliculaSeleccionada: sessionStorage.getItem("peliculaSeleccionada"),
      peliculaActual: sessionStorage.getItem("peliculaActual"),
    });

    if (navComida) {
      navComida.disabled = true;
      navComida.classList.add("nav-disabled");
      navComida.classList.remove("hover:text-blue-400");
      navComida.title = "Primero selecciona una película";
      navComida.onclick = null;
    }

    if (navAsientos) {
      navAsientos.disabled = true;
      navAsientos.classList.add("nav-disabled");
      navAsientos.classList.remove("hover:text-blue-400");
      navAsientos.title = "Primero selecciona una película";
      navAsientos.onclick = null;
    }

    if (navPagos) {
      navPagos.disabled = true;
      navPagos.classList.add("nav-disabled");
      navPagos.classList.remove("hover:text-blue-400");
      navPagos.title = "Completa tu reserva primero";
      navPagos.onclick = null;
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("recordBtnPeliculas")) {
    new VoiceRecorderPeliculas();
  }
});
