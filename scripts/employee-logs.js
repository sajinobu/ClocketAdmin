// scripts/employee-logs.js

(() => {
    if (window.lucide) lucide.createIcons();

    let currentEmpId = null;
    let employeeData = null;
    let allAttendanceData = [];
    let filteredLogs = []; 
    let currentFilter = 'This Month';
    let currentPage = 1;
    const logsPerPage = 5;

    // --- SPA MAP RESET ---
    window._logMapInstance = null;
    window._logMapMarker = null;

    setTimeout(() => {
        let fromPage = 'attendance';
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('from')) fromPage = urlParams.get('from');

        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            const targetHref = fromPage === 'dashboard' ? 'dashboard.html' : 'attendance.html';
            if (item.getAttribute('href') && item.getAttribute('href').startsWith(targetHref)) {
                item.classList.add('active');
            }
        });
    }, 100);

    // ==========================================
    // GOOGLE MAPS PROXY LOADER
    // ==========================================
    window.initMap = function() {
        window._isGoogleMapsReady = true;
    };

    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        loadGoogleMapsProxy();
    } else {
        window._isGoogleMapsReady = true;
    }

    function loadGoogleMapsProxy() {
        window.CORSproxyURL = [
            'https://corsproxy.io/?',
            'https://api.allorigins.win/get?url=',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        window.CORSproxyIndex = 0;
        
        var args = '';
        if (typeof language != 'undefined') args += '&language=' + language;

        window.sendRequestThroughCROSproxy = function(url, callback) {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        try {
                            if (window.CORSproxyIndex % window.CORSproxyURL.length === 0) {
                                if (callback) callback(xhttp.responseText);
                            } else {
                                var response = JSON.parse(xhttp.responseText);
                                if (callback && response.contents) callback(response.contents);
                            }
                        } catch (e) {
                            window.CORSproxyIndex++;
                            window.sendRequestThroughCROSproxy(url, callback);
                        }
                    } else {
                        window.CORSproxyIndex++;
                        if (window.CORSproxyIndex < window.CORSproxyURL.length * 3) {
                            window.sendRequestThroughCROSproxy(url, callback);
                        } else {
                            console.error("Map proxy failed");
                        }
                    }
                }
            };
            xhttp.onerror = function() {
                window.CORSproxyIndex++;
                if (window.CORSproxyIndex < window.CORSproxyURL.length * 3) {
                    window.sendRequestThroughCROSproxy(url, callback);
                }
            };
            xhttp.open("GET", window.CORSproxyURL[window.CORSproxyIndex % window.CORSproxyURL.length] + encodeURIComponent(url), true);
            xhttp.send();
        };

        var bypass = function (googleAPIcomponentJS, googleAPIcomponentURL) {
            if (googleAPIcomponentURL.toString().indexOf("common.js") != -1) {
                var removeFailureAlert = function(googleAPIcomponentURL) {
                    window.sendRequestThroughCROSproxy(googleAPIcomponentURL, (responseText) => {
                        var anotherAppendChildToHeadJSRegex = /\.head;.*src=(.*?);/;
                        var anotherAppendChildToHeadJS = responseText.match(anotherAppendChildToHeadJSRegex);
                        if (!anotherAppendChildToHeadJS) {
                            var script = document.createElement('script');
                            script.innerHTML = responseText;
                            document.head.appendChild(script);
                            return;
                        }
                        var googleAPItrustedScriptURL = anotherAppendChildToHeadJS[1];
                        var bypassQuotaServicePayload = anotherAppendChildToHeadJS[0].replace(
                            googleAPItrustedScriptURL, 
                            googleAPItrustedScriptURL + '.toString().indexOf("QuotaService.RecordEvent")!=-1?"":' + googleAPItrustedScriptURL
                        );
                        var script = document.createElement('script');
                        script.innerHTML = responseText
                            .replace(new RegExp(/;if\(![a-z]+?\).*Failure.*?\}/), ";")
                            .replace(new RegExp(/(\|\|\(\(\)=\>\{\}\);\S+\?\S+?\()/), "$1true||")
                            .replace(anotherAppendChildToHeadJSRegex, bypassQuotaServicePayload);
                        document.head.appendChild(script);
                    });
                }
                googleAPIcomponentJS.innerHTML = '(' + removeFailureAlert.toString() + ')("' + googleAPIcomponentURL.toString() + '")';
            } else if (googleAPIcomponentURL.toString().indexOf("map.js") != -1) {
                var hijackMapJS = function(googleAPIcomponentURL) {
                    window.sendRequestThroughCROSproxy(googleAPIcomponentURL, (responseText) => {
                        var script = document.createElement('script');
                        script.innerHTML = responseText.replace(new RegExp(/if\(\w+!==1&&\w+!==2\)/), "if(false)");
                        document.head.appendChild(script);
                    });
                }
                googleAPIcomponentJS.innerHTML = '(' + hijackMapJS.toString() + ')("' + googleAPIcomponentURL.toString() + '")';
            } else {
                googleAPIcomponentJS.src = googleAPIcomponentURL;
            }
        };

        var createAndExecutePayload = function (googleAPIjs) {
            var script = document.createElement('script');
            var appendChildToHeadJS = googleAPIjs.match(/(\w+)\.src=(_.*?);/);
            if (!appendChildToHeadJS) {
                script.innerHTML = googleAPIjs;
                document.head.appendChild(script);
                return;
            }
            var googleAPIcomponentJS = appendChildToHeadJS[1];
            var googleAPIcomponentURL = appendChildToHeadJS[2];
            script.innerHTML = googleAPIjs.replace(
                appendChildToHeadJS[0], 
                '(' + bypass.toString() + ')(' + googleAPIcomponentJS + ', ' + googleAPIcomponentURL + ');'
            );
            document.head.appendChild(script);
        };

        window.sendRequestThroughCROSproxy(
            'https://maps.googleapis.com/maps/api/js?key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg&callback=initMap' + args, 
            (googleAPIjs) => {
                createAndExecutePayload(googleAPIjs);
            }
        );
    }

    // ==========================================
    // DATA & FETCHING
    // ==========================================
    async function fetchEmployeeLogs() {
        const urlParams = new URLSearchParams(window.location.search);
        currentEmpId = urlParams.get('id');

        if (!currentEmpId || !window.firebaseUtils || !window.db) return;

        try {
            const { doc, getDoc, collection, query, where, getDocs } = window.firebaseUtils;

            const empRef = doc(window.db, "employees", currentEmpId);
            const empSnap = await getDoc(empRef);

            if (empSnap.exists()) {
                employeeData = empSnap.data();
                document.getElementById('log-emp-name').textContent = employeeData.full_name || "Unknown Employee";
                document.getElementById('log-emp-role-dept').textContent = `${employeeData.job_title || "Employee"} • ${employeeData.department || "Unassigned"}`;
            } else {
                document.getElementById('log-emp-name').textContent = "Employee Not Found";
                return;
            }

            const attQuery = query(collection(window.db, "attendance"), where("employee_id", "==", currentEmpId));
            const attSnap = await getDocs(attQuery);
            
            allAttendanceData = [];
            attSnap.forEach(doc => allAttendanceData.push({ id: doc.id, ...doc.data() }));
            allAttendanceData.sort((a, b) => new Date(b.date) - new Date(a.date));

            applyFilterAndRender();

        } catch (error) {
            console.error("Error fetching logs:", error);
        }
    }

    function getWeekBoundaries(date, offsetWeeks = 0) {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay() + 1 + (offsetWeeks * 7)); 
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    function applyFilterAndRender() {
        if (!employeeData) return;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const currentMonthPrefix = todayStr.substring(0, 7); 
        
        filteredLogs = [];

        if (currentFilter === 'This Month') {
            filteredLogs = allAttendanceData.filter(log => log.date.startsWith(currentMonthPrefix));
        } else if (currentFilter === 'This Week') {
            const bounds = getWeekBoundaries(today, 0);
            filteredLogs = allAttendanceData.filter(log => {
                const logDate = new Date(log.date); return logDate >= bounds.start && logDate <= bounds.end;
            });
        } else if (currentFilter === 'Last Week') {
            const bounds = getWeekBoundaries(today, -1);
            filteredLogs = allAttendanceData.filter(log => {
                const logDate = new Date(log.date); return logDate >= bounds.start && logDate <= bounds.end;
            });
        }

        let totalSeconds = 0;
        let lateCount = 0;
        let validDays = 0;
        let isClockedInToday = false;

        let expectedStartMin = 9 * 60; 
        if (employeeData.work_start_time && employeeData.work_start_time !== "Not set") {
            const [time, modifier] = employeeData.work_start_time.split(' ');
            let [hours, minutes] = time.split(':');
            hours = parseInt(hours, 10);
            if (hours === 12 && modifier === 'AM') hours = 0;
            if (hours !== 12 && modifier === 'PM') hours += 12;
            expectedStartMin = (hours * 60) + parseInt(minutes, 10);
        }

        filteredLogs.forEach(log => {
            totalSeconds += (log.rendered_seconds || 0);
            validDays++;

            if (log.date === todayStr && !log.clock_out_time) isClockedInToday = true;

            if (log.clock_in_time) {
                const actualDate = new Date(log.clock_in_time.replace(/-/g, '/'));
                const actualMin = (actualDate.getHours() * 60) + actualDate.getMinutes();
                if (actualMin > expectedStartMin) lateCount++; // STRICT CUTOFF
            }
        });

        const statusBadge = document.getElementById('log-emp-status');
        if (isClockedInToday) statusBadge.classList.remove('hidden');
        else statusBadge.classList.add('hidden');

        const totalHours = (totalSeconds / 3600).toFixed(1);
        document.getElementById('stat-hours').innerHTML = `${totalHours.split('.')[0]}<span>.${totalHours.split('.')[1]}h</span>`;
        document.getElementById('stat-punctuality').innerHTML = `${validDays > 0 ? (((validDays - lateCount) / validDays) * 100).toFixed(0) : 0}<span>%</span>`;
        document.getElementById('stat-days').textContent = validDays;

        currentPage = 1;
        renderPaginatedTable();
        renderTimeline(todayStr);
    }

    function renderPaginatedTable() {
        const tbody = document.getElementById('log-table-body');
        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');
        const pageInfo = document.getElementById('pagination-info');

        tbody.innerHTML = '';
        const todayStr = new Date().toISOString().split('T')[0];

        if (filteredLogs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-500">No attendance records found for ${currentFilter}.</td></tr>`;
            pageInfo.textContent = "Showing 0 of 0 logs";
            prevBtn.disabled = true; nextBtn.disabled = true;
            return;
        }

        const startIndex = (currentPage - 1) * logsPerPage;
        const endIndex = startIndex + logsPerPage;
        const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

        const locationFetchQueue = [];
        let expectedStartMin = 9 * 60; 
        if (employeeData.work_start_time && employeeData.work_start_time !== "Not set") {
            const [time, modifier] = employeeData.work_start_time.split(' ');
            let [hours, minutes] = time.split(':');
            hours = parseInt(hours, 10);
            if (hours === 12 && modifier === 'AM') hours = 0;
            if (hours !== 12 && modifier === 'PM') hours += 12;
            expectedStartMin = (hours * 60) + parseInt(minutes, 10);
        }

        paginatedLogs.forEach(log => {
            const logDate = new Date(log.date);
            const dateDisplay = (log.date === todayStr) ? "Today" : logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            const formatTime = (ts) => ts ? new Date(ts.replace(/-/g,'/')).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : "--:--";

            const clockIn = formatTime(log.clock_in_time);
            const clockOut = formatTime(log.clock_out_time);
            const employeeName = employeeData.full_name;

            const inPhotoBtn = log.clock_in_photo 
                ? `<button class="view-photo-btn text-brand-primary hover:bg-brand-grayBg p-1.5 rounded transition-colors flex-shrink-0" data-name="${employeeName}" data-time="${clockIn}" data-photo="${log.clock_in_photo}" data-type="Clock In"><i data-lucide="camera" class="w-4 h-4"></i></button>` 
                : `<button class="p-1.5 opacity-40 cursor-not-allowed flex-shrink-0" disabled><i data-lucide="camera-off" class="w-4 h-4"></i></button>`;

            const outPhotoBtn = log.clock_out_photo 
                ? `<button class="view-photo-btn text-brand-secondary hover:bg-brand-grayBg p-1.5 rounded transition-colors flex-shrink-0" data-name="${employeeName}" data-time="${clockOut}" data-photo="${log.clock_out_photo}" data-type="Clock Out"><i data-lucide="camera" class="w-4 h-4"></i></button>` 
                : `<button class="p-1.5 opacity-40 cursor-not-allowed flex-shrink-0" disabled><i data-lucide="camera-off" class="w-4 h-4"></i></button>`;

            let statusHtml = `<span class="badge" style="background:rgba(34,197,94,0.1); color:#22c55e;">On Time</span>`;
            if (!log.clock_out_time && log.date === todayStr) {
                statusHtml = `<span class="badge badge-pulse"><span class="status-dot"></span> Active</span>`;
            } else if (log.clock_in_time) {
                const actualDate = new Date(log.clock_in_time.replace(/-/g, '/'));
                const actualMin = (actualDate.getHours() * 60) + actualDate.getMinutes();
                if (actualMin > expectedStartMin) { // STRICT CUTOFF
                    statusHtml = `<span class="badge" style="background:rgba(234,179,8,0.1); color:#eab308;">Late</span>`;
                }
            }

            const hasLocation = log.clock_in_lat && log.clock_in_long;
            const locId = `loc-${log.id}`;
            const locationHtml = hasLocation 
                ? `<button class="view-map-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-grayLight hover:border-brand-primary/40 hover:bg-brand-primary/5 text-brand-darkest hover:text-brand-primary transition-all text-xs font-semibold whitespace-nowrap w-fit shadow-sm"
                        data-lat="${log.clock_in_lat}" data-lng="${log.clock_in_long}" data-name="${employeeName}" data-locid="${locId}">
                        <i data-lucide="map-pin" class="w-3.5 h-3.5 text-brand-primary shrink-0"></i>
                        <span id="${locId}" class="truncate max-w-[180px]"><i data-lucide="loader" class="w-3 h-3 animate-spin inline"></i> Fetching...</span>
                   </button>` 
                : `<span class="text-xs text-gray-400 font-medium">N/A</span>`;

            tbody.innerHTML += `
                <tr class="log-row">
                    <td class="log-td"><p class="font-bold text-brand-darkest text-sm">${dateDisplay}</p><p class="text-[10px] text-brand-dark uppercase tracking-wider font-bold">${log.date}</p></td>
                    <td class="log-td"><div class="flex items-center gap-2"><p class="text-sm font-bold text-brand-darkest">${clockIn}</p>${inPhotoBtn}</div></td>
                    <td class="log-td"><div class="flex items-center gap-2"><p class="text-sm font-medium text-brand-darkest">${clockOut}</p>${outPhotoBtn}</div></td>
                    <td class="log-td">${locationHtml}</td>
                    <td class="log-td">${statusHtml}</td>
                </tr>
            `;

            if (hasLocation) locationFetchQueue.push({ locId: locId, lat: log.clock_in_lat, lng: log.clock_in_long });
        });

        pageInfo.textContent = `Showing ${startIndex + 1}-${Math.min(endIndex, filteredLogs.length)} of ${filteredLogs.length} logs`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = endIndex >= filteredLogs.length;

        if (window.lucide) lucide.createIcons();
        processLocationQueue(locationFetchQueue);
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
                
                if (!response.ok) throw new Error("API Rate Limit");

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

    function renderTimeline(todayStr) {
        const todayLog = allAttendanceData.find(log => log.date === todayStr);
        const track = document.getElementById('timeline-track');
        const fill = document.getElementById('timeline-fill');
        document.getElementById('timeline-date').textContent = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        track.querySelectorAll('.timeline-marker').forEach(m => m.remove());

        if (!todayLog || !todayLog.clock_in_time) {
            fill.style.width = '0%';
            return;
        }

        const getLeftPercent = (dateStr) => {
            const d = new Date(dateStr.replace(/-/g, '/'));
            let mins = (d.getHours() * 60) + d.getMinutes();
            if (mins < 420) mins = 420;
            if (mins > 1140) mins = 1140;
            return ((mins - 420) / 720) * 100;
        };

        const formatTooltip = (dateStr) => new Date(dateStr.replace(/-/g, '/')).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const inPercent = getLeftPercent(todayLog.clock_in_time);
        let outPercent = inPercent; 

        track.innerHTML += `<div class="timeline-marker marker-teal group" style="left: ${inPercent}%;"><div class="timeline-tooltip"><div class="tooltip-arrow"></div><div class="tooltip-text">In: ${formatTooltip(todayLog.clock_in_time)}</div></div></div>`;

        if (todayLog.breaks && todayLog.breaks.length > 0) {
            todayLog.breaks.forEach((b) => {
                if (b.start) track.innerHTML += `<div class="timeline-marker marker-amber group" style="left: ${getLeftPercent(b.start)}%;"><div class="timeline-tooltip"><div class="tooltip-arrow"></div><div class="tooltip-text">Break: ${formatTooltip(b.start)}</div></div></div>`;
                if (b.end) track.innerHTML += `<div class="timeline-marker marker-teal group" style="left: ${getLeftPercent(b.end)}%;"><div class="timeline-tooltip"><div class="tooltip-arrow"></div><div class="tooltip-text">Return: ${formatTooltip(b.end)}</div></div></div>`;
            });
        }

        if (todayLog.clock_out_time) {
            outPercent = getLeftPercent(todayLog.clock_out_time);
            track.innerHTML += `<div class="timeline-marker marker-teal group" style="left: ${outPercent}%;"><div class="timeline-tooltip"><div class="tooltip-arrow"></div><div class="tooltip-text">Out: ${formatTooltip(todayLog.clock_out_time)}</div></div></div>`;
        }

        setTimeout(() => { fill.style.width = `${outPercent}%`; }, 100);
    }

    function triggerCSVExport() {
        let csvContent = "Date,Clock In,Clock Out,Rendered Hours\n";
        
        filteredLogs.forEach(log => {
            const formatTime = (ts) => ts ? new Date(ts.replace(/-/g,'/')).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : "--:--";
            const cIn = formatTime(log.clock_in_time);
            const cOut = formatTime(log.clock_out_time);
            
            let total = "--";
            if (log.rendered_seconds) {
                const hours = Math.floor(log.rendered_seconds / 3600);
                const minutes = Math.floor((log.rendered_seconds % 3600) / 60);
                total = `${hours}h ${minutes}m`;
            }

            csvContent += `"${log.date}","${cIn}","${cOut}","${total}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${employeeData.full_name.replace(/ /g, '_')}_Logs.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const waitForFirebase = setInterval(() => {
        if (window.firebaseUtils && window.db) {
            clearInterval(waitForFirebase);
            fetchEmployeeLogs();
        }
    }, 50);

    // ==========================================
    // SPA SAFE EVENT LISTENERS
    // ==========================================
    if (window._empLogsClickListener) document.body.removeEventListener('click', window._empLogsClickListener);

    window._empLogsClickListener = (e) => {
        
        if (e.target.closest('#prev-page-btn') && !e.target.closest('#prev-page-btn').disabled) {
            currentPage--; renderPaginatedTable();
        }
        if (e.target.closest('#next-page-btn') && !e.target.closest('#next-page-btn').disabled) {
            currentPage++; renderPaginatedTable();
        }

        const backBtn = e.target.closest('#dynamic-back-btn');
        if (backBtn) {
            e.preventDefault();
            let currentFrom = 'attendance'; 
            const currentParams = new URLSearchParams(window.location.search);
            if(currentParams.get('from')) currentFrom = currentParams.get('from');
            
            const returnUrl = `${currentFrom}.html`;
            if (typeof navigateTo === 'function') navigateTo(returnUrl);
            else window.location.href = returnUrl;
        }

        const logRangeDropdown = document.getElementById('log-range-dropdown');
        if (logRangeDropdown && !logRangeDropdown.contains(e.target)) logRangeDropdown.classList.remove('open');

        const dropdownTrigger = e.target.closest('#log-range-dropdown .dropdown-trigger');
        if (dropdownTrigger && logRangeDropdown && logRangeDropdown.contains(dropdownTrigger)) {
            e.stopPropagation();
            logRangeDropdown.classList.toggle('open');
        }

        const dropdownItem = e.target.closest('#log-range-dropdown .dropdown-item');
        if (dropdownItem && logRangeDropdown && logRangeDropdown.contains(dropdownItem)) {
            e.stopPropagation();
            logRangeDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            dropdownItem.classList.add('active');
            document.getElementById('log-range-text').textContent = dropdownItem.textContent;
            logRangeDropdown.classList.remove('open');

            currentFilter = dropdownItem.getAttribute('data-value');
            applyFilterAndRender();
        }

        const exportBtn = e.target.closest('#export-log-btn');
        if (exportBtn && !exportBtn.disabled) {
            e.preventDefault();
            const originalContent = exportBtn.innerHTML;
            
            exportBtn.innerHTML = `<i data-lucide="loader" class="w-5 h-5 text-brand-primary animate-spin"></i><span class="text-sm font-bold opacity-80">Exporting...</span>`;
            exportBtn.disabled = true; exportBtn.classList.add('opacity-50', 'cursor-not-allowed');
            if (window.lucide) lucide.createIcons();

            setTimeout(() => {
                triggerCSVExport(); 

                exportBtn.innerHTML = originalContent;
                exportBtn.disabled = false; exportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                if (window.lucide) lucide.createIcons();
                
                const existingToast = document.querySelector('.export-toast');
                if (existingToast) existingToast.remove();

                const toast = document.createElement('div');
                toast.className = `export-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] transition-all duration-500 transform translate-y-20 opacity-0`;
                toast.style.cssText = "display: flex; align-items: center; justify-content: center; min-width: 300px;";
                toast.innerHTML = `<div class="w-10 h-10 bg-[rgba(99,102,241,0.1)] text-brand-primary rounded-xl flex items-center justify-center flex-shrink-0"><i data-lucide="check" class="w-5 h-5"></i></div><div class="flex-1"><p class="text-sm font-bold">Export Complete</p><p class="text-xs opacity-80 mt-0.5">Logs downloaded.</p></div>`;

                document.body.appendChild(toast);
                if (window.lucide) lucide.createIcons();
                requestAnimationFrame(() => toast.classList.remove('translate-y-20', 'opacity-0'));
                setTimeout(() => { toast.classList.add('translate-y-20', 'opacity-0'); setTimeout(() => toast.remove(), 500); }, 3500);
            }, 1500);
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
        // MODAL MAP FIX: RENDER GOOGLE MAPS
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
                const position = { lat: lat, lng: lng };

                const initModalMap = () => {
                    if (!window._isGoogleMapsReady || typeof google === 'undefined' || !google.maps) {
                        mapContainer.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center text-gray-500"><i data-lucide="loader" class="w-6 h-6 animate-spin mb-2 text-brand-primary"></i><span class="text-sm font-medium">Loading maps engine...</span></div>`;
                        if (window.lucide) lucide.createIcons();
                        
                        setTimeout(initModalMap, 200);
                        return;
                    }

                    if (mapContainer.querySelector('.animate-spin')) {
                        mapContainer.innerHTML = '';
                    }

                    if (!window._logMapInstance) {
                        window._logMapInstance = new google.maps.Map(mapContainer, {
                            center: position,
                            zoom: 16,
                            mapTypeId: 'roadmap',
                            disableDefaultUI: true,
                            zoomControl: true
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
                    } else {
                        window._logMapInstance.setCenter(position);
                        window._logMapMarker.setPosition(position);
                    }

                    google.maps.event.trigger(window._logMapInstance, 'resize');
                    window._logMapInstance.setCenter(position);
                };

                initModalMap();

            }, 100);
        }

        if (e.target.closest('.modal-close-btn, .btn-secondary') || e.target.classList.contains('modal-overlay')) {
            if(document.getElementById('photo-modal')) document.getElementById('photo-modal').classList.add('hidden');
            if(document.getElementById('map-modal')) document.getElementById('map-modal').classList.add('hidden');
        }
    };

    document.body.addEventListener('click', window._empLogsClickListener);

})();