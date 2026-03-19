document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. DYNAMIC ROUTING & SIDEBAR HIGHLIGHTING
    // ==========================================
    let fromPage = 'attendance';
    let returnUrl = 'attendance.html';

    setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        fromPage = urlParams.get('from') || 'attendance';

        // Construct return path based on origin
        returnUrl = `${fromPage}.html`;

        const backBtn = document.getElementById('dynamic-back-btn');
        if (backBtn) backBtn.href = returnUrl;

        // Keep the correct Sidebar link highlighted
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
            
            const targetHref = fromPage === 'dashboard' ? 'dashboard.html' : 'attendance.html';
            
            if (item.getAttribute('href').startsWith(targetHref)) {
                item.classList.add('active');
            }
        });
    }, 100);

    // ==========================================
    // 2. EXPORT BUTTON LOGIC
    // ==========================================
    const exportBtn = document.getElementById('export-log-btn');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const originalContent = exportBtn.innerHTML;
            
            // Set to loading state
            exportBtn.innerHTML = `
                <i data-lucide="loader" class="w-5 h-5 text-brand-accent animate-spin"></i>
                <span class="text-sm font-bold text-gray-300">Exporting...</span>
            `;
            exportBtn.disabled = true;
            exportBtn.classList.add('opacity-75', 'cursor-not-allowed');
            
            if (window.lucide) lucide.createIcons();

            // Simulate network request delay
            setTimeout(() => {
                // Restore button
                exportBtn.innerHTML = originalContent;
                exportBtn.disabled = false;
                exportBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                if (window.lucide) lucide.createIcons();
                
                // Show Success Toast
                showExportToast("Sarah_Johnson_March_2026.csv has been downloaded.");
            }, 1500);
        });
    }

    // ==========================================
    // 3. TOAST NOTIFICATION UTILITY
    // ==========================================
    function showExportToast(message) {
        const toast = document.createElement('div');
        
        toast.className = `fixed bottom-6 right-6 bg-white border border-gray-100 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 300px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="check" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold text-gray-800">Export Complete</p>
                <p class="text-xs text-gray-500">${message}</p>
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

    // ==========================================
    // 4. INITIALIZE ICONS
    // ==========================================
    if(window.lucide) {
        lucide.createIcons();
    }

    console.log("Employee Logs Detail initialized.");
});