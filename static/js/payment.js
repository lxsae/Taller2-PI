// static/js/payment.js - Sistema de Pago
class PaymentSystem {
    constructor() {
        this.peliculaData = JSON.parse(document.getElementById('peliculaData').textContent);
        this.asientosData = JSON.parse(document.getElementById('asientosData').textContent);
        this.comidaData = JSON.parse(document.getElementById('comidaData').textContent);
        this.totalesData = JSON.parse(document.getElementById('totalesData').textContent);

        this.init();
    }

    init() {
        this.mostrarResumen();
        this.configurarEventos();
        this.configurarMetodosPago();
    }

    mostrarResumen() {
        // Mostrar película seleccionada
        this.mostrarPelicula();
        
        // Mostrar asientos seleccionados
        this.mostrarAsientos();
        
        // Mostrar comida seleccionada
        this.mostrarComida();
        
        // Mostrar totales
        this.mostrarTotales();
    }

    mostrarPelicula() {
        const peliculaContainer = document.getElementById('peliculaResumen');
        if (this.peliculaData && this.peliculaData.title) {
            peliculaContainer.innerHTML = `
                <div class="bg-gray-800 rounded-xl p-6">
                    <div class="flex items-center space-x-4">
                        <div class="text-4xl">🎬</div>
                        <div>
                            <h3 class="text-xl font-bold">${this.peliculaData.title}</h3>
                            <p class="text-gray-400">${this.peliculaData.year || 'Año no disponible'}</p>
                            <p class="text-gray-300 text-sm mt-2">${this.peliculaData.genres || 'Género no disponible'}</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    mostrarAsientos() {
        const asientosContainer = document.getElementById('asientosResumen');
        if (this.asientosData && this.asientosData.length > 0) {
            const asientosList = this.asientosData.map(asiento => 
                `<span class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">${asiento}</span>`
            ).join('');
            
            asientosContainer.innerHTML = `
                <div class="bg-gray-800 rounded-xl p-6">
                    <div class="flex items-center space-x-4 mb-4">
                        <div class="text-3xl">💺</div>
                        <div>
                            <h3 class="text-xl font-bold">Asientos Seleccionados</h3>
                            <p class="text-gray-400">${this.asientosData.length} asiento(s)</p>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        ${asientosList}
                    </div>
                </div>
            `;
        }
    }

    mostrarComida() {
        const comidaContainer = document.getElementById('comidaResumen');
        if (this.comidaData && this.comidaData.length > 0) {
            const comidaItems = this.comidaData.map(item => {
                const precio = this.obtenerPrecioComida(item);
                return `
                    <div class="flex justify-between items-center py-2 border-b border-gray-700">
                        <span class="text-gray-300">${item}</span>
                        <span class="text-green-400 font-semibold">$${precio.toLocaleString()}</span>
                    </div>
                `;
            }).join('');
            
            comidaContainer.innerHTML = `
                <div class="bg-gray-800 rounded-xl p-6">
                    <div class="flex items-center space-x-4 mb-4">
                        <div class="text-3xl">🍿</div>
                        <div>
                            <h3 class="text-xl font-bold">Comida Seleccionada</h3>
                            <p class="text-gray-400">${this.comidaData.length} item(s)</p>
                        </div>
                    </div>
                    <div class="space-y-2">
                        ${comidaItems}
                    </div>
                </div>
            `;
        } else {
            comidaContainer.innerHTML = `
                <div class="bg-gray-800 rounded-xl p-6">
                    <div class="flex items-center space-x-4">
                        <div class="text-3xl">🍿</div>
                        <div>
                            <h3 class="text-xl font-bold">Comida Seleccionada</h3>
                            <p class="text-gray-400">No se seleccionó comida</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    obtenerPrecioComida(item) {
        const precios = {
            'Crispetas Grandes': 8000,
            'Crispetas Medianas': 6000,
            'Gaseosa Grande': 5000,
            'Gaseosa Mediana': 4000,
            'Combo Familiar': 20000,
            'Hot Dog': 7000
        };
        return precios[item] || 0;
    }

    mostrarTotales() {
        const totalesContainer = document.getElementById('totalesResumen');
        totalesContainer.innerHTML = `
            <div class="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6">
                <h3 class="text-xl font-bold mb-4">Resumen de Pago</h3>
                
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-200">Asientos (${this.asientosData.length}):</span>
                        <span class="text-white font-semibold">$${this.totalesData.total_asientos.toLocaleString()}</span>
                    </div>
                    
                    <div class="flex justify-between">
                        <span class="text-gray-200">Comida (${this.comidaData.length}):</span>
                        <span class="text-white font-semibold">$${this.totalesData.total_comida.toLocaleString()}</span>
                    </div>
                    
                    <div class="border-t border-white/20 pt-3 mt-3">
                        <div class="flex justify-between text-lg">
                            <span class="text-white font-bold">TOTAL:</span>
                            <span class="text-yellow-400 font-bold">$${this.totalesData.total_general.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    configurarEventos() {
        // Botón de confirmar pago
        const confirmarBtn = document.getElementById('confirmarPago');
        if (confirmarBtn) {
            confirmarBtn.addEventListener('click', () => this.procesarPago());
        }

        // Botón de cancelar
        const cancelarBtn = document.getElementById('cancelarPago');
        if (cancelarBtn) {
            cancelarBtn.addEventListener('click', () => this.cancelarPago());
        }
    }

    configurarMetodosPago() {
        const metodosPago = document.querySelectorAll('input[name="metodoPago"]');
        metodosPago.forEach(metodo => {
            metodo.addEventListener('change', (e) => {
                this.mostrarFormularioPago(e.target.value);
            });
        });
    }

    mostrarFormularioPago(metodo) {
        const formularioContainer = document.getElementById('formularioPago');
        
        const formularios = {
            'tarjeta': `
                <div class="space-y-4">
                    <div>
                        <label class="block text-gray-300 text-sm font-medium mb-2">Número de Tarjeta</label>
                        <input type="text" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="1234 5678 9012 3456" maxlength="19">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">Fecha Expiración</label>
                            <input type="text" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="MM/AA">
                        </div>
                        <div>
                            <label class="block text-gray-300 text-sm font-medium mb-2">CVV</label>
                            <input type="text" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="123" maxlength="3">
                        </div>
                    </div>
                    <div>
                        <label class="block text-gray-300 text-sm font-medium mb-2">Nombre en la Tarjeta</label>
                        <input type="text" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="JUAN PEREZ">
                    </div>
                </div>
            `,
            'efectivo': `
                <div class="bg-yellow-600/20 border border-yellow-600 rounded-lg p-4">
                    <div class="flex items-center space-x-3">
                        <div class="text-2xl">💰</div>
                        <div>
                            <h4 class="text-yellow-400 font-semibold">Pago en Efectivo</h4>
                            <p class="text-yellow-200 text-sm">Paga directamente en taquilla al recoger tus entradas</p>
                        </div>
                    </div>
                </div>
            `,
            'transferencia': `
                <div class="bg-green-600/20 border border-green-600 rounded-lg p-4">
                    <div class="flex items-center space-x-3">
                        <div class="text-2xl">🏦</div>
                        <div>
                            <h4 class="text-green-400 font-semibold">Transferencia Bancaria</h4>
                            <p class="text-green-200 text-sm">Realiza la transferencia a nuestra cuenta bancaria</p>
                            <div class="mt-2 text-xs">
                                <p><strong>Banco:</strong> Banco Nacional</p>
                                <p><strong>Cuenta:</strong> 123-456789-01</p>
                                <p><strong>Titular:</strong> CineVoice S.A.S.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `
        };

        formularioContainer.innerHTML = formularios[metodo] || '';
    }

    async procesarPago() {
        const metodoPago = document.querySelector('input[name="metodoPago"]:checked');
        
        if (!metodoPago) {
            this.mostrarMensaje('❌ Por favor selecciona un método de pago', 'error');
            return;
        }

        // Mostrar loading
        this.mostrarLoading();

        try {
            // Simular procesamiento de pago
            await new Promise(resolve => setTimeout(resolve, 3000));

            // En una aplicación real, aquí iría la integración con la pasarela de pago
            const response = await fetch("/procesar_pago", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    metodo_pago: metodoPago.value,
                    total: this.totalesData.total_general,
                    pelicula: this.peliculaData,
                    asientos: this.asientosData,
                    comida: this.comidaData
                })
            });

            const result = await response.json();

            if (result.success) {
                this.mostrarMensaje('✅ ¡Pago procesado exitosamente!', 'success');
                // Redirigir a confirmación
                setTimeout(() => {
                    window.location.href = '/confirmacion';
                }, 2000);
            } else {
                this.mostrarMensaje('❌ Error al procesar el pago: ' + result.error, 'error');
            }

        } catch (error) {
            console.error("Error procesando pago:", error);
            this.mostrarMensaje('❌ Error de conexión al procesar el pago', 'error');
        } finally {
            this.ocultarLoading();
        }
    }

    cancelarPago() {
        if (confirm('¿Estás seguro de que quieres cancelar el pago? Se perderá tu reserva.')) {
            window.location.href = '/';
        }
    }

    mostrarLoading() {
        const boton = document.getElementById('confirmarPago');
        boton.disabled = true;
        boton.innerHTML = `
            <div class="flex items-center justify-center space-x-2">
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Procesando...</span>
            </div>
        `;
    }

    ocultarLoading() {
        const boton = document.getElementById('confirmarPago');
        boton.disabled = false;
        boton.textContent = 'Confirmar Pago';
    }

    mostrarMensaje(mensaje, tipo) {
        const mensajeDiv = document.createElement('div');
        mensajeDiv.className = `fixed top-4 right-4 p-4 rounded-lg z-50 ${
            tipo === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`;
        mensajeDiv.innerHTML = `
            <div class="flex items-center space-x-2">
                <span class="text-lg">${tipo === 'success' ? '✅' : '❌'}</span>
                <span>${mensaje}</span>
            </div>
        `;
        
        document.body.appendChild(mensajeDiv);
        
        setTimeout(() => {
            mensajeDiv.remove();
        }, 5000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    new PaymentSystem();
});