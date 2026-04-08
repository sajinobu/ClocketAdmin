// scripts/profile.js

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
                const avatarContainer = document.getElementById('hero-avatar');
                if (data.profile_picture && data.profile_picture !== "coming soon") {
                    avatarContainer.innerHTML = `<img src="${data.profile_picture}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`;
                    avatarContainer.style.backgroundColor = 'transparent'; // Hide default background circle if any
                } else {
                    const initials = (data.first_name?.charAt(0) || "") + (data.last_name?.charAt(0) || "");
                    avatarContainer.innerHTML = ''; // Clear just in case
                    avatarContainer.textContent = initials.toUpperCase() || "??";
                    avatarContainer.style.backgroundColor = ''; // Restore default CSS background
                }

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

    const waitForFirebase = setInterval(() => {
        if (window.auth && window.db) {
            clearInterval(waitForFirebase);
            window.firebaseUtils.onAuthStateChanged(window.auth, (user) => {
                if (user) loadAdminProfile();
            });
        }
    }, 50);

    // 2. SPA EVENT GUARD (Run Only Once)
    if (window.profileSPAInitialized) return;
    window.profileSPAInitialized = true;

    // 3. EVENT DELEGATION LISTENERS
    document.body.addEventListener('click', async (e) => {
        
        // --- OPEN PASSWORD MODAL ---
        const resetBtn = e.target.closest('#reset-password-btn');
        if (resetBtn) {
            e.preventDefault();
            const modal = document.getElementById('password-modal');
            if (modal) {
                // Clear the form and errors before showing
                document.getElementById('password-form').reset();
                document.getElementById('password-error').classList.add('hidden');
                
                modal.classList.remove('hidden');
                requestAnimationFrame(() => {
                    modal.classList.remove('opacity-0');
                    modal.querySelector('.modal-box').classList.remove('scale-95');
                });
            }
        }

        // --- CLOSE PASSWORD MODAL ---
        const closeBtn = e.target.closest('#close-password-modal, #cancel-password-btn, #password-modal-backdrop');
        if (closeBtn) {
            const modal = document.getElementById('password-modal');
            if (modal) {
                modal.classList.add('opacity-0');
                modal.querySelector('.modal-box').classList.add('scale-95');
                setTimeout(() => modal.classList.add('hidden'), 300);
            }
        }

        // --- FIREBASE: FORGOT PASSWORD ---
        const forgotBtn = e.target.closest('#btn-forgot-password');
        if (forgotBtn) {
            e.preventDefault();
            const user = window.auth?.currentUser;
            if (user && user.email) {
                try {
                    const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
                    await sendPasswordResetEmail(window.auth, user.email);
                    showProfileToast(`A password reset link has been sent to ${user.email}`);
                    document.getElementById('cancel-password-btn').click(); // Close Modal
                } catch(error) {
                    console.error("Forgot Password Error:", error);
                    const err = document.getElementById('password-error');
                    err.textContent = "Failed to send reset email. Please try again.";
                    err.classList.remove('hidden');
                }
            }
        }

        const editBtn = e.target.closest('a[href="profile-edit.html"]');
        if (editBtn) {
            e.preventDefault();
            const targetUrl = editBtn.getAttribute('href');
            if (typeof navigateTo === 'function') navigateTo(targetUrl);
            else window.location.href = targetUrl;
        }
    });

    // --- FIREBASE: CHANGE PASSWORD SUBMIT ---
    document.body.addEventListener('submit', async (e) => {
        if (e.target.id === 'password-form') {
            e.preventDefault();
            
            const currentPw = document.getElementById('current-password').value;
            const newPw = document.getElementById('new-password').value;
            const confirmPw = document.getElementById('confirm-password').value;
            const errorDiv = document.getElementById('password-error');
            const submitBtn = document.getElementById('save-password-btn');
            
            errorDiv.classList.add('hidden');
            
            // 1. Frontend Validation
            if (newPw !== confirmPw) {
                errorDiv.textContent = "New passwords do not match.";
                errorDiv.classList.remove('hidden');
                return;
            }
            
            // Loading State
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin inline-block mr-2"></i> Updating...`;
            if (window.lucide) lucide.createIcons();

            try {
                // Dynamically load the necessary Auth functions
                const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
                const user = window.auth.currentUser;
                
                // 2. Re-authenticate user
                const credential = EmailAuthProvider.credential(user.email, currentPw);
                await reauthenticateWithCredential(user, credential);
                
                // 3. Update the password
                await updatePassword(user, newPw);
                
                showProfileToast("Your password has been successfully updated.");
                document.getElementById('cancel-password-btn').click(); // Close Modal
                
            } catch (error) {
                console.error("Password update error:", error);
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                    errorDiv.textContent = "Incorrect current password.";
                } else if (error.code === 'auth/weak-password') {
                    errorDiv.textContent = "New password is too weak (minimum 6 characters).";
                } else {
                    errorDiv.textContent = "Failed to update password. Please try again.";
                }
                errorDiv.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
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
                <i data-lucide="check-circle" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold text-brand-darkest">Success</p>
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