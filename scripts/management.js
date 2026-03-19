document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Tab Logic ---
    const tabs = document.querySelectorAll('.management-tab');
    const contents = document.querySelectorAll('.management-tab-content');
    function switchTab(tabName) {
        tabs.forEach(t => {
            t.classList.toggle('border-teal-600', t.getAttribute('data-tab') === tabName);
            t.classList.toggle('text-teal-600', t.getAttribute('data-tab') === tabName);
            t.classList.toggle('border-transparent', t.getAttribute('data-tab') !== tabName);
            t.classList.toggle('text-gray-600', t.getAttribute('data-tab') !== tabName);
        });
        contents.forEach(content => content.classList.toggle('hidden', content.id !== `${tabName}-tab`));
    }
    tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.getAttribute('data-tab'))));

    // --- 2. Advanced Filtering Logic ---
    const empSearch = document.querySelector('.employees-search');
    const filterModal = document.getElementById('filter-modal');
    const filterBadge = document.getElementById('filter-badge');
    const noResults = document.getElementById('no-results-row');
    
    const filterDept = document.getElementById('filter-dept');
    const filterStatus = document.getElementById('filter-status');
    
    const btnOpenModal = document.getElementById('open-filter-modal');
    const btnCloseModal = document.getElementById('close-filter-modal');
    const btnApply = document.getElementById('apply-filters');
    const btnReset = document.getElementById('reset-filters');
    const btnClearAll = document.getElementById('clear-all-filters');

    function applyFinalFilters() {
        const searchText = empSearch.value.toLowerCase().trim();
        const deptValue = filterDept.value;
        const statusValue = filterStatus.value;
        
        // Grab rows from the specific employee table
        const rows = document.querySelectorAll('#employee-table-body .table-row');
        let visibleCount = 0;

        rows.forEach(row => {
            // Extraction
            const name = row.querySelector('p.font-medium')?.textContent.toLowerCase() || '';
            const email = row.querySelectorAll('td')[2]?.textContent.toLowerCase() || '';
            const rowDept = row.querySelectorAll('td')[1]?.textContent.trim();
            const rowStatus = row.querySelector('td:nth-child(4) span')?.textContent.trim();

            // Comparison
            const matchesSearch = name.includes(searchText) || email.includes(searchText);
            const matchesDept = deptValue === "" || rowDept === deptValue;
            const matchesStatus = statusValue === "" || (rowStatus && rowStatus.includes(statusValue));

            if (matchesSearch && matchesDept && matchesStatus) {
                row.classList.remove('hidden');
                visibleCount++;
            } else {
                row.classList.add('hidden');
            }
        });

        // Toggle UI states
        filterBadge.classList.toggle('hidden', deptValue === "" && statusValue === "");
        noResults.classList.toggle('hidden', visibleCount > 0);
        
        if (window.lucide) lucide.createIcons();
    }

    // Event Listeners
    btnOpenModal.addEventListener('click', () => filterModal.classList.remove('hidden'));
    btnCloseModal.addEventListener('click', () => filterModal.classList.add('hidden'));
    
    btnApply.addEventListener('click', () => {
        applyFinalFilters();
        filterModal.classList.add('hidden');
    });

    btnReset.addEventListener('click', () => {
        filterDept.value = "";
        filterStatus.value = "";
    });

    btnClearAll.addEventListener('click', () => {
        empSearch.value = "";
        filterDept.value = "";
        filterStatus.value = "";
        applyFinalFilters();
    });

    // Real-time search
    empSearch.addEventListener('input', applyFinalFilters);

    // Close modal on background click
    filterModal.addEventListener('click', (e) => {
        if (e.target === filterModal) filterModal.classList.add('hidden');
    });

    // --- 3. Action Menu Logic ---
    document.addEventListener('click', (e) => {
        const isActionBtn = e.target.closest('.action-btn');
        const allMenus = document.querySelectorAll('.action-menu');

        if (isActionBtn) {
            e.stopPropagation();
            const currentMenu = isActionBtn.nextElementSibling;
            allMenus.forEach(m => { if (m !== currentMenu) m.classList.add('hidden'); });
            currentMenu.classList.toggle('hidden');
        } else {
            allMenus.forEach(m => m.classList.add('hidden'));
        }
    });

    // --- 3. Teams Filtering Logic (Search + Dept Dropdown) ---
    const teamsSearchInput = document.getElementById('teams-search-input');
    const teamDeptFilter = document.getElementById('team-dept-filter');
    const noTeamsRow = document.getElementById('no-teams-row');
    const clearTeamFiltersBtn = document.getElementById('clear-team-filters');

    function applyTeamFilters() {
        const searchText = teamsSearchInput.value.toLowerCase().trim();
        const deptValue = teamDeptFilter.value;
        
        const rows = document.querySelectorAll('#teams-table-body .table-row');
        let visibleCount = 0;

        rows.forEach(row => {
            const teamName = row.querySelector('p.font-medium')?.textContent.toLowerCase() || '';
            const rowDept = row.querySelectorAll('td')[1]?.textContent.trim();
            const teamLead = row.querySelectorAll('td')[2]?.textContent.toLowerCase() || '';

            const matchesSearch = teamName.includes(searchText) || teamLead.includes(searchText);
            const matchesDept = deptValue === "" || rowDept === deptValue;

            if (matchesSearch && matchesDept) {
                row.classList.remove('hidden');
                visibleCount++;
            } else {
                row.classList.add('hidden');
            }
        });

        // Show/Hide the "No results" row
        noTeamsRow.classList.toggle('hidden', visibleCount > 0);
        
        if (window.lucide) lucide.createIcons();
    }

    // Listeners for Teams
    if (teamsSearchInput && teamDeptFilter) {
        teamsSearchInput.addEventListener('input', applyTeamFilters);
        teamDeptFilter.addEventListener('change', applyTeamFilters);
    }

    // Clear Button for Teams
    if (clearTeamFiltersBtn) {
        clearTeamFiltersBtn.addEventListener('click', () => {
            teamsSearchInput.value = "";
            teamDeptFilter.value = "";
            applyTeamFilters();
        });
    }

    // --- 4. Disband Team / Delete Employee Logic ---
    // --- 4. Disband Team / Delete Employee Logic ---
    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    const cancelDeleteBtn = document.getElementById('cancel-delete');
    
    let itemToDelete = null; 
    let deleteName = "";     

    // Open Modal for BOTH Teams and Employees
    document.addEventListener('click', (e) => {
        const disbandBtn = e.target.closest('.disband-btn');
        const deleteEmpBtn = e.target.closest('.delete-employee-btn'); // Targeted Employee Button
        
        if (disbandBtn || deleteEmpBtn) {
            const activeBtn = disbandBtn || deleteEmpBtn;
            itemToDelete = activeBtn.closest('tr');
            deleteName = activeBtn.getAttribute('data-name');
            
            // Update modal text dynamically
            document.getElementById('delete-type').textContent = disbandBtn ? "team" : "employee";
            
            deleteModal.classList.remove('hidden');
        }
    });

    // Close Modal
    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        itemToDelete = null;
    });

    // Confirm Delete Action (Handles the animation for both tabs)
    confirmDeleteBtn.addEventListener('click', () => {
        if (!itemToDelete) return;

        const row = itemToDelete;
        const name = deleteName;

        // 1. Fade and slide animation
        row.style.transition = 'all 0.4s ease';
        row.style.transform = 'translateX(30px)';
        row.style.opacity = '0';

        setTimeout(() => {
            // 2. Collapse height smoothly
            row.style.height = row.offsetHeight + 'px';
            row.offsetHeight; // Force reflow
            row.style.height = '0px';
            row.style.paddingTop = '0px';
            row.style.paddingBottom = '0px';
            row.style.border = 'none';

            setTimeout(() => {
                row.remove();
                
                // 3. Re-run filters to check if "No Results" message should appear
                applyFinalFilters(); 
                applyTeamFilters();
                
                // 4. Show the dark toast
                showManagementToast(`Successfully removed "${name}"`);
            }, 300);
        }, 300);

        deleteModal.classList.add('hidden');
    });

    // --- Toast Utility for Management ---
    function showManagementToast(message) {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-6 right-6 bg-brand-darkest text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3`;
        toast.style.cssText = "z-index: 9999; transform: translateY(20px); opacity: 0; transition: all 0.3s ease;";
        toast.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5 text-teal-400"></i> <span class="text-sm font-medium">${message}</span>`;
        
        document.body.appendChild(toast);
        if(window.lucide) lucide.createIcons();

        requestAnimationFrame(() => {
            toast.style.transform = "translateY(0)";
            toast.style.opacity = "1";
        });

        setTimeout(() => {
            toast.style.transform = "translateY(20px)";
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});