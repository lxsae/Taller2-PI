document.addEventListener('DOMContentLoaded', () => {
    const seatMap = document.getElementById('seat-map');
    const continueBtn = document.getElementById('continueBtn');
    const voiceBtn = document.getElementById('voiceBtn');
    let selectedSeats = [];

    // Crear grilla de asientos
    for (let i = 1; i <= 20; i++) {
        const seat = document.createElement('button');
        seat.textContent = `A${i}`;
        seat.className = 'seat';
        seat.onclick = () => {
            seat.classList.toggle('selected');
            if (selectedSeats.includes(seat.textContent)) {
                selectedSeats = selectedSeats.filter(s => s !== seat.textContent);
            } else {
                selectedSeats.push(seat.textContent);
            }
        };
        seatMap.appendChild(seat);
    }

    continueBtn.onclick = async () => {
        await fetch('/select_seats', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ seats: selectedSeats })
        });
        window.location.href = '/food';
    };

    voiceBtn.onclick = () => {
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.start();

        recognition.onresult = async (event) => {
            const command = event.results[0][0].transcript.toLowerCase();
            if (command.includes('asiento')) {
                const num = command.match(/\d+/);
                if (num) {
                    const seat = `A${num[0]}`;
                    document.querySelectorAll('.seat').forEach(btn => {
                        if (btn.textContent === seat) btn.classList.add('selected');
                    });
                    selectedSeats.push(seat);
                }
            } else if (command.includes('continuar')) {
                continueBtn.click();
            }
        };
    };
});
