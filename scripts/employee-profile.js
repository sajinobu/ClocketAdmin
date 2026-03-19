document.addEventListener('DOMContentLoaded', () => {
    
    // We use a slight delay (100ms) to ensure layout.js has finished injecting the sidebar HTML first
    setTimeout(() => {
        // 1. Read the URL to see where the user came from
        const urlParams = new URLSearchParams(window.location.search);
        const fromPage = urlParams.get('from') || 'management'; // Defaults to management if no parameter exists

        // 2. Dynamically update the Back Button
        const backBtn = document.getElementById('dynamic-back-btn');
        if (backBtn) {
            // e.g., changes href to "attendance.html"
            backBtn.href = `${fromPage}.html`; 
        }

        // 3. Keep the correct Sidebar Item highlighted
        // First, remove the 'active' class from all sidebar items just in case
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });

        // Find the sidebar link that matches our 'fromPage' and make it active
        const activeSidebarLink = document.querySelector(`.sidebar-item[href="${fromPage}.html"]`);
        if (activeSidebarLink) {
            activeSidebarLink.classList.add('active');
        }

    }, 100);

    console.log("Employee Profile view initialized.");
});