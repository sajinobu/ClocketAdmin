document.addEventListener('DOMContentLoaded', () => {
    
    // --- Password Reset Toast Logic ---
    const resetBtn = document.getElementById('reset-password-btn');
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            showProfileToast("A password reset link has been sent to admin@company.com");
        });
    }

    // --- Custom Brand Toast Utility ---
    function showProfileToast(message) {
        const toast = document.createElement('div');
        
        toast.className = `fixed bottom-6 right-6 bg-[#000523] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 320px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(87,232,255,0.1)] text-[#57e8ff] rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="mail-check" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold text-white">Reset Email Sent</p>
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

    console.log("Profile page initialized.");
});