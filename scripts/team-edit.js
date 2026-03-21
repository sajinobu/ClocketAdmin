(() => {
    // 1. RUN EVERY TIME
    if (window.lucide) lucide.createIcons();

    // Determine return URL & Highlight Sidebar
    setTimeout(() => {
        let fromPage = 'management';
        const urlParams = new URLSearchParams(window.location.search);
        if(urlParams.get('from')) {
            fromPage = urlParams.get('from');
        }
        
        // Keep sidebar highlight on the parent page (Teams falls under Management)
        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') && item.getAttribute('href').startsWith('management')) {
                item.classList.add('active');
            }
        });
    }, 100);

    // 2. SPA EVENT GUARD
    if (window.teamEditSPAInitialized) return;
    window.teamEditSPAInitialized = true;

    // --- Helper Function: Validate Add Member Inputs ---
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
    
    // Typing validation
    document.body.addEventListener('input', (e) => {
        if (e.target.id === 'new-member-name') validateAddMemberInputs();
    });

    document.body.addEventListener('click', (e) => {
        
        // --- Back & Cancel Routing ---
        const routeBtn = e.target.closest('#dynamic-back-btn, #dynamic-cancel-btn');
        if (routeBtn) {
            e.preventDefault();
            const currentParams = new URLSearchParams(window.location.search);
            const currentFrom = currentParams.get('from') || 'management';
            const finalUrl = currentFrom === 'management' ? 'management.html?tab=teams' : `${currentFrom}.html`;

            if (typeof navigateTo === 'function') {
                navigateTo(finalUrl);
            } else {
                window.location.href = finalUrl;
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

        // --- Add Member Button ---
        const addBtn = e.target.closest('#add-member-btn');
        if (addBtn && !addBtn.disabled) {
            e.preventDefault();
            const deptInput = document.getElementById('new-member-dept');
            const nameInput = document.getElementById('new-member-name');
            const container = document.getElementById('added-members-container');

            if (deptInput && nameInput && container) {
                const dept = deptInput.value;
                const name = nameInput.value.trim();
                if (!dept || !name) return;

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

                // Reset
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
        }

        // --- Remove Member (X) Button ---
        const removeBtn = e.target.closest('.btn-remove-member');
        if (removeBtn) {
            e.preventDefault();
            const row = removeBtn.closest('.member-item');
            if (row) row.remove();
        }
    });

    // --- Form Submission Logic ---
    document.body.addEventListener('submit', (e) => {
        if (e.target.id === 'edit-team-form') {
            e.preventDefault();
            
            const nameInput = document.getElementById('team-name');
            const teamName = nameInput ? nameInput.value : 'Team';
            
            showSuccessToast(`"${teamName}" configuration has been successfully updated.`);
            
            setTimeout(() => {
                const currentParams = new URLSearchParams(window.location.search);
                const currentFrom = currentParams.get('from') || 'management';
                const finalUrl = currentFrom === 'management' ? 'management.html?tab=teams' : `${currentFrom}.html`;

                if (typeof navigateTo === 'function') {
                    navigateTo(finalUrl);
                } else {
                    window.location.href = finalUrl;
                }
            }, 2000);
        }
    });

    // --- Modern Brand Toast Utility ---
    function showSuccessToast(message) {
        const existingToast = document.querySelector('.team-edit-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `team-edit-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] transition-all duration-500 transform translate-y-20 opacity-0`;
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

        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-20', 'opacity-0');
        });
        
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 1500);
    }
})();