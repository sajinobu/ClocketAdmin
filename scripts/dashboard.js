// scripts/dashboard.js

(() => {
    if (window.lucide) lucide.createIcons();

    // Helper: Convert "08:00 AM" to minutes past midnight
    function timeStringToMinutes(timeStr) {
        if (!timeStr || timeStr === "Not set") return 9 * 60; // Default 9:00 AM
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10);
        if (hours === 12 && modifier === 'AM') hours = 0;
        if (hours !== 12 && modifier === 'PM') hours += 12;
        return (hours * 60) + minutes;
    }

    // Helper: Get Initials
    function getInitials(name) {
        if (!name) return "EMP";
        const parts = name.split(" ");
        if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    }

    async function updateDashboardStats() {
        if (!window.db || !window.firebaseUtils) return;

        try {
            const { collection, getDocs, query, where } = window.firebaseUtils;
            
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            const currentMins = (now.getHours() * 60) + now.getMinutes();

            // 1. Fetch All Active Employees
            const empSnapshot = await getDocs(collection(window.db, "employees"));
            const employeeMap = {};
            let totalActiveEmployees = 0;
            
            empSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.account_status === 'active') {
                    employeeMap[data.email] = data;
                    totalActiveEmployees++;
                }
            });

            // 2. Fetch Today's Attendance
            const attQuery = query(collection(window.db, "attendance"), where("date", "==", todayStr));
            const attSnapshot = await getDocs(attQuery);
            
            let clockedInToday = 0;
            let lateArrivals = 0;
            let absentCount = 0;
            const clockedInEmails = new Set();
            let feedEvents = []; 

            attSnapshot.forEach(doc => {
                const att = doc.data();
                if (!att.clock_in_time) return;

                clockedInToday++;
                clockedInEmails.add(att.employee_id);
                const emp = employeeMap[att.employee_id] || { full_name: att.employee_id, work_start_time: "09:00 AM" };

                // Calculate Lateness
                const expectedStartMin = timeStringToMinutes(emp.work_start_time);
                const actualDate = new Date(att.clock_in_time.replace(/-/g, '/'));
                const actualMin = (actualDate.getHours() * 60) + actualDate.getMinutes();

                const isLate = actualMin > expectedStartMin;
                if (isLate) lateArrivals++;

                // Build Events List
                const empName = emp.full_name;
                const initials = getInitials(empName);
                
                // Extract profile picture if available
                const profilePic = (emp.profile_picture && emp.profile_picture !== "coming soon") ? emp.profile_picture : null;

                // Event: Clock In
                feedEvents.push({
                    timeObj: actualDate,
                    timeStr: actualDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    type: isLate ? 'late' : 'clock-in',
                    name: empName,
                    initials: initials,
                    profilePic: profilePic,
                    desc: isLate ? `Clocked In (${actualMin - expectedStartMin}m Late)` : `Clocked In for shift`
                });

                // Events: Breaks
                if (att.breaks && Array.isArray(att.breaks)) {
                    att.breaks.forEach(b => {
                        if (b.start) {
                            const bStart = new Date(b.start.replace(/-/g, '/'));
                            feedEvents.push({
                                timeObj: bStart,
                                timeStr: bStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                                type: 'break-start', name: empName, initials: initials, profilePic: profilePic, desc: `Started break`
                            });
                        }
                        if (b.end) {
                            const bEnd = new Date(b.end.replace(/-/g, '/'));
                            feedEvents.push({
                                timeObj: bEnd,
                                timeStr: bEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                                type: 'break-end', name: empName, initials: initials, profilePic: profilePic, desc: `Resumed work`
                            });
                        }
                    });
                }

                // Event: Clock Out
                if (att.clock_out_time) {
                    const cOut = new Date(att.clock_out_time.replace(/-/g, '/'));
                    feedEvents.push({
                        timeObj: cOut,
                        timeStr: cOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                        type: 'clock-out', name: empName, initials: initials, profilePic: profilePic, desc: `Clocked out for the day`
                    });
                }
            });

            // 3. Calculate Absents
            Object.values(employeeMap).forEach(emp => {
                if (!clockedInEmails.has(emp.email)) {
                    const expectedStartMin = timeStringToMinutes(emp.work_start_time);
                    if (currentMins > (expectedStartMin)) {
                        absentCount++;
                    }
                }
            });

            // Update UI Stat Cards
            const els = document.querySelectorAll('.stat-value');
            if (els.length >= 4) {
                els[0].textContent = totalActiveEmployees;
                els[1].textContent = clockedInToday;
                els[2].textContent = lateArrivals;
                
                const absentEl = document.getElementById('stat-absent');
                if (absentEl) absentEl.textContent = absentCount;
            }

            // 4. Render Live Activity Feed
            feedEvents.sort((a, b) => b.timeObj - a.timeObj);

            renderMainFeed(feedEvents.slice(0, 3)); 
            renderModalFeed(feedEvents.slice(0, 6)); 

        } catch (error) {
            console.error("Error updating dashboard stats:", error);
            document.querySelectorAll('.stat-value').forEach(el => el.textContent = "--");
        }
    }

    // --- Feed Renderers ---
    function renderMainFeed(events) {
        const feedContainer = document.getElementById('live-activity-feed');
        if (!feedContainer) return;
        
        let htmlStr = '';

        if (events.length === 0) {
            feedContainer.innerHTML = '<div class="p-6 text-center text-gray-500 text-sm">No activity recorded today yet.</div>';
            return;
        }

        events.forEach(ev => {
            let icon = 'clock';
            let iconColor = 'text-brand-secondary group-hover:text-brand-primary';
            let avatarClass = 'avatar-brand';
            let textClass = 'text-brand-darkest';
            let borderColor = 'var(--brand-primary)'; // For actual images

            if (ev.type === 'late') {
                icon = 'alert-circle';
                iconColor = 'text-yellow-500 group-hover:text-yellow-600';
                avatarClass = 'bg-yellow-100 text-yellow-700 border border-yellow-200';
                textClass = 'text-yellow-700 font-medium';
                borderColor = '#eab308'; // yellow-500
            } else if (ev.type === 'break-start') {
                icon = 'coffee';
                avatarClass = 'bg-amber-100 text-amber-700 border border-amber-200';
                borderColor = '#f59e0b'; // amber-500
            } else if (ev.type === 'break-end') {
                icon = 'play-circle';
                avatarClass = 'bg-blue-100 text-blue-700 border border-blue-200';
                borderColor = '#3b82f6'; // blue-500
            } else if (ev.type === 'clock-out') {
                icon = 'log-out';
                avatarClass = 'bg-gray-100 text-gray-600 border border-gray-200';
                borderColor = '#9ca3af'; // gray-400
            }

            // Determine if we show Image or Initials
            let avatarHTML = '';
            if (ev.profilePic) {
                avatarHTML = `<img src="${ev.profilePic}" alt="${ev.name}" class="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-white shadow-sm" style="border: 2px solid ${borderColor};">`;
            } else {
                avatarHTML = `<div class="avatar-circle ${avatarClass}">${ev.initials}</div>`;
            }

            htmlStr += `
                <a href="live-tracking.html" class="dashboard-row bordered group">
                  <div class="row-info">
                    ${avatarHTML}
                    <div>
                      <p class="row-title">${ev.name}</p>
                      <p class="row-subtitle ${textClass}">${ev.timeStr} • ${ev.desc}</p>
                    </div>
                  </div>
                  <i data-lucide="${icon}" class="w-4 h-4 ${iconColor} transition-colors"></i>
                </a>
            `;
        });
        
        feedContainer.innerHTML = htmlStr;
        if (window.lucide) lucide.createIcons();
    }

    function renderModalFeed(events) {
        const modalContainer = document.getElementById('modal-activity-feed');
        if (!modalContainer) return;
        
        let htmlStr = '';

        if (events.length === 0) {
            modalContainer.innerHTML = '<p class="text-sm text-gray-500 italic">No activity to show.</p>';
            return;
        }

        events.forEach((ev, index) => {
            const isLatest = index === 0;
            const timeTag = isLatest ? '<p class="text-[10px] font-black text-brand-primary uppercase tracking-wider">LATEST</p>' : `<p class="text-xs font-bold text-gray-500">${ev.timeStr}</p>`;
            
            let dotColor = 'bg-brand-grayLight';
            let boxClass = 'bg-brand-grayBg border-brand-grayLight';
            let textClass = 'text-brand-darkest';

            if (ev.type === 'clock-in') {
                dotColor = 'bg-brand-primary';
                boxClass = 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800';
            } else if (ev.type === 'late') {
                dotColor = 'bg-yellow-400';
                boxClass = 'bg-yellow-50 border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-800';
                textClass = 'text-yellow-800 dark:text-yellow-400';
            } else if (ev.type === 'break-start') {
                dotColor = 'bg-amber-400';
            } else if (ev.type === 'clock-out') {
                dotColor = 'bg-gray-400';
            }

            htmlStr += `
                <div class="relative pl-6">
                    <div class="absolute -left-[9px] top-1 w-4 h-4 rounded-full ${dotColor} ring-4 ring-brand-surface transition-colors"></div>
                    <div class="flex items-center gap-3 mb-1">${timeTag}</div>
                    <div class="${boxClass} rounded-lg p-3 border transition-colors">
                        <p class="text-sm ${textClass}"><span class="font-bold">${ev.name}</span> - ${ev.desc}.</p>
                    </div>
                </div>
            `;
        });
        
        modalContainer.innerHTML = htmlStr;
    }

    // ==========================================
    // SPA SAFE EVENT DELEGATION
    // ==========================================
    
    // 1. Purge any stale listeners from previous visits to the Dashboard
    if (window._dashboardClickListener) {
        document.body.removeEventListener('click', window._dashboardClickListener);
    }

    // 2. Define the exact click logic
    window._dashboardClickListener = (e) => {
        const feedModal = document.getElementById('feed-modal');
        if (!feedModal) return;

        // Open Modal
        if (e.target.closest('#view-more-feed-btn')) {
            e.preventDefault();
            feedModal.classList.remove('hidden');
            return;
        }

        // Close Modal
        if (e.target.closest('#close-feed-modal') || e.target === feedModal) {
            e.preventDefault();
            feedModal.classList.add('hidden');
            return;
        }

        // Handle links inside the modal
        const modalLink = e.target.closest('#feed-modal a');
        if (modalLink) {
            feedModal.classList.add('hidden');
        }
    };

    // 3. Attach the fresh, single listener to the body
    document.body.addEventListener('click', window._dashboardClickListener);

    // ==========================================
    // LIVE POLLING SYSTEM & SPA GUARD
    // ==========================================
    // Fetch data immediately on load, then silently refresh every 30 seconds
    const waitForFirebase = setInterval(() => {
        if (window.db && window.firebaseUtils) {
            clearInterval(waitForFirebase);
            updateDashboardStats(); 
            
            if (window._dashboardInterval) clearInterval(window._dashboardInterval);
            window._dashboardInterval = setInterval(updateDashboardStats, 30000); 
        }
    }, 50);

    // GUARD: Ensure scripts don't run duplicates, but listeners stay fresh!
    if (window.dashboardSPAInitialized) return;
    window.dashboardSPAInitialized = true;

})();