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

        // Now that the HTML is on the page, set up the scripts
        initializeLayout();

    } catch (error) {
        console.error("Error loading layout:", error);
    }
}

function initializeLayout() {
    // 1. Draw Icons
    lucide.createIcons();

    // 2. Set current date
    const dateEl = document.getElementById('theme-toggle');
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        dateEl.innerHTML = `<span class="text-sm font-medium text-gray-700">${now.toLocaleDateString('en-US', options)}</span>`;
    }

    // 3. Highlight the active link in the sidebar
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    const sidebarLinks = document.querySelectorAll('.sidebar-item');
    
    sidebarLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        // If the current URL matches the link, make it active
        if (currentPath === linkHref) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // 4. Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebar = document.querySelector('aside');

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

    // 6. Logout Logic
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = 'index.html'; 
        });
    }
}

// Run the function when the page loads
document.addEventListener('DOMContentLoaded', loadLayout);