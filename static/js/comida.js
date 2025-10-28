document.addEventListener("DOMContentLoaded", () => {
    let selectedFood = [];

    // ✅ Función para seleccionar comida
    window.seleccionar = (element) => {
        element.classList.toggle("seleccionado");
        
        // Actualizar array de comidas seleccionadas
        selectedFood = Array.from(document.querySelectorAll(".comida.seleccionado"))
            .map(el => el.querySelector("h3").textContent.trim());

        console.log("Comidas seleccionadas:", selectedFood);

        // Guardar selección en el backend
        fetch('/save_food', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ food: selectedFood })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log("Comida guardada correctamente");
            } else {
                console.error("Error guardando comida:", data.error);
            }
        })
        .catch(error => {
            console.error("Error en la solicitud:", error);
        });
    };

    // ✅ Botón de confirmación
    const confirmBtn = document.getElementById('confirmFood');
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            // Guardar selección final antes de continuar
            await fetch('/save_food', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ food: selectedFood })
            });
            
            // Redirigir a la siguiente página
            window.location.href = '/pago'; // Cambié a '/pago' según tu ruta
        };
    }

    // ✅ Cargar selección previa si existe
    function cargarSeleccionPrevia() {
        fetch('/get_session')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.session.food) {
                    const comidaPrevia = data.session.food;
                    selectedFood = comidaPrevia;
                    
                    // Marcar visualmente las comidas previamente seleccionadas
                    document.querySelectorAll('.comida').forEach(comidaEl => {
                        const nombreComida = comidaEl.querySelector('h3').textContent.trim();
                        if (comidaPrevia.includes(nombreComida)) {
                            comidaEl.classList.add('seleccionado');
                        }
                    });
                    
                    console.log("Selección previa cargada:", comidaPrevia);
                }
            })
            .catch(error => {
                console.error("Error cargando selección previa:", error);
            });
    }

    // Cargar selección al iniciar la página
    cargarSeleccionPrevia();
});