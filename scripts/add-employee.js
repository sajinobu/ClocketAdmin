document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Dynamic Routing Logic ---
    let fromPage = 'management'; // Defaults to management
    
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

    // --- 2. Form Submission Logic ---
    const form = document.getElementById('add-employee-form');
    
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const firstName = document.getElementById('first-name').value;
            const lastName = document.getElementById('last-name').value;
            const employeeId = document.getElementById('employee-id').value;
            
            // Replaced the default alert with our custom dark brand toast
            showSuccessToast(`${firstName} ${lastName} (${employeeId}) has been successfully added to the system.`);
            
            // Wait, fade out, and dynamically route back to the parent page
            setTimeout(() => {
                window.location.href = `${fromPage}.html`;
            }, 2500); // Gives the user time to read the toast before redirecting
        });
    }

    // --- 3. Custom Brand Toast Utility ---
    function showSuccessToast(message) {
        const toast = document.createElement('div');
        
        // Styled with the brand-darkest palette
        toast.className = `fixed bottom-6 right-6 bg-[#000523] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 320px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(87,232,255,0.1)] text-[#57e8ff] rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="user-plus" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold text-white">Employee Added</p>
                <p class="text-xs text-gray-300 mt-0.5">${message}</p>
            </div>
        `;

        document.body.appendChild(toast);
        
        if (window.lucide) lucide.createIcons();

        // Animate In
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-20', 'opacity-0');
        });

        // No animate out needed, because the page will redirect!
    }
});