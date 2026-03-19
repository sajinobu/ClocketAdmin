document.addEventListener('DOMContentLoaded', () => {
    
    // --- Dynamic Routing Logic ---
    let fromPage = 'management'; // Defaults to management
    
    // Slight delay to wait for layout.js to inject the sidebar
    setTimeout(() => {
        // Read URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        fromPage = urlParams.get('from') || 'management';

        // Update the Back and Cancel buttons dynamically
        const backBtn = document.getElementById('dynamic-back-btn');
        const cancelBtn = document.getElementById('dynamic-cancel-btn');
        
        if (backBtn) backBtn.href = `${fromPage}.html`;
        if (cancelBtn) cancelBtn.href = `${fromPage}.html`;

        // Highlight the correct sidebar item based on where we came from
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeSidebarLink = document.querySelector(`.sidebar-item[href="${fromPage}.html"]`);
        if (activeSidebarLink) {
            activeSidebarLink.classList.add('active');
        }
    }, 100);

    // --- Form Submission Logic ---
    const form = document.getElementById('add-employee-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const firstName = document.getElementById('first-name').value;
            const lastName = document.getElementById('last-name').value;
            const employeeId = document.getElementById('employee-id').value;
            const systemRole = document.querySelector('input[name="system-role"]:checked').value;
            
            // Create and show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl shadow-lg z-[80] flex items-center gap-3 transition-all duration-300 transform translate-y-[-20px] opacity-0';
            
            successMsg.innerHTML = `
                <svg class="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div>
                    <strong class="block text-gray-800">Success!</strong> 
                    <span class="text-sm">${firstName} ${lastName} (${employeeId}) has been added.</span>
                </div>
            `;
            
            document.body.appendChild(successMsg);
            
            // Animate toast in
            requestAnimationFrame(() => {
                successMsg.style.transform = "translateY(0)";
                successMsg.style.opacity = "1";
            });
            
            // Wait, fade out, and dynamically route back to the parent page
            setTimeout(() => {
                successMsg.style.transform = "translateY(-20px)";
                successMsg.style.opacity = "0";
                
                setTimeout(() => {
                    window.location.href = `${fromPage}.html`;
                }, 300);
                
            }, 2000);
        });
    }
});