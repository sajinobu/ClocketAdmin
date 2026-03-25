// scripts/employee-profile.js

(() => {
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        let fromPage = 'management'; 
        const urlParams = new URLSearchParams(window.location.search);
        if(urlParams.get('from')) {
            fromPage = urlParams.get('from');
        }

        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') && item.getAttribute('href').startsWith(fromPage)) {
                item.classList.add('active');
            }
        });
    }, 100);

    // --- FIREBASE: LOAD EMPLOYEE PROFILE ---
    async function loadEmployeeProfile() {
        const urlParams = new URLSearchParams(window.location.search);
        const empId = urlParams.get('id');

        if (!empId) {
            document.getElementById('profile-name').textContent = "Error: No Employee Selected";
            return;
        }

        try {
            const { doc, getDoc, collection, query, where, getDocs } = window.firebaseUtils;
            const docRef = doc(window.db, "employees", empId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const emp = docSnap.data();

                const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
                
                const avatarImg = document.getElementById('profile-avatar');
                if (emp.profile_picture && emp.profile_picture !== "coming soon") {
                    avatarImg.src = emp.profile_picture; 
                } else {
                    avatarImg.src = defaultAvatar; 
                }

                document.getElementById('profile-name').textContent = emp.full_name || "Unknown";
                document.getElementById('profile-role').textContent = emp.job_title || "Employee";
                
                const deptEl = document.getElementById('profile-dept');
                if (deptEl) deptEl.innerHTML = `<i data-lucide="briefcase" class="meta-icon"></i> ${emp.department || "Unassigned"}`;

                document.getElementById('profile-email').textContent = emp.email || "N/A";
                document.getElementById('profile-phone').textContent = emp.contact_number || "N/A";
                document.getElementById('profile-emp-id').textContent = emp.employee_id || "N/A";
                document.getElementById('profile-team').textContent = emp.assigned_team || "N/A";
                document.getElementById('profile-system-role').textContent = emp.system_role || "Employee";

                if (emp.created_at) {
                    const dateOnly = emp.created_at.split(" ")[0];
                    document.getElementById('profile-hire-date').textContent = dateOnly;
                }

                // --- POPULATE WORK SCHEDULE ---
                const shiftStart = emp.work_start_time || "Not set";
                const shiftEnd = emp.work_end_time || "Not set";
                
                const shiftDisplay = document.getElementById('profile-shift');
                if (shiftDisplay) {
                    shiftDisplay.textContent = (shiftStart === "Not set" && shiftEnd === "Not set") 
                        ? "Not assigned" 
                        : `${shiftStart} - ${shiftEnd}`;
                }
                
                const daysDisplay = document.getElementById('profile-working-days');
                if (daysDisplay) {
                    daysDisplay.textContent = (emp.working_days && emp.working_days.length > 0) 
                        ? emp.working_days.join(', ') 
                        : "Not assigned";
                }
                
                if (window.lucide) lucide.createIcons();

                // ==========================================
                // NEW: FETCH RECENT ATTENDANCE LOGS
                // ==========================================
                await loadRecentAttendance(emp.email, shiftStart);

            } else {
                document.getElementById('profile-name').textContent = "Employee Not Found in Database";
            }
        } catch (error) {
            console.error("Error fetching profile details:", error);
            document.getElementById('profile-name').textContent = "Error Loading Profile";
        }
    }

    // --- RECENT ATTENDANCE LOGIC ---
    // --- RECENT ATTENDANCE & STATS LOGIC ---
    async function loadRecentAttendance(employeeEmail, expectedStartTimeStr) {
        const tbody = document.querySelector('.log-table tbody');
        if (!tbody) return;

        try {
            const { collection, getDocs, query, where } = window.firebaseUtils;
            
            // Query attendance by this employee's email
            const attQuery = query(collection(window.db, "attendance"), where("employee_id", "==", employeeEmail));
            const attSnap = await getDocs(attQuery);

            let logs = [];
            attSnap.forEach(doc => logs.push(doc.data()));

            // ==========================================
            // NEW: CALCULATE EMPLOYEE STATS (Before Slicing)
            // ==========================================
            let totalRenderedSeconds = 0;
            let lateCount = 0;
            let totalClockInMins = 0;
            let validClockIns = 0;

            // Figure out their expected start time in minutes
            let expectedStartMin = 9 * 60; // default 9AM
            if (expectedStartTimeStr && expectedStartTimeStr !== "Not set") {
                const [time, modifier] = expectedStartTimeStr.split(' ');
                let [hours, minutes] = time.split(':');
                hours = parseInt(hours, 10);
                minutes = parseInt(minutes, 10);
                if (hours === 12 && modifier === 'AM') hours = 0;
                if (hours !== 12 && modifier === 'PM') hours += 12;
                expectedStartMin = (hours * 60) + minutes;
            }

            logs.forEach(log => {
                // 1. Sum up total hours logged
                totalRenderedSeconds += (log.rendered_seconds || 0);

                if (log.clock_in_time) {
                    validClockIns++;
                    const actualDate = new Date(log.clock_in_time.replace(/-/g, '/'));
                    const actualMin = (actualDate.getHours() * 60) + actualDate.getMinutes();
                    
                    // 2. Sum up clock-in times for the average
                    totalClockInMins += actualMin;

                    // 3. Count late days (5 min grace period)
                    if (actualMin > expectedStartMin + 5) {
                        lateCount++;
                    }
                }
            });

            // Update DOM Elements
            const statValues = document.querySelectorAll('.stat-value');
            if (statValues.length >= 3) {
                // Avg Check-in
                if (validClockIns > 0) {
                    const avgMin = Math.floor(totalClockInMins / validClockIns);
                    let avgHour = Math.floor(avgMin / 60);
                    let avgMinsLeft = avgMin % 60;
                    let ampm = avgHour >= 12 ? 'PM' : 'AM';
                    avgHour = avgHour % 12 || 12;
                    statValues[0].textContent = `${avgHour}:${String(avgMinsLeft).padStart(2, '0')} ${ampm}`;
                } else {
                    statValues[0].textContent = "--:--";
                }

                // On-Time Rate
                if (validClockIns > 0) {
                    const rate = (((validClockIns - lateCount) / validClockIns) * 100).toFixed(1);
                    statValues[1].textContent = `${rate}%`;
                } else {
                    statValues[1].textContent = "0%";
                }

                // Hours Logged
                const totalHours = (totalRenderedSeconds / 3600).toFixed(1);
                statValues[2].textContent = `${totalHours}h`;
            }
            // ==========================================


            // Sort logs natively in JavaScript
            logs.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Grab ONLY the 1 most recent record for the table
            logs = logs.slice(0, 1);

            tbody.innerHTML = '';

            if (logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="log-td text-center text-gray-500 py-6">No recent attendance records found.</td></tr>`;
                return;
            }

            const todayStr = new Date().toISOString().split('T')[0];

            logs.forEach(log => {
                // Format Date
                const logDate = new Date(log.date);
                const dateDisplay = (log.date === todayStr) 
                    ? "Today" 
                    : logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                // Format Times
                const formatTime = (timeStr) => {
                    if (!timeStr) return "--";
                    const d = new Date(timeStr.replace(/-/g, '/'));
                    if (isNaN(d.getTime())) return "--";
                    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                };

                const clockIn = formatTime(log.clock_in_time);
                const clockOut = formatTime(log.clock_out_time);
                const total = log.rendered_time || "--";

                // Determine Status
                let statusText = "On Time";
                let statusClass = "status-active"; 

                if (!log.clock_out_time && log.date === todayStr) {
                    statusText = "Active";
                    statusClass = "bg-blue-100 text-blue-600 border-blue-200";
                } else if (log.clock_in_time) {
                    const actualDate = new Date(log.clock_in_time.replace(/-/g, '/'));
                    const actualMin = (actualDate.getHours() * 60) + actualDate.getMinutes();

                    if (actualMin > expectedStartMin + 5) {
                        statusText = "Late";
                        statusClass = "status-late"; 
                    }
                }

                // Inject Row
                tbody.innerHTML += `
                    <tr class="log-row">
                      <td class="log-td font-medium text-[var(--brand-darkest)]">${dateDisplay}</td>
                      <td class="log-td"><span class="status-badge ${statusClass}">${statusText}</span></td>
                      <td class="log-td">${clockIn}</td>
                      <td class="log-td text-[var(--brand-dark)]">${clockOut}</td>
                      <td class="log-td text-[var(--brand-dark)]">${total}</td>
                    </tr>
                `;
            });

        } catch (error) {
            console.error("Error loading recent attendance:", error);
            tbody.innerHTML = `<tr><td colspan="5" class="log-td text-center text-red-500 py-6">Failed to load attendance logs.</td></tr>`;
        }
    }

    const waitForFirebase = setInterval(() => {
        if (window.firebaseUtils && window.db) {
            clearInterval(waitForFirebase);
            loadEmployeeProfile();
        }
    }, 50);

    if (window.employeeProfileSPAInitialized) return;
    window.employeeProfileSPAInitialized = true;

    // --- BULLETPROOF ROUTING LISTENERS ---
    // --- BULLETPROOF ROUTING LISTENERS ---
    document.body.addEventListener('click', (e) => {
        if (!document.getElementById('profile-name')) return;
        
        // 1. Back Button
        const backBtn = e.target.closest('#dynamic-back-btn, #cancel-btn');
        if (backBtn) {
            e.preventDefault();
            const urlParams = new URLSearchParams(window.location.search);
            const fromPage = urlParams.get('from') || 'management';
            
            let returnUrl = 'management.html?tab=employees'; 
            
            if (fromPage === 'team-details') {
                const teamId = urlParams.get('teamId');
                returnUrl = teamId ? `team-details.html?id=${teamId}` : 'management.html?tab=teams';
            } 
            else if (fromPage !== 'management') {
                returnUrl = `${fromPage}.html`;
            }

            // Use SPA Router!
            if (typeof navigateTo === 'function') navigateTo(returnUrl);
            else window.location.href = returnUrl;
            return;
        }

        // 2. Forward Links (Edit Profile & View Logs)
        const forwardBtn = e.target.closest('a[href*="employee-edit-profile"], a[href*="employee-logs"]');
        if (forwardBtn) {
            e.preventDefault();
            const currentParams = new URLSearchParams(window.location.search);
            const empId = currentParams.get('id');
            const fromParam = currentParams.get('from') || 'management';
            const teamId = currentParams.get('teamId');

            // Figure out base URL from the button's href attribute
            let targetUrl = forwardBtn.getAttribute('href').split('?')[0]; 
            targetUrl += `?id=${empId}&from=${fromParam}`;
            if (teamId) targetUrl += `&teamId=${teamId}`;

            // Use SPA Router!
            if (typeof navigateTo === 'function') navigateTo(targetUrl);
            else window.location.href = targetUrl;
            return;
        }
        
        // 3. View Logs Button
        const logBtn = e.target.closest('a[href*="employee-logs"]');
        if (logBtn) {
            e.preventDefault();
            const currentParams = new URLSearchParams(window.location.search);
            const empId = currentParams.get('id');
            const fromParam = currentParams.get('from') || 'management';
            const teamId = currentParams.get('teamId');

            let targetUrl = `employee-logs.html?id=${empId}&from=${fromParam}`;
            if (teamId) targetUrl += `&teamId=${teamId}`;

            window.location.href = targetUrl;
        }
    });
})();