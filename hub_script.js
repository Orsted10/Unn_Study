document.addEventListener("DOMContentLoaded", () => {
    
    // --- TRACK TAB FILTERING ---
    const tabs = document.querySelectorAll('.track-tab');
    const cards = document.querySelectorAll('.chapter-card');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const filter = tab.getAttribute('data-filter');

            // Update active tab UI
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Filter cards
            cards.forEach(card => {
                const track = card.getAttribute('data-track');
                if (filter === 'all' || filter === track) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

});
