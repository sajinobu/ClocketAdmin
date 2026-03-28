// scripts/analytics.js

(() => {
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') && item.getAttribute('href').startsWith('analytics')) {
                item.classList.add('active');
            }
        });
    }, 100);

    let allAttendanceData = [];
    let employeeData = {};
    let currentDateRange = 7; 
    let currentWeeklyTrendFilter = 'This Week'; 

    function timeStringToMinutes(timeStr) {
        if (!timeStr) return 9 * 60; 
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10);
        if (hours === 12 && modifier === 'AM') hours = 0;
        if (hours !== 12 && modifier === 'PM') hours += 12;
        return (hours * 60) + minutes;
    }

    function getPastDateString(daysAgo) {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString().split('T')[0];
    }

    const CIRCUMFERENCE = 251.2;

    async function loadAnalyticsData() {
        if (!window.firebaseUtils || !window.db) return;

        try {
            const { collection, getDocs } = window.firebaseUtils;

            // 1. Fetch Employees & Filter Out Inactive
            const empSnap = await getDocs(collection(window.db, "employees"));
            employeeData = {};
            
            empSnap.forEach(doc => {
                const data = doc.data();
                const status = data.account_status || "active"; // Default to active if missing
                
                // ONLY add them to our lookup if they are not explicitly inactive
                if (status !== 'inactive' && data.email) {
                    employeeData[data.email] = {
                        name: data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || "Unknown",
                        expectedStartMin: timeStringToMinutes(data.work_start_time),
                        dept: data.department || "Unassigned"
                    };
                }
            });

            // 2. Fetch Attendance & Filter Out Inactive Records
            const attSnap = await getDocs(collection(window.db, "attendance"));
            allAttendanceData = [];

            attSnap.forEach(doc => {
                const data = doc.data();
                // --- FIX: Only push the attendance record if the employee is in our ACTIVE employee list! ---
                if (data.clock_in_time && employeeData[data.employee_id]) {
                    allAttendanceData.push(data);
                }
            });

            const subtitle = document.getElementById('analytics-subtitle');
            if (subtitle) {
                subtitle.textContent = `Real-time attendance intelligence for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric'})}`;
            }

            processAnalytics();

        } catch (error) {
            console.error("Error loading analytics: ", error);
        }
    }

    function processAnalytics() {
        const startDateStr = getPastDateString(currentDateRange);
        const rangeData = allAttendanceData.filter(record => record.date >= startDateStr);

        calculateAndRenderKPIs(rangeData);
        renderArrivalDistribution(rangeData);
        renderLiveWorkforce(); 
        renderTopPerformers(); 
        renderWeeklyTrends(); 
    }

    function calculateAndRenderKPIs(dataSubset) {
        let totalRecords = dataSubset.length;
        if (totalRecords === 0) {
            document.querySelectorAll('.kpi-value').forEach(el => el.textContent = "--");
            const progressBar = document.getElementById('kpi-ontime-bar');
            if(progressBar) progressBar.style.width = `0%`;
            return;
        }

        let lateCount = 0;
        let totalRenderedSeconds = 0;
        let totalClockInMinutes = 0;

        dataSubset.forEach(record => {
            const emp = employeeData[record.employee_id]; // Guaranteed to exist because of our new filter
            
            const actualDate = new Date(record.clock_in_time.replace(/-/g, "/"));
            const actualMin = (actualDate.getHours() * 60) + actualDate.getMinutes();

            if (actualMin > emp.expectedStartMin + 5) lateCount++; // Added 5 min grace period

            totalClockInMinutes += actualMin;
            totalRenderedSeconds += (record.rendered_seconds || 0);
        });

        const onTimeRate = (((totalRecords - lateCount) / totalRecords) * 100).toFixed(1);
        document.querySelectorAll('.kpi-value')[1].textContent = `${onTimeRate}%`;
        const progressBar = document.getElementById('kpi-ontime-bar');
        if(progressBar) progressBar.style.width = `${onTimeRate}%`;

        document.querySelectorAll('.kpi-value')[2].textContent = lateCount;

        const avgMin = Math.floor(totalClockInMinutes / totalRecords);
        let avgHour = Math.floor(avgMin / 60);
        let avgMinsLeft = avgMin % 60;
        let ampm = avgHour >= 12 ? 'PM' : 'AM';
        avgHour = avgHour % 12 || 12;
        document.querySelectorAll('.kpi-value')[0].textContent = `${avgHour}:${String(avgMinsLeft).padStart(2, '0')} ${ampm}`;

        const avgSeconds = totalRenderedSeconds / totalRecords;
        const avgHours = (avgSeconds / 3600).toFixed(1);
        document.querySelectorAll('.kpi-value')[3].textContent = `${avgHours}h`;
    }

    function renderArrivalDistribution(dataSubset) {
        let hours = { '7': 0, '8': 0, '9': 0, '10': 0, 'late': 0 };
        let maxCount = 0;

        dataSubset.forEach(record => {
            const emp = employeeData[record.employee_id];
            const actualDate = new Date(record.clock_in_time.replace(/-/g, "/"));
            const h = actualDate.getHours();
            const actualMin = (h * 60) + actualDate.getMinutes();

            if (actualMin > emp.expectedStartMin + 5) hours['late']++;
            else if (h <= 7) hours['7']++;
            else if (h === 8) hours['8']++;
            else if (h === 9) hours['9']++;
            else hours['10']++;
        });

        Object.values(hours).forEach(count => { if(count > maxCount) maxCount = count; });
        if (maxCount === 0) maxCount = 1; 

        const cols = document.querySelectorAll('.distribution-col');
        if (cols.length >= 5) {
            const mapKeys = ['7', '8', '9', '10', 'late'];
            cols.forEach((col, index) => {
                const count = hours[mapKeys[index]];
                const heightPct = (count / maxCount) * 100;
                
                col.querySelector('span').textContent = count;
                setTimeout(() => {
                    col.querySelector('.distribution-bar').style.height = `${heightPct}%`;
                }, 100);
            });
        }
    }

    function renderLiveWorkforce() {
        const todayStr = new Date().toISOString().split('T')[0];
        let activeCount = 0;
        let onBreakCount = 0;
        const totalEmployees = Object.keys(employeeData).length || 1;

        allAttendanceData.forEach(record => {
            if (record.date === todayStr && !record.clock_out_time) {
                activeCount++;
                if (record.on_break) onBreakCount++;
            }
        });

        const onSiteCount = activeCount - onBreakCount;

        document.getElementById('live-total-count').textContent = activeCount;
        document.getElementById('live-onsite-count').textContent = onSiteCount;
        document.getElementById('live-break-count').textContent = onBreakCount;

        const activeRing = document.getElementById('chart-active-ring');
        const breakRing = document.getElementById('chart-break-ring');

        if (activeRing && breakRing) {
            const activePct = onSiteCount / totalEmployees;
            const breakPct = onBreakCount / totalEmployees;

            const activeStroke = activePct * CIRCUMFERENCE;
            const breakStroke = breakPct * CIRCUMFERENCE;

            setTimeout(() => {
                activeRing.style.strokeDasharray = `${activeStroke} ${CIRCUMFERENCE}`;
                
                breakRing.style.strokeDasharray = `${breakStroke} ${CIRCUMFERENCE}`;
                breakRing.style.strokeDashoffset = `-${activeStroke}`;
            }, 100);
        }
    }

    function getWeekDates(offsetWeeks = 0) {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay() + 1 + (offsetWeeks * 7)); 
        
        let days = [];
        for (let i=0; i<5; i++) { 
            const current = new Date(d);
            current.setDate(current.getDate() + i);
            days.push(current.toISOString().split('T')[0]);
        }
        return days;
    }

    function renderWeeklyTrends() {
        const container = document.getElementById('weekly-trends-container');
        if (!container) return;

        const offset = currentWeeklyTrendFilter === 'This Week' ? 0 : -1;
        const weekDates = getWeekDates(offset);
        const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        const totalEmployees = Object.keys(employeeData).length || 1;

        let htmlString = '';

        weekDates.forEach((dateStr, index) => {
            const presentCount = allAttendanceData.filter(log => log.date === dateStr).length;
            const percentage = Math.round((presentCount / totalEmployees) * 100);

            let textClass = 'text-brand-darkest';
            let barClass = 'bg-brand-primary';
            if (percentage < 90 && percentage > 0) {
                textClass = 'text-amber-500';
                barClass = 'bg-amber-400';
            } else if (percentage === 0) {
                textClass = 'text-gray-400';
                barClass = 'bg-gray-200';
            }

            htmlString += `
                <div class="trend-row">
                    <div class="trend-header">
                        <span class="trend-label">${dayNames[index]} <span class="text-[10px] text-gray-400 ml-1">(${dateStr.substring(5)})</span></span>
                        <span class="trend-value ${textClass} transition-colors">${percentage}%</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill ${barClass}" style="width: 0%;" data-target="${percentage}%"></div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = htmlString;

        setTimeout(() => {
            container.querySelectorAll('.progress-fill').forEach(bar => {
                bar.style.width = bar.getAttribute('data-target');
            });
        }, 100);
    }

    function renderTopPerformers() {
        const todayStr = new Date().toISOString().split('T')[0];
        const currentMonthPrefix = todayStr.substring(0, 7); 
        
        const monthData = allAttendanceData.filter(record => record.date.startsWith(currentMonthPrefix));

        let empStats = {};
        
        monthData.forEach(record => {
            const eid = record.employee_id;
            const emp = employeeData[eid]; // Guaranteed to be active
            
            if (!empStats[eid]) empStats[eid] = { total: 0, late: 0, name: emp.name, dept: emp.dept };
            
            empStats[eid].total++;

            const actualDate = new Date(record.clock_in_time.replace(/-/g, "/"));
            const actualMin = (actualDate.getHours() * 60) + actualDate.getMinutes();
            if (actualMin > emp.expectedStartMin + 5) empStats[eid].late++; 
        });

        let rankingArray = [];
        for (const [eid, stats] of Object.entries(empStats)) {
            if (stats.total === 0) continue; 
            
            const rate = ((stats.total - stats.late) / stats.total) * 100;
            rankingArray.push({
                name: stats.name,
                dept: stats.dept,
                score: parseFloat(rate.toFixed(1)),
                initials: stats.name.substring(0,2).toUpperCase()
            });
        }

        rankingArray.sort((a, b) => b.score - a.score);
        window.currentRankingData = rankingArray;

        const listRows = document.querySelectorAll('.list-row');
        for(let i=0; i<listRows.length; i++) {
            if (rankingArray[i]) {
                const row = listRows[i];
                row.querySelector('.list-avatar').textContent = rankingArray[i].initials;
                row.querySelector('.text-sm').textContent = rankingArray[i].name;
                row.querySelector('.text-\\[10px\\]').textContent = `${rankingArray[i].score}% Punctual`;
            } else {
                const row = listRows[i];
                row.querySelector('.list-avatar').textContent = "--";
                row.querySelector('.text-sm').textContent = "Not Enough Data";
                row.querySelector('.text-\\[10px\\]').textContent = `0% Punctual`;
            }
        }

        const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        const rankingMonthText = document.getElementById('ranking-month-text');
        if (rankingMonthText) rankingMonthText.textContent = `Top 10 Employees - ${monthName}`;
    }

    function showRankingModal() {
        const modal = document.getElementById('ranking-modal');
        const box = document.getElementById('ranking-modal-box');
        const container = document.getElementById('ranking-list-container');
        const data = window.currentRankingData || [];

        if (!modal || !box || !container) return;

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
        if(!modal || !box) return;

        modal.classList.add('opacity-0');
        box.classList.remove('scale-100');
        box.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }

    function triggerCSVExport() {
        let csvContent = "Employee Name,Department,Days Present,Late Arrivals,On-Time Rate (%),Total Hours Logged\n";

        let empStats = {};
        
        allAttendanceData.forEach(record => {
            const eid = record.employee_id;
            
            if (!empStats[eid]) {
                const emp = employeeData[eid];
                empStats[eid] = { 
                    name: emp.name, 
                    dept: emp.dept, 
                    expected: emp.expectedStartMin,
                    totalDays: 0, 
                    lateDays: 0, 
                    totalSeconds: 0 
                };
            }

            empStats[eid].totalDays++;
            empStats[eid].totalSeconds += (record.rendered_seconds || 0);

            if (record.clock_in_time) {
                const actualDate = new Date(record.clock_in_time.replace(/-/g, "/"));
                const actualMin = (actualDate.getHours() * 60) + actualDate.getMinutes();
                if (actualMin > empStats[eid].expected + 5) {
                    empStats[eid].lateDays++;
                }
            }
        });

        for (const [eid, stats] of Object.entries(empStats)) {
            const onTimeRate = stats.totalDays > 0 ? (((stats.totalDays - stats.lateDays) / stats.totalDays) * 100).toFixed(1) : 0;
            const hoursLogged = (stats.totalSeconds / 3600).toFixed(1);
            
            csvContent += `"${stats.name}","${stats.dept}","${stats.totalDays}","${stats.lateDays}","${onTimeRate}%","${hoursLogged}"\n`;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", `Clocket_Analytics_Report_${currentDateRange}Days.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

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

    // ==========================================
    // INITIALIZATION & SPA EVENT LISTENERS
    // ==========================================
    const waitForFirebase = setInterval(() => {
        if (window.firebaseUtils && window.db) {
            clearInterval(waitForFirebase);
            loadAnalyticsData();
        }
    }, 50);

    // Safely attach SPA event listeners
    if (window._analyticsClickListener) {
        document.body.removeEventListener('click', window._analyticsClickListener);
    }

    window._analyticsClickListener = (e) => {
        // Dropdown Controls
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

            currentWeeklyTrendFilter = value;
            renderWeeklyTrends(); 
        }

        // Date Range Picker
        const rangeBtn = e.target.closest('.range-btn');
        if (rangeBtn) {
            document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
            rangeBtn.classList.add('active');
            
            const range = rangeBtn.getAttribute('data-range');
            if (range === '7d') currentDateRange = 7;
            if (range === '30d') currentDateRange = 30;
            if (range === '3m') currentDateRange = 90;
            
            processAnalytics();
        }

        // Export CSV
        const exportBtn = e.target.closest('#export-btn');
        if (exportBtn && !exportBtn.disabled) {
            const originalIcon = exportBtn.innerHTML;
            exportBtn.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin text-brand-primary"></i>`;
            if (window.lucide) lucide.createIcons();
            exportBtn.disabled = true;

            setTimeout(() => {
                triggerCSVExport();
                exportBtn.innerHTML = originalIcon;
                exportBtn.disabled = false;
                showAnalyticsToast("Report exported as CSV successfully!");
            }, 1500);
        }

        if (e.target.closest('#open-ranking-btn')) {
            showRankingModal();
        }
        
        if (e.target.closest('#close-ranking-modal') || e.target.id === 'ranking-modal-backdrop') {
            hideRankingModal();
        }
    };

    document.body.addEventListener('click', window._analyticsClickListener);

})();