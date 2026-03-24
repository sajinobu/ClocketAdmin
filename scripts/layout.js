// ==========================================
// THEME INITIALIZATION (Runs immediately)
// ==========================================
if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

// ==========================================
// CORE LAYOUT INITIALIZATION
// ==========================================
async function loadLayout() {
    try {
        const headerPlaceholder = document.getElementById('header-placeholder');
        const sidebarPlaceholder = document.getElementById('sidebar-placeholder');

        let layoutPromises = [];

        // Fetch header and sidebar simultaneously if they exist and are empty
        if (headerPlaceholder && !headerPlaceholder.innerHTML.trim()) {
            layoutPromises.push(
                fetch('header.html')
                    .then(res => res.text())
                    .then(html => headerPlaceholder.innerHTML = html)
            );
        }
        
        if (sidebarPlaceholder && !sidebarPlaceholder.innerHTML.trim()) {
            layoutPromises.push(
                fetch('sidebar.html')
                    .then(res => res.text())
                    .then(html => sidebarPlaceholder.innerHTML = html)
            );
        }

        // Wait for both to finish injecting
        await Promise.all(layoutPromises);

        initializeGlobalUI();
        updateActiveLinks();
        
        // NEW: Fetch and populate the user's data!
        updateSidebarProfile(); 

    } catch (error) {
        console.error("Error loading layout:", error);
    }
}

function updateThemeIcon() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        const isDark = document.documentElement.classList.contains('dark');
        // FIXED: Removed hardcoded colors. The SVG will inherit 'text-brand-darkest' from the button!
        themeToggleBtn.innerHTML = isDark 
            ? '<i data-lucide="sun" class="w-5 h-5"></i>' 
            : '<i data-lucide="moon" class="w-5 h-5"></i>';
        
        if (window.lucide) lucide.createIcons({ root: themeToggleBtn });
    }
}

// ==========================================
// GLOBAL UI SETUP
// ==========================================
let isGlobalUIInitialized = false;

function initializeGlobalUI() {
    if (isGlobalUIInitialized) return;

    if (window.lucide) lucide.createIcons();

    // Date
    const dateEl = document.getElementById('header-date');
    if (dateEl) {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }

    // Set the initial Theme Icon
    updateThemeIcon();

    // --- Dark Mode Toggle ---
    if (!window._themeToggleBound) {
        document.addEventListener('click', (e) => {
            const themeToggleBtn = e.target.closest('#theme-toggle-btn');
            if (themeToggleBtn) {
                const htmlEl = document.documentElement;
                
                if (htmlEl.classList.contains('dark')) {
                    htmlEl.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                } else {
                    htmlEl.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                }
                
                // Update the icon immediately after toggling
                updateThemeIcon();
            }
        });
        window._themeToggleBound = true;
    }

    // Mobile Menu
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('app-sidebar');

    if (mobileMenuBtn && sidebarOverlay && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            sidebarOverlay.classList.toggle('active');
        });
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            sidebarOverlay.classList.remove('active');
        });
    }

    // Profile Dropdown
    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');

    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.add('hidden');
            }
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        // Remove old listeners to prevent duplicates
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        newLogoutBtn.addEventListener('click', async (e) => {
            e.preventDefault(); 
            if (window.auth && window.firebaseUtils) {
                try {
                    // Tell Firebase to destroy the session token
                    await window.firebaseUtils.signOut(window.auth);
                    // Hard redirect to login page to clear all memory
                    window.location.href = 'index.html'; 
                } catch(error) {
                    console.error("Logout failed", error);
                }
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    isGlobalUIInitialized = true;
}

// ==========================================
// SPA ROUTER ENGINE WITH FIREBASE AUTH
// ==========================================
function setupRouter() {
    // 1. Handle normal link clicks
    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href && link.host === window.location.host && link.pathname.endsWith('.html')) {
            e.preventDefault();
            navigateTo(link.href);
        }
    });

    // 2. Intercept Global Form Submissions (Specifically the Login Form)
    document.body.addEventListener('submit', async (e) => {
        if (e.target.id === 'login-form') {
            e.preventDefault();
            
            const submitBtn = document.getElementById('login-submit-btn');
            
            // ANTI-DOUBLE-CLICK GUARD: Stop immediately if the button is already loading
            if (submitBtn.disabled) return; 

            // Always grab the freshest live input values
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('login-error');
            const targetUrl = e.target.getAttribute('action');
            
            // UI Loading State
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin"></i>`;
            if (window.lucide) lucide.createIcons();
            errorDiv.classList.add('hidden');
            errorDiv.textContent = "";

            try {
                if (!window.auth || !window.firebaseUtils) {
                    throw new Error("Cannot connect to server. Please refresh the page.");
                }

                const { signInWithEmailAndPassword, signOut, doc, getDoc } = window.firebaseUtils;
                
                // 1. ATTEMPT FIREBASE LOGIN
                const userCredential = await signInWithEmailAndPassword(window.auth, email, password);
                
                // 2. THE BOUNCER: Fetch the user's document from Firestore
                const userDocRef = doc(window.db, "employees", email);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    
                    // 3. CHECK THE ROLE
                    // You can allow "Manager" here too later if you want them to access the portal
                    if (userData.system_role === "Admin") {
                        // SUCCESS! Route to the dashboard
                        navigateTo(targetUrl);
                    } else {
                        // KICK THEM OUT
                        await signOut(window.auth);
                        throw new Error("unauthorized");
                    }
                } else {
                    // Record doesn't exist in the database, only in Auth
                    await signOut(window.auth);
                    throw new Error("no-database-record");
                }

            } catch (error) {
                console.error("Login Error:", error);
                
                // Show user-friendly error messages
                errorDiv.classList.remove('hidden');
                
                // Handle our custom Bouncer errors
                if (error.message === "unauthorized") {
                    errorDiv.textContent = "Access Denied: Administrator privileges required.";
                } else if (error.message === "no-database-record") {
                    errorDiv.textContent = "Account error: Employee record not found.";
                } 
                // Handle standard Firebase Auth errors
                else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    errorDiv.textContent = "Invalid email or password.";
                } else if (error.code === 'auth/too-many-requests') {
                    errorDiv.textContent = "Too many attempts. Try again later.";
                } else {
                    errorDiv.textContent = "Error logging in. Please try again.";
                }

                submitBtn.disabled = false;
                submitBtn.innerHTML = "Sign In to Dashboard";
            }
        }
    });

    window.addEventListener('popstate', () => {
        navigateTo(window.location.href, false);
    });
}

async function navigateTo(url, pushState = true) {
    try {
        // 1. Fetch new HTML immediately
        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 2. Determine if we need a full body swap (Login <-> Dashboard)
        const currentHasLayout = document.getElementById('header-placeholder') !== null;
        const newHasLayout = doc.getElementById('header-placeholder') !== null;
        const isFullSwap = currentHasLayout !== newHasLayout;

        const mainEl = document.querySelector('main');
        const targetEl = isFullSwap ? document.body : mainEl;

        // 3. Trigger CSS Fade Out
        if (targetEl) {
            if (!isFullSwap) targetEl.classList.add('app-main-transition');
            targetEl.classList.add('fade-out');
        }

        // Wait for fade out animation to finish (200ms)
        await new Promise(resolve => setTimeout(resolve, 200));

        // 4. Inject Missing Stylesheets
        const newStylesheets = doc.querySelectorAll('link[rel="stylesheet"]');
        newStylesheets.forEach(link => {
            const href = link.getAttribute('href');
            if (!document.querySelector(`link[href="${href}"]`)) {
                const newStyle = document.createElement('link');
                newStyle.rel = 'stylesheet';
                newStyle.href = href;
                document.head.appendChild(newStyle);
            }
        });

        if (pushState) window.history.pushState({}, '', url);
        document.title = doc.title;

        // 5. Swap DOM Content
        if (isFullSwap) {
            document.body.innerHTML = doc.body.innerHTML;
            document.body.className = doc.body.className;
            document.body.classList.add('fade-out'); // Keep hidden while loading layout
            
            isGlobalUIInitialized = false; 

            if (newHasLayout) {
                await loadLayout(); // Wait for Header/Sidebar to fully load!
            }
            finalizeTransition(doc, document.body);

        } else {
            if (mainEl) {
                const newMain = doc.querySelector('main');
                mainEl.innerHTML = newMain.innerHTML;
                mainEl.className = newMain.className; 
                mainEl.classList.add('app-main-transition', 'fade-out'); // Keep hidden initially
                
                updateActiveLinks();
                finalizeTransition(doc, mainEl);
            }
        }

    } catch (error) {
        console.error("Routing error:", error);
        window.location.href = url; // Fallback
    }
}

function finalizeTransition(doc, targetEl) {
    if (window.lucide) lucide.createIcons();
    executePageScript(doc);

    // Double requestAnimationFrame ensures the browser paints the new DOM before fading in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            targetEl.classList.remove('fade-out');
            
            // Close mobile menu if open
            const sidebar = document.getElementById('app-sidebar');
            const sidebarOverlay = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.remove('mobile-open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        });
    });
}

function updateActiveLinks() {
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        const linkHref = link.getAttribute('href')?.split('?')[0]; 
        if (linkHref === currentPath) {
            link.classList.add('active');
        }
    });
}

function executePageScript(doc) {
    // FIXED: Added 'body ' to the selector so it ignores the <head> scripts!
    const pageScript = doc.querySelector('body script[src^="scripts/"]:not([src*="layout.js"])');
    
    if (pageScript) {
        const oldScript = document.getElementById('dynamic-page-script');
        if (oldScript) oldScript.remove();

        const newScript = document.createElement('script');
        newScript.src = pageScript.src;
        newScript.id = 'dynamic-page-script';
        document.body.appendChild(newScript);
    }
}

// ==========================================
// DYNAMIC SIDEBAR PROFILE
// ==========================================
async function updateSidebarProfile() {
    // Make sure Firebase is ready and a user is actually logged in
    if (!window.auth || !window.auth.currentUser || !window.firebaseUtils) return;
    
    const email = window.auth.currentUser.email;

    try {
        const { doc, getDoc } = window.firebaseUtils;
        const docRef = doc(window.db, "employees", email);
        const docSnap = await getDoc(docRef);

        // The default avatar SVG string
        const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

        if (docSnap.exists()) {
            const emp = docSnap.data();
            
            // Find the sidebar elements
            const nameEl = document.querySelector('.profile-name');
            const emailEl = document.querySelector('.profile-email');
            const avatarEl = document.querySelector('.profile-avatar');

            // Update text
            if (nameEl) nameEl.textContent = emp.full_name || "Admin";
            if (emailEl) emailEl.textContent = emp.email || email;
            
            // Update Avatar (Custom Image or Default Icon)
            if (avatarEl) {
                // Determine which image source to use
                const avatarSrc = (emp.profile_picture && emp.profile_picture !== "coming soon") 
                    ? emp.profile_picture 
                    : defaultAvatar;
                
                // Clear any leftover initials
                avatarEl.textContent = ""; 
                
                // Inject the image
                avatarEl.innerHTML = `<img src="${avatarSrc}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                avatarEl.style.background = 'transparent'; 
            }
        }
    } catch (error) {
        console.error("Error updating sidebar profile:", error);
    }
}

// Initial Load Bootstrapper
document.addEventListener('DOMContentLoaded', () => {
    // 1. Wait a split second for firebase-config.js to attach to the window
    const checkFirebase = setInterval(() => {
        if (window.auth && window.firebaseUtils) {
            clearInterval(checkFirebase);
            
            const { onAuthStateChanged } = window.firebaseUtils;
            let isInitialLoad = true;

            // 2. THE SESSION GUARD: Listen for Firebase to verify the token
            onAuthStateChanged(window.auth, async (user) => {
                const currentPath = window.location.pathname.split('/').pop() || 'login.html';
                // Check if they are on the login page (adjust 'index.html' if your login page is named differently)
                const isLoginPage = currentPath === 'login.html' || currentPath === 'index.html' || currentPath === '';

                if (user) {
                    // --- SCENARIO A: USER IS LOGGED IN ---
                    if (isLoginPage) {
                        // If they go to the login page while logged in, bounce them to the dashboard!
                        window.location.href = 'dashboard.html'; 
                    } else if (isInitialLoad) {
                        // Standard page load: Load the UI safely
                        await loadLayout();
                        setupRouter();
                        isInitialLoad = false;
                    }
                } else {
                    // --- SCENARIO B: USER IS LOGGED OUT ---
                    if (!isLoginPage) {
                        // If they try to access the dashboard while logged out, kick them to login!
                        window.location.href = 'login.html'; 
                    } else if (isInitialLoad) {
                        // Let the login page render normally
                        setupRouter(); 
                        isInitialLoad = false;
                    }
                }
            });
        }
    }, 50); // Check every 50ms until Firebase is ready
});