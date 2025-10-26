document.addEventListener('DOMContentLoaded', async () => {
    const movieName = document.getElementById('movieName');
    const seatsList = document.getElementById('seatsList');
    const foodList = document.getElementById('foodList');
    const result = document.getElementById('result');

    // Cargar los datos guardados de sesión
    const response = await fetch('/get_session');
    const data = await response.json();

    if (data.success) {
        movieName.textContent = data.session.movie || "Desconocida";
        seatsList.textContent = data.session.seats?.join(', ') || "Ninguno";
        foodList.textContent = data.session.food?.join(', ') || "Ninguno";
    }

    // Confirmar compra por clic
    document.getElementById('confirmBtn').onclick = async () => {
        const res = await fetch('/confirm_purchase', { method: 'POST' });
        const resultData = await res.json();
        if (resultData.success) {
            result.innerHTML = `
                <div class="alert alert-success">
                    ✅ ¡Compra confirmada!
                    <br><strong>Película:</strong> ${resultData.purchase.movie}
                    <br><strong>Asientos:</strong> ${resultData.purchase.seats.join(', ')}
                    <br><strong>Comida:</strong> ${resultData.purchase.food.join(', ')}
                </div>
            `;
        }
    };

    // Confirmar compra por voz
    document.getElementById('voicePay').onclick = () => {
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.start();

        recognition.onresult = async (event) => {
            const command = event.results[0][0].transcript.toLowerCase();
            if (command.includes('confirmar') || command.includes('comprar')) {
                document.getElementById('confirmBtn').click();
            } else {
                result.innerHTML = `<div class="alert alert-warning">No entendí el comando. Di “confirmar compra”.</div>`;
            }
        };
    };
});


