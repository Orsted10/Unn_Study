// Silicon Mastery Hub Interactive Script

document.addEventListener('DOMContentLoaded', () => {
    console.log('Silicon Mastery Platform Hub initialized.');

    // Search input handling
    const searchInput = document.getElementById('hub-search-input');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const trackCards = document.querySelectorAll('.track-launch-card');
    const moduleCards = document.querySelectorAll('.module-card');

    let activeFilter = 'all';

    function filterCards() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        moduleCards.forEach(modCard => {
            let modHasVisibleTracks = false;
            const cards = modCard.querySelectorAll('.track-launch-card');

            cards.forEach(card => {
                const isTrackA = card.classList.contains('track-a-card');
                const isTrackB = card.classList.contains('track-b-card');
                const isTrackC = card.classList.contains('track-c-card');

                let matchesTab = false;
                if (activeFilter === 'all') matchesTab = true;
                else if (activeFilter === 'track-a' && isTrackA) matchesTab = true;
                else if (activeFilter === 'track-b' && isTrackB) matchesTab = true;
                else if (activeFilter === 'track-c' && isTrackC) matchesTab = true;

                const textContent = card.textContent.toLowerCase();
                const matchesSearch = query === '' || textContent.includes(query);

                if (matchesTab && matchesSearch) {
                    card.style.display = 'flex';
                    modHasVisibleTracks = true;
                } else {
                    card.style.display = 'none';
                }
            });

            if (modHasVisibleTracks) {
                modCard.style.display = 'block';
            } else {
                modCard.style.display = 'none';
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterCards);
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.track;
            filterCards();
        });
    });
    
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
