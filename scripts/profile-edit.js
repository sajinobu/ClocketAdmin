// scripts/profile-edit.js

(() => {
    // 1. RUN EVERY TIME (UI Initialization)
    if (window.lucide) lucide.createIcons();

    // Variable to hold the new profile picture base64 string
    let newProfilePictureBase64 = null;

    // --- FIREBASE: LOAD CURRENT DATA INTO FORM ---
    async function loadAdminDataForEdit() {
        if (!window.auth || !window.db || !window.firebaseUtils) return;

        const user = window.auth.currentUser;
        if (!user) return;

        try {
            const { doc, getDoc } = window.firebaseUtils;
            const docRef = doc(window.db, "employees", user.email);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // 1. Populate Hero
                const initials = (data.first_name?.charAt(0) || "") + (data.last_name?.charAt(0) || "");
                const previewEl = document.getElementById('avatar-preview');
                if (previewEl) previewEl.textContent = initials.toUpperCase();
                
                document.getElementById('display-name').textContent = data.full_name;
                document.getElementById('display-role').textContent = data.role || "Administrator";

                // 2. Populate Form Inputs
                document.getElementById('admin-name').value = data.full_name || "";
                document.getElementById('admin-email').value = data.email || "";
                document.getElementById('admin-phone').value = data.contact_number || "";
                document.getElementById('admin-emp-id').value = data.employee_id || "N/A";
                document.getElementById('admin-system-role').value = data.system_role || "Admin";

                // If they have a profile picture, show it
                if (data.profile_picture && data.profile_picture !== "coming soon") {
                    previewEl.innerHTML = '';
                    previewEl.style.backgroundImage = `url(${data.profile_picture})`;
                    previewEl.style.backgroundSize = 'cover';
                    previewEl.style.backgroundPosition = 'center';
                }
            }
        } catch (error) {
            console.error("Error loading profile for edit:", error);
        }
    }

    // Wait for Firebase Auth
    const waitForFirebase = setInterval(() => {
        if (window.auth && window.db) {
            clearInterval(waitForFirebase);
            window.firebaseUtils.onAuthStateChanged(window.auth, (user) => {
                if (user) loadAdminDataForEdit();
            });
        }
    }, 50);

    // 2. SPA EVENT GUARD (Run Only Once)
    if (window.profileEditSPAInitialized) return;
    window.profileEditSPAInitialized = true;

    // --- EVENT LISTENERS ---
    document.body.addEventListener('click', (e) => {
        if (!document.getElementById('admin-edit-form')) return;
        
        // Back & Cancel Routing
        const routeBtn = e.target.closest('#dynamic-back-btn, #dynamic-cancel-btn');
        if (routeBtn) {
            e.preventDefault();
            if (typeof navigateTo === 'function') navigateTo('profile.html');
            else window.location.href = 'profile.html';
        }

        // Avatar Upload Button Click
        const cameraBtn = e.target.closest('.btn-camera');
        if (cameraBtn) {
            e.preventDefault();
            document.getElementById('avatar-upload')?.click();
        }
    });

    // --- Avatar File Selection Logic (Local Preview & Memory Storage) ---
    document.body.addEventListener('change', (e) => {
        if (e.target.id === 'avatar-upload') {
            const file = e.target.files[0];
            if (file) {
                // Strict Firestore Limit: Prevent files larger than 500KB
                if (file.size > 500 * 1024) {
                    alert("❌ Image is too large. Please select an image under 500KB.");
                    e.target.value = ''; // Reset input
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    // Save the base64 string to our variable so we can push it to Firebase later
                    newProfilePictureBase64 = event.target.result;

                    const avatarPreview = document.getElementById('avatar-preview');
                    if (avatarPreview) {
                        avatarPreview.innerHTML = ''; 
                        avatarPreview.style.backgroundImage = `url(${event.target.result})`;
                        avatarPreview.style.backgroundSize = 'cover';
                        avatarPreview.style.backgroundPosition = 'center';
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    });

    // --- SAVE CHANGES LOGIC ---
    document.body.addEventListener('submit', async (e) => {
        if (e.target.id === 'admin-edit-form') {
            e.preventDefault();
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            // UI Loading State
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Saving...`;
            if (window.lucide) lucide.createIcons();

            try {
                const { doc, updateDoc } = window.firebaseUtils;
                const user = window.auth.currentUser;
                const docRef = doc(window.db, "employees", user.email);

                const newFullName = document.getElementById('admin-name').value.trim();
                const names = newFullName.split(" ");
                const firstName = names[0];
                const lastName = names.length > 1 ? names.slice(1).join(" ") : "";

                // Build the data object
                const updatePayload = {
                    full_name: newFullName,
                    first_name: firstName,
                    last_name: lastName,
                    contact_number: document.getElementById('admin-phone').value.trim()
                };

                // If the user selected a new profile picture, add it to the payload
                if (newProfilePictureBase64) {
                    updatePayload.profile_picture = newProfilePictureBase64;
                }

                // Update Firestore
                await updateDoc(docRef, updatePayload);

                // Trigger the restored Toast function!
                showSuccessToast("Your profile details have been updated.");
                
                setTimeout(() => {
                    if (typeof navigateTo === 'function') navigateTo('profile.html');
                    else window.location.href = 'profile.html';
                }, 1500);

            } catch (error) {
                console.error("Save Error:", error);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                alert("Failed to save changes. Please try again.");
            }
        }
    });

    // --- Custom Brand Toast Utility (RESTORED) ---
    function showSuccessToast(message) {
        const existingToast = document.querySelector('.profile-edit-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `profile-edit-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 320px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(99,102,241,0.1)] text-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="check-circle" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold">Profile Saved</p>
                <p class="text-xs opacity-80 mt-0.5">${message}</p>
            </div>
        `;

        document.body.appendChild(toast);
        if (window.lucide) lucide.createIcons();

        // Animate In
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-20', 'opacity-0');
        });
        
        // Animate Out
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 1500);
    }
})();