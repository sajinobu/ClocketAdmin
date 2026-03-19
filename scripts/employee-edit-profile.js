document.addEventListener('DOMContentLoaded', () => {
    
    const form = document.getElementById('edit-employee-form');
    
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const firstName = document.getElementById('edit-first-name').value;
            const lastName = document.getElementById('edit-last-name').value;
            
            // Create a success notification
            const successMsg = document.createElement('div');
            successMsg.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg shadow-lg z-50 flex items-center gap-3 transition-opacity duration-300';
            successMsg.innerHTML = `
                <i data-lucide="check-circle" class="w-5 h-5 text-green-600"></i>
                <div>
                    <strong class="block">Changes Saved!</strong> 
                    <span class="text-sm">Profile updated for ${firstName} ${lastName}.</span>
                </div>
            `;
            
            document.body.appendChild(successMsg);
            
            // Re-initialize icons for the newly injected HTML
            if (window.lucide) {
                lucide.createIcons();
            }
            
            // Redirect back to the profile page after a short delay
            setTimeout(() => {
                successMsg.style.opacity = '0';
                setTimeout(() => {
                    window.location.href = 'employee-profile.html';
                }, 300);
            }, 1500);
        });
    }
});