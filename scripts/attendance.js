(() => {
    // 1. RUN EVERY TIME
    if (window.lucide) lucide.createIcons();

    // Preserve state in closure
    let todayDate = new Date();
    let activeDate = new Date(todayDate);
    let displayedMonth = new Date(todayDate);
    let activeStatus = 'all';

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const formatDate = (dateObj) => {
        const d = new Date(dateObj);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
    };

    const todayStr = formatDate(todayDate);

    // Dynamic Calendar Renderer
    function renderCalendar() {
        const calGrid = document.getElementById('calendar-grid');
        const calMonthYear = document.getElementById('cal-month-year');
        if (!calGrid || !calMonthYear) return;

        const year = displayedMonth.getFullYear();
        const month = displayedMonth.getMonth();
        calMonthYear.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        calGrid.innerHTML = '';

        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'cal-day empty';
            calGrid.appendChild(emptyDiv);
        }

        const activeStr = formatDate(activeDate);

        for (let i = 1; i <= daysInMonth; i++) {
            const dayBtn = document.createElement('div');
            const thisDateStr = formatDate(new Date(year, month, i));
            
            // Added cal-day-btn class for event delegation
            dayBtn.className = 'cal-day cal-day-btn';
            dayBtn.textContent = i;
            dayBtn.setAttribute('data-date', thisDateStr);

            if (thisDateStr === activeStr) {
                dayBtn.classList.add('active');
            } else if (thisDateStr === todayStr) {
                dayBtn.classList.add('today');
            }
            calGrid.appendChild(dayBtn);
        }
    }

    // Dynamic Search Filter
    function filterAttendanceTable() {
        const searchInput = document.getElementById('search-input');
        const tableRows = document.querySelectorAll('.attendance-row');
        
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const targetDateStr = formatDate(activeDate);

        tableRows.forEach(row => {
            const nameNode = row.querySelector('.employee-name');
            const rowStatus = row.getAttribute('data-status');
            let rowDate = row.getAttribute('data-date');
            
            if (rowDate === 'today') rowDate = todayStr;

            if (!nameNode || !rowStatus) return;
            const name = nameNode.textContent.toLowerCase();

            const matchesSearch = name.includes(searchTerm);
            const matchesStatus = activeStatus === 'all' || rowStatus === activeStatus;
            const matchesDate = rowDate === targetDateStr;

            if (matchesSearch && matchesStatus && matchesDate) {
                row.style.display = ''; 
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Render calendar initially in case elements are ready
    renderCalendar();

    // 2. SPA EVENT GUARD (Run Only Once)
    if (window.attendanceSPAInitialized) return;
    window.attendanceSPAInitialized = true;

    // 3. EVENT DELEGATION LISTENERS
    document.body.addEventListener('click', (e) => {
        
        // --- Dropdown Management ---
        const statusDropdown = document.getElementById('status-dropdown');
        const dateDropdown = document.getElementById('date-dropdown');
        
        // Close dropdowns if clicking outside
        if (statusDropdown && !statusDropdown.contains(e.target)) statusDropdown.classList.remove('open');
        if (dateDropdown && !dateDropdown.contains(e.target)) dateDropdown.classList.remove('open');

        // Toggle Status Dropdown
        const statusTrigger = e.target.closest('#status-dropdown .dropdown-trigger');
        if (statusTrigger) {
            e.stopPropagation();
            if (dateDropdown) dateDropdown.classList.remove('open'); 
            statusDropdown.classList.toggle('open');
        }

        // Toggle Date Dropdown
        const dateTrigger = e.target.closest('#date-dropdown .dropdown-trigger');
        if (dateTrigger) {
            e.stopPropagation();
            if (statusDropdown) statusDropdown.classList.remove('open'); 
            dateDropdown.classList.toggle('open');
            renderCalendar(); 
        }

        // Select Status Item
        const statusItem = e.target.closest('#status-menu .dropdown-item');
        if (statusItem) {
            e.stopPropagation();
            const items = statusDropdown.querySelectorAll('.dropdown-item');
            items.forEach(i => i.classList.remove('active'));
            statusItem.classList.add('active');
            
            activeStatus = statusItem.getAttribute('data-value');
            document.getElementById('status-text').textContent = statusItem.textContent;
            
            statusDropdown.classList.remove('open');
            filterAttendanceTable();
        }

        // Calendar Prev/Next Buttons
        if (e.target.closest('#cal-prev')) {
            e.stopPropagation();
            displayedMonth.setMonth(displayedMonth.getMonth() - 1);
            renderCalendar();
        }
        if (e.target.closest('#cal-next')) {
            e.stopPropagation();
            displayedMonth.setMonth(displayedMonth.getMonth() + 1);
            renderCalendar();
        }

        // Select Calendar Day
        const dayBtn = e.target.closest('.cal-day-btn');
        if (dayBtn && !dayBtn.classList.contains('empty')) {
            e.stopPropagation();
            const selectedDateStr = dayBtn.getAttribute('data-date');
            
            const [y, m, d] = selectedDateStr.split('-');
            activeDate = new Date(y, m - 1, d);

            const dateText = document.getElementById('date-text');
            if (selectedDateStr === todayStr) {
                if(dateText) dateText.textContent = "Today";
            } else {
                if(dateText) dateText.textContent = `${monthNames[activeDate.getMonth()].substring(0,3)} ${activeDate.getDate()}, ${activeDate.getFullYear()}`;
            }

            if (dateDropdown) dateDropdown.classList.remove('open');
            filterAttendanceTable();
        }

        // --- Photo Verification Modal ---
        const photoModal = document.getElementById('photo-modal');
        
        // Open Modal
        const viewPhotoBtn = e.target.closest('.view-photo-btn');
        if (viewPhotoBtn && photoModal) {
            const employeeName = viewPhotoBtn.getAttribute('data-name');
            const captureTime = viewPhotoBtn.getAttribute('data-time');
            
            const modalEmpName = document.getElementById('modal-emp-name');
            const modalPhotoTime = document.getElementById('modal-photo-time');
            
            if (modalEmpName) modalEmpName.textContent = employeeName;
            if (modalPhotoTime) modalPhotoTime.textContent = `Selfie captured at ${captureTime}`;
            
            photoModal.classList.remove('hidden');
        }

        // Close Modal
        const closeBtn = e.target.closest('#close-modal-btn, #close-modal-btn-2');
        if ((closeBtn || e.target === photoModal) && photoModal) {
            photoModal.classList.add('hidden');
        }
    });

    document.body.addEventListener('input', (e) => {
        if (e.target.id === 'search-input') {
            filterAttendanceTable();
        }
    });

})();