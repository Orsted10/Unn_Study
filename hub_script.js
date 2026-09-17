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

    // --- MODAL DRAWERS ---
    const toolsModal = document.getElementById('tools-modal');
    const pillarsModal = document.getElementById('pillars-modal');

    document.getElementById('btn-open-tools').onclick = () => toolsModal.classList.remove('hidden');
    document.getElementById('btn-open-5pillars').onclick = () => pillarsModal.classList.remove('hidden');

    document.getElementById('close-tools-btn').onclick = () => toolsModal.classList.add('hidden');
    document.getElementById('close-pillars-btn').onclick = () => pillarsModal.classList.add('hidden');

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.onclick = () => {
            toolsModal.classList.add('hidden');
            pillarsModal.classList.add('hidden');
        };
    });

});
