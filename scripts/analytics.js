(() => {
    // ==========================================
    // 1. RUN EVERY TIME (UI & Animations)
    // ==========================================
    if (window.lucide) {
        lucide.createIcons();
    }

    // We MUST run this animation every time the page loads so the charts visually 
    // "grow" even when navigated to via the SPA router! It sits above the guard flag.
    setTimeout(() => {
        const animatedBars = document.querySelectorAll('.animate-width');
        animatedBars.forEach(bar => {
            const targetWidth = bar.getAttribute('data-width');
            if (targetWidth) {
                bar.style.width = targetWidth;
            }
        });
    }, 150); 

    // Ensure Sidebar Highlight
    setTimeout(() => {
        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') && item.getAttribute('href').startsWith('analytics')) {
                item.classList.add('active');
            }
        });
    }, 100);

    // ==========================================
    // 2. SPA EVENT GUARD (Run Only Once)
    // ==========================================
    if (window.analyticsSPAInitialized) return;
    window.analyticsSPAInitialized = true;

    // ==========================================
    // 3. EVENT DELEGATION LISTENERS
    // ==========================================

    document.body.addEventListener('click', (e) => {
        // NEW PAGE GUARD: Only run if the trend dropdown is on the screen!
        if (!document.getElementById('trend-dropdown')) return;
        
        // --- Date Range Filter Toggle ---
        const rangeBtn = e.target.closest('.range-btn');
        if (rangeBtn) {
            document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
            rangeBtn.classList.add('active');
            console.log(`Fetching data for range: ${rangeBtn.getAttribute('data-range')}`);
        }

        // --- Custom Dropdown Handling (Weekly Trends) ---
        const trendDropdown = document.getElementById('trend-dropdown');
        
        // Close if clicked outside
        if (trendDropdown && !trendDropdown.contains(e.target)) {
            trendDropdown.classList.remove('open');
        }

        // Toggle on trigger click
        const dropdownTrigger = e.target.closest('#trend-dropdown .dropdown-trigger');
        if (dropdownTrigger && trendDropdown && trendDropdown.contains(dropdownTrigger)) {
            e.stopPropagation();
            trendDropdown.classList.toggle('open');
        }

        // Select an item
        const dropdownItem = e.target.closest('#trend-dropdown .dropdown-item');
        if (dropdownItem && trendDropdown && trendDropdown.contains(dropdownItem)) {
            e.stopPropagation();
            const value = dropdownItem.getAttribute('data-value');
            
            // Update UI
            trendDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            dropdownItem.classList.add('active');
            document.getElementById('trend-text').textContent = dropdownItem.textContent;
            
            trendDropdown.classList.remove('open');
            console.log(`Weekly trend data range changed to: ${value}`);
        }

        // --- Export Button ---
        const exportBtn = e.target.closest('#export-btn');
        if (exportBtn && !exportBtn.disabled) {
            const originalIcon = exportBtn.innerHTML;
            
            // Set to loading state
            exportBtn.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin text-brand-primary"></i>`;
            if (window.lucide) lucide.createIcons();
            exportBtn.disabled = true;

            setTimeout(() => {
                // Restore button
                exportBtn.innerHTML = originalIcon;
                exportBtn.disabled = false;
                
                // Show Custom Toast
                showAnalyticsToast("Report exported as CSV successfully!");
            }, 1500);
        }

        if (e.target.closest('.btn-outline-full')) {
            showRankingModal();
        }

        if (e.target.closest('#close-ranking-modal') || e.target.id === 'ranking-modal-backdrop') {
            hideRankingModal();
        }
    });

    // --- Helper Function: Brand-Themed Toast Notification ---
    function showAnalyticsToast(message) {
        const existingToast = document.querySelector('.analytics-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `analytics-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[9999] transition-all duration-300`;
        toast.style.cssText = "transform: translateY(20px); opacity: 0;";
        
        toast.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5 text-brand-primary"></i> <span class="text-sm font-medium">${message}</span>`;
        
        document.body.appendChild(toast);
        if (window.lucide) lucide.createIcons();

        requestAnimationFrame(() => {
            toast.style.transform = "translateY(0)";
            toast.style.opacity = "1";
        });

        setTimeout(() => {
            toast.style.transform = "translateY(20px)";
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    const rankingData = [
    { name: "Lisa Smith", score: "100%", avatar: "LS", color: "avatar-teal" },
    { name: "Mike Chen", score: "99.4%", avatar: "MC", color: "avatar-blue" },
    { name: "Emma Wilson", score: "98.9%", avatar: "EW", color: "avatar-teal" },
    { name: "Jon Orlanz", score: "98.2%", avatar: "JO", color: "avatar-blue" },
    { name: "Sarah Johnson", score: "97.5%", avatar: "SJ", color: "avatar-teal" },
    { name: "David Miller", score: "96.8%", avatar: "DM", color: "avatar-blue" },
    { name: "Anna Taylor", score: "96.1%", avatar: "AT", color: "avatar-teal" },
    { name: "Robert Fox", score: "95.5%", avatar: "RF", color: "avatar-blue" },
    { name: "Chris Brown", score: "94.9%", avatar: "CB", color: "avatar-teal" },
    { name: "Teffanie Bornales", score: "94.2%", avatar: "JS", color: "avatar-blue" }
];

function showRankingModal() {
    const modal = document.getElementById('ranking-modal');
    const box = document.getElementById('ranking-modal-box');
    const container = document.getElementById('ranking-list-container');

    // Populate the list
    container.innerHTML = rankingData.map((emp, index) => `
        <div class="flex items-center gap-4 p-3 rounded-xl hover:bg-brand-grayBg transition-colors group">
            <div class="text-sm font-black text-brand-dark w-6">${index + 1}</div>
            <div class="list-avatar ${emp.color} shrink-0">${emp.avatar}</div>
            <div class="flex-1">
                <p class="text-sm font-bold text-brand-darkest group-hover:text-brand-primary transition-colors">${emp.name}</p>
                <p class="text-[10px] text-brand-dark uppercase">Engineering Dept</p>
            </div>
            <div class="text-right">
                <p class="text-sm font-black text-brand-primary">${emp.score}</p>
                <p class="text-[9px] font-bold text-green-500 uppercase">Punctual</p>
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();

    // Show with animation
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.add('flex'); // Ensure flex is applied
        modal.classList.remove('opacity-0');
        box.classList.remove('scale-95');
        box.classList.add('scale-100');
    });
}

function hideRankingModal() {
    const modal = document.getElementById('ranking-modal');
    const box = document.getElementById('ranking-modal-box');
    
    modal.classList.add('opacity-0');
    box.classList.remove('scale-100');
    box.classList.add('scale-95');

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

})();