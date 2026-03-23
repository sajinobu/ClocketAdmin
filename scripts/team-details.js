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

    // --- FIREBASE: LOAD TEAM DETAILS & MAP DATA ---
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
            const { doc, getDoc, collection, getDocs } = window.firebaseUtils;
            
            // 1. FETCH ALL EMPLOYEES (Map Names to IDs AND Profile Pictures)
            const employeesRef = collection(window.db, "employees");
            const empSnapshot = await getDocs(employeesRef);
            
            const employeeDataMap = {};
            empSnapshot.forEach(empDoc => {
                const data = empDoc.data();
                const fullName = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim();
                
                if (fullName) {
                    employeeDataMap[fullName] = {
                        id: empDoc.id,
                        // If they have a real picture, use it. Otherwise, use the generic grey outline.
                        picture: (data.profile_picture && data.profile_picture !== "coming soon") ? data.profile_picture : defaultAvatar
                    };
                }
            });

            // 2. FETCH THE SPECIFIC TEAM
            const docRef = doc(window.db, "teams", currentTeamId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const team = docSnap.data();

                // Populate Hero
                document.getElementById('detail-dept-badge').textContent = team.department || "Unassigned";
                document.getElementById('detail-team-name').textContent = team.team_name || "Unnamed Team";
                document.getElementById('detail-team-desc').textContent = team.description || "No description provided.";
                
                if (team.created_at) {
                    const date = new Date(team.created_at);
                    const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
                    const year = date.getFullYear();
                    document.getElementById('detail-est-date').textContent = `EST. ${month} ${year}`;
                }

                // Populate Leader
                const leadName = team.team_lead && team.team_lead !== "Unassigned" ? team.team_lead : "Unassigned";
                document.getElementById('detail-lead-name').textContent = leadName;
                
                // Get the leader's data from our map
                const leadData = employeeDataMap[leadName];
                const leadAvatarEl = document.getElementById('detail-lead-avatar');
                const leadLink = document.getElementById('detail-lead-link');
                
                if (leadAvatarEl) {
                    // Inject the picture (or the default generic picture if unassigned)
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

                // Populate Stats
                const memberCount = team.members ? team.members.length : 0;
                document.getElementById('detail-stat-members').textContent = memberCount;

                // Populate Members Table
                const tableBody = document.getElementById('member-table-body');
                const noMembersRow = document.getElementById('no-members-row');
                
                document.querySelectorAll('.member-row').forEach(r => r.remove());

                if (memberCount === 0) {
                    if (noMembersRow) {
                        noMembersRow.style.display = '';
                        noMembersRow.querySelector('p').textContent = "No members assigned to this team.";
                    }
                } else {
                    team.members.forEach((member) => {
                        const mData = employeeDataMap[member.name];
                        const mPicture = mData ? mData.picture : defaultAvatar;
                        
                        const viewProfileUrl = mData 
                            ? `employee-profile.html?from=team-details&id=${mData.id}&teamId=${currentTeamId}` 
                            : `#`;

                        const tr = document.createElement('tr');
                        tr.className = 'data-row member-row';
                        
                        // Using an <img> tag for members now!
                        tr.innerHTML = `
                            <td class="table-td">
                                <div class="member-info flex items-center gap-3">
                                    <img src="${mPicture}" class="w-9 h-9 rounded-full object-cover border border-brand-grayLight bg-white" alt="Avatar">
                                    <p class="member-name font-medium text-brand-darkest">${member.name}</p>
                                </div>
                            </td>
                            <td class="table-td text-brand-dark transition-colors">${member.department || "N/A"}</td>
                            <td class="table-td">
                                <span class="status-badge status-active">Active</span>
                            </td>
                            <td class="table-td text-brand-dark transition-colors">--</td>
                            <td class="table-td text-right">
                                <a href="${viewProfileUrl}" class="link-action font-medium" ${!mData ? 'style="opacity: 0.5; cursor: not-allowed;" title="Profile not found"' : ''}>View</a>
                            </td>
                        `;
                        tableBody.insertBefore(tr, noMembersRow);
                    });
                }
                if (window.lucide) lucide.createIcons();

            } else {
                alert("Team not found.");
                window.location.href = 'management.html?tab=teams';
            }
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

    // --- EVENT LISTENERS ---
    document.body.addEventListener('click', (e) => {
        if (!document.getElementById('member-search')) return;
        
        // --- Dynamic Back Button ---
        const backBtn = e.target.closest('#dynamic-back-btn');
        if (backBtn) {
            e.preventDefault();
            
            // Team Details is a master view. It should ALWAYS return to the teams dashboard.
            const returnUrl = 'management.html?tab=teams';

            if (typeof navigateTo === 'function') navigateTo(returnUrl);
            else window.location.href = returnUrl;
        }
        
        // --- Intercept Links ---
        const linkBtn = e.target.closest('a[href^="team-edit.html"], a[href^="employee-profile.html"]');
        if (linkBtn && linkBtn.getAttribute('href') !== '#') {
            e.preventDefault();
            
            // Use .href to get the fully updated URL containing the ID!
            const targetUrl = linkBtn.href; 
            
            if (typeof navigateTo === 'function') navigateTo(targetUrl);
            else window.location.href = targetUrl;
        }
    });

    document.body.addEventListener('input', (e) => {
        if (!document.getElementById('member-search')) return;

        if (e.target.id === 'member-search') {
            const searchTerm = e.target.value.toLowerCase().trim();
            const memberRows = document.querySelectorAll('.member-row');
            const noMembersRow = document.getElementById('no-members-row');
            let visibleCount = 0;

            memberRows.forEach(row => {
                const nameNode = row.querySelector('.member-name');
                const deptNode = row.querySelector('.table-td:nth-child(2)');
                
                if(!nameNode || !deptNode) return;

                const name = nameNode.textContent.toLowerCase();
                const dept = deptNode.textContent.toLowerCase();

                if (name.includes(searchTerm) || dept.includes(searchTerm)) {
                    row.style.display = ''; 
                    visibleCount++;
                } else {
                    row.style.display = 'none'; 
                }
            });

            if (noMembersRow) {
                noMembersRow.style.display = visibleCount > 0 ? 'none' : '';
                noMembersRow.querySelector('p').textContent = "No members match your search.";
            }
        }
    });
})();