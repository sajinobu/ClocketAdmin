(() => {
    // 1. RUN EVERY TIME (UI Initialization)
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
        });
    }, 100);

    // --- FIREBASE: LOAD LOGGED-IN ADMIN DATA ---
    async function loadAdminProfile() {
        // Wait for Auth to initialize if it hasn't yet
        if (!window.auth || !window.firebaseUtils) return;

        const user = window.auth.currentUser;
        if (!user) {
            console.error("No user logged in.");
            return;
        }

        try {
            const { doc, getDoc } = window.firebaseUtils;
            const docRef = doc(window.db, "employees", user.email);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // 1. Hero & Avatar
                const initials = (data.first_name?.charAt(0) || "") + (data.last_name?.charAt(0) || "");
                document.getElementById('hero-avatar').textContent = initials.toUpperCase() || "??";
                document.getElementById('hero-name').textContent = data.full_name || "Admin";
                document.getElementById('hero-role').textContent = data.role || "Administrator";
                document.getElementById('hero-email').textContent = data.email;

                // 2. Metrics
                document.getElementById('metric-emp-id').textContent = data.employee_id || "N/A";
                document.getElementById('metric-dept').textContent = data.department || "Management";

                // 3. Detailed List
                document.getElementById('detail-full-name').textContent = data.full_name;
                document.getElementById('detail-email').textContent = data.email;
                document.getElementById('detail-phone').textContent = data.contact_number || "None provided";
                document.getElementById('detail-system-role').textContent = data.system_role || "Admin";
                
                if (data.created_at) {
                    const dateOnly = data.created_at.split(" ")[0];
                    document.getElementById('detail-join-date').textContent = dateOnly;
                }

            } else {
                console.warn("No Firestore document found for this admin.");
            }
        } catch (error) {
            console.error("Error fetching admin profile:", error);
        }
    }

    // Trigger loading when Firebase is ready
    const waitForFirebase = setInterval(() => {
        if (window.auth && window.db) {
            clearInterval(waitForFirebase);
            // We use onAuthStateChanged to ensure the user is fully caught by the browser
            window.firebaseUtils.onAuthStateChanged(window.auth, (user) => {
                if (user) loadAdminProfile();
            });
        }
    }, 50);

    // 2. SPA EVENT GUARD (Run Only Once)
    if (window.profileSPAInitialized) return;
    window.profileSPAInitialized = true;

    // 3. EVENT DELEGATION LISTENERS
    document.body.addEventListener('click', (e) => {
        if (!document.getElementById('reset-password-btn')) return;

        const resetBtn = e.target.closest('#reset-password-btn');
        if (resetBtn) {
            e.preventDefault();
            const user = window.auth?.currentUser;
            if (user && user.email) {
                // You can add actual Firebase SendPasswordResetEmail here later!
                showProfileToast(`A password reset link has been sent to ${user.email}`);
            }
        }

        const editBtn = e.target.closest('a[href="profile-edit.html"]');
        if (editBtn) {
            e.preventDefault();
            const targetUrl = editBtn.getAttribute('href');
            if (typeof navigateTo === 'function') {
                navigateTo(targetUrl);
            } else {
                window.location.href = targetUrl;
            }
        }
    });

    function showProfileToast(message) {
        const existingToast = document.querySelector('.profile-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `profile-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 320px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(99,102,241,0.1)] text-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="mail-check" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold text-brand-darkest">Reset Email Sent</p>
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
        }, 3000);
    }
})();