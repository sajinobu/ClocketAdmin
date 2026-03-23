(() => {
    if (window.lucide) lucide.createIcons();

    let allEmployeesData = [];
    let currentTeamId = null;

    setTimeout(() => {
        let fromPage = 'management';
        const urlParams = new URLSearchParams(window.location.search);
        if(urlParams.get('from')) fromPage = urlParams.get('from');

        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') && item.getAttribute('href').startsWith('management')) {
                item.classList.add('active');
            }
        });
    }, 100);

    // --- FIREBASE: LOAD ALL EMPLOYEES ONCE ---
    async function loadEmployeesForDropdowns() {
        if (!window.db || !window.firebaseUtils) return;
        try {
            const { collection, getDocs } = window.firebaseUtils;
            const employeesRef = collection(window.db, "employees");
            const snapshot = await getDocs(employeesRef);

            allEmployeesData = [];

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const employeeName = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim();
                const department = data.department || ''; 
                
                if (employeeName) {
                    allEmployeesData.push({ name: employeeName, department: department });
                }
            });
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    }

    // --- DROPDOWN FILTER LOGIC ---
    function syncDropdownsToDepartment(dept, isUserChange = true) {
        const leadDropdown = document.getElementById('team-lead-custom-dropdown');
        const memberDropdown = document.getElementById('new-member-name-dropdown');
        const container = document.getElementById('added-members-container');

        if (!dept) {
            leadDropdown.classList.add('disabled');
            memberDropdown.classList.add('disabled');
            document.getElementById('team-lead-text').textContent = 'Select department first...';
            document.getElementById('new-member-name-text').textContent = 'Select department first...';
            return;
        }

        leadDropdown.classList.remove('disabled');
        memberDropdown.classList.remove('disabled');

        const filteredPool = allEmployeesData.filter(emp => emp.department === dept);

        let leadHtml = `<div class="dropdown-item active" data-value="">Select Team Lead</div>`;
        let memberHtml = `<div class="dropdown-item active" data-value="">Select Employee...</div>`;

        if (filteredPool.length === 0) {
            const noneFound = `<div class="dropdown-item disabled text-brand-dark" style="pointer-events: none;">No employees found in ${dept}</div>`;
            leadHtml += noneFound;
            memberHtml += noneFound;
        } else {
            filteredPool.forEach(emp => {
                const item = `<div class="dropdown-item" data-value="${emp.name}">${emp.name}</div>`;
                leadHtml += item;
                memberHtml += item;
            });
        }

        document.querySelector('#team-lead-custom-dropdown .dropdown-menu').innerHTML = leadHtml;
        document.getElementById('new-member-name-list').innerHTML = memberHtml;

        // ONLY wipe existing selections if the user manually changes the department
        if (isUserChange) {
            document.getElementById('team-lead').value = '';
            document.getElementById('team-lead-text').textContent = 'Select Team Lead';
            document.getElementById('new-member-name').value = '';
            document.getElementById('new-member-name-text').textContent = 'Select Employee...';
            document.getElementById('add-member-btn').disabled = true;
            if (container) container.innerHTML = ''; 
        } else {
            document.getElementById('new-member-name-text').textContent = 'Select Employee...';
            document.getElementById('add-member-btn').disabled = true;
        }
    }

    // --- FIREBASE: LOAD EXISTING TEAM DATA ---
    async function loadTeamData() {
        const urlParams = new URLSearchParams(window.location.search);
        currentTeamId = urlParams.get('id');

        if (!currentTeamId) {
            showCustomAlert('Error', "No team ID found. Redirecting to management.");
            setTimeout(() => window.location.href = 'management.html?tab=teams', 1500);
            return;
        }

        try {
            const { doc, getDoc } = window.firebaseUtils;
            const teamRef = doc(window.db, "teams", currentTeamId);
            const teamSnap = await getDoc(teamRef);

            if (teamSnap.exists()) {
                const team = teamSnap.data();

                // 1. Populate Text Info
                document.getElementById('team-name').value = team.team_name || '';
                document.getElementById('team-description').value = team.description || '';

                // 2. Populate Department
                const deptInput = document.getElementById('team-department');
                const deptText = document.getElementById('team-dept-text');
                if (deptInput && team.department) {
                    deptInput.value = team.department;
                    deptText.textContent = team.department;
                    const deptMenu = deptInput.previousElementSibling.querySelector('.dropdown-menu');
                    if (deptMenu) {
                        deptMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                        const target = deptMenu.querySelector(`.dropdown-item[data-value="${team.department}"]`);
                        if (target) target.classList.add('active');
                    }
                }

                // 3. Initialize Dropdowns safely (don't clear members yet)
                syncDropdownsToDepartment(team.department, false);

                // 4. Set the Team Lead safely
                if (team.team_lead && team.team_lead !== "Unassigned") {
                    const leadMenu = document.querySelector('#team-lead-custom-dropdown .dropdown-menu');
                    document.getElementById('team-lead').value = team.team_lead;
                    document.getElementById('team-lead-text').textContent = team.team_lead;
                    
                    if (leadMenu) {
                        leadMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                        const target = leadMenu.querySelector(`.dropdown-item[data-value="${team.team_lead}"]`);
                        if (target) target.classList.add('active');
                    }
                } else {
                    document.getElementById('team-lead-text').textContent = "Select Team Lead";
                }

                // 5. Populate Members List with nice UI chips
                const container = document.getElementById('added-members-container');
                container.innerHTML = ''; 
                if (team.members && Array.isArray(team.members)) {
                    team.members.forEach(member => {
                        const memberRow = document.createElement('div');
                        memberRow.className = 'member-item flex items-center justify-between p-3 bg-brand-surface border border-brand-grayLight rounded-lg mb-2 shadow-sm transition-colors';
                        memberRow.innerHTML = `
                            <div class="member-item-info flex flex-col gap-1.5">
                                <span class="member-item-name font-bold text-sm text-brand-darkest">${member.name}</span>
                                <span class="member-item-dept text-[10px] font-bold text-brand-dark tracking-wider uppercase bg-brand-grayBg px-2.5 py-0.5 rounded-full w-fit">${member.department}</span>
                            </div>
                            <button type="button" class="btn-remove-member text-brand-dark hover:text-red-500 transition-colors" title="Remove Member">
                                <i data-lucide="x" class="w-4 h-4"></i>
                            </button>
                        `;
                        container.appendChild(memberRow);
                    });
                }
                if (window.lucide) lucide.createIcons();
            } else {
                showCustomAlert('Error', "Team not found.");
            }
        } catch (error) {
            console.error("Error loading team data:", error);
        }
    }

    // Initialize Page
    const waitForFirebase = setInterval(async () => {
        if (window.auth && window.db && window.firebaseUtils) {
            clearInterval(waitForFirebase);
            await loadEmployeesForDropdowns();
            await loadTeamData(); 
        }
    }, 50);

    if (window.teamEditSPAInitialized) return;
    window.teamEditSPAInitialized = true;

    // --- EVENT DELEGATION ---
    document.body.addEventListener('click', async (e) => {
        if (!document.getElementById('edit-team-form')) return;
        
        // 1. Routing
        const routeBtn = e.target.closest('#dynamic-back-btn, #dynamic-cancel-btn');
        if (routeBtn) {
            e.preventDefault();
            const currentParams = new URLSearchParams(window.location.search);
            const currentFrom = currentParams.get('from') || 'management';
            let finalUrl = 'management.html?tab=teams';
            
            if (currentFrom === 'team-details') {
                finalUrl = `team-details.html?id=${currentTeamId}`;
            } else if (currentFrom !== 'management') {
                finalUrl = `${currentFrom}.html`;
            }

            if (typeof navigateTo === 'function') navigateTo(finalUrl);
            else window.location.href = finalUrl;
        }

        // 2. Dropdown Toggles
        const isDropdownClick = e.target.closest('.custom-dropdown');
        if (!isDropdownClick) {
            document.querySelectorAll('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
        }

        const trigger = e.target.closest('.dropdown-trigger');
        if (trigger) {
            const dropdown = trigger.closest('.custom-dropdown');
            if (!dropdown.classList.contains('disabled')) {
                document.querySelectorAll('.custom-dropdown.open').forEach(d => {
                    if(d !== dropdown) d.classList.remove('open');
                });
                dropdown.classList.toggle('open');
            }
        }

        // 3. Select Dropdown Item
        const item = e.target.closest('.dropdown-item:not(.disabled)');
        if (item) {
            const dropdown = item.closest('.custom-dropdown');
            const value = item.getAttribute('data-value');
            const textElement = dropdown.querySelector('span[id$="-text"]');
            const hiddenInput = dropdown.nextElementSibling; 

            dropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            if (textElement) textElement.textContent = item.textContent || "Unassigned";
            
            if (hiddenInput && hiddenInput.tagName === 'INPUT') {
                hiddenInput.value = value;
                
                // If Department changes manually, filter dropdowns AND wipe member list
                if (hiddenInput.id === 'team-department') {
                    syncDropdownsToDepartment(value, true);
                }
                
                // Enable Add Member button
                if (hiddenInput.id === 'new-member-name') {
                    document.getElementById('add-member-btn').disabled = !value;
                }

                // If Team Lead is selected, remove them from the member list if they exist there
                if (hiddenInput.id === 'team-lead') {
                    const container = document.getElementById('added-members-container');
                    const existingNames = Array.from(container.querySelectorAll('.member-item-name')).map(el => el.textContent);
                    
                    if (existingNames.includes(value)) {
                        Array.from(container.querySelectorAll('.member-item')).forEach(item => {
                            if (item.querySelector('.member-item-name').textContent === value) {
                                item.remove();
                            }
                        });
                        showCustomAlert('Team Lead Updated', `${value} was removed from the standard members list because they are now the Team Lead.`);
                    }
                }
            }
            dropdown.classList.remove('open');
        }

        // 4. Add Member
        const addBtn = e.target.closest('#add-member-btn');
        if (addBtn && !addBtn.disabled) {
            e.preventDefault();
            const dept = document.getElementById('team-department').value;
            const nameInput = document.getElementById('new-member-name');
            const name = nameInput.value;
            const container = document.getElementById('added-members-container');
            const currentLead = document.getElementById('team-lead').value;

            // Prevent adding Team Lead
            if (name === currentLead) {
                showCustomAlert('Cannot Add Member', `${name} is already the Team Lead and cannot be added as a regular member.`);
                return;
            }

            // Prevent duplicates
            const existingNames = Array.from(container.querySelectorAll('.member-item-name')).map(el => el.textContent);
            if (existingNames.includes(name)) {
                showCustomAlert('Duplicate Member', `${name} is already added to the team.`);
                return;
            }

            const memberRow = document.createElement('div');
            memberRow.className = 'member-item flex items-center justify-between p-3 bg-brand-surface border border-brand-grayLight rounded-lg mb-2 shadow-sm transition-colors';
            memberRow.innerHTML = `
                <div class="member-item-info flex flex-col gap-1.5">
                    <span class="member-item-name font-bold text-sm text-brand-darkest">${name}</span>
                    <span class="member-item-dept text-[10px] font-bold text-brand-dark tracking-wider uppercase bg-brand-grayBg px-2.5 py-0.5 rounded-full w-fit">${dept}</span>
                </div>
                <button type="button" class="btn-remove-member text-brand-dark hover:text-red-500 transition-colors" title="Remove Member">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            `;

            container.appendChild(memberRow);
            if (window.lucide) lucide.createIcons();

            document.getElementById('new-member-name-text').textContent = 'Select Employee...';
            nameInput.value = '';
            
            const nameMenu = document.getElementById('new-member-name-list');
            if (nameMenu) {
                nameMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                const defaultItem = nameMenu.querySelector('.dropdown-item[data-value=""]');
                if (defaultItem) defaultItem.classList.add('active');
            }

            addBtn.disabled = true;
        }

        // 5. Remove Member
        const removeBtn = e.target.closest('.btn-remove-member');
        if (removeBtn) {
            e.preventDefault();
            removeBtn.closest('.member-item').remove();
        }

        // 6. Custom Alert Close
        if (e.target.id === 'custom-alert-btn' || e.target.id === 'custom-alert-backdrop') {
            hideCustomAlert();
        }
    });

    // --- FORM SUBMIT: SAVE CHANGES TO FIREBASE ---
    document.body.addEventListener('submit', async (e) => {
        if (e.target.id === 'edit-team-form') {
            e.preventDefault();
            if (!currentTeamId) return;

            const submitBtn = document.querySelector('button[form="edit-team-form"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin inline-block mr-2"></i> Saving...`;
            if (window.lucide) lucide.createIcons();

            try {
                const teamName = document.getElementById('team-name').value.trim();
                const description = document.getElementById('team-description').value.trim();
                const department = document.getElementById('team-department').value;
                const teamLead = document.getElementById('team-lead').value;
                
                if (!department) {
                    showCustomAlert('Missing Information', 'Please select a Team Department.');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                    return;
                }

                const memberElements = document.querySelectorAll('.member-item');
                const membersList = Array.from(memberElements).map(el => {
                    return {
                        name: el.querySelector('.member-item-name').textContent,
                        department: el.querySelector('.member-item-dept').textContent
                    };
                });

                const teamSize = membersList.length;

                const { doc, updateDoc } = window.firebaseUtils;
                const docRef = doc(window.db, "teams", currentTeamId);
                
                await updateDoc(docRef, {
                    team_name: teamName,
                    description: description,
                    department: department,
                    team_lead: teamLead || "Unassigned",
                    expected_size: teamSize, // Auto-calculated size
                    members: membersList,
                    last_updated: new Date().toISOString()
                });
                
                showSuccessToast(`"${teamName}" has been successfully updated.`);
                
                setTimeout(() => {
                    const currentParams = new URLSearchParams(window.location.search);
                    const currentFrom = currentParams.get('from') || 'management';
                    let finalUrl = 'management.html?tab=teams';
                    
                    if (currentFrom === 'team-details') {
                        finalUrl = `team-details.html?id=${currentTeamId}`;
                    } else if (currentFrom !== 'management') {
                        finalUrl = `${currentFrom}.html`;
                    }

                    if (typeof navigateTo === 'function') navigateTo(finalUrl);
                    else window.location.href = finalUrl;
                }, 2000);

            } catch (error) {
                console.error("Error updating team:", error);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                showCustomAlert('Error', 'Failed to update team. Please try again.');
            }
        }
    });

    // --- TOAST NOTIFICATION ---
    function showSuccessToast(message) {
        const existingToast = document.querySelector('.team-edit-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `team-edit-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-grayLight text-brand-darkest px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 320px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(99,102,241,0.1)] text-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="check" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold">Team Updated</p>
                <p class="text-xs opacity-80 mt-0.5">${message}</p>
            </div>
        `;

        document.body.appendChild(toast);
        if (window.lucide) lucide.createIcons();

        requestAnimationFrame(() => toast.classList.remove('translate-y-20', 'opacity-0'));
        
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 1500);
    }

    // --- CUSTOM ALERT MODAL LOGIC ---
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
})();