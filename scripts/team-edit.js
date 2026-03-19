document.addEventListener('DOMContentLoaded', () => {
    
    // --- Dynamic Routing Logic ---
    let fromPage = 'management';
    let returnUrl = 'management.html?tab=teams';

    setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        fromPage = urlParams.get('from') || 'management';

        // Construct return path
        returnUrl = fromPage === 'management' ? 'management.html?tab=teams' : `${fromPage}.html`;

        const backBtn = document.getElementById('dynamic-back-btn');
        const cancelBtn = document.getElementById('dynamic-cancel-btn');

        if (backBtn) backBtn.href = returnUrl;
        if (cancelBtn) cancelBtn.href = returnUrl;

        // Sync Sidebar highlighting
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href').startsWith(fromPage)) {
                item.classList.add('active');
            }
        });
    }, 100);

    // --- Form Submission Logic ---
    const form = document.getElementById('edit-team-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const teamName = document.getElementById('team-name').value;
            
            // Show success toast
            const successMsg = document.createElement('div');
            successMsg.className = 'fixed top-4 right-4 bg-white border border-gray-100 text-gray-800 px-6 py-4 rounded-xl shadow-2xl z-[80] flex items-center gap-3 transition-all duration-300 transform translate-y-[-20px] opacity-0';
            
            successMsg.innerHTML = `
                <div class="w-8 h-8 bg-green-50 text-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <div>
                    <strong class="block">Changes Saved!</strong> 
                    <span class="text-sm text-gray-500">"${teamName}" has been updated.</span>
                </div>
            `;
            
            document.body.appendChild(successMsg);
            
            requestAnimationFrame(() => {
                successMsg.style.transform = "translateY(0)";
                successMsg.style.opacity = "1";
            });
            
            // Redirect back to origin
            setTimeout(() => {
                successMsg.style.transform = "translateY(-20px)";
                successMsg.style.opacity = "0";
                
                setTimeout(() => {
                    window.location.href = returnUrl;
                }, 300);
                
            }, 1500);
        });
    }
});