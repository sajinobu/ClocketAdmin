(() => {
    // ==========================================
    // 1. RUN EVERY TIME
    // ==========================================
    if (window.lucide) lucide.createIcons();

    // ==========================================
    // 2. SPA EVENT GUARD (Run Only Once)
    // ==========================================
    if (window.dashboardSPAInitialized) return;
    window.dashboardSPAInitialized = true;

    // ==========================================
    // 3. EVENT DELEGATION LISTENERS
    // ==========================================
    document.body.addEventListener('click', (e) => {
        
        const feedModal = document.getElementById('feed-modal');
        if (!feedModal) return;

        // Open Modal
        const viewFeedBtn = e.target.closest('#view-more-feed-btn');
        if (viewFeedBtn) {
            e.preventDefault();
            feedModal.classList.remove('hidden');
        }

        // Close Modal via X button
        const closeFeedBtn = e.target.closest('#close-feed-modal');
        if (closeFeedBtn) {
            e.preventDefault();
            feedModal.classList.add('hidden');
        }

        // Close Modal via clicking outside the box
        if (e.target === feedModal) {
            feedModal.classList.add('hidden');
        }

        // --- FIX FOR SPA MODAL ROUTING BUG ---
        // If a user clicks the "Open Live Tracking Map" link inside the modal,
        // we must explicitly hide the modal so the overlay doesn't stay stuck on the screen!
        const modalLink = e.target.closest('#feed-modal a');
        if (modalLink) {
            feedModal.classList.add('hidden');
        }
    });

    console.log("Dashboard command center initialized.");
})();