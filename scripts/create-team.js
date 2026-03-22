(() => {
    // 1. RUN EVERY TIME
    if (window.lucide) lucide.createIcons();

    // --- Dynamic Routing Logic & Sidebar Highlight ---
    setTimeout(() => {
        let fromPage = 'management';
        const urlParams = new URLSearchParams(window.location.search);
        if(urlParams.get('from')) {
            fromPage = urlParams.get('from');
        }

        // Keep sidebar highlight on the parent page
        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') && item.getAttribute('href').startsWith(fromPage)) {
                item.classList.add('active');
            }
        });
    }, 100);

    // 2. SPA EVENT GUARD (Run Only Once)
    if (window.createTeamSPAInitialized) return;
    window.createTeamSPAInitialized = true;

    // --- Validation Utility for Add Member Button ---
    function validateAddMemberInputs() {
        const deptInput = document.getElementById('new-member-dept');
        const nameInput = document.getElementById('new-member-name');
        const addMemberBtn = document.getElementById('add-member-btn');
        
        if (deptInput && nameInput && addMemberBtn) {
            const hasDept = deptInput.value.trim() !== '';
            const hasName = nameInput.value.trim() !== '';
            addMemberBtn.disabled = !(hasDept && hasName);
        }
    }

    // 3. EVENT DELEGATION LISTENERS
    
    // Typing in Name Field
    document.body.addEventListener('input', (e) => {
        if (e.target.id === 'new-member-name') {
            validateAddMemberInputs();
        }
    });

    document.body.addEventListener('click', (e) => {
        // FIXED GUARD: Now this will ONLY run on the actual Create Team page!
        if (!document.getElementById('create-team-form')) return;
        
        // --- Back & Cancel Routing ---
        const routeBtn = e.target.closest('#dynamic-back-btn, #dynamic-cancel-btn');
        if (routeBtn) {
            e.preventDefault();
            let fromPage = 'management';
            const urlParams = new URLSearchParams(window.location.search);
            if(urlParams.get('from')) fromPage = urlParams.get('from');
            
            const returnUrl = fromPage === 'management' ? 'management.html?tab=teams' : `${fromPage}.html`;

            if (typeof navigateTo === 'function') {
                navigateTo(returnUrl);
            } else {
                window.location.href = returnUrl;
            }
        }

        // --- Custom Dropdown Handling ---
        const isDropdownClick = e.target.closest('.custom-dropdown');
        
        // Close all dropdowns if clicking outside
        if (!isDropdownClick) {
            document.querySelectorAll('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
        }

        // Toggle clicked dropdown
        const trigger = e.target.closest('.dropdown-trigger');
        if (trigger) {
            const dropdown = trigger.closest('.custom-dropdown');
            // Close others first
            document.querySelectorAll('.custom-dropdown.open').forEach(d => {
                if(d !== dropdown) d.classList.remove('open');
            });
            dropdown.classList.toggle('open');
        }

        // Select an item from Custom Dropdown
        const item = e.target.closest('.dropdown-item');
        if (item) {
            const dropdown = item.closest('.custom-dropdown');
            const value = item.getAttribute('data-value');
            const textElement = dropdown.querySelector('span[id$="-text"]');
            const hiddenInput = dropdown.nextElementSibling; 

            dropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            if (textElement) textElement.textContent = item.textContent;
            
            if (hiddenInput && hiddenInput.tagName === 'INPUT') {
                hiddenInput.value = value;
                
                // If the selected dropdown was the New Member Dept, validate the button
                if (hiddenInput.id === 'new-member-dept') {
                    validateAddMemberInputs();
                }
            }
            
            dropdown.classList.remove('open');
        }

        // --- Add Member Button Click ---
        const addBtn = e.target.closest('#add-member-btn');
        if (addBtn && !addBtn.disabled) {
            e.preventDefault();
            const deptInput = document.getElementById('new-member-dept');
            const nameInput = document.getElementById('new-member-name');
            const container = document.getElementById('added-members-container');

            const dept = deptInput.value;
            const name = nameInput.value.trim();

            const memberRow = document.createElement('div');
            memberRow.className = 'member-item';
            memberRow.innerHTML = `
                <div class="member-item-info">
                    <span class="member-item-dept">${dept}</span>
                    <span class="member-item-name">${name}</span>
                </div>
                <button type="button" class="btn-remove-member" title="Remove Member">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            `;

            container.appendChild(memberRow);
            if (window.lucide) lucide.createIcons();

            // Reset Inputs
            deptInput.value = '';
            nameInput.value = '';
            
            // Reset Custom Dropdown UI for Dept
            const deptDropdown = document.getElementById('new-member-dept-dropdown');
            if (deptDropdown) {
                deptDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                const defaultItem = deptDropdown.querySelector('.dropdown-item[data-value=""]');
                if (defaultItem) defaultItem.classList.add('active');
                document.getElementById('new-member-dept-text').textContent = 'Select Dept...';
            }

            validateAddMemberInputs();
            nameInput.focus();
        }

        // --- Remove Member Button Click ---
        const removeBtn = e.target.closest('.btn-remove-member');
        if (removeBtn) {
            e.preventDefault();
            removeBtn.closest('.member-item').remove();
        }
    });

    // --- Form Submission Logic ---
    document.body.addEventListener('submit', (e) => {
        if (e.target.id === 'create-team-form') {
            e.preventDefault();
            
            const teamName = document.getElementById('team-name').value;
            const teamLead = document.getElementById('team-lead').value || "unassigned lead";
            
            showSuccessToast(`"${teamName}" has been created with ${teamLead} as lead.`);
            
            setTimeout(() => {
                let fromPage = 'management';
                const urlParams = new URLSearchParams(window.location.search);
                if(urlParams.get('from')) fromPage = urlParams.get('from');
                const returnUrl = fromPage === 'management' ? 'management.html?tab=teams' : `${fromPage}.html`;

                if (typeof navigateTo === 'function') {
                    navigateTo(returnUrl);
                } else {
                    window.location.href = returnUrl;
                }
            }, 2500);
        }
    });

    // --- Modern Dark-Mode Ready Toast Utility ---
    function showSuccessToast(message) {
        const existingToast = document.querySelector('.team-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `team-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] transition-all duration-500 transform translate-y-20 opacity-0`;
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
})();