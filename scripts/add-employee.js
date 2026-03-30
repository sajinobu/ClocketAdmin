// scripts/add-employee.js

(() => {
    // 1. RUN EVERY TIME
    if (window.lucide) lucide.createIcons();

    // 2. SPA EVENT GUARD (Run Only Once)
    if (window.addEmployeeSPAInitialized) return;
    window.addEmployeeSPAInitialized = true;

    let dynamicTeamsData = {};

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

    // Helper Function: Convert HTML time (18:00) to 12-hour format (06:00 PM)
    function format12HourTime(time24) {
        if (!time24) return "";
        let [hours, minutes] = time24.split(':');
        hours = parseInt(hours, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12; // Convert 0 to 12
        const strHours = String(hours).padStart(2, '0');
        return `${strHours}:${minutes} ${ampm}`;
    }

    // --- FIREBASE: LOAD TEAMS FOR DROPDOWN ---
    async function loadTeamsForDropdown() {
        if (!window.db || !window.firebaseUtils) return;
        try {
            const { collection, getDocs } = window.firebaseUtils;
            const teamsRef = collection(window.db, "teams");
            const teamsSnap = await getDocs(teamsRef);

            dynamicTeamsData = {};
            teamsSnap.forEach(tDoc => {
                const tData = tDoc.data();
                const dept = tData.department || "Unassigned";
                if (!dynamicTeamsData[dept]) dynamicTeamsData[dept] = [];
                // Store both name and ID so we can update the correct team document later
                dynamicTeamsData[dept].push({ team_name: tData.team_name, team_id: tDoc.id });
            });
        } catch (error) {
            console.error("Error loading teams:", error);
        }
    }

    // --- LOGIC: UPDATE TEAM DROPDOWN BASED ON DEPT ---
    function updateTeamDropdown(selectedDept) {
        const teamSelect = document.getElementById('assigned-team');
        if (!teamSelect) return;

        teamSelect.innerHTML = '';

        if (selectedDept && dynamicTeamsData[selectedDept] && dynamicTeamsData[selectedDept].length > 0) {
            teamSelect.disabled = false;
            
            // Explicitly give the admin the option to leave it unassigned
            const defaultOpt = document.createElement('option');
            defaultOpt.value = "";
            defaultOpt.textContent = "None / Unassigned";
            teamSelect.appendChild(defaultOpt);

            dynamicTeamsData[selectedDept].forEach(team => {
                const opt = document.createElement('option');
                opt.value = team.team_name;
                opt.dataset.teamId = team.team_id; // Store ID for the batch write
                opt.textContent = team.team_name;
                teamSelect.appendChild(opt);
            });
        } else {
            // Even if no teams exist, or no dept is selected, default to a blank/unassigned state
            teamSelect.disabled = true;
            const opt = document.createElement('option');
            opt.value = "";
            opt.textContent = selectedDept ? `No teams in ${selectedDept} (Unassigned)` : "None / Unassigned";
            teamSelect.appendChild(opt);
        }
    }

    // --- AUTO-GENERATE NEXT EMPLOYEE ID ---
    async function generateNextEmployeeId() {
        if (!window.db || !window.firebaseUtils) return;
        
        const empIdInput = document.getElementById('employee-id');
        if (!empIdInput) return;

        try {
            empIdInput.placeholder = "Generating ID...";
            empIdInput.disabled = true;

            const { collection, getDocs } = window.firebaseUtils;
            const empSnapshot = await getDocs(collection(window.db, "employees"));
            
            let maxIdNum = 0;

            empSnapshot.forEach(doc => {
                const empData = doc.data();
                if (empData.employee_id && empData.employee_id.startsWith('EMP-')) {
                    const numPart = parseInt(empData.employee_id.split('-')[1], 10);
                    if (!isNaN(numPart) && numPart > maxIdNum) {
                        maxIdNum = numPart;
                    }
                }
            });

            const nextIdNum = maxIdNum + 1;
            const nextIdString = `EMP-${String(nextIdNum).padStart(3, '0')}`;
            empIdInput.value = nextIdString;

        } catch (error) {
            console.error("Error generating employee ID:", error);
            empIdInput.placeholder = "EMP-...";
            empIdInput.disabled = false;
        }
    }

    // Wait for Firebase, then load teams and generate ID
    const waitForFirebase = setInterval(() => {
        if (window.db && window.firebaseUtils) {
            clearInterval(waitForFirebase);
            loadTeamsForDropdown();
            generateNextEmployeeId();
        }
    }, 50);

    // 3. EVENT DELEGATION LISTENERS
    
    // Handle Native Select Changes
    document.body.addEventListener('change', (e) => {
        if (!document.getElementById('add-employee-form')) return;

        if (e.target.id === 'department') {
            updateTeamDropdown(e.target.value);
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

            if (typeof navigateTo === 'function') navigateTo(`${fromPage}.html`);
            else window.location.href = `${fromPage}.html`;
        }
    });

    // --- FIREBASE: Handle Form Submission with BATCH WRITE ---
    document.body.addEventListener('submit', async (e) => {
        if (e.target.id === 'add-employee-form') {
            e.preventDefault();
            
            const submitBtn = document.querySelector('button[form="add-employee-form"]');
            const originalBtnText = submitBtn.innerHTML;
            
            // 1. Validate Dropdowns
            const dept = document.getElementById('department').value;
            const teamSelect = document.getElementById('assigned-team');
            const teamName = teamSelect.value;
            
            if (!dept) {
                alert("Please select a Department.");
                return;
            }

            // Set UI to loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Saving...`;
            if (window.lucide) lucide.createIcons();
            
            try {
                if (!window.secondaryAuth || !window.firebaseUtils) {
                    throw new Error("Firebase is not initialized. Please refresh the page.");
                }

                const { doc, getDoc, writeBatch, createUserWithEmailAndPassword, signOut } = window.firebaseUtils;
                const batch = writeBatch(window.db);

                // 2. Gather General UI Data
                const firstName = document.getElementById('first-name').value.trim();
                const lastName = document.getElementById('last-name').value.trim();
                const email = document.getElementById('email').value.trim();
                const empId = document.getElementById('employee-id').value.trim();
                const systemRole = document.querySelector('input[name="system-role"]:checked').value;
                const fullName = `${firstName} ${lastName}`.trim();
                
                // Safely grab optional inputs if you add them later
                const phoneNode = document.getElementById('phone');
                const phone = phoneNode ? phoneNode.value.trim() : "";
                
                const addressNode = document.getElementById('address');
                const address = addressNode ? addressNode.value.trim() : "";

                // --- Gather Work Schedule Data ---
                const rawStartTime = document.getElementById('work-start').value;
                const rawEndTime = document.getElementById('work-end').value;
                
                // Formatted exactly like "09:00 AM" and "06:00 PM"
                const formattedStartTime = format12HourTime(rawStartTime);
                const formattedEndTime = format12HourTime(rawEndTime);

                // Grab an array of all the days they checked
                const checkedDaysNodes = document.querySelectorAll('input[name="work-days"]:checked');
                const workingDaysArray = Array.from(checkedDaysNodes).map(node => node.value);
                // --------------------------------------

                const currentTime = getFormattedDateTime();
                const tempPassword = "SuP3rS3crtP@ssWord#1234";
                const currentAdminEmail = window.auth?.currentUser?.email || "admin@company.com";

                const selectedOption = teamSelect.options[teamSelect.selectedIndex];
                const teamId = selectedOption ? selectedOption.dataset.teamId : null;

                // 3. Create User in Firebase Auth 
                await createUserWithEmailAndPassword(window.secondaryAuth, email, tempPassword);
                await signOut(window.secondaryAuth);

                // 4. Set Employee Document in Batch
                const empRef = doc(window.db, "employees", email);
                batch.set(empRef, {
                    account_status: "active",
                    address: address, 
                    assigned_team: teamName || "Unassigned", // Leaves unassigned if blank
                    contact_number: phone,
                    created_at: currentTime,
                    created_by: currentAdminEmail,
                    department: dept,
                    email: email,
                    employee_code: "EMP" + Math.floor(Math.random() * 900 + 100),
                    employee_id: empId,
                    first_name: firstName,
                    full_name: fullName,
                    last_login: "",
                    last_name: lastName,
                    login_attempts: 0,
                    password: "pending_setup",
                    password_last_changed: currentTime,
                    profile_picture: "coming soon",
                    role: systemRole, 
                    system_role: systemRole, 
                    updated_at: currentTime,
                    
                    // The schedule fields
                    work_start_time: formattedStartTime,
                    work_end_time: formattedEndTime,
                    working_days: workingDaysArray
                });

                // 5. Update Team Document in Batch (If a team was chosen)
                // This block is naturally bypassed if teamId/teamName is blank
                if (teamId && teamName) {
                    const teamRef = doc(window.db, "teams", teamId);
                    const teamSnap = await getDoc(teamRef);
                    if (teamSnap.exists()) {
                        const teamData = teamSnap.data();
                        const members = teamData.members || [];
                        
                        if (!members.some(m => m.name === fullName)) {
                            members.push({ name: fullName, department: dept });
                            batch.update(teamRef, {
                                members: members,
                                expected_size: members.length,
                                last_updated: new Date().toISOString()
                            });
                        }
                    }
                }

                // 6. Commit both writes simultaneously
                await batch.commit();

                showSuccessToast(`${fullName} (${empId}) has been successfully added.`);
                
                setTimeout(() => {
                    let fromPage = 'management'; 
                    const urlParams = new URLSearchParams(window.location.search);
                    if(urlParams.get('from')) fromPage = urlParams.get('from');

                    if (typeof navigateTo === 'function') navigateTo(`${fromPage}.html`);
                    else window.location.href = `${fromPage}.html`;
                }, 2000); 

            } catch (error) {
                console.error("Error adding employee: ", error);
                if (error.code === 'auth/email-already-in-use') {
                    alert("Error: An account with this email address already exists.");
                } else {
                    alert("Error saving employee. Check console for details.");
                }
                
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