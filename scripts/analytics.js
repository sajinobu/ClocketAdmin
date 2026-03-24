// scripts/analytics.js

(() => {
    // 1. RUN EVERY TIME (UI & Animations)
    if (window.lucide) lucide.createIcons();

    // Ensure Sidebar Highlight
    setTimeout(() => {
        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') && item.getAttribute('href').startsWith('analytics')) {
                item.classList.add('active');
            }
        });
    }, 100);

    // Global state
    let attendanceData = [];
    let employeeData = {};
    let currentDateRange = 7; // Default to 7 days

    // ==========================================
    // DATA FETCHING & MATH LOGIC
    // ==========================================

    // Helper: Convert "09:00 AM" to minutes past midnight for easy math
    function timeStringToMinutes(timeStr) {
        if (!timeStr) return 9 * 60; // Default 9:00 AM if missing
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10);
        if (hours === 12 && modifier === 'AM') hours = 0;
        if (hours !== 12 && modifier === 'PM') hours += 12;
        return (hours * 60) + minutes;
    }

    // Helper: Get X days ago as YYYY-MM-DD
    function getPastDateString(daysAgo) {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString().split('T')[0];
    }

    async function loadAnalyticsData() {
        if (!window.firebaseUtils || !window.db) return;

        try {
            const { collection, getDocs, query, where } = window.firebaseUtils;

            // 1. Fetch Employees to get their Expected Start Times & Names
            const empSnap = await getDocs(collection(window.db, "employees"));
            employeeData = {};
            empSnap.forEach(doc => {
                const data = doc.data();
                employeeData[data.email] = {
                    name: data.full_name || data.first_name + " " + data.last_name,
                    expectedStartMin: timeStringToMinutes(data.work_start_time),
                    dept: data.department || "Unassigned"
                };
            });

            // 2. Fetch Attendance Data based on Date Range
            const startDate = getPastDateString(currentDateRange);
            const attQuery = query(
                collection(window.db, "attendance"), 
                where("date", ">=", startDate)
            );
            
            const attSnap = await getDocs(attQuery);
            attendanceData = [];

            attSnap.forEach(doc => {
                const data = doc.data();
                if (data.clock_in_time) {
                    attendanceData.push(data);
                }
            });

            // 3. Process the Data
            calculateAndRenderKPIs();
            renderArrivalDistribution();
            renderLiveWorkforce();
            renderTopPerformers();
            // Optional: You can expand renderWeeklyTrends() later using a similar grouping logic

        } catch (error) {
            console.error("Error loading analytics: ", error);
        }
    }

    function calculateAndRenderKPIs() {
        let totalRecords = attendanceData.length;
        if (totalRecords === 0) return;

        let lateCount = 0;
        let totalRenderedSeconds = 0;
        let totalClockInMinutes = 0;

        attendanceData.forEach(record => {
            const emp = employeeData[record.employee_id] || { expectedStartMin: 9 * 60 };
            
            // Get actual clock in minutes past midnight
            const actualDate = new Date(record.clock_in_time.replace(/-/g, "/"));
            const actualMin = (actualDate.getHours() * 60) + actualDate.getMinutes();

            // Calculate Lateness (Allowing a 5-minute grace period)
            if (actualMin > (emp.expectedStartMin + 5)) {
                lateCount++;
            }

            totalClockInMinutes += actualMin;
            totalRenderedSeconds += (record.rendered_seconds || 0);
        });

        // 1. On-Time Rate
        const onTimeRate = (((totalRecords - lateCount) / totalRecords) * 100).toFixed(1);
        document.querySelectorAll('.kpi-value')[1].textContent = `${onTimeRate}%`;
        const progressBar = document.querySelector('.kpi-info .progress-fill');
        if(progressBar) {
            progressBar.setAttribute('data-width', `${onTimeRate}%`);
            progressBar.style.width = `${onTimeRate}%`;
        }

        // 2. Late Arrivals
        document.querySelectorAll('.kpi-value')[2].textContent = lateCount;

        // 3. Avg Check-in
        const avgMin = Math.floor(totalClockInMinutes / totalRecords);
        let avgHour = Math.floor(avgMin / 60);
        let avgMinsLeft = avgMin % 60;
        let ampm = avgHour >= 12 ? 'PM' : 'AM';
        avgHour = avgHour % 12 || 12;
        document.querySelectorAll('.kpi-value')[0].textContent = `${avgHour}:${String(avgMinsLeft).padStart(2, '0')} ${ampm}`;

        // 4. Avg Productive Hours
        const avgSeconds = totalRenderedSeconds / totalRecords;
        const avgHours = (avgSeconds / 3600).toFixed(1);
        document.querySelectorAll('.kpi-value')[3].textContent = `${avgHours}h`;
    }

    function renderArrivalDistribution() {
        // Group by hour
        let hours = { '7': 0, '8': 0, '9': 0, '10': 0, 'late': 0 };
        let maxCount = 0;

        attendanceData.forEach(record => {
            const emp = employeeData[record.employee_id] || { expectedStartMin: 9 * 60 };
            const actualDate = new Date(record.clock_in_time.replace(/-/g, "/"));
            const h = actualDate.getHours();
            const actualMin = (h * 60) + actualDate.getMinutes();

            if (actualMin > (emp.expectedStartMin + 5)) {
                hours['late']++;
            } else if (h <= 7) { hours['7']++; }
            else if (h === 8) { hours['8']++; }
            else if (h === 9) { hours['9']++; }
            else { hours['10']++; }
        });

        Object.values(hours).forEach(count => { if(count > maxCount) maxCount = count; });
        if (maxCount === 0) maxCount = 1; // Prevent division by zero

        // Update UI Bars
        const cols = document.querySelectorAll('.distribution-col');
        if (cols.length >= 5) {
            const mapKeys = ['7', '8', '9', '10', 'late'];
            cols.forEach((col, index) => {
                const count = hours[mapKeys[index]];
                const heightPct = (count / maxCount) * 100;
                
                col.querySelector('span').textContent = count;
                col.querySelector('.distribution-bar').style.height = `${heightPct}%`;
            });
        }
    }

    function renderLiveWorkforce() {
        const todayStr = new Date().toISOString().split('T')[0];
        let activeCount = 0;
        let onBreakCount = 0;

        attendanceData.forEach(record => {
            if (record.date === todayStr && !record.clock_out_time) {
                activeCount++;
                if (record.on_break) onBreakCount++;
            }
        });

        const onSiteCount = activeCount - onBreakCount;

        const livePanel = document.querySelector('.analytics-panel:nth-child(2)');
        if (livePanel) {
            livePanel.querySelector('.text-2xl').textContent = activeCount;
            const detailSpans = livePanel.querySelectorAll('.text-sm.font-bold.text-brand-darkest');
            if (detailSpans.length >= 2) {
                detailSpans[0].textContent = onSiteCount;
                detailSpans[1].textContent = onBreakCount;
            }
        }
    }

    function renderTopPerformers() {
        // Group data by employee
        let empStats = {};
        attendanceData.forEach(record => {
            const eid = record.employee_id;
            if (!empStats[eid]) empStats[eid] = { total: 0, late: 0, name: '', dept: '' };
            
            const emp = employeeData[eid] || { name: eid, expectedStartMin: 9 * 60, dept: 'Unassigned' };
            empStats[eid].name = emp.name;
            empStats[eid].dept = emp.dept;
            empStats[eid].total++;

            const actualDate = new Date(record.clock_in_time.replace(/-/g, "/"));
            const actualMin = (actualDate.getHours() * 60) + actualDate.getMinutes();
            if (actualMin > (emp.expectedStartMin + 5)) empStats[eid].late++;
        });

        // Calculate rate and convert to array for sorting
        let rankingArray = [];
        for (const [eid, stats] of Object.entries(empStats)) {
            const rate = ((stats.total - stats.late) / stats.total) * 100;
            rankingArray.push({
                name: stats.name,
                dept: stats.dept,
                score: parseFloat(rate.toFixed(1)),
                initials: stats.name.substring(0,2).toUpperCase()
            });
        }

        // Sort descending by score
        rankingArray.sort((a, b) => b.score - a.score);

        // Save globally for the modal
        window.currentRankingData = rankingArray;

        // Update the Mini-List on the dashboard
        const listRows = document.querySelectorAll('.list-row');
        for(let i=0; i<listRows.length; i++) {
            if (rankingArray[i]) {
                const row = listRows[i];
                row.querySelector('.list-avatar').textContent = rankingArray[i].initials;
                row.querySelector('.text-sm').textContent = rankingArray[i].name;
                row.querySelector('.text-\\[10px\\]').textContent = `${rankingArray[i].score}% Punctual`;
            }
        }
    }

    // Modal Rendering
    function showRankingModal() {
        const modal = document.getElementById('ranking-modal');
        const box = document.getElementById('ranking-modal-box');
        const container = document.getElementById('ranking-list-container');

        const data = window.currentRankingData || [];

        container.innerHTML = data.slice(0, 10).map((emp, index) => {
            let colorClass = index % 2 === 0 ? 'avatar-teal' : 'avatar-blue';
            return `
            <div class="flex items-center gap-4 p-3 rounded-xl hover:bg-brand-grayBg transition-colors group">
                <div class="text-sm font-black text-brand-dark w-6">${index + 1}</div>
                <div class="list-avatar ${colorClass} shrink-0">${emp.initials}</div>
                <div class="flex-1">
                    <p class="text-sm font-bold text-brand-darkest group-hover:text-brand-primary transition-colors">${emp.name}</p>
                    <p class="text-[10px] text-brand-dark uppercase">${emp.dept}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm font-black text-brand-primary">${emp.score}%</p>
                    <p class="text-[9px] font-bold text-green-500 uppercase">Punctual</p>
                </div>
            </div>
        `}).join('');

        if (window.lucide) lucide.createIcons();

        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.add('flex'); 
            modal.classList.remove('opacity-0');
            box.classList.remove('scale-95');
            box.classList.add('scale-100');
        });
    }

    function hideRankingModal() {
        const modal = document.getElementById('ranking-modal');
        const box = document.getElementById('ranking-modal-box');
        
        modal.classList.add('opacity-0');
        box.classList.remove('scale-100');
        box.classList.add('scale-95');

        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }

    // ==========================================
    // SPA EVENT GUARD & LISTENERS
    // ==========================================
    const waitForFirebase = setInterval(() => {
        if (window.firebaseUtils && window.db) {
            clearInterval(waitForFirebase);
            loadAnalyticsData();
        }
    }, 50);

    if (window.analyticsSPAInitialized) return;
    window.analyticsSPAInitialized = true;

    document.body.addEventListener('click', (e) => {
        if (!document.getElementById('trend-dropdown')) return;
        
        // --- Date Range Filter Toggle ---
        const rangeBtn = e.target.closest('.range-btn');
        if (rangeBtn) {
            document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
            rangeBtn.classList.add('active');
            
            const range = rangeBtn.getAttribute('data-range');
            if (range === '7d') currentDateRange = 7;
            if (range === '30d') currentDateRange = 30;
            if (range === '3m') currentDateRange = 90;
            
            // Reload data with new range
            loadAnalyticsData();
        }

        // --- Custom Dropdown Handling (Weekly Trends) ---
        const trendDropdown = document.getElementById('trend-dropdown');
        if (trendDropdown && !trendDropdown.contains(e.target)) trendDropdown.classList.remove('open');

        const dropdownTrigger = e.target.closest('#trend-dropdown .dropdown-trigger');
        if (dropdownTrigger && trendDropdown && trendDropdown.contains(dropdownTrigger)) {
            e.stopPropagation();
            trendDropdown.classList.toggle('open');
        }

        const dropdownItem = e.target.closest('#trend-dropdown .dropdown-item');
        if (dropdownItem && trendDropdown && trendDropdown.contains(dropdownItem)) {
            e.stopPropagation();
            const value = dropdownItem.getAttribute('data-value');
            
            trendDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            dropdownItem.classList.add('active');
            document.getElementById('trend-text').textContent = dropdownItem.textContent;
            
            trendDropdown.classList.remove('open');
        }

        // --- Export Button ---
        const exportBtn = e.target.closest('#export-btn');
        if (exportBtn && !exportBtn.disabled) {
            const originalIcon = exportBtn.innerHTML;
            exportBtn.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin text-brand-primary"></i>`;
            if (window.lucide) lucide.createIcons();
            exportBtn.disabled = true;

            setTimeout(() => {
                exportBtn.innerHTML = originalIcon;
                exportBtn.disabled = false;
                showAnalyticsToast("Report exported as CSV successfully!");
            }, 1500);
        }

        if (e.target.closest('.btn-outline-full')) { showRankingModal(); }
        if (e.target.closest('#close-ranking-modal') || e.target.id === 'ranking-modal-backdrop') { hideRankingModal(); }
    });

    // --- Helper Function: Brand-Themed Toast Notification ---
    function showAnalyticsToast(message) {
        const existingToast = document.querySelector('.analytics-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `analytics-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[9999] transition-all duration-300`;
        toast.style.cssText = "transform: translateY(20px); opacity: 0;";
        
        toast.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5 text-brand-primary"></i> <span class="text-sm font-medium">${message}</span>`;
        
        document.body.appendChild(toast);
        if (window.lucide) lucide.createIcons();

        requestAnimationFrame(() => {
            toast.style.transform = "translateY(0)";
            toast.style.opacity = "1";
        });

        setTimeout(() => {
            toast.style.transform = "translateY(20px)";
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
})();