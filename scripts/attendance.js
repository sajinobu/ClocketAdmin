document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. PHOTO VERIFICATION MODAL LOGIC
    // ==========================================
    const photoModal = document.getElementById('photo-modal');
    const viewPhotoBtns = document.querySelectorAll('.view-photo-btn');
    const closeBtns = [
        document.getElementById('close-modal-btn'), 
        document.getElementById('close-modal-btn-2')
    ];
    const modalEmpName = document.getElementById('modal-emp-name');

    // Open Modal and inject the correct employee's name
    if (viewPhotoBtns.length > 0 && photoModal) {
        viewPhotoBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const employeeName = btn.getAttribute('data-name');
                if (modalEmpName) {
                    modalEmpName.textContent = employeeName;
                }
                photoModal.classList.remove('hidden');
            });
        });
    }

    // Close Modal Logic
    function closeModal() {
        if (photoModal) {
            photoModal.classList.add('hidden');
        }
    }

    closeBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', closeModal);
    });

    // Close modal when clicking outside the white box
    if (photoModal) {
        photoModal.addEventListener('click', (e) => {
            if (e.target === photoModal) {
                closeModal();
            }
        });
    }

    // ==========================================
    // 2. SET DATE INPUT TO TODAY (LOCAL TIME)
    // ==========================================
    const dateInput = document.getElementById('attendance-date');
    if (dateInput) {
        // Get local date properly adjusted for timezone offset
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const localDate = new Date(today.getTime() - offset).toISOString().split('T')[0];
        
        dateInput.value = localDate;
    }

    // ==========================================
    // 3. SEARCH AND FILTER LOGIC
    // ==========================================
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const tableRows = document.querySelectorAll('.attendance-row');

    function filterAttendanceTable() {
        if (!searchInput || !statusFilter) return;

        const searchTerm = searchInput.value.toLowerCase().trim();
        const statusValue = statusFilter.value;

        tableRows.forEach(row => {
            // Find the Name and Status cells matching the new HTML structure
            const nameNode = row.querySelector('.table-td:nth-child(1) p.font-bold');
            const statusNode = row.querySelector('.table-td:nth-child(6) .status-badge');
            
            if (!nameNode || !statusNode) return; // Safety fallback
            
            const name = nameNode.textContent.toLowerCase();
            
            // Format the text inside the badge to match our <option> values 
            // e.g., "On Time" -> "on-time", "Missing Punch" -> "missing-punch"
            let statusText = statusNode.textContent.toLowerCase().replace(/\s+/g, '-'); 
            
            // Handle edge case where select option is "missing" but badge might say "missing-punch"
            if (statusText === 'missing-punch') {
                statusText = 'missing';
            }

            // Check if row matches search AND filter
            const matchesSearch = name.includes(searchTerm);
            const matchesStatus = statusValue === 'all' || statusText.includes(statusValue);

            // Show or hide row overriding standard CSS
            if (matchesSearch && matchesStatus) {
                row.style.display = ''; 
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Attach the event listeners ('input' is used instead of 'keyup' to support copy/pasting)
    if (searchInput) {
        searchInput.addEventListener('input', filterAttendanceTable);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', filterAttendanceTable);
    }

    // ==========================================
    // 4. INITIALIZE ICONS
    // ==========================================
    if (window.lucide) {
        lucide.createIcons();
    }
});