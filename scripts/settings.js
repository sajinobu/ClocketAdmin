// scripts/settings.js

(() => {
    // ==========================================
    // 1. RUN EVERY TIME (UI Initialization)
    // ==========================================
    if (window.lucide) lucide.createIcons();

    // Highlight Correct Sidebar Link
    setTimeout(() => {
        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
        });
        const activeSidebarLink = document.querySelector(`.sidebar-item[href="settings.html"], .nav-link[href="settings.html"]`);
        if (activeSidebarLink) {
            activeSidebarLink.classList.add('active');
        }
    }, 100);

    // --- PRE-LOAD SETTINGS (Moved above the SPA guard!) ---
    // This ensures the toggle visually updates every time you open the Settings page
    const compactToggle = document.getElementById('toggle-compact-mode');
    if (compactToggle) {
        compactToggle.checked = localStorage.getItem('clocket_compact_mode') === 'true';
    }

    // ==========================================
    // 2. SPA EVENT GUARD (Run Only Once)
    // ==========================================
    if (window.settingsSPAInitialized) return;
    window.settingsSPAInitialized = true;

    // ==========================================
    // 3. EVENT DELEGATION LISTENERS
    // ==========================================
    
    // Toggle Switches (Change Event)
    document.body.addEventListener('change', (e) => {
        if (e.target.id === 'toggle-compact-mode') {
            const isEnabled = e.target.checked;
            localStorage.setItem('clocket_compact_mode', isEnabled);
            
            // Instantly apply or remove the class to the body
            if (isEnabled) {
                document.body.classList.add('compact-mode');
            } else {
                document.body.classList.remove('compact-mode');
            }
            
            showSettingsToast(isEnabled ? "Compact mode enabled." : "Compact mode disabled.");
        }
    });

    // Buttons (Click Event)
    document.body.addEventListener('click', async (e) => {
        const downloadBtn = e.target.closest('#download-data-btn');
        
        if (downloadBtn && !downloadBtn.disabled) {
            if (!window.auth || !window.db || !window.firebaseUtils) {
                showSettingsToast("System is still loading. Please try again in a moment.");
                return;
            }

            const currentUser = window.auth.currentUser;
            if (!currentUser) {
                showSettingsToast("Error: No authenticated user found.");
                return;
            }

            const originalContent = downloadBtn.innerHTML;
            
            downloadBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Preparing Archive...`;
            downloadBtn.disabled = true;
            if (window.lucide) lucide.createIcons();

            try {
                const { doc, getDoc, collection, query, where, getDocs } = window.firebaseUtils;

                const profileRef = doc(window.db, "employees", currentUser.email);
                const profileSnap = await getDoc(profileRef);
                const profileData = profileSnap.exists() ? profileSnap.data() : { error: "Profile not found" };

                const attQuery = query(collection(window.db, "attendance"), where("employee_id", "==", currentUser.email));
                const attSnap = await getDocs(attQuery);
                const attendanceHistory = [];
                
                attSnap.forEach(docSnap => {
                    attendanceHistory.push(docSnap.data());
                });

                attendanceHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

                const exportData = {
                    exportDate: new Date().toISOString(),
                    accountInfo: {
                        uid: currentUser.uid,
                        email: currentUser.email,
                    },
                    profile: profileData,
                    attendanceRecords: attendanceHistory
                };

                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", `Clocket_DataExport_${currentUser.email}.json`);
                
                document.body.appendChild(downloadAnchorNode); 
                downloadAnchorNode.click();
                downloadAnchorNode.remove();

                showSettingsToast("Your data archive has been successfully downloaded.");

            } catch (error) {
                console.error("Data Export Error:", error);
                showSettingsToast("Failed to compile your data. Please check console.");
            } finally {
                downloadBtn.innerHTML = originalContent;
                downloadBtn.disabled = false;
                if (window.lucide) lucide.createIcons();
            }
        }
    });

    // ==========================================
    // 4. HELPER: Modern Brand Toast Utility
    // ==========================================
    function showSettingsToast(message) {
        const existingToast = document.querySelector('.settings-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `settings-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] transition-all duration-500 transform translate-y-20 opacity-0`;
        toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 320px;";

        toast.innerHTML = `
            <div class="w-10 h-10 bg-[rgba(99,102,241,0.1)] text-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="settings" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-bold">Settings Updated</p>
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
        }, 3500);
    }
})();