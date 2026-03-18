document.addEventListener('DOMContentLoaded', () => {
    // Standard Setup
    lucide.createIcons();
  
    const dateEl = document.getElementById('theme-toggle');
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    dateEl.innerHTML = `<span class="text-sm font-medium text-gray-700">${now.toLocaleDateString('en-US', options)}</span>`;
  
    // Mobile Sidebar Toggle
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
  
    // Profile Dropdown
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

    // Form Submission Logic
    const form = document.getElementById('create-team-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const teamName = document.getElementById('team-name').value;
            const teamLead = document.getElementById('team-lead').value;
            
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg shadow-lg z-50';
            successMsg.innerHTML = `<strong>Success!</strong> "${teamName}" team has been created with ${teamLead} as lead.`;
            document.body.appendChild(successMsg);
            
            // Redirect back to management page after a short delay
            setTimeout(() => {
                window.location.href = 'management.html';
            }, 2000);
        });
    }
});