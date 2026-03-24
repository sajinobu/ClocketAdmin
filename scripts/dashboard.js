(() => {
    // ==========================================
    // 1. RUN EVERY TIME
    // ==========================================
    if (window.lucide) lucide.createIcons();

    async function updateDashboardStats() {
        if (!window.db || !window.firebaseUtils) return;

        try {
            const { collection, getDocs, query, where } = window.firebaseUtils;
            
            // Helper to get today's date string (YYYY-MM-DD)
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // 1. Fetch All Employees
            const empSnapshot = await getDocs(collection(window.db, "employees"));
            const totalEmployees = empSnapshot.size;

            // 2. Fetch Today's Attendance
            const attQuery = query(collection(window.db, "attendance"), where("date", "==", todayStr));
            const attSnapshot = await getDocs(attQuery);
            
            let clockedInToday = 0;
            let lateArrivals = 0;

            attSnapshot.forEach(doc => {
                const data = doc.data();
                clockedInToday++;
                
                // Logic for late: If status is explicitly "late" or clock_in_time exists
                // Adjust this condition based on your specific "late" criteria
                if (data.status === 'late' || data.is_late === true) {
                    lateArrivals++;
                }
            });

            // 3. Count Employees on Leave (Active status logic)
            let onLeave = 0;
            empSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.status === 'On Leave' || data.account_status === 'on-leave') {
                    onLeave++;
                }
            });

            // Update UI Elements
            // Using your N/A or 0 logic
            const elTotal = document.querySelector('.stat-card:nth-child(1) .stat-value');
            const elActive = document.querySelector('.stat-card:nth-child(2) .stat-value');
            const elLate = document.querySelector('.stat-card:nth-child(3) .stat-value');
            const elLeave = document.querySelector('.stat-card:nth-child(4) .stat-value');

            if (elTotal) elTotal.textContent = totalEmployees > 0 ? totalEmployees : "0";
            if (elActive) elActive.textContent = clockedInToday > 0 ? clockedInToday : "0";
            if (elLate) elLate.textContent = lateArrivals > 0 ? lateArrivals : "0";
            if (elLeave) elLeave.textContent = onLeave > 0 ? onLeave : "0";

        } catch (error) {
            console.error("Error updating dashboard stats:", error);
            // Fallback to N/A on critical error
            document.querySelectorAll('.stat-value').forEach(el => el.textContent = "N/A");
        }
    }

    // Initialize Fetch
    const waitForFirebase = setInterval(() => {
        if (window.db && window.firebaseUtils) {
            clearInterval(waitForFirebase);
            updateDashboardStats();
        }
    }, 50);

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

        const modalLink = e.target.closest('#feed-modal a');
        if (modalLink) {
            feedModal.classList.add('hidden');
        }
    });

    console.log("Dashboard command center initialized.");
})();