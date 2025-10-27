// script.js - Navegación básica
function showSection(sectionId) {
    // Ocultar todas las secciones
    const sections = ['home', 'peliculas'];
    sections.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden');
        }
    });
    
    // Mostrar sección seleccionada
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
}

// Verificar estado al cargar
document.addEventListener('DOMContentLoaded', function() {
    const peliculaSeleccionada = sessionStorage.getItem('peliculaSeleccionada');
    if (peliculaSeleccionada === 'true') {
        // Si ya hay película seleccionada, habilitar navegación
        const navComida = document.getElementById('navComida');
        const navAsientos = document.getElementById('navAsientos');
        const navPagos = document.getElementById('navPagos');
        
        if (navComida) {
            navComida.disabled = false;
            navComida.classList.remove('nav-disabled');
            navComida.classList.add('hover:text-blue-400');
        }
        
        if (navAsientos) {
            navAsientos.disabled = false;
            navAsientos.classList.remove('nav-disabled');
            navAsientos.classList.add('hover:text-blue-400');
        }
        
        if (navPagos) {
            navPagos.disabled = false;
            navPagos.classList.remove('nav-disabled');
            navPagos.classList.add('hover:text-blue-400');
        }
    }
});