(() => {
    // 1. RUN EVERY TIME (UI Initialization)
    if (window.lucide) lucide.createIcons();

    // Ensure Sidebar Highlight is cleared for this specific page (since it's a bottom profile link)
    setTimeout(() => {
        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
        });
    }, 100);

    // 2. SPA EVENT GUARD (Run Only Once)
    if (window.profileSPAInitialized) return;
    window.profileSPAInitialized = true;

    // 3. EVENT DELEGATION LISTENERS
    document.body.addEventListener('click', (e) => {
        
        // --- Password Reset Button ---
        const resetBtn = e.target.closest('#reset-password-btn');
        if (resetBtn) {
            e.preventDefault();
            showProfileToast("A password reset link has been sent to admin@company.com");
        }

        // --- Edit Details Button Intercept ---
        // This ensures a smooth transition to the Edit page without a hard reload
        const editBtn = e.target.closest('a[href="profile-edit.html"]');
        if (editBtn) {
            e.preventDefault();
            if (typeof navigateTo === 'function') {
                navigateTo('profile-edit.html');
            } else {
                window.location.href = 'profile-edit.html';
            }
        }
    });

    // --- Custom Modern Brand Toast Utility ---
    function showProfileToast(message) {
        // Prevent stacking
        const existingToast = document.querySelector('.profile-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        
        toast.className = `profile-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 320px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(99,102,241,0.1)] text-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="mail-check" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold text-brand-darkest">Reset Email Sent</p>
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
        }, 3000);
    }

    console.log("Profile SPA module loaded successfully.");
})();