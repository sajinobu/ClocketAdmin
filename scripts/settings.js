(() => {
    // ==========================================
    // 1. RUN EVERY TIME (UI Initialization)
    // ==========================================
    if (window.lucide) lucide.createIcons();

    // Highlight Correct Sidebar Link
    setTimeout(() => {
        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
        });
        const activeSidebarLink = document.querySelector(`.sidebar-item[href="settings.html"], .nav-link[href="settings.html"]`);
        if (activeSidebarLink) {
            activeSidebarLink.classList.add('active');
        }
    }, 100);

    // ==========================================
    // 2. SPA EVENT GUARD (Run Only Once)
    // ==========================================
    if (window.settingsSPAInitialized) return;
    window.settingsSPAInitialized = true;

    // ==========================================
    // 3. EVENT DELEGATION LISTENERS
    // ==========================================
    
    // Toggle Switches (Change Event)
    document.body.addEventListener('change', (e) => {
        // NEW PAGE GUARD: Only run if the settings toggles exist
        if (!document.getElementById('toggle-email')) return;

        if (e.target.id === 'toggle-email') {
            const status = e.target.checked ? "enabled" : "disabled";
            showSettingsToast(`Email notifications have been ${status}.`);
        }
        
        if (e.target.id === 'toggle-2fa') {
            const status = e.target.checked ? "enabled" : "disabled";
            showSettingsToast(`Two-Factor Authentication is now ${status}.`);
        }
    });

    // Buttons (Click Event)
    document.body.addEventListener('click', (e) => {
        // NEW PAGE GUARD: Only run if the download button exists
        if (!document.getElementById('download-data-btn')) return;

        const downloadBtn = e.target.closest('#download-data-btn');
        
        if (downloadBtn && !downloadBtn.disabled) {
            const originalContent = downloadBtn.innerHTML;
            
            // Set to loading state
            downloadBtn.innerHTML = `
                <i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Preparing Archive...
            `;
            downloadBtn.disabled = true;
            
            if (window.lucide) lucide.createIcons();

            // Simulate server preparation delay
            setTimeout(() => {
                downloadBtn.innerHTML = originalContent;
                downloadBtn.disabled = false;
                if (window.lucide) lucide.createIcons();
                
                showSettingsToast("Your data archive (ZIP) has started downloading.");
            }, 1800);
        }
    });

    // ==========================================
    // 4. HELPER: Modern Brand Toast Utility
    // ==========================================
    function showSettingsToast(message) {
        const existingToast = document.querySelector('.settings-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `settings-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 320px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(99,102,241,0.1)] text-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="settings" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold">Settings Updated</p>
                <p class="text-xs opacity-80 mt-0.5">${message}</p>
            </div>
        `;

        document.body.appendChild(toast);
        if (window.lucide) lucide.createIcons();

        // Animate In
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-20', 'opacity-0');
        });

        // Animate Out & Remove automatically
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 3500);
    }
})();