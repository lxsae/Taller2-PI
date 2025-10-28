// static/js/payment.js

document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos desde los scripts JSON
    const pelicula = JSON.parse(document.getElementById('peliculaData').textContent);
    const asientos = JSON.parse(document.getElementById('asientosData').textContent);
    const comida = JSON.parse(document.getElementById('comidaData').textContent);
    const totales = JSON.parse(document.getElementById('totalesData').textContent);

    // Mostrar resumen de película
    const peliculaResumen = document.getElementById('peliculaResumen');
    peliculaResumen.innerHTML = `
        <div class="bg-gray-800 rounded-xl p-6">
            <h3 class="text-xl font-bold text-yellow-400 mb-4">🎬 Película</h3>
            <div class="flex items-center space-x-4">
                <div class="flex-1">
                    <h4 class="text-lg font-semibold">${pelicula.title}</h4>
                    <p class="text-gray-400">${pelicula.year} • ${pelicula.genres}</p>
                    <p class="text-gray-300 mt-2">${pelicula.plot}</p>
                </div>
                <div class="text-right">
                    <div class="text-yellow-400 text-lg font-bold">⭐ ${pelicula.rating}/10</div>
                </div>
            </div>
        </div>
    `;

    // Mostrar resumen de asientos
    const asientosResumen = document.getElementById('asientosResumen');
    asientosResumen.innerHTML = `
        <div class="bg-gray-800 rounded-xl p-6">
            <h3 class="text-xl font-bold text-yellow-400 mb-4">💺 Asientos Seleccionados</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                ${asientos.map(asiento => `
                    <div class="bg-gray-700 text-center py-2 rounded-lg font-semibold">
                        ${asiento}
                    </div>
                `).join('')}
            </div>
            <div class="flex justify-between items-center border-t border-gray-600 pt-4">
                <span class="text-lg">${asientos.length} asiento(s) x $15,000</span>
                <span class="text-yellow-400 text-xl font-bold">$${totales.total_asientos.toLocaleString()}</span>
            </div>
        </div>
    `;

    // Mostrar resumen de comida CON PRECIOS REALES
    const comidaResumen = document.getElementById('comidaResumen');
    if (comida.length > 0) {
        comidaResumen.innerHTML = `
            <div class="bg-gray-800 rounded-xl p-6">
                <h3 class="text-xl font-bold text-yellow-400 mb-4">🍿 Comida y Bebidas</h3>
                <div class="space-y-3 mb-4">
                    ${comida.map(item => `
                        <div class="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                            <span class="font-semibold">${item.nombre}</span>
                            <span class="text-yellow-400">$${item.precio.toLocaleString()}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="flex justify-between items-center border-t border-gray-600 pt-4">
                    <span class="text-lg">${comida.length} ítem(s) de comida</span>
                    <span class="text-yellow-400 text-xl font-bold">$${totales.total_comida.toLocaleString()}</span>
                </div>
            </div>
        `;
    } else {
        comidaResumen.innerHTML = `
            <div class="bg-gray-800 rounded-xl p-6">
                <h3 class="text-xl font-bold text-yellow-400 mb-4">🍿 Comida y Bebidas</h3>
                <div class="text-center text-gray-400 py-4">
                    <p>No se seleccionaron alimentos</p>
                </div>
            </div>
        `;
    }

    // Mostrar totales
    const totalesResumen = document.getElementById('totalesResumen');
    totalesResumen.innerHTML = `
        <div class="bg-yellow-400 text-black rounded-xl p-6">
            <div class="flex justify-between items-center text-2xl font-bold">
                <span>TOTAL A PAGAR</span>
                <span>$${totales.total_general.toLocaleString()}</span>
            </div>
            <div class="text-sm text-gray-700 mt-2 text-right">
                Incluye impuestos
            </div>
        </div>
    `;

    // Manejar selección de método de pago
    const metodosPago = document.querySelectorAll('input[name="metodoPago"]');
    const formularioPago = document.getElementById('formularioPago');
    
    metodosPago.forEach(metodo => {
        metodo.addEventListener('change', function() {
            mostrarFormularioPago(this.value);
        });
    });

    // Función para mostrar formulario de pago según método seleccionado
    function mostrarFormularioPago(metodo) {
        let formularioHTML = '';
        
        switch(metodo) {
            case 'tarjeta':
                formularioHTML = `
                    <div class="space-y-4">
                        <h4 class="text-lg font-semibold text-yellow-400">💳 Datos de Tarjeta</h4>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Número de Tarjeta</label>
                            <input type="text" 
                                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400"
                                   placeholder="1234 5678 9012 3456"
                                   maxlength="19">
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">Fecha Expiración</label>
                                <input type="text" 
                                       class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400"
                                       placeholder="MM/AA">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">CVV</label>
                                <input type="text" 
                                       class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400"
                                       placeholder="123"
                                       maxlength="3">
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Nombre en la Tarjeta</label>
                            <input type="text" 
                                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400"
                                   placeholder="JUAN PEREZ">
                        </div>
                    </div>
                `;
                break;
                
            case 'efectivo':
                formularioHTML = `
                    <div class="text-center py-4">
                        <div class="text-6xl mb-4">💰</div>
                        <h4 class="text-lg font-semibold text-yellow-400 mb-2">Pago en Efectivo</h4>
                        <p class="text-gray-300">Realiza el pago en las taquillas del cine</p>
                        <p class="text-gray-400 text-sm mt-2">Presenta este código al llegar:</p>
                        <div class="bg-yellow-400 text-black font-mono font-bold text-xl py-2 px-4 rounded-lg mt-2 inline-block">
                            CINE-${Math.random().toString(36).substr(2, 8).toUpperCase()}
                        </div>
                    </div>
                `;
                break;
                
            case 'transferencia':
                formularioHTML = `
                    <div class="space-y-4">
                        <h4 class="text-lg font-semibold text-yellow-400">🏦 Transferencia Bancaria</h4>
                        
                        <div class="bg-gray-700 p-4 rounded-lg">
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-300">Banco:</span>
                                    <span class="font-semibold">Bancolombia</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-300">Tipo de cuenta:</span>
                                    <span class="font-semibold">Corriente</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-300">Número de cuenta:</span>
                                    <span class="font-semibold">123-456789-01</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-300">Titular:</span>
                                    <span class="font-semibold">CineVoice SAS</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-300">Monto a transferir:</span>
                                    <span class="font-semibold text-yellow-400">$${totales.total_general.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        
                        <p class="text-gray-400 text-sm">Envía el comprobante a: comprobantes@cinevoice.com</p>
                    </div>
                `;
                break;
                
            default:
                formularioHTML = `
                    <div class="text-center text-gray-400 py-8">
                        <p>Selecciona un método de pago para continuar</p>
                    </div>
                `;
        }
        
        formularioPago.innerHTML = formularioHTML;
    }

    // Manejar confirmación de pago
    const confirmarPagoBtn = document.getElementById('confirmarPago');
    confirmarPagoBtn.addEventListener('click', function() {
        const metodoSeleccionado = document.querySelector('input[name="metodoPago"]:checked');
        
        if (!metodoSeleccionado) {
            alert('Por favor selecciona un método de pago');
            return;
        }
        
        // Mostrar tarjeta flotante de agradecimiento
        mostrarAgradecimiento();
    });

    // Manejar cancelación
    const cancelarPagoBtn = document.getElementById('cancelarPago');
    cancelarPagoBtn.addEventListener('click', function() {
        if (confirm('¿Estás seguro de que quieres cancelar el pago?')) {
            window.location.href = '/comida';
        }
    });

    // Función para mostrar tarjeta de agradecimiento
    function mostrarAgradecimiento() {
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        overlay.id = 'agradecimientoOverlay';
        
        // Crear tarjeta de agradecimiento
        overlay.innerHTML = `
            <div class="bg-gray-800 rounded-2xl p-8 mx-4 max-w-md w-full transform scale-95 animate-scaleIn">
                <div class="text-center">
                    <!-- Ícono de éxito -->
                    <div class="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    
                    <!-- Mensaje -->
                    <h3 class="text-2xl font-bold text-white mb-4">¡Pago Exitoso! 🎉</h3>
                    <p class="text-gray-300 mb-2">Muchas gracias por hacer uso de nuestros servicios</p>
                    <p class="text-gray-400 text-sm mb-6">Tu reserva ha sido confirmada exitosamente</p>
                    
                    <!-- Botón -->
                    <button id="irACreditos" 
                            class="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-6 rounded-lg transition-colors duration-300 transform hover:scale-105">
                        Ver Créditos y Colaboradores
                    </button>
                    
                    <!-- Información adicional -->
                    <div class="mt-6 p-4 bg-gray-700 rounded-lg">
                        <p class="text-green-400 text-sm font-semibold mb-2">✅ Reserva Confirmada</p>
                        <p class="text-gray-400 text-xs">Código de reserva: <span class="font-mono">CINE-${Math.random().toString(36).substr(2, 8).toUpperCase()}</span></p>
                    </div>
                </div>
            </div>
        `;
        
        // Agregar estilos de animación
        const style = document.createElement('style');
        style.textContent = `
            @keyframes scaleIn {
                from {
                    opacity: 0;
                    transform: scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            .animate-scaleIn {
                animation: scaleIn 0.3s ease-out forwards;
            }
        `;
        document.head.appendChild(style);
        
        // Agregar al documento
        document.body.appendChild(overlay);
        
        // Manejar clic en el botón de créditos
        document.getElementById('irACreditos').addEventListener('click', function() {
            window.location.href = '/creditos';
        });
        
        // Cerrar al hacer clic fuera de la tarjeta
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                document.head.removeChild(style);
            }
        });
    }
});