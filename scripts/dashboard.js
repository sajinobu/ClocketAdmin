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
  
    // 5. Logout logic (Demo)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Usually you would redirect to index.html (login screen)
            window.location.href = 'index.html'; 
        });
    }
  
    // 6. Table Search Functionality
    const searchToggleBtn = document.getElementById('search-toggle-mobile');
    const searchFieldMobile = document.querySelector('.search-field-mobile');
    const searchInputMobile = document.getElementById('search-input-mobile');
    const searchInputDesktop = document.getElementById('search-input-desktop');
  
    // Toggle mobile search input
    if (searchToggleBtn && searchFieldMobile) {
      searchToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        searchFieldMobile.classList.toggle('hidden');
        if (!searchFieldMobile.classList.contains('hidden')) {
          setTimeout(() => searchInputMobile.focus(), 50);
        }
      });
    }
  
    // Sync inputs and perform search
    function syncSearchInputs() {
      if (searchInputMobile) {
        searchInputMobile.addEventListener('keyup', (e) => {
          if (searchInputDesktop) searchInputDesktop.value = e.target.value;
          performSearch(e.target.value);
        });
      }
      if (searchInputDesktop) {
        searchInputDesktop.addEventListener('keyup', (e) => {
          if (searchInputMobile) searchInputMobile.value = e.target.value;
          performSearch(e.target.value);
        });
      }
    }
  
    function performSearch(searchTerm) {
      searchTerm = searchTerm.toLowerCase();
      const tbody = document.querySelector('#employee-table tbody');
      if (!tbody) return;
      
      const rows = tbody.querySelectorAll('tr');
      rows.forEach(row => {
        const nameEl = row.querySelector('.search-name');
        const emailEl = row.querySelector('.search-email');
        const name = nameEl ? nameEl.textContent.toLowerCase() : '';
        const email = emailEl ? emailEl.textContent.toLowerCase() : '';
        
        if (name.includes(searchTerm) || email.includes(searchTerm)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }
  
    syncSearchInputs();
  });