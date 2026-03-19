document.addEventListener('DOMContentLoaded', () => {
    
    const photoModal = document.getElementById('photo-modal');
    const viewPhotoBtns = document.querySelectorAll('.view-photo-btn');
    const closeBtns = [document.getElementById('close-modal-btn'), document.getElementById('close-modal-btn-2')];
    const modalEmpName = document.getElementById('modal-emp-name');

    // Open Modal and inject the correct employee's name
    viewPhotoBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const employeeName = btn.getAttribute('data-name');
            modalEmpName.textContent = employeeName;
            
            photoModal.classList.remove('hidden');
        });
    });

    // Close Modal Logic
    function closeModal() {
        photoModal.classList.add('hidden');
    }

    closeBtns.forEach(btn => {
        if(btn) btn.addEventListener('click', closeModal);
    });

    // Close modal when clicking outside the white box
    photoModal.addEventListener('click', (e) => {
        if (e.target === photoModal) {
            closeModal();
        }
    });

    // Set Date input to today's date dynamically
    const dateInput = document.getElementById('attendance-date');
    if(dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    // --- NEW: Search and Filter Logic ---
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const tableRows = document.querySelectorAll('tbody tr');

    function filterAttendanceTable() {
        const searchTerm = searchInput.value.toLowerCase();
        const statusValue = statusFilter.value;

        tableRows.forEach(row => {
            // Find the Name and Status cells within the row
            const nameNode = row.querySelector('td:nth-child(1) p.font-medium');
            const statusNode = row.querySelector('td:nth-child(6) span');
            
            if (!nameNode || !statusNode) return; // Safety fallback
            
            const name = nameNode.textContent.toLowerCase();
            
            // Format the text inside the span to match our <option> values 
            // e.g., "On Time" becomes "on-time"
            const statusText = statusNode.textContent.toLowerCase().replace(/\s+/g, '-'); 

            // Check if row matches search AND filter
            const matchesSearch = name.includes(searchTerm);
            const matchesStatus = statusValue === 'all' || statusText === statusValue;

            // Show or hide row
            if (matchesSearch && matchesStatus) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Attach the event listeners
    if (searchInput && statusFilter) {
        searchInput.addEventListener('keyup', filterAttendanceTable);
        statusFilter.addEventListener('change', filterAttendanceTable);
    }
});