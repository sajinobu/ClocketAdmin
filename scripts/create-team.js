(() => {
    if (window.lucide) lucide.createIcons();

    // --- Global State ---
    let allEmployeesData = [];

    // --- Sidebar Active State ---
    setTimeout(() => {
        let fromPage = 'management';
        const urlParams = new URLSearchParams(window.location.search);
        if(urlParams.get('from')) fromPage = urlParams.get('from');

        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') && item.getAttribute('href').startsWith(fromPage)) {
                item.classList.add('active');
            }
        });
    }, 100);

    // --- FIREBASE: FETCH EMPLOYEES ONCE ---
    async function loadEmployeesForDropdowns() {
        if (!window.db || !window.firebaseUtils) return;

        try {
            const { collection, getDocs } = window.firebaseUtils;
            const employeesRef = collection(window.db, "employees");
            const snapshot = await getDocs(employeesRef);

            allEmployeesData = []; // Clear array

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const employeeName = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim();
                const department = data.department || ''; 
                
                if (employeeName) {
                    allEmployeesData.push({ 
                        name: employeeName, 
                        department: department 
                    });
                }
            });

        } catch (error) {
            console.error("Error fetching employees for dropdowns:", error);
        }
    }

    // --- DROPDOWN FILTER LOGIC (THE "MASTER KEY") ---
    function syncDropdownsToDepartment(dept) {
        const leadDropdown = document.getElementById('team-lead-custom-dropdown');
        const memberDropdown = document.getElementById('new-member-name-dropdown');
        const container = document.getElementById('added-members-container');

        // If no department is selected, lock everything down
        if (!dept) {
            leadDropdown.classList.add('disabled');
            memberDropdown.classList.add('disabled');
            document.getElementById('team-lead-text').textContent = 'Select department first...';
            document.getElementById('new-member-name-text').textContent = 'Select department first...';
            return;
        }

        // Unblock dropdowns
        leadDropdown.classList.remove('disabled');
        memberDropdown.classList.remove('disabled');

        // Filter employee pool by selected department
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

        // Inject HTML
        document.querySelector('#team-lead-custom-dropdown .dropdown-menu').innerHTML = leadHtml;
        document.getElementById('new-member-name-list').innerHTML = memberHtml;

        // RESET FIELDS: If department changes, clear previous selections to maintain integrity
        document.getElementById('team-lead').value = '';
        document.getElementById('team-lead-text').textContent = 'Select Team Lead';
        
        document.getElementById('new-member-name').value = '';
        document.getElementById('new-member-name-text').textContent = 'Select Employee...';
        document.getElementById('add-member-btn').disabled = true;
        
        // IMPORTANT: Clear the member list if the department changes!
        if (container) container.innerHTML = ''; 
    }

    // --- WAIT FOR FIREBASE INITIALIZATION ---
    const waitForFirebase = setInterval(() => {
        if (window.auth && window.db && window.firebaseUtils) {
            clearInterval(waitForFirebase);
            loadEmployeesForDropdowns();
        }
    }, 50);

    if (window.createTeamSPAInitialized) return;
    window.createTeamSPAInitialized = true;

    // --- EVENT DELEGATION (CLICKS) ---
    document.body.addEventListener('click', async (e) => {
        if (!document.getElementById('create-team-form')) return;
        
        // 1. Routing (Back / Cancel)
        const routeBtn = e.target.closest('#dynamic-back-btn, #dynamic-cancel-btn');
        if (routeBtn) {
            e.preventDefault();
            let fromPage = 'management';
            const urlParams = new URLSearchParams(window.location.search);
            if(urlParams.get('from')) fromPage = urlParams.get('from');
            const returnUrl = fromPage === 'management' ? 'management.html?tab=teams' : `${fromPage}.html`;

            if (typeof navigateTo === 'function') navigateTo(returnUrl);
            else window.location.href = returnUrl;
        }

        // 2. Close dropdowns if clicking outside
        const isDropdownClick = e.target.closest('.custom-dropdown');
        if (!isDropdownClick) {
            document.querySelectorAll('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
        }

        // 3. Open Dropdown
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

        // 4. Select Dropdown Item
        const item = e.target.closest('.dropdown-item:not(.disabled)');
        if (item) {
            const dropdown = item.closest('.custom-dropdown');
            const value = item.getAttribute('data-value');
            const textElement = dropdown.querySelector('span[id$="-text"]');
            const hiddenInput = dropdown.nextElementSibling; 

            // Update UI
            dropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            if (textElement) textElement.textContent = item.textContent || "Unassigned";
            
            if (hiddenInput && hiddenInput.tagName === 'INPUT') {
                hiddenInput.value = value;
                
                // Logic: If Department changes, trigger the sync function
                if (hiddenInput.id === 'team-department') {
                    syncDropdownsToDepartment(value);
                }
                
                // Logic: Enable Add Member button if a name is selected
                if (hiddenInput.id === 'new-member-name') {
                    document.getElementById('add-member-btn').disabled = !value;
                }

                // NEW LOGIC: If a Team Lead is selected, ensure they aren't also in the members list
                if (hiddenInput.id === 'team-lead') {
                    const container = document.getElementById('added-members-container');
                    const existingNames = Array.from(container.querySelectorAll('.member-item-name')).map(el => el.textContent);
                    
                    if (existingNames.includes(value)) {
                        // Find and remove them from the members list
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

        // 5. Add Member Button
        const addBtn = e.target.closest('#add-member-btn');
        if (addBtn && !addBtn.disabled) {
            e.preventDefault();
            const dept = document.getElementById('team-department').value;
            const nameInput = document.getElementById('new-member-name');
            const name = nameInput.value;
            const container = document.getElementById('added-members-container');
            const currentLead = document.getElementById('team-lead').value;

            // NEW LOGIC: Prevent adding the Team Lead as a regular member
            if (name === currentLead) {
                showCustomAlert('Cannot Add Member', `${name} is already the Team Lead and cannot be added as a regular member.`);
                return;
            }

            // Prevent adding duplicates
            const existingNames = Array.from(container.querySelectorAll('.member-item-name')).map(el => el.textContent);
            if (existingNames.includes(name)) {
                showCustomAlert('Duplicate Member', `${name} is already added to the team.`);
                return;
            }

            // UI FIX: Changed bg-white to bg-brand-surface, improved text colors and pill design
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

            // Reset only the Name dropdown so they can pick the next person
            document.getElementById('new-member-name-text').textContent = 'Select Employee...';
            nameInput.value = '';
            
            // Remove active class from the dropdown menu items
            const nameMenu = document.getElementById('new-member-name-list');
            if (nameMenu) {
                nameMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                const defaultItem = nameMenu.querySelector('.dropdown-item[data-value=""]');
                if (defaultItem) defaultItem.classList.add('active');
            }

            addBtn.disabled = true;
        }

        // 6. Remove Member
        const removeBtn = e.target.closest('.btn-remove-member');
        if (removeBtn) {
            e.preventDefault();
            removeBtn.closest('.member-item').remove();
        }

        // 7. Custom Alert Handlers (Close logic)
        if (e.target.id === 'custom-alert-btn' || e.target.id === 'custom-alert-backdrop') {
            hideCustomAlert();
        }
    });

    // --- FORM SUBMISSION ---
    document.body.addEventListener('submit', async (e) => {
        if (e.target.id === 'create-team-form') {
            e.preventDefault();
            
            const submitBtn = document.querySelector('button[form="create-team-form"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin inline-block mr-2"></i> Creating...`;
            if (window.lucide) lucide.createIcons();

            try {
                const teamName = document.getElementById('team-name').value.trim();
                const description = document.getElementById('team-description').value.trim();
                const department = document.getElementById('team-department').value;
                const teamLead = document.getElementById('team-lead').value;
                
                // Validate Department
                if (!department) {
                    showCustomAlert('Missing Information', 'Please select a Team Department.');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                    return;
                }

                // Gather Members
                const memberElements = document.querySelectorAll('.member-item');
                const membersList = Array.from(memberElements).map(el => {
                    return {
                        name: el.querySelector('.member-item-name').textContent,
                        department: el.querySelector('.member-item-dept').textContent
                    };
                });

                // Auto-calculate expected size based on actual added members
                const teamSize = membersList.length;
                
                const teamId = teamName.toLowerCase().replace(/[^a-z0-9]/g, '-');

                const { doc, setDoc } = window.firebaseUtils;
                const docRef = doc(window.db, "teams", teamId);
                
                await setDoc(docRef, {
                    team_id: teamId,
                    team_name: teamName,
                    description: description,
                    department: department,
                    team_lead: teamLead || "Unassigned",
                    expected_size: teamSize,
                    members: membersList,
                    created_at: new Date().toISOString(),
                    created_by: window.auth?.currentUser?.email || "System Admin"
                });
                
                showSuccessToast(`"${teamName}" has been successfully created.`);
                
                // Redirect back
                setTimeout(() => {
                    let fromPage = 'management';
                    const urlParams = new URLSearchParams(window.location.search);
                    if(urlParams.get('from')) fromPage = urlParams.get('from');
                    const returnUrl = fromPage === 'management' ? 'management.html?tab=teams' : `${fromPage}.html`;

                    if (typeof navigateTo === 'function') navigateTo(returnUrl);
                    else window.location.href = returnUrl;
                }, 2000);

            } catch (error) {
                console.error("Error creating team:", error);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                showCustomAlert('Error', 'Failed to create team. Please try again.');
            }
        }
    });

    // --- TOAST NOTIFICATION ---
    function showSuccessToast(message) {
        const existingToast = document.querySelector('.team-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `team-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-grayLight text-brand-darkest px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 320px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(99,102,241,0.1)] text-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="users" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold">Team Created</p>
                <p class="text-xs opacity-80 mt-0.5">${message}</p>
            </div>
        `;

        document.body.appendChild(toast);
        if (window.lucide) lucide.createIcons();

        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-20', 'opacity-0');
        });

        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 2000);
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

        // Show modal
        modal.classList.remove('hidden');
        // Small delay to allow CSS transition to play
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

        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300); // Matches duration-300
    }
})();