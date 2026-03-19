document.addEventListener('DOMContentLoaded', () => {
    // 1. Re-initialize Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // 2. Growth Animation for Progress Bars
    // Selects elements using the new semantic class and data attribute
    const animatedBars = document.querySelectorAll('.animate-width');
    setTimeout(() => {
        animatedBars.forEach(bar => {
            const targetWidth = bar.getAttribute('data-width');
            if (targetWidth) {
                bar.style.width = targetWidth;
            }
        });
    }, 150); // Slight delay for visual pop

    // 3. Date Range Filter Toggle
    const rangeBtns = document.querySelectorAll('.range-btn');
    rangeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            rangeBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');
            
            console.log(`Fetching data for range: ${btn.getAttribute('data-range')}`);
            // Here you would typically trigger an API call to update the charts
        });
    });

    // 4. Export Button Functionality with Brand-Themed Toast
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const originalIcon = exportBtn.innerHTML;
            
            // Set to loading state
            exportBtn.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin text-brand-primary"></i>`;
            if (window.lucide) lucide.createIcons();
            exportBtn.disabled = true;

            setTimeout(() => {
                // Restore button
                exportBtn.innerHTML = originalIcon;
                exportBtn.disabled = false;
                
                // Show Custom Toast
                showAnalyticsToast("Report exported as CSV successfully!");
            }, 1500);
        });
    }

    // --- Helper Function: Brand-Themed Toast Notification ---
    function showAnalyticsToast(message) {
        const toast = document.createElement('div');
        
        // Styled with the brand-darkest palette to match the other pages
        toast.className = `fixed bottom-6 right-6 bg-[#000523] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 300px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(0,209,255,0.1)] text-[#00d1ff] rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="check" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold text-white">Export Complete</p>
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

    console.log("Analytics view initialized.");
});