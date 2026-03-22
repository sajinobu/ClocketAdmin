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

})();