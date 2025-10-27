document.addEventListener('DOMContentLoaded', () => {
    const asientosContainer = document.getElementById("asientos");
    const acceptSelectionBtn = document.getElementById("acceptSelection");
    const statusMessage = document.getElementById("statusMessage");
    const confirmacionContainer = document.getElementById("confirmacionContainer");
    const confirmacionTexto = document.getElementById("confirmacionTexto");
    
    let selectedSeats = [];
    let speechSynthesis = window.speechSynthesis;
    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = [];
    let silenceTimer = null;
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let javascriptNode = null;

    // Verificar soporte de síntesis de voz
    function checkSpeechSupport() {
        if (!speechSynthesis) {
            console.warn('Síntesis de voz no soportada en este navegador');
            return false;
        }
        return true;
    }

    // Función para que el asistente hable
    function hablarAsistente(texto) {
        if (!checkSpeechSupport()) {
            updateStatusMessage(texto, 'info');
            return;
        }

        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = 'es-ES';
        utterance.rate = 1.1; // Un poco más rápido
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            console.log('Asistente hablando:', texto);
        };

        utterance.onend = () => {
            console.log('Asistente terminó de hablar');
            // Iniciar grabación después de que termine de hablar
            if (confirmacionContainer.style.display === 'block') {
                iniciarGrabacionConfirmacion();
            }
        };

        utterance.onerror = (event) => {
            console.error('Error en síntesis de voz:', event);
            updateStatusMessage(texto, 'info');
            // Iniciar grabación incluso si hay error
            if (confirmacionContainer.style.display === 'block') {
                iniciarGrabacionConfirmacion();
            }
        };

        speechSynthesis.speak(utterance);
        updateStatusMessage(texto, 'info');
    }

    // Detectar silencio para detener grabación automáticamente
    async function setupSilenceDetection(stream) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            microphone = audioContext.createMediaStreamSource(stream);
            javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

            analyser.smoothingTimeConstant = 0.8;
            analyser.fftSize = 1024;

            microphone.connect(analyser);
            analyser.connect(javascriptNode);
            javascriptNode.connect(audioContext.destination);

            let silenceStartTime = Date.now();
            const SILENCE_THRESHOLD = 0.01; // Umbral de silencio
            const SILENCE_DURATION = 800; // 800ms de silencio para detener

            javascriptNode.onaudioprocess = () => {
                if (!isRecording) return;

                const array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                
                let values = 0;
                for (let i = 0; i < array.length; i++) {
                    values += array[i];
                }
                
                const average = values / array.length;
                const normalized = average / 256;

                if (normalized < SILENCE_THRESHOLD) {
                    // Silencio detectado
                    if (Date.now() - silenceStartTime > SILENCE_DURATION) {
                        // Silencio prolongado, detener grabación
                        console.log('Silencio detectado, deteniendo grabación...');
                        detenerGrabacion();
                    }
                } else {
                    // Hay sonido, resetear timer de silencio
                    silenceStartTime = Date.now();
                }
            };

        } catch (error) {
            console.warn('No se pudo configurar detección de silencio:', error);
            // Fallback: timeout normal
            setTimeout(() => {
                if (isRecording) {
                    console.log('Timeout de seguridad, deteniendo grabación...');
                    detenerGrabacion();
                }
            }, 3000);
        }
    }

    // Limpiar recursos de detección de silencio
    function cleanupSilenceDetection() {
        if (javascriptNode) {
            javascriptNode.disconnect();
            javascriptNode = null;
        }
        if (microphone) {
            microphone.disconnect();
            microphone = null;
        }
        if (analyser) {
            analyser.disconnect();
            analyser = null;
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
    }

    // Iniciar grabación para confirmación con AssemblyAI
    async function iniciarGrabacionConfirmacion() {
        if (isRecording) return;
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            updateStatusMessage('❌ Tu navegador no soporta grabación de audio', 'error');
            return;
        }
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000, // Reducir sample rate para archivo más pequeño
                    channelCount: 1 // Mono en lugar de estéreo
                } 
            });
            
            // Configurar detección de silencio
            await setupSilenceDetection(stream);
            
            mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            audioChunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = async () => {
                cleanupSilenceDetection();
                if (audioChunks.length > 0) {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    await procesarRespuestaAssemblyAI(audioBlob);
                }
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorder.onerror = (event) => {
                console.error('Error en grabación:', event.error);
                updateStatusMessage('❌ Error en la grabación', 'error');
                detenerGrabacion();
            };
            
            updateStatusMessage("🎤 Escuchando... Di 'SÍ' o 'NO'", 'warning');
            
            // Iniciar grabación con chunks más pequeños para respuesta rápida
            mediaRecorder.start(500); // Emitir datos cada 500ms
            isRecording = true;
            
            // Timeout de seguridad por si falla la detección de silencio
            setTimeout(() => {
                if (isRecording) {
                    console.log('Timeout de seguridad activado');
                    detenerGrabacion();
                }
            }, 5000); // Reducido a 5 segundos
            
        } catch (error) {
            console.error('Error al acceder al micrófono:', error);
            updateStatusMessage('❌ Error al acceder al micrófono', 'error');
        }
    }

    // Procesar respuesta con AssemblyAI
    async function procesarRespuestaAssemblyAI(audioBlob) {
        try {
            updateStatusMessage("📡 Procesando tu respuesta...", 'info');
            
            // Verificar tamaño del audio (no procesar si es muy pequeño)
            if (audioBlob.size < 1000) {
                updateStatusMessage("No se detectó audio. Reintentando...", 'warning');
                setTimeout(() => {
                    if (confirmacionContainer.style.display === 'block') {
                        hablarAsistente("No te escuché. Por favor di SÍ para confirmar o NO para volver a elegir.");
                    }
                }, 500);
                return;
            }
            
            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.webm');
            
            const response = await fetch('/transcribe', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success && result.text) {
                const respuesta = result.text.toLowerCase().trim();
                console.log("Respuesta del usuario:", respuesta);
                procesarRespuestaConfirmacion(respuesta);
            } else {
                const errorMsg = result.error || 'Error en la transcripción';
                updateStatusMessage(`❌ ${errorMsg}`, 'error');
                // Reintentar después de error
                setTimeout(() => {
                    if (confirmacionContainer.style.display === 'block') {
                        hablarAsistente("No pude entender tu respuesta. Por favor di SÍ para confirmar o NO para volver a elegir.");
                    }
                }, 500);
            }
            
        } catch (error) {
            console.error('Error enviando audio a AssemblyAI:', error);
            updateStatusMessage('❌ Error de conexión', 'error');
        }
    }

    // Procesar respuesta de confirmación
    function procesarRespuestaConfirmacion(respuesta) {
        // Palabras clave más específicas para reducir falsos positivos
        const palabrasConfirmacion = ['sí', 'si', 'confirmo', 'confirmar', 'acepto', 'aceptar', 'correcto', 'vale', 'de acuerdo', 'ok'];
        const palabrasCancelacion = ['no', 'cancelar', 'rechazar', 'incorrecto', 'equivocado', 'volver'];
        
        const confirmacion = palabrasConfirmacion.some(palabra => respuesta.includes(palabra));
        const cancelacion = palabrasCancelacion.some(palabra => respuesta.includes(palabra));
        
        if (confirmacion && !cancelacion) {
            // Usuario dijo SÍ
            confirmarReserva();
        } else if (cancelacion && !confirmacion) {
            // Usuario dijo NO
            reiniciarSeleccion();
        } else {
            // Respuesta ambigua o no reconocida
            hablarAsistente("No entendí claramente. Por favor di solamente SÍ para confirmar tu reserva o NO para volver a elegir.");
        }
    }

    // Detener grabación
    function detenerGrabacion() {
        if (mediaRecorder && isRecording) {
            try {
                mediaRecorder.stop();
                isRecording = false;
                cleanupSilenceDetection();
            } catch (error) {
                console.error('Error al detener grabación:', error);
                isRecording = false;
            }
        }
    }

    // Generar asientos organizados por filas (6 filas A-F, 8 columnas)
    function generateSeats() {
        const filas = ['A', 'B', 'C', 'D', 'E', 'F'];
        
        filas.forEach((fila) => {
            // Añadir etiqueta de fila
            const filaLabel = document.createElement("div");
            filaLabel.classList.add("fila-label");
            filaLabel.textContent = fila;
            asientosContainer.appendChild(filaLabel);
            
            // Generar asientos para esta fila
            for (let i = 1; i <= 8; i++) {
                const div = document.createElement("div");
                div.classList.add("asiento");
                div.dataset.fila = fila;
                div.dataset.numero = i;
                div.dataset.id = `${fila}${i}`;
                div.textContent = i;
                
                // Simular algunos asientos ocupados (20% de probabilidad)
                if (Math.random() < 0.2) {
                    div.classList.add("ocupado");
                } else {
                    div.addEventListener("click", () => toggleSeat(div));
                }
                
                asientosContainer.appendChild(div);
            }
        });
    }

    // Alternar selección de asiento
    function toggleSeat(seatElement) {
        const seatId = seatElement.dataset.id;
        
        if (seatElement.classList.contains("seleccionado")) {
            seatElement.classList.remove("seleccionado");
            selectedSeats = selectedSeats.filter(seat => seat !== seatId);
        } else {
            seatElement.classList.add("seleccionado");
            selectedSeats.push(seatId);
        }
        
        // Actualizar estado del botón
        updateAcceptButton();
        
        // Actualizar mensaje de estado
        updateStatusMessage(`Asientos seleccionados: ${selectedSeats.join(', ')}`, 'info');
    }

    // Actualizar estado del botón Aceptar
    function updateAcceptButton() {
        if (selectedSeats.length > 0) {
            acceptSelectionBtn.disabled = false;
        } else {
            acceptSelectionBtn.disabled = true;
        }
    }

    // Actualizar mensaje de estado
    function updateStatusMessage(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message ' + type;
    }

    // Mostrar confirmación por voz
    function mostrarConfirmacionVoz() {
        const mensaje = `Has seleccionado ${selectedSeats.length} asiento${selectedSeats.length > 1 ? 's' : ''}: ${selectedSeats.join(', ')}`;
        confirmacionTexto.textContent = mensaje;
        confirmacionContainer.style.display = 'block';
        
        // Hablar la confirmación (la grabación se iniciará automáticamente después)
        hablarAsistente(`${mensaje}. ¿Estás seguro? Responde SÍ para confirmar o NO para volver a elegir.`);
    }

    // Ocultar confirmación
    function ocultarConfirmacion() {
        confirmacionContainer.style.display = 'none';
        detenerGrabacion();
        cleanupSilenceDetection();
    }

    // Procesar selección aceptada
    async function procesarSeleccionAceptada() {
        if (selectedSeats.length === 0) {
            updateStatusMessage("❌ Por favor, selecciona al menos un asiento.", 'error');
            return;
        }

        // Mostrar confirmación por voz
        mostrarConfirmacionVoz();
    }

    // Confirmar reserva y continuar
    async function confirmarReserva() {
        detenerGrabacion();
        ocultarConfirmacion();
        
        try {
            updateStatusMessage("💾 Confirmando tu reserva...", 'info');
            
            // Hablar confirmación exitosa (más breve)
            hablarAsistente("¡Perfecto! ahora  vamos a la seccion de pago...");
            
            // Guardar en el servidor
            const response = await fetch('/select_seats', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ seats: selectedSeats })
            });
            
            const result = await response.json();
            
            if (result.success) {
                updateStatusMessage("✅ ¡Reserva confirmada! Redirigiendo...", 'success');
                
                // Redirigir más rápido
                setTimeout(() => {
                    window.location.href = '/resumen';
                }, 2000);
            } else {
                updateStatusMessage('❌ Error al confirmar la reserva: ' + result.error, 'error');
                hablarAsistente("Error al confirmar. Intenta de nuevo.");
            }
        } catch (error) {
            console.error('Error:', error);
            updateStatusMessage('❌ Error de conexión', 'error');
            hablarAsistente("Error de conexión. Intenta de nuevo.");
        }
    }

    // Reiniciar selección
    function reiniciarSeleccion() {
        detenerGrabacion();
        ocultarConfirmacion();
        
        // Limpiar selección
        document.querySelectorAll('.asiento.seleccionado').forEach(seat => {
            seat.classList.remove('seleccionado');
        });
        selectedSeats = [];
        
        // Actualizar botón
        updateAcceptButton();
        
        // Mensaje de reinicio más breve
        updateStatusMessage("Selección reiniciada", 'info');
        hablarAsistente("Vamos a empezar de nuevo. Selecciona los asientos.");
    }

    // Event listeners
    acceptSelectionBtn.addEventListener('click', procesarSeleccionAceptada);
    
    // Inicializar
    generateSeats();
    updateAcceptButton();
    
    // Mensaje de bienvenida inicial más breve
    setTimeout(() => {
        hablarAsistente("Selecciona asientos y presiona Aceptar.");
    }, 1000);
});