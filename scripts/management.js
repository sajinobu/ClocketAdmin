(() => {
    // ==========================================
    // 1. RUN EVERY TIME (UI & Fetch Initialization)
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
    
    window.addEventListener('popstate', () => {
        initializeTabsFromURL();
    });

    const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

    // --- FIREBASE FETCH: EMPLOYEES ---
    async function loadEmployeesFromFirebase() {
        const tableBody = document.getElementById('employee-table-body');
        const noResultsRow = document.getElementById('no-results-row');
        
        if (!tableBody || !window.firebaseUtils) return;

        try {
            const loadingRow = document.createElement('tr');
            loadingRow.id = "emp-loading-row";
            loadingRow.innerHTML = `<td colspan="5" class="text-center py-12"><i data-lucide="loader" class="w-8 h-8 animate-spin mx-auto text-brand-primary"></i></td>`;
            tableBody.prepend(loadingRow);
            if (window.lucide) lucide.createIcons();

            const { collection, getDocs } = window.firebaseUtils;
            const querySnapshot = await getDocs(collection(window.db, "employees"));
            
            const loader = document.getElementById('emp-loading-row');
            if (loader) loader.remove();

            document.querySelectorAll('#employee-table-body .data-row').forEach(row => row.remove());

            if (querySnapshot.empty) {
                noResultsRow.style.display = '';
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const emp = docSnap.data();
                
                let avatarSrc = defaultAvatar;
                if (emp.profile_picture && emp.profile_picture !== "coming soon") {
                    avatarSrc = emp.profile_picture;
                }

                let statusClass = "status-active";
                let statusText = "Active";
                let isInactive = false;

                if (emp.account_status === "inactive" || emp.account_status === "disabled") {
                    statusClass = "bg-gray-100 text-gray-500 border-gray-200"; 
                    statusText = "Inactive";
                    isInactive = true;
                }

                // --- NEW: Only show the Delete button if the employee is NOT inactive ---
                // --- NEW: Toggle between Delete and Reactivate based on status ---
                let dynamicActionBtnHtml = "";
                if (isInactive) {
                    dynamicActionBtnHtml = `
                        <button class="menu-item text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 restore-employee-btn" data-name="${emp.full_name}" data-id="${docSnap.id}">
                          <i data-lucide="refresh-cw" class="w-4 h-4"></i> Reactivate
                        </button>
                    `;
                } else {
                    dynamicActionBtnHtml = `
                        <button class="menu-item menu-item-danger delete-employee-btn" data-name="${emp.full_name}" data-id="${docSnap.id}">
                          <i data-lucide="trash-2" class="w-4 h-4"></i> Delete
                        </button>
                    `;
                }

                const tr = document.createElement('tr');
                tr.className = 'data-row';
                tr.innerHTML = `
                    <td class="table-td">
                      <div class="flex items-center gap-3">
                        <img src="${avatarSrc}" class="w-10 h-10 rounded-full object-cover border border-brand-grayLight bg-white" alt="Avatar">
                        <p class="font-bold text-brand-darkest transition-colors">${emp.full_name}</p>
                      </div>
                    </td>
                    <td class="table-td text-sm text-brand-dark transition-colors">${emp.department || "Unassigned"}</td>
                    <td class="table-td text-sm text-brand-dark transition-colors">${emp.email}</td>
                    <td class="table-td">
                      <span class="status-badge ${statusClass}">${statusText}</span>
                    </td>
                    <td class="table-td text-right relative">
                      <button class="action-btn"><i data-lucide="more-vertical" class="w-5 h-5"></i></button>
                      <div class="action-menu hidden">
                        <a href="employee-profile.html?from=management&id=${docSnap.id}" class="menu-item">
                          <i data-lucide="user" class="w-4 h-4"></i> View Profile
                        </a>
                        <a href="employee-edit-profile.html?from=management&id=${docSnap.id}" class="menu-item">
                          <i data-lucide="pencil" class="w-4 h-4"></i> Modify
                        </a>
                        ${dynamicActionBtnHtml}
                      </div>
                    </td>
                `;
                
                tableBody.insertBefore(tr, noResultsRow);
            });

            if (window.lucide) lucide.createIcons();
            applyEmployeeFilters();

        } catch(error) {
            console.error("Error fetching employees: ", error);
        }
    }

    // --- FIREBASE FETCH: TEAMS ---
    async function loadTeamsFromFirebase() {
        const tableBody = document.getElementById('teams-table-body');
        const noResultsRow = document.getElementById('no-teams-row');
        
        if (!tableBody || !window.firebaseUtils) return;

        try {
            const loadingRow = document.createElement('tr');
            loadingRow.id = "teams-loading-row";
            loadingRow.innerHTML = `<td colspan="5" class="text-center py-12"><i data-lucide="loader" class="w-8 h-8 animate-spin mx-auto text-brand-primary"></i></td>`;
            tableBody.prepend(loadingRow);
            if (window.lucide) lucide.createIcons();

            const { collection, getDocs } = window.firebaseUtils;

            const empSnapshot = await getDocs(collection(window.db, "employees"));
            const employeeAvatarMap = {};
            
            empSnapshot.forEach(empDoc => {
                const data = empDoc.data();
                const fullName = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim();
                if (fullName) {
                    employeeAvatarMap[fullName] = (data.profile_picture && data.profile_picture !== "coming soon") ? data.profile_picture : defaultAvatar;
                }
            });

            const querySnapshot = await getDocs(collection(window.db, "teams"));
            
            const loader = document.getElementById('teams-loading-row');
            if (loader) loader.remove();

            document.querySelectorAll('#teams-table-body .data-row').forEach(row => row.remove());

            if (querySnapshot.empty) {
                noResultsRow.style.display = '';
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const team = docSnap.data();
                
                const leadName = team.team_lead && team.team_lead !== "Unassigned" ? team.team_lead : "Unassigned";
                const leadAvatar = employeeAvatarMap[leadName] || defaultAvatar;

                const memberCount = team.members ? team.members.length : 0;

                const tr = document.createElement('tr');
                tr.className = 'data-row';
                tr.innerHTML = `
                    <td class="table-td">
                        <p class="font-bold text-brand-darkest transition-colors">${team.team_name}</p>
                    </td>
                    <td class="table-td text-sm text-brand-dark transition-colors">${team.department || "Unassigned"}</td>
                    <td class="table-td">
                        <div class="flex items-center gap-2">
                            <img src="${leadAvatar}" class="w-8 h-8 rounded-full object-cover border border-brand-grayLight bg-white" alt="Avatar">
                            <p class="text-sm font-medium text-brand-darkest transition-colors">${leadName}</p>
                        </div>
                    </td>
                    <td class="table-td text-sm text-brand-dark transition-colors">${memberCount} members</td>
                    <td class="table-td text-right relative">
                        <button class="action-btn"><i data-lucide="more-vertical" class="w-5 h-5"></i></button>
                        <div class="action-menu hidden">
                            <a href="team-details.html?from=management&id=${docSnap.id}" class="menu-item">
                                <i data-lucide="users" class="w-4 h-4"></i> View Team
                            </a>
                            <a href="team-edit.html?from=management&id=${docSnap.id}" class="menu-item">
                                <i data-lucide="pencil" class="w-4 h-4"></i> Edit Team
                            </a>
                            <button class="menu-item menu-item-danger disband-btn" data-name="${team.team_name}" data-id="${docSnap.id}">
                                <i data-lucide="trash-2" class="w-4 h-4"></i> Disband
                            </button>
                        </div>
                    </td>
                `;
                
                tableBody.insertBefore(tr, noResultsRow);
            });

            if (window.lucide) lucide.createIcons();
            applyTeamFilters();

        } catch(error) {
            console.error("Error fetching teams: ", error);
        }
    }

    const waitForFirebase = setInterval(() => {
        if (window.firebaseUtils && window.db) {
            clearInterval(waitForFirebase);
            loadEmployeesFromFirebase();
            loadTeamsFromFirebase(); 
        }
    }, 50);
    
    // ==========================================
    // 2. SPA EVENT GUARD
    // ==========================================
    if (window._mgmtEventsBound) return;
    window._mgmtEventsBound = true;

    window.addEventListener('scroll', (e) => {
        if (e.target.closest && e.target.closest('.dropdown-menu')) return;
        
        document.querySelectorAll('.action-menu:not(.hidden)').forEach(m => {
            m.classList.add('hidden');
            m.style.position = '';
        });
    }, { capture: true, passive: true });

    // ==========================================
    // 3. EVENT LISTENERS
    // ==========================================
    document.body.addEventListener('click', async (e) => {
        if (!document.querySelector('.management-tab')) return;

        const tabBtn = e.target.closest('.management-tab');
        if (tabBtn) switchTab(tabBtn.getAttribute('data-tab'));

        const actionBtn = e.target.closest('.action-btn');
        const allMenus = document.querySelectorAll('.action-menu');
        
        if (actionBtn) {
            e.stopPropagation();
            const menu = actionBtn.nextElementSibling;
            
            allMenus.forEach(m => { 
                if (m !== menu) {
                    m.classList.add('hidden'); 
                    m.style.position = '';
                } 
            });
            
            if (menu) {
                if (menu.classList.contains('hidden')) {
                    menu.style.display = 'block';
                    menu.style.visibility = 'hidden';
                    menu.classList.remove('hidden');
                    
                    const rect = actionBtn.getBoundingClientRect();
                    const menuWidth = menu.offsetWidth || 160; 
                    const menuHeight = menu.offsetHeight || 130; // NEW: Track the height
                    
                    menu.style.position = 'fixed';
                    
                    // --- NEW: SMART Y POSITIONING ---
                    // If the menu drops below the bottom of the window, flip it UP!
                    if (rect.bottom + menuHeight + 20 > window.innerHeight) {
                        menu.style.top = `${rect.top - menuHeight - 4}px`;
                    } else {
                        menu.style.top = `${rect.bottom + 4}px`;
                    }
                    
                    // --- SMART X POSITIONING ---
                    let idealLeft = rect.right - menuWidth; 
                    
                    if (idealLeft + menuWidth > window.innerWidth - 16) {
                        idealLeft = window.innerWidth - menuWidth - 16;
                    }
                    if (idealLeft < 16) {
                        idealLeft = 16;
                    }
                    
                    menu.style.left = `${idealLeft}px`;
                    menu.style.right = 'auto';
                    menu.style.zIndex = '9999';
                    
                    menu.style.visibility = 'visible';
                    menu.style.display = '';
                    
                } else {
                    menu.classList.add('hidden');
                    menu.style.position = '';
                }
            }
        } else {
            if (!e.target.closest('.action-menu')) {
                allMenus.forEach(m => { 
                    m.classList.add('hidden'); 
                    m.style.position = ''; 
                });
            }
        }
        
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

        // --- REACTIVATE EMPLOYEE ---
        const restoreBtn = e.target.closest('.restore-employee-btn');
        if (restoreBtn) {
            const empId = restoreBtn.getAttribute('data-id');
            const empName = restoreBtn.getAttribute('data-name');
            
            // Show loading spinner on the button
            const originalText = restoreBtn.innerHTML;
            restoreBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Reactivating...`;
            if (window.lucide) lucide.createIcons();

            try {
                const { doc, updateDoc } = window.firebaseUtils;
                const employeeRef = doc(window.db, "employees", empId);
                
                // Update Firestore
                await updateDoc(employeeRef, {
                    account_status: "active"
                });
                
                showManagementToast(`Successfully reactivated "${empName}"`);
                
                // Reload the table so their row turns back to normal
                loadEmployeesFromFirebase(); 
                
            } catch (error) {
                console.error("Error reactivating employee:", error);
                showCustomAlert("Error", `Failed to reactivate ${empName}.`);
                restoreBtn.innerHTML = originalText;
                if (window.lucide) lucide.createIcons();
            }
        }

        // --- OPEN DELETE MODAL ---
        const deleteBtn = e.target.closest('.delete-employee-btn, .disband-btn');
        if (deleteBtn) {
            const dm = document.getElementById('delete-modal');
            if (dm) {
                const type = deleteBtn.classList.contains('disband-btn') ? 'team' : 'employee';
                document.getElementById('delete-type').textContent = type;
                
                window.itemToDeleteRow = deleteBtn.closest('tr');
                window.deleteItemName = deleteBtn.getAttribute('data-name');
                window.deleteItemId = deleteBtn.getAttribute('data-id'); 
                window.deleteItemType = type; 
                
                dm.classList.remove('hidden');
            }
        }
        
        // --- CANCEL DELETE ---
        if (e.target.closest('#cancel-delete') || e.target.id === 'delete-modal') {
            const dm = document.getElementById('delete-modal');
            if (dm) dm.classList.add('hidden');
            
            window.itemToDeleteRow = null;
            window.deleteItemName = null;
            window.deleteItemId = null;
            window.deleteItemType = null;
        }

        // --- CONFIRM DELETE (FIREBASE BATCH EXECUTION) ---
        // --- CONFIRM DELETE (FIREBASE BATCH EXECUTION) ---
        const confirmDeleteBtn = e.target.closest('#confirm-delete');
        if (confirmDeleteBtn) {
            const dm = document.getElementById('delete-modal');
            
            if (dm && window.itemToDeleteRow && window.deleteItemId) {
                const row = window.itemToDeleteRow;
                const itemName = window.deleteItemName;
                const itemId = window.deleteItemId;
                const type = window.deleteItemType;
                
                const originalText = confirmDeleteBtn.innerHTML;
                confirmDeleteBtn.disabled = true;
                confirmDeleteBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin inline-block"></i> Deleting...`;
                if(window.lucide) lucide.createIcons();

                try {
                    // Make sure to include updateDoc in the destructured utils!
                    const { doc, deleteDoc, updateDoc, getDoc, collection, query, where, getDocs, writeBatch } = window.firebaseUtils;

                    if (type === 'team') {
                        // 1. Fetch team data before deleting to know who was inside it
                        const teamRef = doc(window.db, "teams", itemId);
                        const teamSnap = await getDoc(teamRef);
                        const batch = writeBatch(window.db);

                        if (teamSnap.exists()) {
                            const teamData = teamSnap.data();
                            
                            // Compile list of names to unassign (Team Lead + All Members)
                            const membersToUnassign = [];
                            if (teamData.team_lead && teamData.team_lead !== "Unassigned") membersToUnassign.push(teamData.team_lead);
                            if (teamData.members) teamData.members.forEach(m => membersToUnassign.push(m.name));

                            // 2. Unassign them all via Batch
                            for (const empName of membersToUnassign) {
                                const q = query(collection(window.db, "employees"), where("full_name", "==", empName));
                                const qSnap = await getDocs(q);
                                qSnap.forEach(empDoc => {
                                    batch.update(empDoc.ref, { assigned_team: "Unassigned" });
                                });
                            }
                        }

                        // 3. Delete the team itself
                        batch.delete(teamRef);
                        await batch.commit(); // Execute everything simultaneously!
                    } else {
                        // --- NEW: SOF-DELETE LOGIC FOR EMPLOYEES ---
                        // Instead of deleting the document entirely, we update the status field.
                        const employeeRef = doc(window.db, "employees", itemId);
                        await updateDoc(employeeRef, {
                            account_status: "inactive"
                        });
                    }

                    // Animate row disappearance
                    row.style.transition = 'all 0.3s ease';
                    row.style.opacity = '0';
                    row.style.transform = 'translateX(20px)';
                    
                    setTimeout(() => {
                        // Instead of totally removing the row from the DOM, we can reload 
                        // the table to ensure the newly "inactive" user renders correctly with greyed-out styles
                        if (type === 'employee') {
                            loadEmployeesFromFirebase();
                        } else {
                            row.remove();
                            applyTeamFilters();
                        }
                        
                        showManagementToast(`Successfully removed "${itemName}"`);
                    }, 300);
                    
                    dm.classList.add('hidden');
                    
                } catch (error) {
                    console.error(`Error deleting ${type}:`, error);
                    showCustomAlert('Error Deleting Item', `Failed to delete ${itemName}. Please try again.`);
                } finally {
                    confirmDeleteBtn.disabled = false;
                    confirmDeleteBtn.innerHTML = originalText;
                    
                    window.itemToDeleteRow = null;
                    window.deleteItemName = null;
                    window.deleteItemId = null;
                    window.deleteItemType = null;
                }
            }
        }
    });

    document.body.addEventListener('input', (e) => {
        if (e.target.id === 'emp-search-input') applyEmployeeFilters();
        if (e.target.id === 'teams-search-input') applyTeamFilters();
    });

    // --- NEW: Listen for the toggle switch click ---
    document.getElementById('toggle-inactive-emp')?.addEventListener('change', applyEmployeeFilters);

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
        
        // This now perfectly matches "active" or "inactive" from the dropdown
        const statusValue = filterStatusInput ? filterStatusInput.value.toLowerCase() : "";
        
        // Hide inactive by default UNLESS the user explicitly selects "All Statuses" or "Inactive"
        const isFiltered = searchText !== "" || deptValue !== "" || statusValue !== "";

        const rows = document.querySelectorAll('#employee-table-body .data-row:not(#no-results-row)');
        let visibleCount = 0;

        rows.forEach(row => {
            const name = row.querySelector('.font-bold')?.textContent.toLowerCase() || '';
            const email = row.querySelectorAll('.table-td')[2]?.textContent.toLowerCase() || '';
            const rowDept = row.querySelectorAll('.table-td')[1]?.textContent.trim();
            const rowStatus = row.querySelector('.status-badge')?.textContent.toLowerCase().trim(); // "active" or "inactive"

            const matchesSearch = name.includes(searchText) || email.includes(searchText);
            const matchesDept = deptValue === "" || rowDept === deptValue;
            
            // Fixed logic: "All Statuses" shows absolutely everyone
            let matchesStatus = false;
            if (statusValue === "") {
                matchesStatus = true; 
            } else {
                matchesStatus = rowStatus === statusValue;
            }

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

    // ==========================================
    // 5. CUSTOM ALERT MODAL
    // ==========================================
    function showCustomAlert(title, message) {
        const modal = document.getElementById('custom-alert-modal');
        const box = document.getElementById('custom-alert-box');
        const titleEl = document.getElementById('custom-alert-title');
        const messageEl = document.getElementById('custom-alert-message');
        
        if (!modal) return;
        titleEl.textContent = title;
        messageEl.textContent = message;

        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            box.classList.remove('scale-95');
            box.classList.add('scale-100');
        });
    }

    function hideCustomAlert() {
        const modal = document.getElementById('custom-alert-modal');
        const box = document.getElementById('custom-alert-box');
        if (!modal) return;

        modal.classList.add('opacity-0');
        box.classList.remove('scale-100');
        box.classList.add('scale-95');

        setTimeout(() => modal.classList.add('hidden'), 300);
    }

    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'custom-alert-btn' || e.target.id === 'custom-alert-backdrop') {
            hideCustomAlert();
        }
    });
})();