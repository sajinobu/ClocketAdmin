(() => {
    // 1. RUN EVERY TIME
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
        const empId = urlParams.get('id'); // This is the user's email

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

                // 1. Generate Default Profile Picture
                const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
                
                const avatarImg = document.getElementById('profile-avatar');
                if (emp.profile_picture && emp.profile_picture !== "coming soon") {
                    avatarImg.src = emp.profile_picture; // Use their real photo if they have one!
                } else {
                    avatarImg.src = defaultAvatar; // Use the silhouette
                }

                // 2. Populate Hero Section
                document.getElementById('profile-name').textContent = emp.full_name || "Unknown";
                document.getElementById('profile-role').textContent = emp.role || "Employee";
                
                const deptEl = document.getElementById('profile-dept');
                if (deptEl) deptEl.innerHTML = `<i data-lucide="briefcase" class="meta-icon"></i> ${emp.department || "Unassigned"}`;

                // 3. Populate Contact & Employment Details
                document.getElementById('profile-email').textContent = emp.email || "N/A";
                document.getElementById('profile-phone').textContent = emp.contact_number || "N/A";
                document.getElementById('profile-emp-id').textContent = emp.employee_id || "N/A";
                document.getElementById('profile-team').textContent = emp.assigned_team || "N/A";
                document.getElementById('profile-system-role').textContent = emp.system_role || "Employee";

                // Format Hire Date (Using created_at)
                if (emp.created_at) {
                    // Extract just the date part (YYYY-MM-DD) from the string "YYYY-MM-DD HH:MM:SS"
                    const dateOnly = emp.created_at.split(" ")[0];
                    document.getElementById('profile-hire-date').textContent = dateOnly;
                }

                // 4. Update Header Buttons to pass the ID forward
                const editBtn = document.getElementById('edit-profile-btn');
                if (editBtn) editBtn.href = `employee-edit-profile.html?from=employee-profile&id=${empId}`;
                
                const logBtn = document.getElementById('view-log-btn');
                if (logBtn) logBtn.href = `employee-logs.html?from=employee-profile&id=${empId}`;

                if (window.lucide) lucide.createIcons();
            } else {
                document.getElementById('profile-name').textContent = "Employee Not Found in Database";
            }
        } catch (error) {
            console.error("Error fetching profile details:", error);
            document.getElementById('profile-name').textContent = "Error Loading Profile";
        }
    }

    // Wait for Firebase to load before fetching
    const waitForFirebase = setInterval(() => {
        if (window.firebaseUtils && window.db) {
            clearInterval(waitForFirebase);
            loadEmployeeProfile();
        }
    }, 50);

    // 2. SPA EVENT GUARD (Run Only Once)
    if (window.employeeProfileSPAInitialized) return;
    window.employeeProfileSPAInitialized = true;

    // 3. EVENT DELEGATION LISTENERS
    document.body.addEventListener('click', (e) => {
        // NEW PAGE GUARD: Only run if the profile name exists on screen
        if (!document.getElementById('profile-name')) return;
        
        // --- Dynamic Back Button Routing ---
        const backBtn = e.target.closest('#dynamic-back-btn');
        if (backBtn) {
            e.preventDefault();
            
            let currentFrom = 'management'; 
            const currentParams = new URLSearchParams(window.location.search);
            if(currentParams.get('from')) {
                currentFrom = currentParams.get('from');
            }
            const returnUrl = `${currentFrom}.html`;

            if (typeof navigateTo === 'function') {
                navigateTo(returnUrl);
            } else {
                window.location.href = returnUrl;
            }
        }

        // --- Edit Details Button Intercept ---
        const editBtn = e.target.closest('a[href^="employee-edit-profile.html"]');
        if (editBtn) {
            e.preventDefault();
            const targetUrl = editBtn.getAttribute('href');
            if (typeof navigateTo === 'function') {
                navigateTo(targetUrl);
            } else {
                window.location.href = targetUrl;
            }
        }
        
        // --- View Full Log Button Intercept ---
        const logBtn = e.target.closest('a[href^="employee-logs.html"]');
        if (logBtn) {
            e.preventDefault();
            const targetUrl = logBtn.getAttribute('href');
            if (typeof navigateTo === 'function') {
                navigateTo(targetUrl);
            } else {
                window.location.href = targetUrl;
            }
        }
    });
})();