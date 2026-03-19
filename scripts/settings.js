document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Highlight Correct Sidebar Link ---
    setTimeout(() => {
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeSidebarLink = document.querySelector(`.sidebar-item[href="settings.html"]`);
        if (activeSidebarLink) {
            activeSidebarLink.classList.add('active');
        }
    }, 100);

    // --- 2. Toggle Switches Logic ---
    const toggleEmail = document.getElementById('toggle-email');
    const toggle2FA = document.getElementById('toggle-2fa');

    if (toggleEmail) {
        toggleEmail.addEventListener('change', (e) => {
            const status = e.target.checked ? "enabled" : "disabled";
            showSettingsToast(`Email notifications have been ${status}.`);
        });
    }

    if (toggle2FA) {
        toggle2FA.addEventListener('change', (e) => {
            const status = e.target.checked ? "enabled" : "disabled";
            showSettingsToast(`Two-Factor Authentication is now ${status}.`);
        });
    }

    // --- 3. Download Data Logic ---
    const downloadBtn = document.getElementById('download-data-btn');
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
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
        });
    }

    // --- 4. Custom Brand Toast Utility ---
    function showSettingsToast(message) {
        const toast = document.createElement('div');
        
        toast.className = `fixed bottom-6 right-6 bg-[#000523] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 320px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(87,232,255,0.1)] text-[#57e8ff] rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="settings" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold text-white">Settings Updated</p>
                <p class="text-xs text-gray-300 mt-0.5">${message}</p>
            </div>
        `;

        document.body.appendChild(toast);
        if (window.lucide) lucide.createIcons();

        // Animate In
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-20', 'opacity-0');
        });

        // Animate Out & Remove after 3.5 seconds
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 3500);
    }

    console.log("Settings page initialized.");
});