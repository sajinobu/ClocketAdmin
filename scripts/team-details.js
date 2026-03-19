document.addEventListener('DOMContentLoaded', () => {
    
    let fromPage = 'management';
    let returnUrl = 'management.html?tab=teams';

    setTimeout(() => {
        // 1. Determine origin
        const urlParams = new URLSearchParams(window.location.search);
        fromPage = urlParams.get('from') || 'management';

        // 2. Configure return paths
        // If we came from management, we want to go back specifically to the TEAMS tab
        returnUrl = fromPage === 'management' ? 'management.html?tab=teams' : `${fromPage}.html`;

        const backBtn = document.getElementById('dynamic-back-btn');
        if (backBtn) backBtn.href = returnUrl;

        // 3. Sidebar Persistence
        // Since Team Details is a sub-page of "Management", 
        // we keep the Management sidebar item active.
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
            
            // Check if the link href starts with the fromPage name
            if (item.getAttribute('href').startsWith(fromPage)) {
                item.classList.add('active');
            }
        });
    }, 100);

    console.log("Team Details view initialized.");

    // --- NEW: Member Search Logic ---
    const memberSearch = document.getElementById('member-search');
    const memberRows = document.querySelectorAll('.member-row');
    const noMembersRow = document.getElementById('no-members-row');

    if (memberSearch) {
        memberSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            let visibleCount = 0;

            memberRows.forEach(row => {
                const name = row.querySelector('p.font-medium')?.textContent.toLowerCase() || '';
                const role = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';

                if (name.includes(searchTerm) || role.includes(searchTerm)) {
                    row.classList.remove('hidden');
                    visibleCount++;
                } else {
                    row.classList.add('hidden');
                }
            });

            // Toggle "No Results" message
            if (noMembersRow) {
                noMembersRow.classList.toggle('hidden', visibleCount > 0);
            }
        });
    }
});