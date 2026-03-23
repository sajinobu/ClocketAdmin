(() => {
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        let fromPage = 'management'; 
        const urlParams = new URLSearchParams(window.location.search);
        if(urlParams.get('from')) {
            fromPage = urlParams.get('from');
        }

        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') && item.getAttribute('href').startsWith(fromPage)) {
                item.classList.add('active');
            }
        });
    }, 100);

    // --- FIREBASE: LOAD EMPLOYEE PROFILE ---
    async function loadEmployeeProfile() {
        const urlParams = new URLSearchParams(window.location.search);
        const empId = urlParams.get('id');

        if (!empId) {
            document.getElementById('profile-name').textContent = "Error: No Employee Selected";
            return;
        }

        try {
            const { doc, getDoc } = window.firebaseUtils;
            const docRef = doc(window.db, "employees", empId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const emp = docSnap.data();

                const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
                
                const avatarImg = document.getElementById('profile-avatar');
                if (emp.profile_picture && emp.profile_picture !== "coming soon") {
                    avatarImg.src = emp.profile_picture; 
                } else {
                    avatarImg.src = defaultAvatar; 
                }

                document.getElementById('profile-name').textContent = emp.full_name || "Unknown";
                document.getElementById('profile-role').textContent = emp.role || "Employee";
                
                const deptEl = document.getElementById('profile-dept');
                if (deptEl) deptEl.innerHTML = `<i data-lucide="briefcase" class="meta-icon"></i> ${emp.department || "Unassigned"}`;

                document.getElementById('profile-email').textContent = emp.email || "N/A";
                document.getElementById('profile-phone').textContent = emp.contact_number || "N/A";
                document.getElementById('profile-emp-id').textContent = emp.employee_id || "N/A";
                document.getElementById('profile-team').textContent = emp.assigned_team || "N/A";
                document.getElementById('profile-system-role').textContent = emp.system_role || "Employee";

                if (emp.created_at) {
                    const dateOnly = emp.created_at.split(" ")[0];
                    document.getElementById('profile-hire-date').textContent = dateOnly;
                }
                
                if (window.lucide) lucide.createIcons();
            } else {
                document.getElementById('profile-name').textContent = "Employee Not Found in Database";
            }
        } catch (error) {
            console.error("Error fetching profile details:", error);
            document.getElementById('profile-name').textContent = "Error Loading Profile";
        }
    }

    const waitForFirebase = setInterval(() => {
        if (window.firebaseUtils && window.db) {
            clearInterval(waitForFirebase);
            loadEmployeeProfile();
        }
    }, 50);

    if (window.employeeProfileSPAInitialized) return;
    window.employeeProfileSPAInitialized = true;

    // --- BULLETPROOF ROUTING LISTENERS ---
    document.body.addEventListener('click', (e) => {
        if (!document.getElementById('profile-name')) return;
        
        // 1. Back Button
        const backBtn = e.target.closest('#dynamic-back-btn');
        if (backBtn) {
            e.preventDefault();
            const urlParams = new URLSearchParams(window.location.search);
            const fromPage = urlParams.get('from') || 'management';
            
            let returnUrl = 'management.html?tab=employees'; 
            
            if (fromPage === 'team-details') {
                const teamId = urlParams.get('teamId');
                returnUrl = teamId ? `team-details.html?id=${teamId}` : 'management.html?tab=teams';
            } 
            else if (fromPage !== 'management') {
                returnUrl = `${fromPage}.html`;
            }

            // FORCE HARD REDIRECT
            window.location.href = returnUrl;
        }

        // 2. Edit Details Button
        const editBtn = e.target.closest('a[href*="employee-edit-profile"]');
        if (editBtn) {
            e.preventDefault();
            const currentParams = new URLSearchParams(window.location.search);
            const empId = currentParams.get('id');
            const fromParam = currentParams.get('from') || 'management';
            const teamId = currentParams.get('teamId');

            let targetUrl = `employee-edit-profile.html?id=${empId}&from=${fromParam}`;
            if (teamId) targetUrl += `&teamId=${teamId}`;

            // FORCE HARD REDIRECT
            window.location.href = targetUrl;
        }
        
        // 3. View Logs Button
        const logBtn = e.target.closest('a[href*="employee-logs"]');
        if (logBtn) {
            e.preventDefault();
            const currentParams = new URLSearchParams(window.location.search);
            const empId = currentParams.get('id');
            const fromParam = currentParams.get('from') || 'management';
            const teamId = currentParams.get('teamId');

            let targetUrl = `employee-logs.html?id=${empId}&from=${fromParam}`;
            if (teamId) targetUrl += `&teamId=${teamId}`;

            // FORCE HARD REDIRECT
            window.location.href = targetUrl;
        }
    });
})();