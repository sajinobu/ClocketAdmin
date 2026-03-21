(() => {
    // 1. RUN EVERY TIME
    if (window.lucide) lucide.createIcons();

    // 2. SPA EVENT GUARD (Run Only Once)
    if (window.addEmployeeSPAInitialized) return;
    window.addEmployeeSPAInitialized = true;

    // --- Dynamic Department -> Team Mapping Database ---
    const teamsData = {
        "Engineering": ["Engineering Team A", "Engineering Team B", "QA Testers", "DevOps"],
        "Design": ["Design Team B", "UX Research", "Brand Identity"],
        "Operations": ["Operations Team A", "Logistics", "Facility Management"],
        "Sales": ["Enterprise Sales", "SMB Sales", "Client Success"],
        "Marketing": ["Content Team", "Growth & SEO", "Event Marketing"]
    };

    // 3. EVENT DELEGATION LISTENERS
    
    // Handle Dropdown Changes
    document.body.addEventListener('change', (e) => {
        if (e.target.id === 'department') {
            const teamSelect = document.getElementById('assigned-team');
            const selectedDept = e.target.value;
            
            if (!teamSelect) return;
            
            teamSelect.innerHTML = '';
            
            if (selectedDept && teamsData[selectedDept]) {
                teamSelect.disabled = false;
                
                const defaultOpt = document.createElement('option');
                defaultOpt.value = "";
                defaultOpt.textContent = `Select ${selectedDept} Team`;
                teamSelect.appendChild(defaultOpt);

                teamsData[selectedDept].forEach(team => {
                    const opt = document.createElement('option');
                    opt.value = team;
                    opt.textContent = team;
                    teamSelect.appendChild(opt);
                });
            } else {
                teamSelect.disabled = true;
                const opt = document.createElement('option');
                opt.value = "";
                opt.textContent = "Please select a department first";
                teamSelect.appendChild(opt);
            }
        }
    });

    // Handle Clicks (Routing)
    document.body.addEventListener('click', (e) => {
        const routeBtn = e.target.closest('#dynamic-back-btn, #dynamic-cancel-btn');
        if (routeBtn) {
            e.preventDefault();
            
            let fromPage = 'management'; 
            const urlParams = new URLSearchParams(window.location.search);
            if(urlParams.get('from')) {
                fromPage = urlParams.get('from');
            }

            if (typeof navigateTo === 'function') {
                navigateTo(`${fromPage}.html`);
            } else {
                window.location.href = `${fromPage}.html`;
            }
        }
    });

    // Handle Form Submission
    document.body.addEventListener('submit', (e) => {
        if (e.target.id === 'add-employee-form') {
            e.preventDefault();
            
            const firstName = document.getElementById('first-name').value;
            const lastName = document.getElementById('last-name').value;
            const employeeId = document.getElementById('employee-id').value;
            
            showSuccessToast(`${firstName} ${lastName} (${employeeId}) has been successfully added to the system.`);
            
            setTimeout(() => {
                let fromPage = 'management'; 
                const urlParams = new URLSearchParams(window.location.search);
                if(urlParams.get('from')) {
                    fromPage = urlParams.get('from');
                }

                if (typeof navigateTo === 'function') {
                    navigateTo(`${fromPage}.html`);
                } else {
                    window.location.href = `${fromPage}.html`;
                }
            }, 2000); 
        }
    });

    // --- Modern Dark-Mode Ready Toast Utility ---
    function showSuccessToast(message) {
        const existingToast = document.querySelector('.add-emp-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `add-emp-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 320px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(99,102,241,0.1)] text-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="user-plus" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold">Employee Added</p>
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