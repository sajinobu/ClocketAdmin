document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Dynamic Routing Logic ---
    let fromPage = 'management';
    let returnUrl = 'management.html?tab=teams';

    setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        fromPage = urlParams.get('from') || 'management';

        // Construct the return URL
        returnUrl = fromPage === 'management' ? 'management.html?tab=teams' : `${fromPage}.html`;

        const backBtn = document.getElementById('dynamic-back-btn');
        const cancelBtn = document.getElementById('dynamic-cancel-btn');

        if (backBtn) backBtn.href = returnUrl;
        if (cancelBtn) cancelBtn.href = returnUrl;

        // Keep sidebar highlight on the parent page
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeSidebarLink = document.querySelector(`.sidebar-item[href^="${fromPage}.html"]`);
        if (activeSidebarLink) {
            activeSidebarLink.classList.add('active');
        }
    }, 100);


    // --- 2. Add Member Logic (Validation & UI Insertion) ---
    const deptInput = document.getElementById('new-member-dept');
    const nameInput = document.getElementById('new-member-name');
    const addMemberBtn = document.getElementById('add-member-btn');
    const addedMembersContainer = document.getElementById('added-members-container');

    function validateAddMemberInputs() {
        if (deptInput && nameInput && addMemberBtn) {
            const hasDept = deptInput.value.trim() !== '';
            const hasName = nameInput.value.trim() !== '';
            
            // Enable only if both have values
            addMemberBtn.disabled = !(hasDept && hasName);
        }
    }

    if (deptInput) deptInput.addEventListener('change', validateAddMemberInputs);
    if (nameInput) nameInput.addEventListener('input', validateAddMemberInputs);

    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => {
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

            addedMembersContainer.appendChild(memberRow);

            const removeBtn = memberRow.querySelector('.btn-remove-member');
            removeBtn.addEventListener('click', () => {
                memberRow.remove();
            });

            if (window.lucide) lucide.createIcons();

            // Reset inputs and disable button
            deptInput.value = '';
            nameInput.value = '';
            validateAddMemberInputs();
            
            nameInput.focus();
        });
    }

    // --- 3. Form Submission Logic ---
    const form = document.getElementById('create-team-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const teamName = document.getElementById('team-name').value;
            const teamLead = document.getElementById('team-lead').value;
            
            // Trigger Brand Toast Notification
            showSuccessToast(`"${teamName}" has been created with ${teamLead} as lead.`);
            
            // Redirect back after delay
            setTimeout(() => {
                window.location.href = returnUrl;
            }, 2500);
        });
    }

    // --- 4. Custom Brand Toast Utility ---
    function showSuccessToast(message) {
        const toast = document.createElement('div');
        
        toast.className = `fixed bottom-6 right-6 bg-[#000523] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 320px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(87,232,255,0.1)] text-[#57e8ff] rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="users" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold text-white">Team Created</p>
                <p class="text-xs text-gray-300 mt-0.5">${message}</p>
            </div>
        `;

        document.body.appendChild(toast);
        
        if (window.lucide) lucide.createIcons();

        // Animate In
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-20', 'opacity-0');
        });
    }
});