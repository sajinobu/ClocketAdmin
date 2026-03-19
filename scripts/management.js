document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Tab Logic ---
    const tabs = document.querySelectorAll('.management-tab');
    const contents = document.querySelectorAll('.management-tab-content');
    
    function switchTab(tabName) {
        tabs.forEach(t => {
            if (t.getAttribute('data-tab') === tabName) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });
        contents.forEach(content => {
            content.classList.toggle('hidden', content.id !== `${tabName}-tab`);
        });
    }
    
    tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.getAttribute('data-tab'))));

    // --- 2. Advanced Filtering Logic (Employees) ---
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
        const statusValue = filterStatus.value.toLowerCase(); // Ensure lowercase matching
        
        // Grab only the data rows, excluding the "no results" row
        const rows = document.querySelectorAll('#employee-table-body .data-row:not(#no-results-row)');
        let visibleCount = 0;

        rows.forEach(row => {
            // Extraction based on the semantic table-td layout
            const name = row.querySelector('.font-bold')?.textContent.toLowerCase() || '';
            const email = row.querySelectorAll('.table-td')[2]?.textContent.toLowerCase() || '';
            const rowDept = row.querySelectorAll('.table-td')[1]?.textContent.trim();
            const rowStatus = row.querySelector('.status-badge')?.textContent.toLowerCase().trim();

            // Comparison
            const matchesSearch = name.includes(searchText) || email.includes(searchText);
            const matchesDept = deptValue === "" || rowDept === deptValue;
            const matchesStatus = statusValue === "" || (rowStatus && rowStatus.includes(statusValue));

            // Fix: Override CSS display property directly
            if (matchesSearch && matchesDept && matchesStatus) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // Toggle UI states
        filterBadge.classList.toggle('hidden', deptValue === "" && statusValue === "");
        if (noResults) {
            noResults.style.display = visibleCount > 0 ? 'none' : '';
            noResults.classList.remove('hidden'); // Ensure CSS doesn't fight the style prop
        }
        
        if (window.lucide) lucide.createIcons();
    }

    // Event Listeners for Filters
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

    empSearch.addEventListener('input', applyFinalFilters);

    filterModal.addEventListener('click', (e) => {
        if (e.target === filterModal) filterModal.classList.add('hidden');
    });

    // --- 3. Action Menu Logic (Dropdowns) ---
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

    // --- 4. Teams Filtering Logic ---
    const teamsSearchInput = document.getElementById('teams-search-input');
    const teamDeptFilter = document.getElementById('team-dept-filter');
    const noTeamsRow = document.getElementById('no-teams-row');
    const clearTeamFiltersBtn = document.getElementById('clear-team-filters');

    function applyTeamFilters() {
        if (!teamsSearchInput || !teamDeptFilter) return;

        const searchText = teamsSearchInput.value.toLowerCase().trim();
        const deptValue = teamDeptFilter.value;
        
        const rows = document.querySelectorAll('#teams-table-body .data-row:not(#no-teams-row)');
        let visibleCount = 0;

        rows.forEach(row => {
            const teamName = row.querySelector('.font-bold')?.textContent.toLowerCase() || '';
            const rowDept = row.querySelectorAll('.table-td')[1]?.textContent.trim();
            const teamLead = row.querySelectorAll('.table-td')[2]?.textContent.toLowerCase() || '';

            const matchesSearch = teamName.includes(searchText) || teamLead.includes(searchText);
            const matchesDept = deptValue === "" || rowDept === deptValue;

            if (matchesSearch && matchesDept) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        if (noTeamsRow) {
            noTeamsRow.style.display = visibleCount > 0 ? 'none' : '';
            noTeamsRow.classList.remove('hidden');
        }
        
        if (window.lucide) lucide.createIcons();
    }

    if (teamsSearchInput && teamDeptFilter) {
        teamsSearchInput.addEventListener('input', applyTeamFilters);
        teamDeptFilter.addEventListener('change', applyTeamFilters);
    }

    if (clearTeamFiltersBtn) {
        clearTeamFiltersBtn.addEventListener('click', () => {
            teamsSearchInput.value = "";
            teamDeptFilter.value = "";
            applyTeamFilters();
        });
    }

    // --- 5. Disband Team / Delete Employee Logic ---
    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    const cancelDeleteBtn = document.getElementById('cancel-delete');
    
    let itemToDelete = null; 
    let deleteName = "";     

    document.addEventListener('click', (e) => {
        const disbandBtn = e.target.closest('.disband-btn');
        const deleteEmpBtn = e.target.closest('.delete-employee-btn');
        
        if (disbandBtn || deleteEmpBtn) {
            const activeBtn = disbandBtn || deleteEmpBtn;
            itemToDelete = activeBtn.closest('tr');
            deleteName = activeBtn.getAttribute('data-name');
            
            document.getElementById('delete-type').textContent = disbandBtn ? "team" : "employee";
            deleteModal.classList.remove('hidden');
        }
    });

    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        itemToDelete = null;
    });

    confirmDeleteBtn.addEventListener('click', () => {
        if (!itemToDelete) return;

        const row = itemToDelete;
        const name = deleteName;

        // Animations for visual feedback
        row.style.transition = 'all 0.4s ease';
        row.style.transform = 'translateX(30px)';
        row.style.opacity = '0';

        setTimeout(() => {
            row.style.height = row.offsetHeight + 'px';
            row.offsetHeight; 
            row.style.height = '0px';
            row.querySelectorAll('td').forEach(td => {
                td.style.paddingTop = '0px';
                td.style.paddingBottom = '0px';
                td.style.border = 'none';
            });

            setTimeout(() => {
                row.remove();
                
                // Re-run filters to show "Empty State" message if it was the last row
                applyFinalFilters(); 
                applyTeamFilters();
                
                showManagementToast(`Successfully removed "${name}"`);
            }, 300);
        }, 300);

        deleteModal.classList.add('hidden');
    });

    // --- Toast Utility ---
    function showManagementToast(message) {
        const toast = document.createElement('div');
        // Styled using standard Tailwind classes mapped to your palette
        toast.className = `fixed bottom-6 right-6 bg-[#000523] text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[9999]`;
        toast.style.cssText = "transform: translateY(20px); opacity: 0; transition: all 0.3s ease;";
        toast.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5 text-[#57e8ff]"></i> <span class="text-sm font-medium">${message}</span>`;
        
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