(() => {
    if (window.lucide) lucide.createIcons();

    let currentEmpId = null;
    let dynamicTeamsData = {}; 
    const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

    setTimeout(() => {
        let fromPage = 'employee-profile'; 
        const urlParams = new URLSearchParams(window.location.search);
        if(urlParams.get('from')) {
            fromPage = urlParams.get('from');
        }
        
        const targetSidebarLink = (fromPage.includes('employee') || fromPage === 'management') ? 'management.html' : `${fromPage}.html`;

        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') && item.getAttribute('href').startsWith(targetSidebarLink)) {
                item.classList.add('active');
            }
        });
    }, 100);

    function updateTeamDropdown(selectedDept, preselectedTeam = "") {
        const teamMenu = document.getElementById('team-dropdown-menu');
        const teamText = document.getElementById('team-dropdown-text');
        const teamInput = document.getElementById('edit-assigned-team');
        const teamDropdown = document.getElementById('team-custom-dropdown');

        if (!teamMenu || !teamDropdown) return;

        teamMenu.innerHTML = ''; 

        if (selectedDept && dynamicTeamsData[selectedDept] && dynamicTeamsData[selectedDept].length > 0) {
            teamDropdown.classList.remove('disabled');
            
            teamMenu.innerHTML += `<div class="dropdown-item ${!preselectedTeam ? 'active' : ''}" data-value="">Unassigned</div>`;

            dynamicTeamsData[selectedDept].forEach((teamName) => {
                const isActive = teamName === preselectedTeam ? 'active' : '';
                const item = document.createElement('div');
                item.className = `dropdown-item ${isActive}`;
                item.setAttribute('data-value', teamName);
                item.textContent = teamName;
                teamMenu.appendChild(item);
            });

            if (preselectedTeam && dynamicTeamsData[selectedDept].includes(preselectedTeam)) {
                teamText.textContent = preselectedTeam;
                teamInput.value = preselectedTeam;
            } else {
                teamText.textContent = "Unassigned";
                teamInput.value = "";
            }

        } else {
            teamDropdown.classList.add('disabled');
            const message = selectedDept ? `No teams in ${selectedDept}` : "Select a department first";
            teamText.textContent = message;
            teamInput.value = "";
            
            const item = document.createElement('div');
            item.className = 'dropdown-item active';
            item.setAttribute('data-value', "");
            item.textContent = message;
            teamMenu.appendChild(item);
        }
    }

    async function loadEmployeeData() {
        if (!window.db || !window.firebaseUtils) return;

        const urlParams = new URLSearchParams(window.location.search);
        currentEmpId = urlParams.get('id');

        if (!currentEmpId) {
            alert("No employee ID provided.");
            window.location.href = 'management.html?tab=employees'; 
            return;
        }

        try {
            const { doc, getDoc, collection, getDocs } = window.firebaseUtils;

            const teamsRef = collection(window.db, "teams");
            const teamsSnap = await getDocs(teamsRef);
            
            dynamicTeamsData = {};
            teamsSnap.forEach(tDoc => {
                const tData = tDoc.data();
                const dept = tData.department || "Unassigned";
                if (!dynamicTeamsData[dept]) dynamicTeamsData[dept] = [];
                dynamicTeamsData[dept].push(tData.team_name);
            });

            const empRef = doc(window.db, "employees", currentEmpId);
            const empSnap = await getDoc(empRef);

            if (empSnap.exists()) {
                const emp = empSnap.data();

                document.getElementById('display-emp-name').textContent = emp.full_name || "Unknown";
                document.getElementById('display-emp-id').textContent = emp.employee_id || "N/A";
                
                const initialsEl = document.getElementById('emp-avatar-initials');
                const imageEl = document.getElementById('emp-avatar-preview');
                
                if (emp.profile_picture && emp.profile_picture !== "coming soon") {
                    imageEl.src = emp.profile_picture;
                    imageEl.style.display = 'block';
                    initialsEl.style.display = 'none';
                } else {
                    const parts = (emp.full_name || "U A").split(" ");
                    initialsEl.textContent = parts.length > 1 
                        ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
                        : parts[0].substring(0, 2).toUpperCase();
                    initialsEl.style.display = 'flex';
                    imageEl.style.display = 'none';
                }

                document.getElementById('edit-first-name').value = emp.first_name || "";
                document.getElementById('edit-middle-name').value = emp.middle_name || ""; 
                document.getElementById('edit-last-name').value = emp.last_name || "";
                document.getElementById('edit-email').value = emp.email || "";
                document.getElementById('edit-phone').value = emp.contact_number || "";
                document.getElementById('edit-employee-id').value = emp.employee_id || "";
                document.getElementById('edit-job-title').value = emp.job_title || "";

                const roleValue = emp.system_role || "Employee";
                const roleRadios = document.querySelectorAll('.role-radio');
                roleRadios.forEach(radio => {
                    if (radio.value === roleValue) radio.checked = true;
                });

                const deptInput = document.getElementById('edit-department');
                const deptText = document.getElementById('dept-dropdown-text');
                const deptMenu = document.getElementById('dept-dropdown-menu');
                
                if (emp.department) {
                    deptInput.value = emp.department;
                    deptText.textContent = emp.department;
                    deptMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                    const targetDept = deptMenu.querySelector(`.dropdown-item[data-value="${emp.department}"]`);
                    if (targetDept) targetDept.classList.add('active');
                }

                updateTeamDropdown(emp.department, emp.assigned_team || "");

            } else {
                alert("Employee not found.");
                window.location.href = 'management.html?tab=employees'; 
            }
        } catch (error) {
            console.error("Error loading employee data:", error);
        }
    }

    const waitForFirebase = setInterval(async () => {
        if (window.auth && window.db && window.firebaseUtils) {
            clearInterval(waitForFirebase);
            await loadEmployeeData();
        }
    }, 50);

    if (window.editEmployeeSPAInitialized) return;
    window.editEmployeeSPAInitialized = true;

    document.body.addEventListener('change', (e) => {
        if (e.target.id === 'emp-avatar-upload') {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imgPreview = document.getElementById('emp-avatar-preview');
                    const initialsPreview = document.getElementById('emp-avatar-initials');
                    
                    if (imgPreview && initialsPreview) {
                        imgPreview.src = event.target.result;
                        imgPreview.style.display = 'block';
                        initialsPreview.style.display = 'none';
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    });

    document.body.addEventListener('click', (e) => {
        if (!document.getElementById('edit-employee-form')) return;
        
        // --- BULLETPROOF BACK & CANCEL ROUTING ---
        const routeBtn = e.target.closest('#dynamic-back-btn, #dynamic-cancel-btn');
        if (routeBtn) {
            e.preventDefault();
            const currentParams = new URLSearchParams(window.location.search);
            const safeEmpId = currentParams.get('id');
            const currentFrom = currentParams.get('from') || 'management';
            const teamId = currentParams.get('teamId'); 
            
            let finalUrl = 'management.html?tab=employees';
            
            if (safeEmpId) {
                finalUrl = `employee-profile.html?id=${safeEmpId}&from=${currentFrom}`;
                if (teamId) finalUrl += `&teamId=${teamId}`;
            }

            // FORCE HARD REDIRECT
            window.location.href = finalUrl; 
        }

        const cameraBtn = e.target.closest('.btn-camera');
        if (cameraBtn) {
            e.preventDefault();
            const fileInput = document.getElementById('emp-avatar-upload');
            if (fileInput) fileInput.click();
        }

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
            }
            
            dropdown.classList.remove('open');

            if (dropdown.id === 'dept-custom-dropdown') {
                updateTeamDropdown(value, "");
            }
        }
    });

    document.body.addEventListener('submit', async (e) => {
        if (e.target.id === 'edit-employee-form') {
            e.preventDefault();
            
            if (!currentEmpId) return;

            const submitBtn = document.querySelector('button[form="edit-employee-form"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin inline-block"></i> Saving...`;
            if (window.lucide) lucide.createIcons();

            try {
                const firstName = document.getElementById('edit-first-name').value.trim();
                const middleName = document.getElementById('edit-middle-name').value.trim();
                const lastName = document.getElementById('edit-last-name').value.trim();
                const fullName = `${firstName} ${lastName}`.trim();
                
                const contactNumber = document.getElementById('edit-phone').value.trim();
                const department = document.getElementById('edit-department').value;
                const assignedTeam = document.getElementById('edit-assigned-team').value;
                const jobTitle = document.getElementById('edit-job-title').value.trim();
                
                const systemRole = document.querySelector('input[name="system-role"]:checked').value;

                const { doc, updateDoc } = window.firebaseUtils;
                const docRef = doc(window.db, "employees", currentEmpId);

                await updateDoc(docRef, {
                    first_name: firstName,
                    middle_name: middleName,
                    last_name: lastName,
                    full_name: fullName,
                    contact_number: contactNumber,
                    department: department,
                    assigned_team: assignedTeam,
                    job_title: jobTitle,
                    system_role: systemRole,
                    updated_at: new Date().toISOString()
                });

                showSuccessToast(`Profile for ${fullName} has been successfully updated.`);
                
                setTimeout(() => {
                    const currentParams = new URLSearchParams(window.location.search);
                    const safeEmpId = currentParams.get('id');
                    const currentFrom = currentParams.get('from') || 'management';
                    const teamId = currentParams.get('teamId');
                    
                    let finalUrl = 'management.html?tab=employees';
                    
                    if (safeEmpId) {
                        finalUrl = `employee-profile.html?id=${safeEmpId}&from=${currentFrom}`;
                        if (teamId) finalUrl += `&teamId=${teamId}`;
                    }

                    // FORCE HARD REDIRECT
                    window.location.href = finalUrl; 
                }, 2000);

            } catch (error) {
                console.error("Error updating profile:", error);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                alert("Failed to update profile. Please try again.");
            }
        }
    });

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