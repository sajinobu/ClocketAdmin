(() => {
    // 1. RUN EVERY TIME
    if (window.lucide) lucide.createIcons();

    // Force highlight "Management" in the sidebar (Wrap in setTimeout for hard refresh)
    setTimeout(() => {
        document.querySelectorAll('.sidebar-item, .nav-link').forEach(link => {
            link.classList.remove('active');
            
            // This page always belongs to the Management tab
            if (link.getAttribute('href') && link.getAttribute('href').startsWith('management')) {
                link.classList.add('active');
            }
        });
    }, 100);

    // 2. SPA EVENT GUARD (Run Only Once)
    if (window.teamDetailsSPAInitialized) return;
    window.teamDetailsSPAInitialized = true;

    // 3. EVENT LISTENERS
    document.body.addEventListener('click', (e) => {
        // --- Dynamic Back Button ---
        const backBtn = e.target.closest('#dynamic-back-btn');
        if (backBtn) {
            e.preventDefault();
            
            let fromPage = 'management';
            const urlParams = new URLSearchParams(window.location.search);
            if(urlParams.get('from')) {
                fromPage = urlParams.get('from');
            }
            const returnUrl = fromPage === 'management' ? 'management.html?tab=teams' : `${fromPage}.html`;

            if (typeof navigateTo === 'function') {
                navigateTo(returnUrl);
            } else {
                window.location.href = returnUrl;
            }
        }
        
        // --- Edit Team Button Intercept ---
        const editBtn = e.target.closest('a[href^="team-edit.html"]');
        if (editBtn) {
            e.preventDefault();
            const targetUrl = editBtn.getAttribute('href');
            if (typeof navigateTo === 'function') {
                navigateTo(targetUrl);
            } else {
                window.location.href = targetUrl;
            }
        }
        
        // --- View Employee Button Intercept ---
        const viewBtn = e.target.closest('a[href^="employee-profile.html"]');
        if (viewBtn) {
            e.preventDefault();
            const targetUrl = viewBtn.getAttribute('href');
            if (typeof navigateTo === 'function') {
                navigateTo(targetUrl);
            } else {
                window.location.href = targetUrl;
            }
        }
    });

    // --- Search Members Logic ---
    document.body.addEventListener('input', (e) => {
        if (e.target.id === 'member-search') {
            const searchTerm = e.target.value.toLowerCase().trim();
            const memberRows = document.querySelectorAll('.member-row');
            const noMembersRow = document.getElementById('no-members-row');
            let visibleCount = 0;

            memberRows.forEach(row => {
                const nameNode = row.querySelector('.member-name');
                const roleNode = row.querySelector('.table-td:nth-child(2)');
                
                if(!nameNode || !roleNode) return;

                const name = nameNode.textContent.toLowerCase();
                const role = roleNode.textContent.toLowerCase();

                if (name.includes(searchTerm) || role.includes(searchTerm)) {
                    row.style.display = ''; 
                    visibleCount++;
                } else {
                    row.style.display = 'none'; 
                }
            });

            if (noMembersRow) {
                noMembersRow.style.display = visibleCount > 0 ? 'none' : '';
            }
        }
    });
})();