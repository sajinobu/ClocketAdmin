// scripts/live-tracking.js

(() => {
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') && item.getAttribute('href').startsWith('live-tracking')) {
                item.classList.add('active');
            }
        });
    }, 100);

    // ==========================================
    // GLOBALS & CLEANUP (LEAFLET VERSION)
    // ==========================================
    if (window._liveMapMarkers) {
        Object.values(window._liveMapMarkers).forEach(m => {
            if (m && window._liveMapInstance) window._liveMapInstance.removeLayer(m);
        });
    }
    window._liveMapMarkers = {}; 
    
    window._infoWindows = {};

    // ==========================================
    // MAP INIT (LEAFLET - SPA SAFE)
    // ==========================================
    window.initMap = function() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        // Destroy previous instance if navigating back via SPA
        if (window._liveMapInstance) {
            window._liveMapInstance.remove();
        }

        mapContainer.style.opacity = '0';
        mapContainer.style.transition = 'opacity 0.7s ease-out';

        const hqCoords = [14.6922, 120.9789]; 
        
        window._liveMapInstance = L.map('map', {
            zoomControl: false, 
            attributionControl: false 
        }).setView(hqCoords, 15);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }).addTo(window._liveMapInstance);

        // Fade in map and force resize calculation
        window._liveMapInstance.whenReady(() => {
            setTimeout(() => {
                window._liveMapInstance.invalidateSize();
                mapContainer.style.opacity = '1';
            }, 100);
        });

        startLiveTracking();
    };

    // ==========================================
    // BULLETPROOF SPA INITIALIZATION
    // ==========================================
    function loadLeafletAndInit() {
        // If Leaflet is already loaded in memory, just wait for the DOM element
        if (window.L) {
            waitForMapElement();
            return;
        }

        // Inject Leaflet CSS if it doesn't exist
        if (!document.querySelector('link[href*="leaflet.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        // Inject Leaflet JS and wait for it to finish downloading
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
            waitForMapElement(); // Only look for the map AFTER the library is ready
        };
        document.head.appendChild(script);
    }

    function waitForMapElement() {
        let mapCheckCount = 0;
        const waitForMap = setInterval(() => {
            // Ensure BOTH the DOM element and the Leaflet library exist
            if (document.getElementById('map') && window.L) {
                clearInterval(waitForMap);
                window.initMap();
            }
            
            mapCheckCount++;
            // Give up after 5 seconds (50 checks) to prevent infinite memory loops
            if (mapCheckCount > 50) {
                clearInterval(waitForMap);
                console.error("Map initialization failed: #map element not found in DOM.");
            }
        }, 100);
    }

    // Kick off the loading process
    loadLeafletAndInit();

    // ==========================================
    // CORE LOGIC: FETCH & RENDER
    // ==========================================

    // Global state cache to allow instant client-side filtering
    window._trackingData = { employees: [], activeLocations: [] };

    async function startLiveTracking() {
        if (!window.db || !window.firebaseUtils || !window.rtdb) {
            setTimeout(startLiveTracking, 100);
            return;
        }

        const { collection, getDocs, ref, onValue } = window.firebaseUtils;

        try {
            // 1. Fetch Employees once
            const empSnap = await getDocs(collection(window.db, "employees"));
            const allEmployees = [];
            
            empSnap.forEach(doc => {
                const data = doc.data();
                if (data.account_status && String(data.account_status).toLowerCase() === 'inactive') return;
                allEmployees.push({ email: doc.id, ...data });
            });

            window._trackingData.employees = allEmployees;
            populateFilterOptions(allEmployees); // Fill department/team dropdowns

            // 2. Listen to RTDB
            const locationsRef = ref(window.rtdb, 'active_locations');
            if (window._liveTrackingUnsubscribe) window._liveTrackingUnsubscribe();

            window._liveTrackingUnsubscribe = onValue(locationsRef, (snapshot) => {
                const activeLocations = snapshot.exists() ? snapshot.val() : {};
                window._trackingData.activeLocations = Object.values(activeLocations);
                
                // Trigger a render whenever location data updates
                renderFilteredData();
            });

        } catch (err) {
            console.error("Error loading tracking data:", err);
            showToast("Database connection error.", false);
        }
    }

    // ==========================================
    // CUSTOM DROPDOWN LOGIC
    // ==========================================

    function populateFilterOptions(employees) {
        const menuDept = document.getElementById('menu-dept');
        const menuTeam = document.getElementById('menu-team');
        if (!menuDept || !menuTeam) return;

        const depts = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();
        const teams = [...new Set(employees.map(e => e.assigned_team).filter(Boolean))].sort();

        // Preserve current selection if any
        const currentDept = document.getElementById('filter-department').value;
        const currentTeam = document.getElementById('filter-team').value;

        // Build Department HTML
        let deptHtml = `<div class="dropdown-option ${currentDept === 'all' ? 'active' : ''}" data-value="all">All Departments</div>`;
        depts.forEach(d => {
            deptHtml += `<div class="dropdown-option ${currentDept === d ? 'active' : ''}" data-value="${d}">${d}</div>`;
        });
        menuDept.innerHTML = deptHtml;

        // Build Team HTML
        let teamHtml = `<div class="dropdown-option ${currentTeam === 'all' ? 'active' : ''}" data-value="all">All Teams</div>`;
        teams.forEach(t => {
            teamHtml += `<div class="dropdown-option ${currentTeam === t ? 'active' : ''}" data-value="${t}">${t}</div>`;
        });
        menuTeam.innerHTML = teamHtml;
    }

    // Handle Dropdown Interactions
    document.addEventListener('click', (e) => {
        // 1. Handle clicking on a trigger button
        const trigger = e.target.closest('.dropdown-trigger');
        if (trigger) {
            const dropdown = trigger.closest('.custom-dropdown');
            
            // Close other open dropdowns
            document.querySelectorAll('.custom-dropdown.open').forEach(el => {
                if (el !== dropdown) el.classList.remove('open');
            });
            
            // Toggle current dropdown
            dropdown.classList.toggle('open');
            return; // Stop execution here
        }

        // 2. Handle clicking on an option inside the menu
        const option = e.target.closest('.dropdown-option');
        if (option) {
            const dropdown = option.closest('.custom-dropdown');
            const hiddenInput = dropdown.querySelector('input[type="hidden"]');
            const label = dropdown.querySelector('.dropdown-label');
            
            // Update styling
            dropdown.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            // Update values
            label.textContent = option.textContent;
            hiddenInput.value = option.dataset.value;
            
            // Close menu
            dropdown.classList.remove('open');
            
            // Trigger the filtering logic you already wrote
            if (typeof renderFilteredData === 'function') {
                renderFilteredData();
            }
            return;
        }

        // 3. Clicked outside - close all dropdowns
        document.querySelectorAll('.custom-dropdown.open').forEach(el => el.classList.remove('open'));
    });
    
    // The core rendering loop that respects filters
    function renderFilteredData() {
        const { employees, activeLocations } = window._trackingData;
        const startOfToday = new Date().setHours(0, 0, 0, 0);

        // Get active filter values
        const activeDept = document.getElementById('filter-department')?.value || 'all';
        const activeTeam = document.getElementById('filter-team')?.value || 'all';
        const activeStatus = document.getElementById('filter-status')?.value || 'all';
        const searchTerm = document.getElementById('staff-search')?.value.toLowerCase().trim() || '';

        // Clear Map
        Object.values(window._liveMapMarkers).forEach(m => {
            if (window._liveMapInstance) window._liveMapInstance.removeLayer(m);
        });
        window._liveMapMarkers = {};

        // Clear Sidebar
        const staffList = document.getElementById('staff-list');
        if (staffList) staffList.innerHTML = '';

        let onlineCount = 0;
        let renderedCount = 0;
        
        // --- NEW: Array to collect coordinates of all filtered users ---
        let visibleCoords = []; 

        employees.forEach(emp => {
            let liveData = activeLocations.find(loc => loc.email === emp.email);
            if (liveData && liveData.timestamp < startOfToday) liveData = undefined;

            let status = liveData?.status || "offline";
            if (status === "online") onlineCount++;

            // --- FILTER LOGIC ---
            if (activeDept !== 'all' && emp.department !== activeDept) return;
            if (activeTeam !== 'all' && emp.assigned_team !== activeTeam) return;
            if (activeStatus !== 'all' && status !== activeStatus) return;
            
            if (searchTerm) {
                const nameMatch = (emp.full_name || '').toLowerCase().includes(searchTerm);
                const teamMatch = (emp.assigned_team || '').toLowerCase().includes(searchTerm);
                if (!nameMatch && !teamMatch) return;
            }

            // --- NEW: If the user passes the filter and has location data, save their coordinates ---
            if (liveData?.latitude && liveData?.longitude) {
                visibleCoords.push(L.latLng(liveData.latitude, liveData.longitude));
            }

            // If it passes all filters, render it
            renderEmployeeRecord(emp, status, liveData?.latitude, liveData?.longitude);
            renderedCount++;
        });

        const subtitle = document.querySelector('.page-subtitle');
        if (subtitle) {
            subtitle.textContent = `Monitoring ${onlineCount} active sessions`;
        }
        
        if (renderedCount === 0 && staffList) {
            staffList.innerHTML = '<div class="p-6 text-center text-gray-500 text-sm">No employees match your filters.</div>';
        }

        // --- NEW: Adjust Map to fit all visible coordinates ---
        if (visibleCoords.length > 0 && window._liveMapInstance) {
            // Create a bounding box out of all collected coordinates
            const bounds = L.latLngBounds(visibleCoords);
            
            window._liveMapInstance.flyToBounds(bounds, {
                padding: [50, 50], // Adds 50px of padding so markers aren't cut off at the edges
                maxZoom: 16,       // Prevents zooming in too uncomfortably close if only 1 person is filtered
                duration: 0.8      // The speed of the smooth pan/zoom animation
            });
        }
    }

    // Updated render function to handle profile pictures
    function renderEmployeeRecord(emp, status, lat, lng) {
        const name = emp.full_name || "Unknown Employee";
        const team = emp.assigned_team || "Unassigned";
        const profilePic = emp.profile_picture || null;
        
        let statusColorHex = "475569"; 
        let displayStatus = "Offline";
        let dotColorClass = "bg-slate-600";
        let bgClass = "bg-[rgba(71,85,105,0.1)] text-slate-700";
        let markerScale = 6; 

        if (status === "online") {
            statusColorHex = "10B981"; 
            displayStatus = "Active";
            dotColorClass = "bg-emerald-500";
            bgClass = "bg-[rgba(16,185,129,0.1)] text-emerald-600";
            markerScale = 9; 
        } else if (status === "break") {
            statusColorHex = "F59E0B"; 
            displayStatus = "On Break";
            dotColorClass = "bg-amber-500";
            bgClass = "bg-[rgba(245,158,11,0.1)] text-amber-600";
            markerScale = 9; 
        }

        const nameParts = name.split(" ");
        const initials = nameParts.length > 1
            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
            : nameParts[0].substring(0, 2).toUpperCase();

        // Setup Map Marker
        if (lat && lng && window._liveMapInstance) {
            const marker = L.circleMarker([lat, lng], {
                radius: markerScale,
                fillColor: `#${statusColorHex}`,
                fillOpacity: 1, 
                color: "#ffffff", 
                weight: 2
            }).addTo(window._liveMapInstance);

            const popupContent = `
                <div style="font-family: 'DM Sans', sans-serif; padding: 4px; min-width: 120px;">
                    <p style="font-weight: 700; font-size: 14px; margin: 0 0 4px 0;">${name}</p>
                    <p style="font-size: 10px; color: #${statusColorHex}; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin: 0;">${displayStatus} • ${team}</p>
                </div>
            `;

            marker.bindPopup(popupContent, { 
                closeButton: false,
                offset: L.point(0, -markerScale) 
            });

            window._liveMapMarkers[emp.email] = marker;
        }

        // Determine Avatar HTML
        let avatarHtml = `<div class="avatar-circle ${bgClass}">${initials}</div>`;
        if (profilePic) {
            // If image fails to load, fallback to the initial circle via the onerror event
            const safeInitialsHtml = avatarHtml.replace(/"/g, '&quot;');
            avatarHtml = `<img src="${profilePic}" alt="${name}" class="avatar-img" onerror="this.onerror=null; this.outerHTML='${safeInitialsHtml}'">`;
        }

        // Setup List Card
        const staffList = document.getElementById('staff-list');
        if (!staffList) return;

        const card = document.createElement('div');
        card.className = 'staff-card group cursor-pointer';
        
        const opacityClass = status === "offline" ? 'opacity-60' : '';

        card.innerHTML = `
            ${avatarHtml}
            <div class="flex-1 min-w-0 ${opacityClass}">
            <p class="staff-card-name">${name}</p>
            <div class="flex items-center gap-1 mt-0.5">
                <span class="w-1.5 h-1.5 ${dotColorClass} rounded-full flex-shrink-0"></span>
                <span class="text-[11px] text-brand-dark font-medium truncate transition-colors">${displayStatus} • ${team}</span>
            </div>
            </div>
            <i data-lucide="map-pin" class="staff-card-arrow opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 text-brand-dark"></i>
        `;

        card.addEventListener('click', () => {
            const marker = window._liveMapMarkers[emp.email];
            if (marker && window._liveMapInstance) {
                window._liveMapInstance.flyTo(marker.getLatLng(), 17, { duration: 0.5 });
                marker.openPopup();
            } else {
                showToast(`No location data available for ${name}`, false);
            }
        });

        if (status !== "offline") {
            staffList.prepend(card);
        } else {
            staffList.appendChild(card);
        }
        
        if (window.lucide) lucide.createIcons();
    }

    // 4. Attach Listeners for the Dropdowns
    ['filter-department', 'filter-team', 'filter-status'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', renderFilteredData);
    });

    // Remove your old manual string-matching search listener and replace with this:
    if (window._liveTrackingInputHandler) {
        document.body.removeEventListener('input', window._liveTrackingInputHandler);
    }

    let searchTimeout;

    window._liveTrackingInputHandler = (e) => {
        if (e.target && e.target.id === 'staff-search') {
            // Clear the previous timer if the user is still typing
            clearTimeout(searchTimeout);
            
            // Set a new timer. The map will only update 300ms AFTER they stop typing.
            searchTimeout = setTimeout(() => {
                if (typeof renderFilteredData === 'function') {
                    renderFilteredData();
                }
            }, 300);
        }
    };

    document.body.addEventListener('input', window._liveTrackingInputHandler);

    // ==========================================
    // EVENT LISTENERS & UI
    // ==========================================
    if (window._liveTrackingClickHandler) {
        document.body.removeEventListener('click', window._liveTrackingClickHandler);
    }
    
    window._liveTrackingClickHandler = (e) => {
        if (!document.getElementById('map')) return;

        if (e.target.closest('#map-zoom-in') && window._liveMapInstance) {
            window._liveMapInstance.zoomIn();
        }
        if (e.target.closest('#map-zoom-out') && window._liveMapInstance) {
            window._liveMapInstance.zoomOut();
        }

        const recenterBtn = e.target.closest('#map-recenter');
        if (recenterBtn && window._liveMapInstance) {
            if (recenterBtn.classList.contains('pointer-events-none')) return;

            if (!navigator.geolocation) {
                showToast("Geolocation not supported by your browser", false);
                return;
            }

            const originalIcon = recenterBtn.innerHTML;
            
            recenterBtn.classList.add('pointer-events-none', 'opacity-70');
            recenterBtn.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin"></i>`;
            if (window.lucide) lucide.createIcons();

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userCoords = [position.coords.latitude, position.coords.longitude];
                    
                    window._liveMapInstance.flyTo(userCoords, 16);

                    if (window.userLocationMarker) {
                        window.userLocationMarker.setLatLng(userCoords);
                    } else {
                        window.userLocationMarker = L.circleMarker(userCoords, {
                            radius: 6,
                            fillColor: "#818cf8", 
                            fillOpacity: 1,
                            color: "#ffffff",
                            weight: 2
                        }).addTo(window._liveMapInstance);
                    }
                    
                    recenterBtn.classList.remove('pointer-events-none', 'opacity-70');
                    recenterBtn.innerHTML = originalIcon;
                    if (window.lucide) lucide.createIcons();
                },
                (error) => {
                    recenterBtn.classList.remove('pointer-events-none', 'opacity-70');
                    recenterBtn.innerHTML = originalIcon;
                    if (window.lucide) lucide.createIcons();
                    
                    let errorMsg = "Unable to retrieve your location.";
                    if (error.code === 1) errorMsg = "Location access denied. Please allow it in browser settings.";
                    if (error.code === 2) errorMsg = "Location unavailable right now.";
                    if (error.code === 3) errorMsg = "Location request timed out. Please try again.";
                    
                    showToast(errorMsg, false);
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        }
    };
    document.body.addEventListener('click', window._liveTrackingClickHandler);

    function showToast(message, isSuccess = true) {
        const existingToast = document.querySelector('.live-track-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `live-track-toast fixed bottom-6 right-6 bg-brand-surface border border-brand-gray-light text-brand-darkest px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[9999] transition-all duration-300`;
        toast.style.cssText = "transform: translateY(20px); opacity: 0;";
        
        const iconColor = isSuccess ? "text-brand-primary" : "text-red-500";
        const iconType = isSuccess ? "check-circle" : "alert-circle";
        
        toast.innerHTML = `<i data-lucide="${iconType}" class="w-5 h-5 ${iconColor}"></i> <span class="text-sm font-medium">${message}</span>`;
        
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