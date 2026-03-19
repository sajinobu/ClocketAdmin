async function loadLayout() {
    try {
        // Fetch and insert the header
        const headerResponse = await fetch('header.html');
        const headerHtml = await headerResponse.text();
        document.getElementById('header-placeholder').innerHTML = headerHtml;

        // Fetch and insert the sidebar
        const sidebarResponse = await fetch('sidebar.html');
        const sidebarHtml = await sidebarResponse.text();
        document.getElementById('sidebar-placeholder').innerHTML = sidebarHtml;

        // Set up the scripts now that HTML is injected
        initializeLayout();

    } catch (error) {
        console.error("Error loading layout:", error);
    }
}

function initializeLayout() {
    // 1. Draw Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // 2. Set current date
    const dateEl = document.getElementById('header-date');
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('en-US', options);
    }

    // 3. Highlight the active link in the sidebar
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    const sidebarLinks = document.querySelectorAll('.nav-link'); // Updated to semantic class
    
    sidebarLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (currentPath === linkHref) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // 4. Mobile Menu Toggle
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

    // 5. Profile Dropdown
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

    // 6. Logout Logic (Redirects to new index.html)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = 'index.html'; 
        });
    }
}

// Run the function when the page loads
document.addEventListener('DOMContentLoaded', loadLayout);