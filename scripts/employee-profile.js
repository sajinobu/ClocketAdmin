(() => {
    // 1. RUN EVERY TIME
    if (window.lucide) lucide.createIcons();

    // FIXED: Wrap in setTimeout so it waits for layout.js to inject the sidebar on hard refresh!
    setTimeout(() => {
        let fromPage = 'management'; 
        const urlParams = new URLSearchParams(window.location.search);
        if(urlParams.get('from')) {
            fromPage = urlParams.get('from');
        }

        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') && item.getAttribute('href').startsWith(fromPage)) {
                item.classList.add('active');
            }
        });
    }, 100);

    // 2. SPA EVENT GUARD (Run Only Once)
    if (window.employeeProfileSPAInitialized) return;
    window.employeeProfileSPAInitialized = true;

    // 3. EVENT DELEGATION LISTENERS
    document.body.addEventListener('click', (e) => {
        // NEW PAGE GUARD: Only run if the edit button is on the screen!
        if (!document.querySelector('a[href^="employee-edit-profile.html"]')) return;
        
        // --- Dynamic Back Button Routing ---
        const backBtn = e.target.closest('#dynamic-back-btn');
        if (backBtn) {
            e.preventDefault();
            
            let currentFrom = 'management'; 
            const currentParams = new URLSearchParams(window.location.search);
            if(currentParams.get('from')) {
                currentFrom = currentParams.get('from');
            }
            const returnUrl = `${currentFrom}.html`;

            if (typeof navigateTo === 'function') {
                navigateTo(returnUrl);
            } else {
                window.location.href = returnUrl;
            }
        }

        // --- Edit Details Button Intercept ---
        const editBtn = e.target.closest('a[href^="employee-edit-profile.html"]');
        if (editBtn) {
            e.preventDefault();
            const targetUrl = editBtn.getAttribute('href');
            if (typeof navigateTo === 'function') {
                navigateTo(targetUrl);
            } else {
                window.location.href = targetUrl;
            }
        }
        
        // --- View Full Log Button Intercept ---
        const logBtn = e.target.closest('a[href^="employee-logs.html"]');
        if (logBtn) {
            e.preventDefault();
            const targetUrl = logBtn.getAttribute('href');
            if (typeof navigateTo === 'function') {
                navigateTo(targetUrl);
            } else {
                window.location.href = targetUrl;
            }
        }
    });

    console.log("Employee Profile SPA module loaded successfully.");
})();