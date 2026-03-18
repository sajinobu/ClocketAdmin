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
  
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = 'index.html'; 
        });
    }

    // 5. Management Tab Switching Logic
    const tabs = document.querySelectorAll('.management-tab');
    const contents = document.querySelectorAll('.management-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            // Reset tab styles
            tabs.forEach(t => {
                t.classList.remove('border-teal-600', 'text-teal-600');
                t.classList.add('border-transparent', 'text-gray-600');
            });
            
            // Set active tab style
            tab.classList.add('border-teal-600', 'text-teal-600');
            tab.classList.remove('border-transparent', 'text-gray-600');
            
            // Hide all content blocks and show the target one
            contents.forEach(content => content.classList.add('hidden'));
            document.getElementById(tabName + '-tab').classList.remove('hidden');
        });
    });

    // 6. Employees Search
    const employeesSearch = document.querySelector('.employees-search');
    if (employeesSearch) {
        employeesSearch.addEventListener('keyup', function() {
            const searchTerm = this.value.toLowerCase();
            const employeesTab = document.getElementById('employees-tab');
            const tbody = employeesTab.querySelector('tbody');
            const rows = tbody.querySelectorAll('tr');
            
            rows.forEach(row => {
                // Safely grab text content based on your table layout
                const name = row.querySelector('p.font-medium')?.textContent.toLowerCase() || '';
                const email = row.querySelectorAll('td')[2]?.textContent.toLowerCase() || '';
                const department = row.querySelectorAll('td')[1]?.textContent.toLowerCase() || '';
                
                if (name.includes(searchTerm) || email.includes(searchTerm) || department.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // 7. Teams Search
    const teamsSearch = document.querySelector('.teams-search');
    if (teamsSearch) {
        teamsSearch.addEventListener('keyup', function() {
            const searchTerm = this.value.toLowerCase();
            const teamsTab = document.getElementById('teams-tab');
            const tbody = teamsTab.querySelector('tbody');
            const rows = tbody.querySelectorAll('tr');
            
            rows.forEach(row => {
                const teamName = row.querySelector('p.font-medium')?.textContent.toLowerCase() || '';
                const department = row.querySelectorAll('td')[1]?.textContent.toLowerCase() || '';
                const leader = row.querySelectorAll('td')[2]?.textContent.toLowerCase() || '';
                
                if (teamName.includes(searchTerm) || department.includes(searchTerm) || leader.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
});