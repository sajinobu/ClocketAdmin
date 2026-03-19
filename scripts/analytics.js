document.addEventListener('DOMContentLoaded', () => {
    // 1. Re-initialize Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // 2. Simple Growth Animation for Progress Bars
    const bars = document.querySelectorAll('.management-tab-content div[style*="width: 0"]');
    setTimeout(() => {
        bars.forEach(bar => {
            bar.style.transition = "width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
        });
    }, 100);

    // 3. Date Range Filter Functionality
    const rangeBtns = document.querySelectorAll('.range-btn');
    rangeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            rangeBtns.forEach(b => {
                b.classList.remove('bg-brand-primary', 'text-white');
                b.classList.add('text-gray-500');
            });
            btn.classList.add('bg-brand-primary', 'text-white');
            btn.classList.remove('text-gray-500');
            console.log(`Fetching data for range: ${btn.getAttribute('data-range')}`);
        });
    });

    // 4. Export Button Functionality with Toast
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const originalIcon = exportBtn.innerHTML;
            // Set to loading state
            exportBtn.innerHTML = `<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>`;
            exportBtn.disabled = true;

            setTimeout(() => {
                exportBtn.innerHTML = originalIcon;
                exportBtn.disabled = false;
                
                // --- NEW: Trigger Toast instead of Alert ---
                showAnalyticsToast("Report exported as CSV successfully!");
            }, 1500);
        });
    }

    // --- Helper Function: Professional Toast Notification ---
    function showAnalyticsToast(message) {
        const toast = document.createElement('div');
        
        // Tailwind classes for styling
        toast.className = `fixed bottom-6 right-6 bg-white border border-gray-100 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] transition-all duration-500 transform translate-y-20 opacity-0`;
        
        // Inline styles to handle animation and z-index safely
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 300px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold text-gray-800">Export Complete</p>
                <p class="text-xs text-gray-500">${message}</p>
            </div>
        `;

        document.body.appendChild(toast);

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

    console.log("Analytics view initialized.");
});