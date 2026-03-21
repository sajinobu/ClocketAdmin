(() => {
    // 1. RUN EVERY TIME
    if (window.lucide) lucide.createIcons();

    // Ensure Sidebar Highlight is cleared for the edit page as it's a sub-page
    setTimeout(() => {
        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
        });
    }, 100);

    // 2. SPA EVENT GUARD (Run Only Once)
    if (window.profileEditSPAInitialized) return;
    window.profileEditSPAInitialized = true;

    // 3. EVENT DELEGATION LISTENERS
    document.body.addEventListener('click', (e) => {
        
        // --- Back & Cancel Routing ---
        const routeBtn = e.target.closest('#dynamic-back-btn, #dynamic-cancel-btn');
        if (routeBtn) {
            e.preventDefault();
            if (typeof navigateTo === 'function') {
                navigateTo('profile.html');
            } else {
                window.location.href = 'profile.html';
            }
        }

        // --- Avatar Upload Button Click ---
        const cameraBtn = e.target.closest('.btn-camera');
        if (cameraBtn) {
            e.preventDefault();
            const fileInput = document.getElementById('avatar-upload');
            if (fileInput) fileInput.click();
        }
    });

    // --- Avatar File Selection Logic ---
    document.body.addEventListener('change', (e) => {
        if (e.target.id === 'avatar-upload') {
            const file = e.target.files[0];
            if (file) {
                // Use FileReader to instantly preview the image without a server
                const reader = new FileReader();
                reader.onload = (event) => {
                    const avatarPreview = document.getElementById('avatar-preview');
                    if (avatarPreview) {
                        avatarPreview.innerHTML = ''; // Remove the "AM" text
                        avatarPreview.style.backgroundImage = `url(${event.target.result})`;
                        avatarPreview.style.backgroundSize = 'cover';
                        avatarPreview.style.backgroundPosition = 'center';
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    });

    // --- Form Submission ---
    document.body.addEventListener('submit', (e) => {
        if (e.target.id === 'admin-edit-form') {
            e.preventDefault();
            
            showSuccessToast("Your profile details have been successfully updated.");
            
            setTimeout(() => {
                if (typeof navigateTo === 'function') {
                    navigateTo('profile.html');
                } else {
                    window.location.href = 'profile.html';
                }
            }, 2000); 
        }
    });

    // --- Custom Brand Toast Utility ---
    function showSuccessToast(message) {
        const existingToast = document.querySelector('.profile-edit-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `profile-edit-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 320px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(99,102,241,0.1)] text-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="check-circle" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold">Profile Saved</p>
                <p class="text-xs opacity-80 mt-0.5">${message}</p>
            </div>
        `;

        document.body.appendChild(toast);
        if (window.lucide) lucide.createIcons();

        // Animate In
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-20', 'opacity-0');
        });
        
        // Animate Out
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 1500);
    }
})();