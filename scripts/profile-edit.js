document.addEventListener('DOMContentLoaded', () => {
    
    // Ensure the profile sidebar item stays highlighted
    setTimeout(() => {
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeSidebarLink = document.querySelector(`.sidebar-item[href="profile.html"]`);
        if (activeSidebarLink) {
            activeSidebarLink.classList.add('active');
        }
    }, 100);

    // --- Form Submission Logic ---
    const form = document.getElementById('admin-edit-form');
    
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Trigger Brand Toast Notification
            showSuccessToast("Your profile details have been successfully updated.");
            
            // Redirect back to profile after delay
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 2500); 
        });
    }

    // --- Custom Brand Toast Utility ---
    function showSuccessToast(message) {
        const toast = document.createElement('div');
        
        toast.className = `fixed bottom-6 right-6 bg-[#000523] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 320px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(87,232,255,0.1)] text-[#57e8ff] rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="check-circle" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold text-white">Profile Saved</p>
                <p class="text-xs text-gray-300 mt-0.5">${message}</p>
            </div>
        `;

        document.body.appendChild(toast);
        
        if (window.lucide) lucide.createIcons();

        // Animate In
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-20', 'opacity-0');
        });
    }
});