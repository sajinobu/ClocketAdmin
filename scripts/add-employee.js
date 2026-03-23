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

    // Helper Function: Format Datetime for Firestore
    function getFormattedDateTime() {
        const now = new Date();
        return now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + ' ' +
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0') + ':' +
            String(now.getSeconds()).padStart(2, '0');
    }

    // 3. EVENT DELEGATION LISTENERS
    
    // Handle Dropdown Changes (Native <select> tags)
    document.body.addEventListener('change', (e) => {
        // NEW PAGE GUARD: Only run if the Add Employee form is on the screen!
        if (!document.getElementById('add-employee-form')) return;

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
        if (!document.getElementById('add-employee-form')) return;
        
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

    // --- FIREBASE: Handle Form Submission ---
    document.body.addEventListener('submit', async (e) => {
        if (e.target.id === 'add-employee-form') {
            e.preventDefault();
            
            // FIXED: Search the whole document for the linked button!
            const submitBtn = document.querySelector('button[form="add-employee-form"]');
            const originalBtnText = submitBtn.innerHTML;
            
            // 1. Validate Dropdowns
            const dept = document.getElementById('department').value;
            const team = document.getElementById('assigned-team').value;
            
            if (!dept || !team) {
                alert("Please select a Department and Assigned Team.");
                return;
            }

            // Set UI to loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Saving...`;
            if (window.lucide) lucide.createIcons();
            
            try {
                // Ensure Firebase is connected via the Global Window trick
                if (!window.secondaryAuth || !window.firebaseUtils) {
                    throw new Error("Firebase is not initialized. Please refresh the page.");
                }

                const { doc, setDoc, createUserWithEmailAndPassword, signOut } = window.firebaseUtils;

                // 2. Gather UI Data
                const firstName = document.getElementById('first-name').value.trim();
                const lastName = document.getElementById('last-name').value.trim();
                const email = document.getElementById('email').value.trim();
                const empId = document.getElementById('employee-id').value.trim();
                const systemRole = document.querySelector('input[name="system-role"]:checked').value;
                
                // Fallbacks just in case you add these inputs back to the HTML later
                const phoneNode = document.getElementById('phone');
                const phone = phoneNode ? phoneNode.value.trim() : "";
                const titleNode = document.getElementById('job-title');
                const jobTitle = titleNode ? titleNode.value.trim() : "Employee";

                const currentTime = getFormattedDateTime();
                const tempPassword = "SuP3rS3crtP@ssWord#1234";

                // 3. Create User in Firebase Auth (Using secondary ghost app to prevent logout)
                await createUserWithEmailAndPassword(window.secondaryAuth, email, tempPassword);
                await signOut(window.secondaryAuth);

                // 4. Build Exact Database Payload
                const employeeData = {
                    account_status: "active",
                    address: "",
                    assigned_team: team,
                    contact_number: phone,
                    created_at: currentTime,
                    created_by: "admin@company.com", // We can make this dynamic later
                    department: dept,
                    email: email,
                    employee_code: "EMP" + Math.floor(Math.random() * 900 + 100),
                    employee_id: empId,
                    first_name: firstName,
                    full_name: `${firstName} ${lastName}`,
                    last_login: "",
                    last_name: lastName,
                    login_attempts: 0,
                    password: "pending_setup",
                    password_last_changed: currentTime,
                    profile_picture: "coming soon",
                    role: jobTitle,
                    system_role: systemRole,
                    updated_at: currentTime
                };

                // 5. Write to Firestore using the email as the Document ID
                await setDoc(doc(window.db, "employees", email), employeeData);

                showSuccessToast(`${firstName} ${lastName} (${empId}) has been successfully added.`);
                
                // 6. Route back after success
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

            } catch (error) {
                console.error("Error adding employee: ", error);
                if (error.code === 'auth/email-already-in-use') {
                    alert("Error: An account with this email address already exists.");
                } else {
                    alert("Error saving employee. Check console for details.");
                }
                
                // Reset button on failure
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                if (window.lucide) lucide.createIcons();
            }
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