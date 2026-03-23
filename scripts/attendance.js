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

    // --- FIREBASE: FETCH ATTENDANCE DATA ---
    async function loadAttendanceData() {
        const tableBody = document.getElementById('attendance-table-body');
        const noResultsRow = document.getElementById('no-results-row');
        
        if (!tableBody || !window.firebaseUtils) return;

        try {
            // 1. Show Loading Spinner
            const loadingRow = document.createElement('tr');
            loadingRow.id = "att-loading-row";
            loadingRow.innerHTML = `<td colspan="7" class="text-center py-12"><i data-lucide="loader" class="w-8 h-8 animate-spin mx-auto text-brand-primary"></i></td>`;
            tableBody.prepend(loadingRow);
            if (window.lucide) lucide.createIcons();

            const { collection, getDocs, query, where } = window.firebaseUtils;
            
            // 2. FETCH ALL EMPLOYEES FIRST (To get Names, Departments, and Photos)
            const empSnapshot = await getDocs(collection(window.db, "employees"));
            const employeeMap = {};
            empSnapshot.forEach(doc => {
                employeeMap[doc.data().email] = { ...doc.data(), id: doc.id };
            });

            // 3. FETCH ATTENDANCE FOR THE SELECTED DATE
            const targetDateStr = formatDate(activeDate); // Matches your "2026-03-23" format
            const attQuery = query(collection(window.db, "attendance"), where("date", "==", targetDateStr));
            const attSnapshot = await getDocs(attQuery);
            
            const loader = document.getElementById('att-loading-row');
            if (loader) loader.remove();

            // Clear existing rows
            document.querySelectorAll('#attendance-table-body .attendance-row').forEach(row => row.remove());

            if (attSnapshot.empty) {
                if (noResultsRow) noResultsRow.style.display = '';
                return;
            } else {
                if (noResultsRow) noResultsRow.style.display = 'none';
            }

            const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

            attSnapshot.forEach((docSnap) => {
                const att = docSnap.data();
                const empData = employeeMap[att.employee_id] || {}; // Link via email

                // Get Times (Firestore Timestamps to String)
                const clockIn = att.clock_in_time ? (att.clock_in_time.toDate ? att.clock_in_time.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : att.clock_in_time) : "N/A";
                const clockOut = att.clock_out_time ? (att.clock_out_time.toDate ? att.clock_out_time.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : att.clock_out_time) : "--";
                
                // Location formatting
                const location = (att.clock_in_lat && att.clock_in_long) ? `${att.clock_in_lat.toFixed(2)}, ${att.clock_in_long.toFixed(2)}` : "N/A";

                // Status Logic
                let statusText = "On Time";
                let statusClass = "status-active"; // Green
                if (!att.clock_out_time) {
                    statusText = "Active";
                    statusClass = "bg-blue-100 text-blue-600 border-blue-200";
                }

                const tr = document.createElement('tr');
                tr.className = 'attendance-row data-row';
                tr.setAttribute('data-status', statusText.toLowerCase());
                tr.setAttribute('data-date', att.date);

                tr.innerHTML = `
                    <td class="table-td">
                      <div class="flex items-center gap-3">
                        <img src="${empData.profile_picture || defaultAvatar}" class="w-10 h-10 rounded-full object-cover border border-brand-grayLight bg-white" alt="Avatar">
                        <div>
                          <p class="font-bold text-brand-darkest text-sm employee-name">${empData.full_name || att.employee_id}</p>
                          <p class="text-xs text-gray-500">${empData.department || "Unassigned"}</p>
                        </div>
                      </div>
                    </td>
                    <td class="table-td text-center">
                      <button class="btn-photo mx-auto view-photo-btn" 
                        data-name="${empData.full_name || 'Employee'}" 
                        data-time="${clockIn}"
                        onclick="window.openModalWithImage('${att.clock_in_photo}')">
                          <i data-lucide="camera" class="w-4 h-4"></i>
                      </button>
                    </td>
                    <td class="table-td">
                      <p class="text-sm font-bold text-brand-darkest">${clockIn}</p>
                    </td>
                    <td class="table-td">
                      <p class="text-sm font-medium text-brand-darkest">${clockOut}</p>
                    </td>
                    <td class="table-td text-sm font-medium text-brand-darkest">
                        <a href="https://www.google.com/maps?q=${att.clock_in_lat},${att.clock_in_long}" target="_blank" class="hover:underline text-brand-primary">
                            ${location}
                        </a>
                    </td>
                    <td class="table-td">
                      <span class="status-badge ${statusClass}">${statusText}</span>
                    </td>
                    <td class="table-td text-right">
                      <a href="employee-logs.html?id=${empData.id || att.employee_id}" class="link-action">View Log</a>
                    </td>
                `;
                
                tableBody.appendChild(tr);
            });

            if (window.lucide) lucide.createIcons();

        } catch(error) {
            console.error("Error fetching attendance data: ", error);
        }
    }

    // Dynamic Search Filter
    function filterAttendanceTable() {
        const searchInput = document.getElementById('search-input');
        const tableRows = document.querySelectorAll('.attendance-row');
        const noResultsRow = document.getElementById('no-results-row');
        
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const targetDateStr = formatDate(activeDate);
        let visibleCount = 0;

        tableRows.forEach(row => {
            const nameNode = row.querySelector('.employee-name');
            const rowStatus = row.getAttribute('data-status');
            let rowDate = row.getAttribute('data-date');
            
            if (rowDate === 'today') rowDate = todayStr;

            if (!nameNode || !rowStatus) return;
            const name = nameNode.textContent.toLowerCase();

            const matchesSearch = name.includes(searchTerm);
            const matchesStatus = activeStatus === 'all' || rowStatus === activeStatus;
            
            // Note: Since all placeholder rows are set to 'today', changing the calendar date will hide them
            const matchesDate = rowDate === targetDateStr; 

            if (matchesSearch && matchesStatus && matchesDate) {
                row.style.display = ''; 
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        if (noResultsRow) {
            noResultsRow.style.display = visibleCount > 0 ? 'none' : '';
        }
    }

    // Render calendar initially in case elements are ready
    renderCalendar();

    // Fetch Safely (Wait for Firebase to finish loading on hard refreshes)
    const waitForFirebase = setInterval(() => {
        if (window.firebaseUtils && window.db) {
            clearInterval(waitForFirebase);
            loadAttendanceData();
        }
    }, 50);

    // 2. SPA EVENT GUARD (Run Only Once)
    if (window.attendanceSPAInitialized) return;
    window.attendanceSPAInitialized = true;

    // 3. EVENT DELEGATION LISTENERS
    document.body.addEventListener('click', (e) => {
        // NEW PAGE GUARD: Only run if the calendar grid is on the screen!
        if (!document.getElementById('calendar-grid')) return;
        
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
        if (viewPhotoBtn && photoModal && !viewPhotoBtn.disabled) {
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