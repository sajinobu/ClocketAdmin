(() => {
    // 1. RUN EVERY TIME
    if (window.lucide) lucide.createIcons();

    // Dynamically highlight the correct sidebar item based on the URL parameter
    setTimeout(() => {
        let fromPage = 'employee-profile'; 
        const urlParams = new URLSearchParams(window.location.search);
        if(urlParams.get('from')) {
            fromPage = urlParams.get('from');
        }
        
        // If fromPage is employee-profile or management, highlight Management
        const targetSidebarLink = (fromPage.includes('employee') || fromPage === 'management') ? 'management.html' : `${fromPage}.html`;

        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') && item.getAttribute('href').startsWith(targetSidebarLink)) {
                item.classList.add('active');
            }
        });
    }, 100);

    // 2. SPA EVENT GUARD (Run Only Once)
    if (window.editEmployeeSPAInitialized) return;
    window.editEmployeeSPAInitialized = true;

    // --- Dynamic Department -> Team Mapping Database ---
    const teamsData = {
        "Engineering": ["Engineering Team A", "Engineering Team B", "QA Testers", "DevOps"],
        "Design": ["Design Team B", "UX Research", "Brand Identity"],
        "Operations": ["Operations Team A", "Logistics", "Facility Management"],
        "Sales": ["Enterprise Sales", "SMB Sales", "Client Success"],
        "Marketing": ["Content Team", "Growth & SEO", "Event Marketing"]
    };

    // Helper Function for updating the Custom Team Dropdown
    function updateTeamDropdown(selectedDept) {
        const teamMenu = document.getElementById('team-dropdown-menu');
        const teamText = document.getElementById('team-dropdown-text');
        const teamInput = document.getElementById('edit-assigned-team');
        const teamDropdown = document.getElementById('team-custom-dropdown');

        if (!teamMenu || !teamDropdown) return;

        teamMenu.innerHTML = ''; // Clear items

        if (selectedDept && teamsData[selectedDept]) {
            teamDropdown.classList.remove('disabled');
            
            teamsData[selectedDept].forEach((team, index) => {
                const item = document.createElement('div');
                item.className = `dropdown-item ${index === 0 ? 'active' : ''}`;
                item.setAttribute('data-value', team);
                item.textContent = team;
                teamMenu.appendChild(item);

                if (index === 0) {
                    teamText.textContent = team;
                    teamInput.value = team;
                }
            });
        } else {
            teamDropdown.classList.add('disabled');
            teamText.textContent = "Select a department first";
            teamInput.value = "";
            
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.setAttribute('data-value', "");
            item.textContent = "Please select a department first";
            teamMenu.appendChild(item);
        }
    }

    // 3. EVENT DELEGATION LISTENERS
    
    // --- File Upload Changes ---
    document.body.addEventListener('change', (e) => {
        if (e.target.id === 'emp-avatar-upload') {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const avatarPreview = document.getElementById('emp-avatar-preview');
                    if (avatarPreview) {
                        avatarPreview.innerHTML = ''; // Remove the initials text
                        avatarPreview.style.backgroundImage = `url(${event.target.result})`;
                        avatarPreview.style.backgroundSize = 'cover';
                        avatarPreview.style.backgroundPosition = 'center';
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    });

    // Handle Clicks
    document.body.addEventListener('click', (e) => {
        
        // --- Back & Cancel Routing ---
        const routeBtn = e.target.closest('#dynamic-back-btn, #dynamic-cancel-btn');
        if (routeBtn) {
            e.preventDefault();
            let fromPage = 'employee-profile'; 
            const urlParams = new URLSearchParams(window.location.search);
            if(urlParams.get('from')) fromPage = urlParams.get('from');

            if (typeof navigateTo === 'function') {
                navigateTo(`${fromPage}.html`);
            } else {
                window.location.href = `${fromPage}.html`;
            }
        }

        // --- Camera Button Click ---
        const cameraBtn = e.target.closest('.btn-camera');
        if (cameraBtn) {
            e.preventDefault();
            const fileInput = document.getElementById('emp-avatar-upload');
            if (fileInput) fileInput.click();
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
            if (!dropdown.classList.contains('disabled')) {
                // Close others first
                document.querySelectorAll('.custom-dropdown.open').forEach(d => {
                    if(d !== dropdown) d.classList.remove('open');
                });
                dropdown.classList.toggle('open');
            }
        }

        // Select an item
        const item = e.target.closest('.dropdown-item');
        if (item) {
            const dropdown = item.closest('.custom-dropdown');
            const value = item.getAttribute('data-value');
            const textElement = dropdown.querySelector('span[id$="-dropdown-text"]');
            const hiddenInput = dropdown.nextElementSibling; 

            dropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            if (textElement) textElement.textContent = item.textContent;
            
            if (hiddenInput && hiddenInput.tagName === 'INPUT') {
                hiddenInput.value = value;
            }
            
            dropdown.classList.remove('open');

            // Specific logic for mapping Department -> Team
            if (dropdown.id === 'dept-custom-dropdown') {
                updateTeamDropdown(value);
            }
        }
    });

    // Handle Form Submission
    document.body.addEventListener('submit', (e) => {
        if (e.target.id === 'edit-employee-form') {
            e.preventDefault();
            
            const firstName = document.getElementById('edit-first-name').value;
            const lastName = document.getElementById('edit-last-name').value;
            
            showSuccessToast(`Profile for ${firstName} ${lastName} has been successfully updated.`);
            
            setTimeout(() => {
                let fromPage = 'employee-profile'; 
                const urlParams = new URLSearchParams(window.location.search);
                if(urlParams.get('from')) fromPage = urlParams.get('from');

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
        const existingToast = document.querySelector('.edit-emp-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `edit-emp-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 320px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(99,102,241,0.1)] text-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="check-circle" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold">Changes Saved</p>
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