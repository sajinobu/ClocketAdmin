(() => {
    // ==========================================
    // 1. RUN EVERY TIME (UI & State Initialization)
    // ==========================================
    if (window.lucide) lucide.createIcons();
    window.activeTeamDept = ""; 

    function switchTab(tabName, updateUrl = true) {
        if (updateUrl) {
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('tab', tabName);
            window.history.replaceState({}, '', newUrl);
        }

        document.querySelectorAll('.management-tab').forEach(t => {
            if (t.getAttribute('data-tab') === tabName) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });
        
        document.querySelectorAll('.management-tab-content').forEach(c => {
            c.classList.add('hidden');
        });
        
        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) activeContent.classList.remove('hidden');
        
        document.querySelectorAll('.action-menu').forEach(m => {
            m.classList.add('hidden');
            m.style.position = '';
        });
    }

    function initializeTabsFromURL() {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam === 'teams' || tabParam === 'employees') {
            switchTab(tabParam, false); 
        } else {
            switchTab('employees', false);
        }
    }

    initializeTabsFromURL();
    applyEmployeeFilters();
    applyTeamFilters();

    window.addEventListener('popstate', () => {
        initializeTabsFromURL();
    });

    // ==========================================
    // 2. SPA EVENT GUARD
    // ==========================================
    if (window._mgmtEventsBound) return;
    window._mgmtEventsBound = true;

    // Close floating menus aggressively on any scroll to prevent them flying away
    window.addEventListener('scroll', (e) => {
        // Ignore scrolling if the user is scrolling inside a dropdown menu
        if (e.target.closest && e.target.closest('.dropdown-menu')) return;
        
        document.querySelectorAll('.action-menu:not(.hidden)').forEach(m => {
            m.classList.add('hidden');
            m.style.position = '';
        });
    }, { capture: true, passive: true });

    // ==========================================
    // 3. EVENT LISTENERS
    // ==========================================
    document.body.addEventListener('click', (e) => {
        // NEW PAGE GUARD: Only run if the Management tabs are on the screen!
        if (!document.querySelector('.management-tab')) return;

        // Tab Clicks...
        // Tab Clicks
        const tabBtn = e.target.closest('.management-tab');
        if (tabBtn) switchTab(tabBtn.getAttribute('data-tab'));

        // --- UPGRADED: Viewport Clamped Floating Action Menu ---
        const actionBtn = e.target.closest('.action-btn');
        const allMenus = document.querySelectorAll('.action-menu');
        
        if (actionBtn) {
            e.stopPropagation();
            const menu = actionBtn.nextElementSibling;
            
            // Close all others
            allMenus.forEach(m => { 
                if (m !== menu) {
                    m.classList.add('hidden'); 
                    m.style.position = '';
                } 
            });
            
            if (menu) {
                if (menu.classList.contains('hidden')) {
                    // Temporarily display block to measure width accurately
                    menu.style.display = 'block';
                    menu.style.visibility = 'hidden';
                    menu.classList.remove('hidden');
                    
                    const rect = actionBtn.getBoundingClientRect();
                    const menuWidth = menu.offsetWidth || 160; 
                    
                    menu.style.position = 'fixed';
                    menu.style.top = `${rect.bottom + 4}px`;
                    
                    // Math Clamp: Calculate optimal left position
                    // Default: Align right edges
                    let idealLeft = rect.right - menuWidth; 
                    
                    // Clamp to Right Edge of Screen (16px padding)
                    if (idealLeft + menuWidth > window.innerWidth - 16) {
                        idealLeft = window.innerWidth - menuWidth - 16;
                    }
                    // Clamp to Left Edge of Screen (16px padding)
                    if (idealLeft < 16) {
                        idealLeft = 16;
                    }
                    
                    menu.style.left = `${idealLeft}px`;
                    menu.style.right = 'auto';
                    menu.style.zIndex = '9999';
                    
                    // Restore visibility
                    menu.style.visibility = 'visible';
                    menu.style.display = '';
                    
                } else {
                    menu.classList.add('hidden');
                    menu.style.position = '';
                }
            }
        } else {
            // Clicked outside - close menus
            if (!e.target.closest('.action-menu')) {
                allMenus.forEach(m => { 
                    m.classList.add('hidden'); 
                    m.style.position = ''; 
                });
            }
        }
        
        // --- Custom Dropdown Handling ---
        const isDropdownClick = e.target.closest('.custom-dropdown');
        if (!isDropdownClick) {
            document.querySelectorAll('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
        }

        const trigger = e.target.closest('.dropdown-trigger');
        if (trigger) {
            const dropdown = trigger.closest('.custom-dropdown');
            document.querySelectorAll('.custom-dropdown.open').forEach(d => {
                if(d !== dropdown) d.classList.remove('open');
            });
            dropdown.classList.toggle('open');
        }

        const dropdownItem = e.target.closest('.dropdown-item');
        if (dropdownItem) {
            e.stopPropagation();
            const dropdown = dropdownItem.closest('.custom-dropdown');
            const value = dropdownItem.getAttribute('data-value');
            const textElement = dropdown.querySelector('span[id$="-text"]');
            const hiddenInput = dropdown.nextElementSibling;

            dropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            dropdownItem.classList.add('active');
            if (textElement) textElement.textContent = dropdownItem.textContent;
            
            if (hiddenInput && hiddenInput.tagName === 'INPUT') {
                hiddenInput.value = value;
            } else if (dropdown.id === 'team-dept-dropdown') {
                window.activeTeamDept = value;
                applyTeamFilters();
            }
            
            dropdown.classList.remove('open');
        }

        // Modals & Filters
        if (e.target.closest('#open-filter-modal')) {
            const fm = document.getElementById('filter-modal');
            if (fm) fm.classList.remove('hidden');
        }
        if (e.target.closest('#close-filter-modal') || e.target.id === 'filter-modal') {
            const fm = document.getElementById('filter-modal');
            if (fm) fm.classList.add('hidden');
        }
        if (e.target.closest('#apply-filters')) {
            applyEmployeeFilters();
            const fm = document.getElementById('filter-modal');
            if (fm) fm.classList.add('hidden');
        }
        
        if (e.target.closest('#reset-filters')) {
            const deptDropdown = document.querySelector('#filter-dept').previousElementSibling;
            const statusDropdown = document.querySelector('#filter-status').previousElementSibling;
            
            document.getElementById('filter-dept').value = '';
            deptDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            deptDropdown.querySelector('.dropdown-item[data-value=""]').classList.add('active');
            document.getElementById('filter-dept-text').textContent = 'All Departments';
            
            document.getElementById('filter-status').value = '';
            statusDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            statusDropdown.querySelector('.dropdown-item[data-value=""]').classList.add('active');
            document.getElementById('filter-status-text').textContent = 'All Statuses';
        }
        
        if (e.target.closest('#clear-all-filters')) {
            const search = document.getElementById('emp-search-input');
            if(search) search.value = "";
            document.getElementById('reset-filters').click(); 
            applyEmployeeFilters();
        }

        if(e.target.closest('#clear-team-filters')) {
            const search = document.getElementById('teams-search-input');
            if (search) search.value = "";
            window.activeTeamDept = "";
            
            const deptText = document.getElementById('team-dept-text');
            if (deptText) deptText.textContent = "All Departments";
            
            const deptDrop = document.getElementById('team-dept-dropdown');
            if (deptDrop) {
                deptDrop.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                const first = deptDrop.querySelector('.dropdown-item[data-value=""]');
                if (first) first.classList.add('active');
            }
            applyTeamFilters();
        }

        // Deletion Flow
        const deleteBtn = e.target.closest('.delete-employee-btn, .disband-btn');
        if (deleteBtn) {
            const dm = document.getElementById('delete-modal');
            if (dm) {
                const type = deleteBtn.classList.contains('disband-btn') ? 'team' : 'employee';
                document.getElementById('delete-type').textContent = type;
                window.itemToDelete = deleteBtn.closest('tr');
                window.deleteItemName = deleteBtn.getAttribute('data-name');
                dm.classList.remove('hidden');
            }
        }
        if (e.target.closest('#cancel-delete') || e.target.id === 'delete-modal') {
            const dm = document.getElementById('delete-modal');
            if (dm) dm.classList.add('hidden');
            window.itemToDelete = null;
        }
        if (e.target.closest('#confirm-delete')) {
            const dm = document.getElementById('delete-modal');
            if (dm && window.itemToDelete) {
                const row = window.itemToDelete;
                const itemName = window.deleteItemName;
                
                row.style.transition = 'all 0.3s ease';
                row.style.opacity = '0';
                row.style.transform = 'translateX(20px)';
                
                setTimeout(() => {
                    row.remove();
                    applyEmployeeFilters();
                    applyTeamFilters();
                    showManagementToast(`Successfully removed "${itemName}"`);
                }, 300);
                
                dm.classList.add('hidden');
                window.itemToDelete = null;
            }
        }
    });

    document.body.addEventListener('input', (e) => {
        if (e.target.id === 'emp-search-input') applyEmployeeFilters();
        if (e.target.id === 'teams-search-input') applyTeamFilters();
    });

    // ==========================================
    // 4. CORE FILTER FUNCTIONS
    // ==========================================
    function applyEmployeeFilters() {
        const empSearch = document.getElementById('emp-search-input');
        const filterDeptInput = document.getElementById('filter-dept');
        const filterStatusInput = document.getElementById('filter-status');
        const noResults = document.getElementById('no-results-row');
        const clearBtn = document.getElementById('clear-all-filters');

        if(!empSearch) return;

        const searchText = empSearch.value.toLowerCase().trim();
        const deptValue = filterDeptInput ? filterDeptInput.value : "";
        const statusValue = filterStatusInput ? filterStatusInput.value.toLowerCase() : "";
        
        const isFiltered = searchText !== "" || deptValue !== "" || statusValue !== "";

        const rows = document.querySelectorAll('#employee-table-body .data-row:not(#no-results-row)');
        let visibleCount = 0;

        rows.forEach(row => {
            const name = row.querySelector('.font-bold')?.textContent.toLowerCase() || '';
            const email = row.querySelectorAll('.table-td')[2]?.textContent.toLowerCase() || '';
            const rowDept = row.querySelectorAll('.table-td')[1]?.textContent.trim();
            const rowStatus = row.querySelector('.status-badge')?.textContent.toLowerCase().trim();

            const matchesSearch = name.includes(searchText) || email.includes(searchText);
            const matchesDept = deptValue === "" || rowDept === deptValue;
            const matchesStatus = statusValue === "" || (rowStatus && rowStatus.includes(statusValue));

            if (matchesSearch && matchesDept && matchesStatus) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        const filterBadge = document.getElementById('filter-badge');
        if(filterBadge) filterBadge.classList.toggle('hidden', deptValue === "" && statusValue === "");
        
        if (noResults) {
            noResults.style.display = visibleCount > 0 ? 'none' : '';
            noResults.classList.remove('hidden');
            
            const titleNode = noResults.querySelector('.empty-state-title');
            const subtextNode = noResults.querySelector('.empty-state-subtext');
            
            if (titleNode) titleNode.textContent = isFiltered ? "No employees found" : "No employees in system";
            if (subtextNode) subtextNode.textContent = isFiltered ? "Try adjusting your filters or search terms." : "Click 'Add Employee' to get started.";
            if (clearBtn) clearBtn.style.display = isFiltered ? 'inline-block' : 'none';
        }
    }

    function applyTeamFilters() {
        const teamsSearchInput = document.getElementById('teams-search-input');
        const noTeamsRow = document.getElementById('no-teams-row');
        const clearBtn = document.getElementById('clear-team-filters');

        if (!teamsSearchInput) return;

        const searchText = teamsSearchInput.value.toLowerCase().trim();
        const deptValue = window.activeTeamDept; 
        
        const isFiltered = searchText !== "" || deptValue !== "";

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
            
            const titleNode = noTeamsRow.querySelector('.empty-state-title');
            const subtextNode = noTeamsRow.querySelector('.empty-state-subtext');
            
            if (titleNode) titleNode.textContent = isFiltered ? "No teams found" : "No teams in system";
            if (subtextNode) subtextNode.textContent = isFiltered ? "Try adjusting your filters or search terms." : "Click 'Create Team' to get started.";
            if (clearBtn) clearBtn.style.display = isFiltered ? 'inline-block' : 'none';
        }
    }

    function showManagementToast(message) {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[9999] transition-all duration-300`;
        toast.style.cssText = "transform: translateY(20px); opacity: 0;";
        toast.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5 text-brand-primary"></i> <span class="text-sm font-medium">${message}</span>`;
        
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
})();