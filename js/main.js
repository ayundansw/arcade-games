document.addEventListener('DOMContentLoaded', () => {
    // Clock Logic
    const clockElement = document.getElementById('clock');
    
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clockElement.textContent = `${hours}:${minutes}:${seconds}`;
    }

    setInterval(updateClock, 1000);
    updateClock();

    // Random Glitch Effect on Hover for Cards (Optional Visual Flair)
    const cards = document.querySelectorAll('.game-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            // Play a subtle sound or trigger a specific visual state if needed
            // For now, CSS handles the heavy lifting of visual feedback
        });
    });
});
