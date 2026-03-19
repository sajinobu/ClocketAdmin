document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons
    lucide.createIcons();
  
    // 2. Display current date in header
    const dateEl = document.getElementById('theme-toggle');
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    dateEl.innerHTML = `<span class="text-sm font-medium text-gray-700">${now.toLocaleDateString('en-US', options)}</span>`;
  
    // 3. Mobile Sidebar Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebar = document.querySelector('aside');
  
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      sidebarOverlay.classList.toggle('active');
    });
  
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      sidebarOverlay.classList.remove('active');
    });
  
    // 4. Profile Dropdown Menu Toggle
    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
  
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('hidden');
    });
  
    document.addEventListener('click', (e) => {
      if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.add('hidden');
      }
    });

    // 5. Logout logic
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = 'index.html'; 
        });
    }

    // 6. Week Toggle Buttons Logic
    const btnThisWeek = document.getElementById('btn-this-week');
    const btnNextWeek = document.getElementById('btn-next-week');

    function setActiveBtn(activeBtn, inactiveBtn) {
        // Remove active classes from the inactive button
        inactiveBtn.classList.remove('bg-teal-600', 'text-white');
        inactiveBtn.classList.add('border', 'border-gray-200', 'text-gray-600', 'hover:bg-gray-50');
        
        // Add active classes to the active button
        activeBtn.classList.remove('border', 'border-gray-200', 'text-gray-600', 'hover:bg-gray-50');
        activeBtn.classList.add('bg-teal-600', 'text-white');
    }

    if (btnThisWeek && btnNextWeek) {
        btnThisWeek.addEventListener('click', () => setActiveBtn(btnThisWeek, btnNextWeek));
        btnNextWeek.addEventListener('click', () => setActiveBtn(btnNextWeek, btnThisWeek));
    }
});