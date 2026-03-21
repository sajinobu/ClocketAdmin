(() => {
    // 1. RUN EVERY TIME
    if (window.lucide) {
        lucide.createIcons();
    }

    // Dynamic Routing & Sidebar Highlighting
    setTimeout(() => {
        let fromPage = 'attendance';
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('from')) {
            fromPage = urlParams.get('from');
        }

        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            const targetHref = fromPage === 'dashboard' ? 'dashboard.html' : 'attendance.html';
            
            if (item.getAttribute('href') && item.getAttribute('href').startsWith(targetHref)) {
                item.classList.add('active');
            }
        });
    }, 100);

    // 2. SPA EVENT GUARD (Run Only Once)
    if (window.employeeLogsSPAInitialized) return;
    window.employeeLogsSPAInitialized = true;

    // 3. EVENT DELEGATION LISTENERS
    document.body.addEventListener('click', (e) => {
        
        // --- Dynamic Back Button Routing ---
        const backBtn = e.target.closest('#dynamic-back-btn');
        if (backBtn) {
            e.preventDefault();
            
            let currentFrom = 'attendance'; 
            const currentParams = new URLSearchParams(window.location.search);
            if(currentParams.get('from')) {
                currentFrom = currentParams.get('from');
            }
            const returnUrl = `${currentFrom}.html`;

            if (typeof navigateTo === 'function') {
                navigateTo(returnUrl);
            } else {
                window.location.href = returnUrl;
            }
        }

        // --- Custom Dropdown Handling (Time Range) ---
        const logRangeDropdown = document.getElementById('log-range-dropdown');
        
        if (logRangeDropdown && !logRangeDropdown.contains(e.target)) {
            logRangeDropdown.classList.remove('open');
        }

        const dropdownTrigger = e.target.closest('#log-range-dropdown .dropdown-trigger');
        if (dropdownTrigger && logRangeDropdown && logRangeDropdown.contains(dropdownTrigger)) {
            e.stopPropagation();
            logRangeDropdown.classList.toggle('open');
        }

        const dropdownItem = e.target.closest('#log-range-dropdown .dropdown-item');
        if (dropdownItem && logRangeDropdown && logRangeDropdown.contains(dropdownItem)) {
            e.stopPropagation();
            const value = dropdownItem.getAttribute('data-value');
            
            logRangeDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            dropdownItem.classList.add('active');
            
            const textElement = document.getElementById('log-range-text');
            if (textElement) textElement.textContent = dropdownItem.textContent;
            
            logRangeDropdown.classList.remove('open');
        }

        // --- Export Button Logic ---
        const exportBtn = e.target.closest('#export-log-btn');
        if (exportBtn && !exportBtn.disabled) {
            e.preventDefault();
            const originalContent = exportBtn.innerHTML;
            
            exportBtn.innerHTML = `
                <i data-lucide="loader" class="w-5 h-5 text-brand-primary animate-spin"></i>
                <span class="text-sm font-bold opacity-80">Exporting...</span>
            `;
            exportBtn.disabled = true;
            exportBtn.classList.add('opacity-50', 'cursor-not-allowed');
            
            if (window.lucide) lucide.createIcons();

            setTimeout(() => {
                exportBtn.innerHTML = originalContent;
                exportBtn.disabled = false;
                exportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                if (window.lucide) lucide.createIcons();
                
                showExportToast("Sarah_Johnson_March_2026.csv has been downloaded.");
            }, 1500);
        }
    });

    // --- Modern Dark-Mode Ready Toast Utility ---
    function showExportToast(message) {
        const existingToast = document.querySelector('.export-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        
        toast.className = `export-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 300px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(99,102,241,0.1)] text-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="check" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold">Export Complete</p>
                <p class="text-xs opacity-80 mt-0.5">${message}</p>
            </div>
        `;

        document.body.appendChild(toast);
        if (window.lucide) lucide.createIcons();

        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-20', 'opacity-0');
        });

        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 3500);
    }
})();