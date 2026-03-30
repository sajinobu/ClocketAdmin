// scripts/attendance.js

(() => {
    if (window.lucide) lucide.createIcons();

    // ==========================================
    // DATA & STATE
    // ==========================================
    let todayDate = new Date();
    let activeDate = new Date(todayDate);
    let displayedMonth = new Date(todayDate);
    let activeStatus = 'all';
    let activeDept = 'all'; 

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

    // Leaflet Globals
    window._logMapInstance = null;
    window._logMapMarker = null;

    function timeStringToMinutes(timeStr) {
        if (!timeStr || timeStr === "Not set") return 9 * 60;
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10);
        if (hours === 12 && modifier === 'AM') hours = 0;
        if (hours !== 12 && modifier === 'PM') hours += 12;
        return (hours * 60) + minutes;
    }

    // ==========================================
    // RENDERING LOGIC
    // ==========================================
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

            if (thisDateStr === activeStr) dayBtn.classList.add('active');
            else if (thisDateStr === todayStr) dayBtn.classList.add('today');
            calGrid.appendChild(dayBtn);
        }
    }

    async function loadAttendanceData() {
        const tableBody = document.getElementById('attendance-table-body');
        const noResultsRow = document.getElementById('no-results-row');
        if (!tableBody || !window.firebaseUtils) return;

        try {
            const loadingRow = document.createElement('tr');
            loadingRow.id = "att-loading-row";
            loadingRow.innerHTML = `<td colspan="6" class="text-center py-12"><i data-lucide="loader" class="w-8 h-8 animate-spin mx-auto text-brand-primary"></i></td>`;
            tableBody.prepend(loadingRow);
            if (window.lucide) lucide.createIcons();

            const { collection, getDocs, query, where } = window.firebaseUtils;
            
            const empSnapshot = await getDocs(collection(window.db, "employees"));
            const employeeMap = {};
            const departmentSet = new Set();

            empSnapshot.forEach(doc => {
                const data = doc.data();
                // FIX 1: Safely grab the email. If it's not a field, use the doc.id
                const emailKey = data.email || doc.id;
                
                if (data.account_status === 'active') {
                    employeeMap[emailKey] = { ...data, id: doc.id, email: emailKey };
                    if (data.department) departmentSet.add(data.department);
                }
            });

            const deptMenu = document.getElementById('dept-menu');
            if (deptMenu) {
                deptMenu.innerHTML = `<div class="dropdown-item ${activeDept === 'all' ? 'active' : ''}" data-value="all">All Departments</div>`;
                Array.from(departmentSet).sort().forEach(dept => {
                    const isActive = activeDept === dept ? 'active' : '';
                    deptMenu.innerHTML += `<div class="dropdown-item ${isActive}" data-value="${dept}">${dept}</div>`;
                });
            }

            const targetDateStr = formatDate(activeDate); 
            const attQuery = query(collection(window.db, "attendance"), where("date", "==", targetDateStr));
            const attSnapshot = await getDocs(attQuery);
            
            const attendanceRecordMap = {};
            attSnapshot.forEach(doc => {
                attendanceRecordMap[doc.data().employee_id] = { ...doc.data(), docId: doc.id };
            });
            
            const loader = document.getElementById('att-loading-row');
            if (loader) loader.remove();

            document.querySelectorAll('#attendance-table-body .attendance-row').forEach(row => row.remove());

            if (Object.keys(employeeMap).length === 0) {
                if (noResultsRow) { noResultsRow.querySelector('td').setAttribute('colspan', '6'); noResultsRow.style.display = ''; }
                return;
            } else {
                if (noResultsRow) noResultsRow.style.display = 'none';
            }

            const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
            const locationFetchQueue = [];

            const sortedEmployees = Object.values(employeeMap).sort((a, b) => {
                const nameA = (a.full_name || "").toLowerCase();
                const nameB = (b.full_name || "").toLowerCase();
                return nameA.localeCompare(nameB);
            });

            // Time variables for status logic
            const isToday = (targetDateStr === todayStr);
            const isFuture = (targetDateStr > todayStr);
            const now = new Date();
            const currentMin = (now.getHours() * 60) + now.getMinutes();

            sortedEmployees.forEach((empData) => {
                const att = attendanceRecordMap[empData.email];
                const employeeName = empData.full_name;
                const empDepartment = empData.department || "Unassigned";
                const avatarSrc = (empData.profile_picture && empData.profile_picture !== "coming soon") ? empData.profile_picture : defaultAvatar;

                let clockIn = "--:--";
                let clockOut = "--:--";
                
                let statusText = "Absent";
                let statusClass = "bg-red-100 text-red-600 border-red-200";
                
                let inPhotoBtn = `<button class="p-1.5 opacity-40 cursor-not-allowed flex-shrink-0" disabled><i data-lucide="camera-off" class="w-4 h-4"></i></button>`;
                let outPhotoBtn = `<button class="p-1.5 opacity-40 cursor-not-allowed flex-shrink-0" disabled><i data-lucide="camera-off" class="w-4 h-4"></i></button>`;
                
                let locationDisplay = `<span class="text-xs text-gray-400 font-medium">N/A</span>`;

                const expectedStartMin = timeStringToMinutes(empData.work_start_time);

                if (att && att.clock_in_time) {
                    const actualDate = new Date(att.clock_in_time.replace(/-/g, '/'));
                    const actualMin = (actualDate.getHours() * 60) + actualDate.getMinutes();

                    if (actualMin > expectedStartMin) {
                        statusText = "Late";
                        statusClass = "status-late";
                    } else {
                        statusText = "On Time";
                        statusClass = "status-on-time";
                    }

                    clockIn = actualDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    if (att.clock_out_time) {
                        clockOut = new Date(att.clock_out_time.replace(/-/g, "/")).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    }

                    if (att.clock_in_photo) {
                        inPhotoBtn = `<button class="view-photo-btn text-brand-primary hover:bg-brand-grayBg p-1.5 rounded transition-colors flex-shrink-0" data-name="${employeeName}" data-time="${clockIn}" data-photo="${att.clock_in_photo}" data-type="Clock In"><i data-lucide="camera" class="w-4 h-4"></i></button>`;
                    }
                    if (att.clock_out_photo) {
                        outPhotoBtn = `<button class="view-photo-btn text-brand-secondary hover:bg-brand-grayBg p-1.5 rounded transition-colors flex-shrink-0" data-name="${employeeName}" data-time="${clockOut}" data-photo="${att.clock_out_photo}" data-type="Clock Out"><i data-lucide="camera" class="w-4 h-4"></i></button>`;
                    }

                    if (att.clock_in_lat && att.clock_in_long) {
                        const locId = `loc-${att.docId || empData.id}`; 
                        locationDisplay = `<button class="view-map-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-grayLight hover:border-brand-primary/40 hover:bg-brand-primary/5 text-brand-darkest hover:text-brand-primary transition-all text-xs font-semibold whitespace-nowrap w-fit shadow-sm"
                                data-lat="${att.clock_in_lat}" data-lng="${att.clock_in_long}" data-name="${employeeName}" data-locid="${locId}">
                                <i data-lucide="map-pin" class="w-3.5 h-3.5 text-brand-primary shrink-0"></i>
                                <span id="${locId}" class="truncate max-w-[180px]"><i data-lucide="loader" class="w-3 h-3 animate-spin inline"></i> Fetching...</span>
                           </button>`;
                        locationFetchQueue.push({ locId: locId, lat: att.clock_in_lat, lng: att.clock_in_long });
                    }
                } else {
                    // FIX 2: Check if the shift actually started before marking them absent
                    if (isFuture || (isToday && currentMin < expectedStartMin)) {
                        statusText = "Not Started";
                        statusClass = "bg-slate-100 text-slate-600 border-slate-200"; 
                    }
                }

                const tr = document.createElement('tr');
                tr.className = 'attendance-row data-row';
                tr.setAttribute('data-status', statusText.toLowerCase().replace(' ', '-'));
                tr.setAttribute('data-department', empDepartment);

                tr.innerHTML = `
                    <td class="table-td">
                      <div class="flex items-center gap-3">
                        <img src="${avatarSrc}" class="w-10 h-10 rounded-full object-cover border border-brand-grayLight bg-transparent" alt="Avatar">
                        <div>
                          <p class="font-bold text-brand-darkest text-sm employee-name">${employeeName}</p>
                          <p class="text-xs text-gray-500">${empDepartment}</p>
                        </div>
                      </div>
                    </td>
                    <td class="table-td"><div class="flex items-center gap-2"><p class="text-sm font-bold text-brand-darkest">${clockIn}</p>${inPhotoBtn}</div></td>
                    <td class="table-td"><div class="flex items-center gap-2"><p class="text-sm font-medium text-brand-darkest">${clockOut}</p>${outPhotoBtn}</div></td>
                    <td class="table-td">${locationDisplay}</td>
                    <td class="table-td"><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td class="table-td text-right"><a href="employee-logs.html?id=${empData.id}" class="link-action">View Log</a></td>
                `;
                
                tableBody.appendChild(tr);
            });

            if (window.lucide) lucide.createIcons();
            filterAttendanceTable(); 
            processLocationQueue(locationFetchQueue);

        } catch(error) {
            console.error("Error fetching attendance data: ", error);
        }
    }

    async function processLocationQueue(queue) {
        const addressCache = {}; 
        for (const item of queue) {
            const el = document.getElementById(item.locId);
            if (!el) continue;
            const cacheKey = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
            if (addressCache[cacheKey]) {
                el.innerHTML = addressCache[cacheKey];
                continue;
            }
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${item.lat}&lon=${item.lng}`, {
                    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
                });
                if (!response.ok) throw new Error("API Limit");
                const data = await response.json();
                if (data && data.address) {
                    const addr = data.address;
                    const brgy = addr.village || addr.suburb || addr.neighbourhood || addr.quarter || addr.hamlet || '';
                    const city = addr.city || addr.town || addr.municipality || '';
                    let placeName = "Unknown Area";
                    if (brgy && city) placeName = `${brgy}, ${city}`;
                    else if (city) placeName = city;
                    else if (brgy) placeName = brgy;
                    else if (data.display_name) placeName = data.display_name.split(',').slice(0, 2).join(',');

                    addressCache[cacheKey] = placeName;
                    el.innerHTML = placeName;
                    el.title = data.display_name; 
                }
            } catch (error) {
                el.innerHTML = `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`;
            }
            await new Promise(resolve => setTimeout(resolve, 1200));
        }
    }

    function filterAttendanceTable() {
        const searchInput = document.getElementById('search-input');
        const tableRows = document.querySelectorAll('.attendance-row');
        const noResultsRow = document.getElementById('no-results-row');
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        let visibleCount = 0;

        tableRows.forEach(row => {
            const nameNode = row.querySelector('.employee-name');
            const rowStatus = row.getAttribute('data-status');
            const rowDept = row.getAttribute('data-department');
            
            if (!nameNode || !rowStatus) return;
            
            const name = nameNode.textContent.toLowerCase();
            const matchesSearch = name.includes(searchTerm);
            const matchesStatus = activeStatus === 'all' || rowStatus === activeStatus;
            const matchesDept = activeDept === 'all' || rowDept === activeDept;

            if (matchesSearch && matchesStatus && matchesDept) {
                row.style.display = ''; visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        if (noResultsRow) noResultsRow.style.display = visibleCount > 0 ? 'none' : '';
    }

    renderCalendar();

    const waitForFirebase = setInterval(() => {
        if (window.firebaseUtils && window.db) {
            clearInterval(waitForFirebase);
            loadAttendanceData();
        }
    }, 50);

    // ==========================================
    // SPA SAFE EVENT LISTENERS
    // ==========================================
    if (window._attClickListener) document.body.removeEventListener('click', window._attClickListener);
    if (window._attInputListener) document.body.removeEventListener('input', window._attInputListener);

    if (window._attScrollListener) {
        const oldMain = document.getElementById('main-scroll-area');
        if (oldMain) oldMain.removeEventListener('scroll', window._attScrollListener);
    }

    let lastScrollTop = 0;
    window._ignoreScrollClose = false; 

    window._attScrollListener = (e) => {
        if (window._ignoreScrollClose) return;

        const currentScroll = e.target.scrollTop;
        if (currentScroll > lastScrollTop + 20 && currentScroll > 80) {
            const container = document.getElementById('filter-container');
            if (container && container.classList.contains('expanded')) {
                container.classList.remove('expanded');
                
                const icon = document.getElementById('filter-toggle-icon');
                if (icon) icon.style.transform = 'rotate(0deg)';
                
                document.querySelectorAll('#filter-container .custom-dropdown.open').forEach(d => d.classList.remove('open'));
            }
        }
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll; 
    };

    const mainScrollArea = document.getElementById('main-scroll-area');
    if (mainScrollArea) {
        mainScrollArea.addEventListener('scroll', window._attScrollListener);
    }

    window._attClickListener = (e) => {
        if (!document.getElementById('calendar-grid')) return;
        
        const statusDropdown = document.getElementById('status-dropdown');
        const deptDropdown = document.getElementById('dept-dropdown');
        const dateDropdown = document.getElementById('date-dropdown');
        
        if (e.target.closest('#mobile-filter-toggle')) {
            const container = document.getElementById('filter-container');
            const icon = document.getElementById('filter-toggle-icon');
            
            if (container) {
                window._ignoreScrollClose = true;
                const isExpanded = container.classList.toggle('expanded');
                if (icon) icon.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
                setTimeout(() => { 
                    if (mainScrollArea) lastScrollTop = mainScrollArea.scrollTop;
                    window._ignoreScrollClose = false; 
                }, 500); 
            }
            return;
        }
        
        if (statusDropdown && !statusDropdown.contains(e.target)) statusDropdown.classList.remove('open');
        if (deptDropdown && !deptDropdown.contains(e.target)) deptDropdown.classList.remove('open');
        if (dateDropdown && !dateDropdown.contains(e.target)) dateDropdown.classList.remove('open');

        if (e.target.closest('#status-dropdown .dropdown-trigger')) {
            e.stopPropagation();
            if (dateDropdown) dateDropdown.classList.remove('open'); 
            if (deptDropdown) deptDropdown.classList.remove('open');
            statusDropdown.classList.toggle('open');
        }

        if (e.target.closest('#dept-dropdown .dropdown-trigger')) {
            e.stopPropagation();
            if (dateDropdown) dateDropdown.classList.remove('open'); 
            if (statusDropdown) statusDropdown.classList.remove('open');
            deptDropdown.classList.toggle('open');
        }

        if (e.target.closest('#date-dropdown .dropdown-trigger')) {
            e.stopPropagation();
            if (statusDropdown) statusDropdown.classList.remove('open'); 
            if (deptDropdown) deptDropdown.classList.remove('open');
            dateDropdown.classList.toggle('open');
            renderCalendar(); 
        }

        const statusItem = e.target.closest('#status-menu .dropdown-item');
        if (statusItem) {
            e.stopPropagation();
            statusDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            statusItem.classList.add('active');
            activeStatus = statusItem.getAttribute('data-value');
            document.getElementById('status-text').textContent = statusItem.textContent;
            statusDropdown.classList.remove('open');
            filterAttendanceTable();
        }

        const deptItem = e.target.closest('#dept-menu .dropdown-item');
        if (deptItem) {
            e.stopPropagation();
            deptDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            deptItem.classList.add('active');
            activeDept = deptItem.getAttribute('data-value');
            document.getElementById('dept-text').textContent = deptItem.textContent;
            deptDropdown.classList.remove('open');
            filterAttendanceTable();
        }

        if (e.target.closest('#cal-prev')) { e.stopPropagation(); displayedMonth.setMonth(displayedMonth.getMonth() - 1); renderCalendar(); }
        if (e.target.closest('#cal-next')) { e.stopPropagation(); displayedMonth.setMonth(displayedMonth.getMonth() + 1); renderCalendar(); }

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
            renderCalendar();
            loadAttendanceData(); 
        }

        const photoModal = document.getElementById('photo-modal');
        const viewPhotoBtn = e.target.closest('.view-photo-btn');
        
        if (viewPhotoBtn && photoModal && !viewPhotoBtn.disabled) {
            const empNameEl = document.getElementById('modal-emp-name');
            const photoTimeEl = document.getElementById('modal-photo-time');
            
            if (empNameEl) empNameEl.textContent = viewPhotoBtn.getAttribute('data-name');
            if (photoTimeEl) photoTimeEl.textContent = `${viewPhotoBtn.getAttribute('data-type')} selfie captured at ${viewPhotoBtn.getAttribute('data-time')}`;
            
            const photoData = viewPhotoBtn.getAttribute('data-photo');
            const photoPlaceholder = document.querySelector('.photo-placeholder');
            
            if (photoPlaceholder) {
                if (photoData && photoData !== "null") {
                    photoPlaceholder.innerHTML = `<img src="${photoData}" class="w-full h-full object-cover rounded-lg shadow-sm">`;
                } else {
                    photoPlaceholder.innerHTML = `<div class="text-center py-6"><i data-lucide="image" class="w-12 h-12 mx-auto mb-2 opacity-50"></i><p class="text-sm font-medium mt-2 text-brand-darkest">No photo available</p></div>`;
                    if (window.lucide) lucide.createIcons();
                }
            }
            
            photoModal.classList.remove('hidden');
        }

        // ==========================================
        // MODAL MAP FIX: RENDER LEAFLET MAPS
        // ==========================================
        const mapModal = document.getElementById('map-modal');
        const viewMapBtn = e.target.closest('.view-map-btn');
        if (viewMapBtn && mapModal) {
            const lat = parseFloat(viewMapBtn.getAttribute('data-lat'));
            const lng = parseFloat(viewMapBtn.getAttribute('data-lng'));
            const empName = viewMapBtn.getAttribute('data-name');
            const locId = viewMapBtn.getAttribute('data-locid');
            const addressSpan = document.getElementById(locId);

            document.getElementById('modal-map-emp-name').textContent = empName;
            document.getElementById('modal-map-address').textContent = addressSpan ? addressSpan.textContent : "Unknown Location";

            mapModal.classList.remove('hidden');

            setTimeout(() => {
                const mapContainer = document.getElementById('log-map-container');
                const position = [lat, lng];

                if (!window._logMapInstance) {
                    // Initialize Leaflet Map
                    window._logMapInstance = L.map(mapContainer, {
                        zoomControl: true,
                        attributionControl: false
                    }).setView(position, 16);

                    // CartoDB Positron Basemap (matches your clean dark/light mode setup)
                    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                        maxZoom: 20
                    }).addTo(window._logMapInstance);

                    // Add Custom Marker
                    window._logMapMarker = L.circleMarker(position, {
                        radius: 8,
                        fillColor: "#4f46e5", // Your brand primary color
                        fillOpacity: 1,
                        color: "#ffffff",
                        weight: 2
                    }).addTo(window._logMapInstance);

                    // Add a tooltip for the employee name
                    window._logMapMarker.bindTooltip(empName, { 
                        direction: 'top', 
                        offset: [0, -8],
                        className: 'font-bold font-sans'
                    });
                } else {
                    // Update Existing Map
                    window._logMapInstance.setView(position, 16);
                    window._logMapMarker.setLatLng(position);
                    window._logMapMarker.setTooltipContent(empName);
                }

                // CRITICAL FIX: Leaflet glitches if initialized while display is hidden. 
                // InvalidateSize forces the engine to recalculate container dimensions!
                setTimeout(() => {
                    window._logMapInstance.invalidateSize();
                }, 10);

            }, 100); // 100ms lets the modal CSS animation execute before forcing map resize
        }

        if (e.target.closest('.modal-close-btn, .btn-secondary') || e.target.classList.contains('modal-overlay')) {
            if(document.getElementById('photo-modal')) document.getElementById('photo-modal').classList.add('hidden');
            if(document.getElementById('map-modal')) document.getElementById('map-modal').classList.add('hidden');
        }
    };

    window._attInputListener = (e) => {
        if (e.target.id === 'search-input') filterAttendanceTable();
    };

    document.body.addEventListener('click', window._attClickListener);
    document.body.addEventListener('input', window._attInputListener);

})();