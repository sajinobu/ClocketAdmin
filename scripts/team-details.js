// scripts/team-details.js

(() => {
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        document.querySelectorAll('.sidebar-item, .nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') && link.getAttribute('href').startsWith('management')) {
                link.classList.add('active');
            }
        });
    }, 100);

    const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

    function isValidImageUrl(url) {
        return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/'));
    }

    async function loadTeamDetails() {
        if (!window.db || !window.firebaseUtils) return;

        const urlParams = new URLSearchParams(window.location.search);
        const currentTeamId = urlParams.get('id');

        if (!currentTeamId) {
            alert("No team ID provided. Redirecting to Management.");
            window.location.href = 'management.html?tab=teams';
            return;
        }

        const editBtn = document.getElementById('edit-team-btn');
        if (editBtn) {
            editBtn.href = `team-edit.html?from=team-details&id=${currentTeamId}`;
        }

        try {
            const { doc, getDoc, collection, getDocs, query, where } = window.firebaseUtils;
            
            // 1. FETCH THE SPECIFIC TEAM
            const docRef = doc(window.db, "teams", currentTeamId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                alert("Team not found.");
                window.location.href = 'management.html?tab=teams';
                return;
            }

            const team = docSnap.data();
            const memberNames = (team.members || []).map(m => m.name);
            const leadName = team.team_lead && team.team_lead !== "Unassigned" ? team.team_lead : "Unassigned";
            if (leadName !== "Unassigned" && !memberNames.includes(leadName)) memberNames.push(leadName);

            // --- FIX: Combine Team Members AND Team Leader for Table/Stats ---
            let combinedMembers = team.members ? [...team.members] : [];
            if (leadName !== "Unassigned" && !combinedMembers.some(m => m.name === leadName)) {
                // Add the leader to the front of the array so they appear at the top of the table
                combinedMembers.unshift({
                    name: leadName,
                    department: team.department || "Unassigned"
                });
            }

            // 2. FETCH EMPLOYEES DATA
            const employeesRef = collection(window.db, "employees");
            const empSnapshot = await getDocs(employeesRef);
            
            const employeeDataMap = {};
            const teamEmails = [];
            
            empSnapshot.forEach(empDoc => {
                const data = empDoc.data();
                const fullName = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim();
                
                if (fullName) {
                    employeeDataMap[fullName] = {
                        id: empDoc.id,
                        email: data.email,
                        status: data.account_status || "active",
                        expectedStartStr: data.work_start_time || "09:00 AM",
                        picture: isValidImageUrl(data.profile_picture) ? data.profile_picture : defaultAvatar
                    };

                    if (memberNames.includes(fullName) && data.email) {
                        teamEmails.push(data.email);
                    }
                }
            });

            // Populate Hero
            document.getElementById('detail-dept-badge').textContent = team.department || "Unassigned";
            document.getElementById('detail-team-name').textContent = team.team_name || "Unnamed Team";
            document.getElementById('detail-team-desc').textContent = team.description || "No description provided.";
            
            if (team.created_at) {
                const date = new Date(team.created_at);
                document.getElementById('detail-est-date').textContent = `EST. ${date.toLocaleString('default', { month: 'short' }).toUpperCase()} ${date.getFullYear()}`;
            }

            // Populate Leader
            document.getElementById('detail-lead-name').textContent = leadName;
            const leadData = employeeDataMap[leadName];
            const leadAvatarEl = document.getElementById('detail-lead-avatar');
            const leadLink = document.getElementById('detail-lead-link');
            
            if (leadAvatarEl) {
                leadAvatarEl.src = leadData ? leadData.picture : defaultAvatar;
                leadAvatarEl.style.display = 'block'; 
            }

            if (leadLink) {
                if (leadData) {
                    leadLink.href = `employee-profile.html?from=team-details&id=${leadData.id}&teamId=${currentTeamId}`;
                    leadLink.style.display = 'inline-block';
                } else {
                    leadLink.style.display = 'none';
                }
            }

            // 3. FETCH ATTENDANCE FOR STATS & TODAY'S TIME
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
            const todayStr = new Date().toISOString().split('T')[0];

            let totalRenderedSeconds = 0;
            let validClockIns = 0;
            let lateCount = 0;
            let totalClockInMins = 0;
            const todayAttendanceMap = {}; // Maps email -> today's record

            // Fetch attendance logs from the last 7 days to calculate dynamic stats
            if (teamEmails.length > 0) {
                const attQuery = query(collection(window.db, "attendance"), where("date", ">=", sevenDaysAgoStr));
                const attSnap = await getDocs(attQuery);

                attSnap.forEach(attDoc => {
                    const log = attDoc.data();
                    if (!teamEmails.includes(log.employee_id)) return;

                    // Capture today's record
                    if (log.date === todayStr) {
                        todayAttendanceMap[log.employee_id] = log;
                    }

                    // Accumulate weekly hours
                    totalRenderedSeconds += (log.rendered_seconds || 0);

                    // Accumulate averages
                    if (log.clock_in_time) {
                        validClockIns++;
                        const actualDate = new Date(log.clock_in_time.replace(/-/g, '/'));
                        const actualMin = (actualDate.getHours() * 60) + actualDate.getMinutes();
                        totalClockInMins += actualMin;

                        // Find expected start time
                        const empName = Object.keys(employeeDataMap).find(name => employeeDataMap[name].email === log.employee_id);
                        const expectedStr = empName ? employeeDataMap[empName].expectedStartStr : "09:00 AM";
                        let expectedStartMin = 9 * 60;
                        if (expectedStr && expectedStr !== "Not set") {
                            const [time, modifier] = expectedStr.split(' ');
                            let [hours, minutes] = time.split(':').map(Number);
                            if (hours === 12 && modifier === 'AM') hours = 0;
                            if (hours !== 12 && modifier === 'PM') hours += 12;
                            expectedStartMin = (hours * 60) + minutes;
                        }

                        if (actualMin > expectedStartMin + 5) lateCount++;
                    }
                });
            }

            // Update Stats Display
            let activeMembersCount = 0;
            combinedMembers.forEach(m => {
                if (employeeDataMap[m.name]?.status !== "inactive") activeMembersCount++;
            });

            document.getElementById('detail-stat-members').textContent = activeMembersCount;
            
            const statValues = document.querySelectorAll('.stat-value');
            if (statValues.length >= 4) {
                // Weekly Hours (Stat 2)
                const totalHours = (totalRenderedSeconds / 3600).toFixed(1);
                statValues[1].textContent = `${totalHours} h`;

                // Avg Clock-in (Stat 3)
                if (validClockIns > 0) {
                    const avgMin = Math.floor(totalClockInMins / validClockIns);
                    let avgHour = Math.floor(avgMin / 60);
                    let avgMinsLeft = avgMin % 60;
                    let ampm = avgHour >= 12 ? 'PM' : 'AM';
                    avgHour = avgHour % 12 || 12;
                    statValues[2].textContent = `${avgHour}:${String(avgMinsLeft).padStart(2, '0')} ${ampm}`;
                }

                // On-Time Rate (Stat 4)
                if (validClockIns > 0) {
                    const rate = (((validClockIns - lateCount) / validClockIns) * 100).toFixed(1);
                    statValues[3].textContent = `${rate}%`;
                }
            }

            // 4. RENDER TABLE
            const tableBody = document.getElementById('member-table-body');
            const noMembersRow = document.getElementById('no-members-row');
            document.querySelectorAll('.member-row').forEach(r => r.remove());

            if (combinedMembers.length === 0) {
                if (noMembersRow) {
                    noMembersRow.style.display = '';
                    noMembersRow.querySelector('p').textContent = "No members assigned to this team.";
                }
            } else {
                combinedMembers.forEach((member) => {
                    const mData = employeeDataMap[member.name];
                    const mPicture = mData ? mData.picture : defaultAvatar;
                    const mStatus = mData ? mData.status : "active";
                    
                    const viewProfileUrl = mData 
                        ? `employee-profile.html?from=team-details&id=${mData.id}&teamId=${currentTeamId}` 
                        : `#`;

                    // Status Badge Logic
                    let badgeClass = "bg-green-100 text-green-700 border-green-200";
                    let badgeText = "Active";
                    if (mStatus === "inactive") {
                        badgeClass = "bg-gray-100 text-gray-500 border-gray-200";
                        badgeText = "Inactive";
                    }

                    // Calculate Today's Time
                    let todaysTimeText = "--";
                    if (mData && todayAttendanceMap[mData.email]) {
                        const log = todayAttendanceMap[mData.email];
                        if (log.clock_out_time) {
                            // Already clocked out
                            todaysTimeText = log.rendered_time || "--";
                        } else if (log.clock_in_time) {
                            // Currently clocked in -> calculate live duration
                            const inTime = new Date(log.clock_in_time.replace(/-/g, '/')).getTime();
                            const diffMs = Date.now() - inTime;
                            const breakMs = (log.total_break_seconds || 0) * 1000;
                            const activeBreakMs = (log.on_break && log.break_start_time) ? (Date.now() - new Date(log.break_start_time.replace(/-/g, '/')).getTime()) : 0;
                            
                            const netMs = Math.max(0, diffMs - breakMs - activeBreakMs);
                            const hrs = Math.floor(netMs / 3600000);
                            const mins = Math.floor((netMs % 3600000) / 60000);
                            
                            todaysTimeText = `<span class="text-brand-primary font-bold">${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}</span>`;
                        }
                    }

                    // Optional: Add a small visual indicator for the leader row
                    const isLeaderFlag = member.name === leadName ? `<span class="text-xs ml-2 px-2 py-0.5 bg-brand-grayBg text-brand-darkest rounded-full font-bold border border-brand-grayLight">Lead</span>` : "";

                    const tr = document.createElement('tr');
                    tr.className = 'data-row member-row';
                    tr.setAttribute('data-status', mStatus); 
                    
                    tr.innerHTML = `
                        <td class="table-td text-left">
                            <div class="member-info flex items-center gap-3">
                                <div style="position:relative; width:36px; height:36px; flex-shrink:0;">
                                    <div class="member-avatar" style="position:absolute; inset:0; border: 2px solid ${mStatus === 'inactive' ? '#9CA3AF' : 'var(--brand-primary)'}; background: white; color: var(--brand-primary); font-weight: 700; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">${member.name.substring(0,2).toUpperCase()}</div>
                                    <img src="${mPicture}" class="w-9 h-9 rounded-full object-cover border-2 border-white bg-white" style="position:absolute; inset:0; border-color: ${mStatus === 'inactive' ? '#9CA3AF' : 'var(--brand-primary)'}; z-index:10;" onerror="this.style.display='none'">
                                </div>
                                <div class="flex items-center">
                                    <p class="member-name font-medium text-brand-darkest ${mStatus === 'inactive' ? 'opacity-50' : ''}">${member.name}</p>
                                    ${isLeaderFlag}
                                </div>
                            </div>
                        </td>
                        <td class="table-td text-left text-brand-dark transition-colors ${mStatus === 'inactive' ? 'opacity-50' : ''}">${member.department || "N/A"}</td>
                        <td class="table-td text-left">
                            <span class="status-badge ${badgeClass}">${badgeText}</span>
                        </td>
                        <td class="table-td text-center text-brand-dark transition-colors ${mStatus === 'inactive' ? 'opacity-50' : ''}">
                            ${todaysTimeText}
                        </td>
                        <td class="table-td text-right">
                            <a href="${viewProfileUrl}" class="link-action font-medium" ${!mData ? 'style="opacity: 0.5; cursor: not-allowed;" title="Profile not found"' : ''}>View</a>
                        </td>
                    `;
                    tableBody.insertBefore(tr, noMembersRow);
                });
            }
            if (window.lucide) lucide.createIcons();
            
            // Run filters immediately to apply default hide-inactive behavior
            applyFilters();

        } catch (error) {
            console.error("Error loading team details:", error);
        }
    }

    const waitForFirebase = setInterval(async () => {
        if (window.auth && window.db && window.firebaseUtils) {
            clearInterval(waitForFirebase);
            await loadTeamDetails();
        }
    }, 50);

    if (window.teamDetailsSPAInitialized) return;
    window.teamDetailsSPAInitialized = true;

    // --- FILTER LOGIC ---
    function applyFilters() {
        const searchInput = document.getElementById('member-search');
        const togglePast = document.getElementById('toggle-past-members');
        const noMembersRow = document.getElementById('no-members-row');

        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const showInactive = togglePast ? togglePast.checked : false;

        const memberRows = document.querySelectorAll('.member-row');
        let visibleCount = 0;

        memberRows.forEach(row => {
            const nameNode = row.querySelector('.member-name');
            const deptNode = row.querySelector('.table-td:nth-child(2)');
            const status = row.getAttribute('data-status');
            
            if(!nameNode || !deptNode) return;

            const name = nameNode.textContent.toLowerCase();
            const dept = deptNode.textContent.toLowerCase();

            const matchesSearch = name.includes(searchTerm) || dept.includes(searchTerm);
            const matchesStatus = status !== 'inactive' || showInactive;

            if (matchesSearch && matchesStatus) {
                row.style.display = ''; 
                visibleCount++;
            } else {
                row.style.display = 'none'; 
            }
        });

        if (noMembersRow) {
            noMembersRow.style.display = visibleCount > 0 ? 'none' : '';
            noMembersRow.querySelector('p').textContent = (searchTerm || showInactive) ? "No members match your search." : "No active members found.";
        }
    }

    // --- EVENT LISTENERS ---
    document.body.addEventListener('click', (e) => {
        const backBtn = e.target.closest('#dynamic-back-btn');
        if (backBtn) {
            e.preventDefault();
            const returnUrl = 'management.html?tab=teams';
            if (typeof navigateTo === 'function') navigateTo(returnUrl);
            else window.location.href = returnUrl;
        }
        
        const linkBtn = e.target.closest('a[href^="team-edit"], a[href^="employee-profile"], .link-action, #edit-team-btn');
        if (linkBtn && linkBtn.getAttribute('href') && linkBtn.getAttribute('href') !== '#') {
            e.preventDefault();
            const targetUrl = linkBtn.getAttribute('href'); 
            if (typeof navigateTo === 'function') navigateTo(targetUrl);
            else window.location.href = targetUrl;
        }
    });

    document.body.addEventListener('input', (e) => {
        if (e.target.id === 'member-search') applyFilters();
    });

    document.body.addEventListener('change', (e) => {
        if (e.target.id === 'toggle-past-members') applyFilters();
    });
})();