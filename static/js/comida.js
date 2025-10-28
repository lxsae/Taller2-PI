document.addEventListener("DOMContentLoaded", () => {
  let selectedFood = [];

   // ✅ Selección manual
    window.seleccionar = (element) => {
        element.classList.toggle("seleccionado");
        selectedFood = Array.from(document.querySelectorAll(".comida.seleccionado"))
            .map(el => el.querySelector("h3").textContent.trim());

        // Guardar selección en el backend
        fetch('/save_food', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ food: selectedFood })
        });
    };




  // ✅ Botón de confirmación manual
    const confirmBtn = document.getElementById('confirmFood');
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            await fetch('/save_food', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ food: selectedFood })
            });
            window.location.href = '/asientos';
        };
  }
});


