document.addEventListener('DOMContentLoaded', () => {
    let selectedFood = [];

    document.querySelectorAll('.food').forEach(btn => {
        btn.onclick = () => {
            btn.classList.toggle('selected');
            if (selectedFood.includes(btn.textContent))
                selectedFood = selectedFood.filter(f => f !== btn.textContent);
            else selectedFood.push(btn.textContent);
        };
    });

    document.getElementById('voiceFood').onclick = () => {
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.start();

        recognition.onresult = (event) => {
            const command = event.results[0][0].transcript.toLowerCase();
            if (command.includes('combo 1')) selectedFood.push('Combo 1: Crispetas y gaseosa');
            if (command.includes('combo 2')) selectedFood.push('Combo 2: Nachos y jugo');
            if (command.includes('combo 3')) selectedFood.push('Combo 3: Perro y agua');
        };
    };

    document.getElementById('confirmFood').onclick = async () => {
        await fetch('/select_food', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ food: selectedFood })
        });
        window.location.href = '/payment';
    };
});

