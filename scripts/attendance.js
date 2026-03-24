// scripts/attendance.js

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

    // --- DYNAMIC GOOGLE MAPS INJECTOR ---
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        const mapScript = document.createElement('script');
        mapScript.src = "https://cdn.jsdelivr.net/gh/somanchiu/Keyless-Google-Maps-API@v7.1/mapsJavaScriptAPI.js";
        mapScript.async = true;
        mapScript.defer = true;
        document.head.appendChild(mapScript);
    }
    
    // Global vars for the map modal
    window._logMapInstance = null;
    window._logMapMarker = null;

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
            loadingRow.innerHTML = `<td colspan="6" class="text-center py-12"><i data-lucide="loader" class="w-8 h-8 animate-spin mx-auto text-brand-primary"></i></td>`;
            tableBody.prepend(loadingRow);
            if (window.lucide) lucide.createIcons();

            const { collection, getDocs, query, where } = window.firebaseUtils;
            
            // 2. FETCH ALL EMPLOYEES FIRST 
            const empSnapshot = await getDocs(collection(window.db, "employees"));
            const employeeMap = {};
            empSnapshot.forEach(doc => {
                employeeMap[doc.data().email] = { ...doc.data(), id: doc.id };
                employeeMap[doc.id] = { ...doc.data(), id: doc.id }; 
            });

            // 3. FETCH ATTENDANCE FOR THE SELECTED DATE
            const targetDateStr = formatDate(activeDate); 
            const attQuery = query(collection(window.db, "attendance"), where("date", "==", targetDateStr));
            const attSnapshot = await getDocs(attQuery);
            
            const loader = document.getElementById('att-loading-row');
            if (loader) loader.remove();

            // Clear existing rows
            document.querySelectorAll('#attendance-table-body .attendance-row').forEach(row => row.remove());

            if (attSnapshot.empty) {
                if (noResultsRow) {
                    noResultsRow.querySelector('td').setAttribute('colspan', '6');
                    noResultsRow.style.display = '';
                }
                return;
            } else {
                if (noResultsRow) noResultsRow.style.display = 'none';
            }

            const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

            // NEW: Queue to hold locations so we don't spam the API
            const locationFetchQueue = [];

            attSnapshot.forEach((docSnap) => {
                const att = docSnap.data();
                const empData = employeeMap[att.employee_id] || {}; 

                // Process Timestamps safely
                let clockIn = "N/A";
                if (att.clock_in_time) {
                    if (att.clock_in_time.toDate) clockIn = att.clock_in_time.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    else if (typeof att.clock_in_time === 'string') clockIn = new Date(att.clock_in_time.replace(/-/g, "/")).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                }

                let clockOut = "--";
                if (att.clock_out_time) {
                    if (att.clock_out_time.toDate) clockOut = att.clock_out_time.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    else if (typeof att.clock_out_time === 'string') clockOut = new Date(att.clock_out_time.replace(/-/g, "/")).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                }
                
                // --- BARANGAY/CITY UI LOGIC ---
                const hasLocation = att.clock_in_lat && att.clock_in_long;
                const locId = `loc-${docSnap.id}`; 
                const employeeName = empData.full_name || att.employee_id;
                
                const locationDisplay = hasLocation 
                    ? `<button class="view-map-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-grayLight hover:border-brand-primary/40 hover:bg-brand-primary/5 text-brand-darkest hover:text-brand-primary transition-all text-xs font-semibold whitespace-nowrap w-fit shadow-sm"
                            data-lat="${att.clock_in_lat}" data-lng="${att.clock_in_long}" data-name="${employeeName}" data-locid="${locId}">
                            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-brand-primary shrink-0"></i>
                            <span id="${locId}" class="truncate max-w-[180px]"><i data-lucide="loader" class="w-3 h-3 animate-spin inline"></i> Fetching...</span>
                       </button>` 
                    : `<span class="text-xs text-gray-400 font-medium">N/A</span>`;

                // Status Logic
                let statusText = "On Time";
                let statusClass = "status-active"; // Green
                if (!att.clock_out_time) {
                    statusText = "Active";
                    statusClass = "bg-blue-100 text-blue-600 border-blue-200";
                }

                // Photo Buttons
                const inPhotoBtn = att.clock_in_photo 
                    ? `<button class="view-photo-btn text-brand-primary hover:bg-brand-grayBg p-1.5 rounded transition-colors flex-shrink-0" data-name="${employeeName}" data-time="${clockIn}" data-photo="${att.clock_in_photo}" data-type="Clock In" title="View Clock In Photo">
                        <i data-lucide="camera" class="w-4 h-4"></i>
                       </button>` 
                    : `<button class="p-1.5 opacity-40 cursor-not-allowed flex-shrink-0" disabled title="No Clock In Photo">
                        <i data-lucide="camera-off" class="w-4 h-4"></i>
                       </button>`;

                const outPhotoBtn = att.clock_out_photo 
                    ? `<button class="view-photo-btn text-brand-secondary hover:bg-brand-grayBg p-1.5 rounded transition-colors flex-shrink-0" data-name="${employeeName}" data-time="${clockOut}" data-photo="${att.clock_out_photo}" data-type="Clock Out" title="View Clock Out Photo">
                        <i data-lucide="camera" class="w-4 h-4"></i>
                       </button>` 
                    : `<button class="p-1.5 opacity-40 cursor-not-allowed flex-shrink-0" disabled title="No Clock Out Photo">
                        <i data-lucide="camera-off" class="w-4 h-4"></i>
                       </button>`;

                const avatarSrc = (empData.profile_picture && empData.profile_picture !== "coming soon") 
                    ? empData.profile_picture 
                    : defaultAvatar;

                const tr = document.createElement('tr');
                tr.className = 'attendance-row data-row';
                tr.setAttribute('data-status', statusText.toLowerCase());

                tr.innerHTML = `
                    <td class="table-td">
                      <div class="flex items-center gap-3">
                        <img src="${avatarSrc}" class="w-10 h-10 rounded-full object-cover border border-brand-grayLight bg-transparent" alt="Avatar">
                        <div>
                          <p class="font-bold text-brand-darkest text-sm employee-name">${employeeName}</p>
                          <p class="text-xs text-gray-500">${empData.department || "Unassigned"}</p>
                        </div>
                      </div>
                    </td>
                    <td class="table-td">
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-bold text-brand-darkest">${clockIn}</p>
                        ${inPhotoBtn}
                      </div>
                    </td>
                    <td class="table-td">
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-medium text-brand-darkest">${clockOut}</p>
                        ${outPhotoBtn}
                      </div>
                    </td>
                    <td class="table-td">
                        ${locationDisplay}
                    </td>
                    <td class="table-td">
                      <span class="status-badge ${statusClass}">${statusText}</span>
                    </td>
                    <td class="table-td text-right">
                      <a href="employee-logs.html?id=${empData.id || att.employee_id}" class="link-action">View Log</a>
                    </td>
                `;
                
                tableBody.appendChild(tr);

                // Add to the fetch queue instead of firing instantly
                if (hasLocation) {
                    locationFetchQueue.push({
                        locId: locId,
                        lat: att.clock_in_lat,
                        lng: att.clock_in_long
                    });
                }
            });

            if (window.lucide) lucide.createIcons();
            filterAttendanceTable(); 

            // NEW: Safely process location fetching queue
            processLocationQueue(locationFetchQueue);

        } catch(error) {
            console.error("Error fetching attendance data: ", error);
        }
    }

    // ==========================================
    // NEW: Safe Location Fetcher with Caching
    // ==========================================
    async function processLocationQueue(queue) {
        const addressCache = {}; // Store locations we already looked up
        
        for (const item of queue) {
            const el = document.getElementById(item.locId);
            if (!el) continue;

            // Round coordinates heavily to group locations (~110 meters)
            const cacheKey = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;

            if (addressCache[cacheKey]) {
                el.innerHTML = addressCache[cacheKey];
                continue;
            }

            try {
                // Fetch with explicit headers
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${item.lat}&lon=${item.lng}`, {
                    headers: {
                        'Accept-Language': 'en-US,en;q=0.9'
                    }
                });
                
                if (!response.ok) throw new Error("API Blocked or Rate Limited");

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

                    // Save it to the cache
                    addressCache[cacheKey] = placeName;
                    el.innerHTML = placeName;
                    el.title = data.display_name; 
                }
            } catch (error) {
                // If it fails, safely fallback to coordinates
                el.innerHTML = `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`;
            }

            // WAIT 1.2 SECONDS (1200ms) to ensure we don't get blocked
            await new Promise(resolve => setTimeout(resolve, 1200));
        }
    }

    // Dynamic Search Filter
    function filterAttendanceTable() {
        const searchInput = document.getElementById('search-input');
        const tableRows = document.querySelectorAll('.attendance-row');
        const noResultsRow = document.getElementById('no-results-row');
        
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        let visibleCount = 0;

        tableRows.forEach(row => {
            const nameNode = row.querySelector('.employee-name');
            const rowStatus = row.getAttribute('data-status');
            
            if (!nameNode || !rowStatus) return;
            const name = nameNode.textContent.toLowerCase();

            const matchesSearch = name.includes(searchTerm);
            const matchesStatus = activeStatus === 'all' || rowStatus.replace(' ', '-') === activeStatus;

            if (matchesSearch && matchesStatus) {
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

    // Render calendar initially
    renderCalendar();

    // Fetch Safely (Wait for Firebase to finish loading on hard refreshes)
    const waitForFirebase = setInterval(() => {
        if (window.firebaseUtils && window.db) {
            clearInterval(waitForFirebase);
            loadAttendanceData();
        }
    }, 50);

    if (window.attendanceSPAInitialized) return;
    window.attendanceSPAInitialized = true;

    // --- EVENT DELEGATION LISTENERS ---
    document.body.addEventListener('click', (e) => {
        if (!document.getElementById('calendar-grid')) return;
        
        const statusDropdown = document.getElementById('status-dropdown');
        const dateDropdown = document.getElementById('date-dropdown');
        
        if (statusDropdown && !statusDropdown.contains(e.target)) statusDropdown.classList.remove('open');
        if (dateDropdown && !dateDropdown.contains(e.target)) dateDropdown.classList.remove('open');

        const statusTrigger = e.target.closest('#status-dropdown .dropdown-trigger');
        if (statusTrigger) {
            e.stopPropagation();
            if (dateDropdown) dateDropdown.classList.remove('open'); 
            statusDropdown.classList.toggle('open');
        }

        const dateTrigger = e.target.closest('#date-dropdown .dropdown-trigger');
        if (dateTrigger) {
            e.stopPropagation();
            if (statusDropdown) statusDropdown.classList.remove('open'); 
            dateDropdown.classList.toggle('open');
            renderCalendar(); 
        }

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

        // --- Calendar Day Click ---
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

        // --- Photo Verification Modal ---
        const photoModal = document.getElementById('photo-modal');
        const viewPhotoBtn = e.target.closest('.view-photo-btn');
        
        if (viewPhotoBtn && photoModal && !viewPhotoBtn.disabled) {
            const employeeName = viewPhotoBtn.getAttribute('data-name');
            const captureTime = viewPhotoBtn.getAttribute('data-time');
            const photoData = viewPhotoBtn.getAttribute('data-photo');
            const photoType = viewPhotoBtn.getAttribute('data-type'); 
            
            const modalEmpName = document.getElementById('modal-emp-name');
            const modalPhotoTime = document.getElementById('modal-photo-time');
            const photoPlaceholder = document.querySelector('.photo-placeholder');
            
            if (modalEmpName) modalEmpName.textContent = employeeName;
            
            if (modalPhotoTime) modalPhotoTime.textContent = `${photoType} selfie captured at ${captureTime}`;
            
            if (photoData && photoData !== "null") {
                photoPlaceholder.innerHTML = `<img src="${photoData}" alt="${photoType} Verification Selfie" class="w-full h-full object-cover rounded-lg shadow-sm">`;
            } else {
                photoPlaceholder.innerHTML = `
                    <div class="text-center py-6">
                        <i data-lucide="image" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                        <p class="text-sm font-medium mt-2 text-brand-darkest">No photo available</p>
                    </div>
                `;
                if (window.lucide) lucide.createIcons();
            }
            
            photoModal.classList.remove('hidden');
        }

        const closeBtn = e.target.closest('#close-modal-btn, #close-modal-btn-2');
        if ((closeBtn || e.target === photoModal) && photoModal) {
            photoModal.classList.add('hidden');
        }

        // --- Map Verification Modal ---
        const mapModal = document.getElementById('map-modal');
        const viewMapBtn = e.target.closest('.view-map-btn');
        
        if (viewMapBtn && mapModal) {
            const lat = parseFloat(viewMapBtn.getAttribute('data-lat'));
            const lng = parseFloat(viewMapBtn.getAttribute('data-lng'));
            const empName = viewMapBtn.getAttribute('data-name');
            
            // Extract the address text that Nominatim just fetched
            const locId = viewMapBtn.getAttribute('data-locid');
            const addressSpan = document.getElementById(locId);
            const addressText = addressSpan ? addressSpan.textContent : "Unknown Location";

            document.getElementById('modal-map-emp-name').textContent = empName;
            document.getElementById('modal-map-address').textContent = addressText;

            mapModal.classList.remove('hidden');

            setTimeout(() => {
                const mapContainer = document.getElementById('log-map-container');
                const position = { lat, lng };

                // Initialize the map if it hasn't been created yet
                if (!window._logMapInstance && typeof google !== 'undefined') {
                    window._logMapInstance = new google.maps.Map(mapContainer, {
                        center: position,
                        zoom: 16,
                        disableDefaultUI: true,
                        zoomControl: true,
                        styles: [] 
                    });

                    window._logMapMarker = new google.maps.Marker({
                        position: position,
                        map: window._logMapInstance,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: "#4f46e5", 
                            fillOpacity: 1,
                            strokeWeight: 2,
                            strokeColor: "#ffffff"
                        },
                        title: empName
                    });
                } else if (window._logMapInstance) {
                    // Update center, marker position, AND Marker Title!
                    window._logMapInstance.setCenter(position);
                    window._logMapInstance.setZoom(16);
                    window._logMapMarker.setPosition(position);
                    window._logMapMarker.setTitle(empName);
                }
            }, 100);
        }

        const closeMapBtn = e.target.closest('#close-map-modal-btn, #close-map-modal-btn-2');
        if ((closeMapBtn || e.target === mapModal) && mapModal) {
            mapModal.classList.add('hidden');
        }
    });

    document.body.addEventListener('input', (e) => {
        if (e.target.id === 'search-input') {
            filterAttendanceTable();
        }
    });

})();