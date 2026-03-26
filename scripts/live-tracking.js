// scripts/live-tracking.js

(() => {
    // ==========================================
    // INITIALIZATION & UI SETUP
    // ==========================================
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
    // GLOBALS & UTILS
    // ==========================================
    window._liveMapInstance = null; 
    window._liveMapMarkers = {};    
    window._currentTileLayer = null;
    window.userLocationMarker = null;

    function getDurationText(startTimestamp) {
        if (!startTimestamp) return "";
        const diffMs = Date.now() - startTimestamp;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins}m`;
        
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
    }

    setInterval(() => {
        document.querySelectorAll('.time-duration').forEach(el => {
            const ts = parseInt(el.getAttribute('data-timestamp'));
            if (ts) el.textContent = getDurationText(ts);
        });
    }, 60000);

    // ==========================================
    // LEAFLET MAP INIT & THEMES
    // ==========================================
    function setMapTheme() {
        if (!window._liveMapInstance) return;
        
        if (window._currentTileLayer) {
            window._liveMapInstance.removeLayer(window._currentTileLayer);
        }

        const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark-mode');
        
        // CartoDB Voyager for Light, Dark Matter for Dark
        const tileUrl = isDark 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

        window._currentTileLayer = L.tileLayer(tileUrl, {
            maxZoom: 19,
            attribution: false
        }).addTo(window._liveMapInstance);
    }
    
    function initLeafletMap() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        // SPA CRITICAL FIX: Destroy the old map instance if it exists!
        if (window._liveMapInstance) {
            window._liveMapInstance.off();
            window._liveMapInstance.remove();
            window._liveMapInstance = null;
        }

        const hqCoords = [14.6922, 120.9789]; 
        
        window._liveMapInstance = L.map('map', {
            zoomControl: false, 
            attributionControl: false
        }).setView(hqCoords, 15);

        setMapTheme();
        startLiveTracking();
    }

    // ==========================================
    // DYNAMIC SCRIPT INJECTION & SPA GUARD
    // ==========================================
    function loadLeafletAndInit() {
        if (typeof L !== 'undefined') {
            initLeafletMap();
            return;
        }

        if (!document.querySelector('link[href*="leaflet.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        if (!document.querySelector('script[src*="leaflet.js"]')) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => {
                initLeafletMap(); 
            };
            document.head.appendChild(script);
        }
    }

    // Initialize Map Flow
    loadLeafletAndInit();

    // ==========================================
    // THEME OBSERVER & REAL-TIME TRACKING
    // ==========================================
    
    // Watch for Dark Mode class changes to instantly swap map tiles
    if (window._themeObserverLive) window._themeObserverLive.disconnect();
    window._themeObserverLive = new MutationObserver(() => setMapTheme());
    window._themeObserverLive.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window._themeObserverLive.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    async function startLiveTracking() {
        if (!window.db || !window.firebaseUtils || !window.rtdb) {
            setTimeout(startLiveTracking, 100);
            return;
        }

        const { collection, getDocs, ref, onValue } = window.firebaseUtils;

        try {
            const empSnap = await getDocs(collection(window.db, "employees"));
            const allEmployees = [];
            empSnap.forEach(doc => {
                allEmployees.push({ email: doc.id, ...doc.data() });
            });

            const locationsRef = ref(window.rtdb, 'active_locations');
            
            // Clean up old listeners
            if (window._liveTrackingUnsubscribe) window._liveTrackingUnsubscribe();

            window._liveTrackingUnsubscribe = onValue(locationsRef, (snapshot) => {
                const activeLocations = snapshot.exists() ? snapshot.val() : {};
                const rtdbDataArray = Object.values(activeLocations);

                // Clear existing markers
                if (window._liveMapMarkers) {
                    Object.values(window._liveMapMarkers).forEach(m => m.remove());
                }
                window._liveMapMarkers = {};

                const staffList = document.getElementById('staff-list');
                if (staffList) staffList.innerHTML = '';

                let onlineCount = 0;

                allEmployees.forEach(emp => {
                    const liveData = rtdbDataArray.find(loc => loc.email === emp.email);
                    
                    let status = "offline";
                    let lat = null;
                    let lng = null;

                    if (liveData) {
                        status = liveData.status || "offline";
                        lat = liveData.latitude;
                        lng = liveData.longitude;
                    }

                    if (status === "online") onlineCount++;

                    renderEmployeeRecord(emp, status, lat, lng, liveData);
                });

                const subtitle = document.querySelector('.page-subtitle');
                if (subtitle) {
                    subtitle.textContent = `Monitoring ${onlineCount} active sessions`;
                }
                
                if (allEmployees.length === 0 && staffList) {
                    staffList.innerHTML = '<div class="p-6 text-center text-gray-500 text-sm">No employees found in database.</div>';
                }
            });

        } catch (err) {
            console.error("Error loading tracking data:", err);
            showToast("Database connection error.", false);
        }
    }

    function renderEmployeeRecord(emp, status, lat, lng, liveData) {
        const name = emp.full_name || "Unknown Employee";
        const team = emp.assigned_team || "Unassigned";
        
        let statusColorHex = "475569"; // Slate 600
        let displayStatus = "Offline";
        let dotColorClass = "bg-slate-600";
        let bgClass = "bg-[rgba(71,85,105,0.1)] text-slate-700";
        let markerSize = 12; 
        let zIndexOffset = 1; 

        if (status === "online") {
            statusColorHex = "10B981"; // Emerald 500
            displayStatus = "Active";
            dotColorClass = "bg-emerald-500";
            bgClass = "bg-[rgba(16,185,129,0.1)] text-emerald-600";
            markerSize = 18; 
            zIndexOffset = 1000; 
        } else if (status === "break") {
            statusColorHex = "F59E0B"; // Amber 500
            displayStatus = "On Break";
            dotColorClass = "bg-amber-500";
            bgClass = "bg-[rgba(245,158,11,0.1)] text-amber-600";
            markerSize = 18; 
            zIndexOffset = 1000; 
        }

        const statusTime = liveData ? (liveData.status_time || liveData.timestamp) : null;
        let timeHTML = "";
        let infoWindowTimeText = "";
        
        if (statusTime) {
            const timeString = getDurationText(statusTime);
            timeHTML = `<span class="opacity-40 ml-1 mr-1">•</span><span class="time-duration font-bold" data-timestamp="${statusTime}">${timeString}</span>`;
            infoWindowTimeText = ` • ${timeString}`;
        }

        const nameParts = name.split(" ");
        const initials = nameParts.length > 1
            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
            : nameParts[0].substring(0, 2).toUpperCase();

        // 1. STRICT FLOAT PARSING: Prevents Leaflet from crashing on bad data
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);

        if (!isNaN(parsedLat) && !isNaN(parsedLng) && window._liveMapInstance) {
            
            const customIcon = L.divIcon({
                className: '', // Prevents Leaflet from hijacking our custom HTML
                html: `<div style="width: ${markerSize}px; height: ${markerSize}px; background-color: #${statusColorHex}; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.4);"></div>`,
                iconSize: [markerSize, markerSize],
                iconAnchor: [markerSize/2, markerSize/2],
                popupAnchor: [0, -(markerSize/2)] 
            });

            const marker = L.marker([parsedLat, parsedLng], { 
                icon: customIcon,
                zIndexOffset: zIndexOffset
            }).addTo(window._liveMapInstance);

            const popupContent = `
                <div style="min-width: 120px;">
                    <p style="font-weight: 700; color: var(--brand-darkest); font-size: 14px; margin: 0 0 4px 0;">${name}</p>
                    <p style="font-size: 10px; color: #${statusColorHex}; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin: 0;">${displayStatus} • ${team}${infoWindowTimeText}</p>
                </div>
            `;

            marker.bindPopup(popupContent, { className: 'custom-brand-popup' });
            window._liveMapMarkers[emp.email] = marker;
        }

        // 2. Render Sidebar List
        const staffList = document.getElementById('staff-list');
        if (!staffList) return;

        const card = document.createElement('div');
        card.className = 'staff-card group cursor-pointer';
        card.dataset.email = emp.email;
        card.dataset.name = name;
        
        const opacityClass = status === "offline" ? 'opacity-60' : '';

        card.innerHTML = `
            <div class="avatar-circle ${bgClass}">${initials}</div>
            <div class="flex-1 min-w-0 ${opacityClass}">
              <p class="staff-card-name">${name}</p>
              <div class="flex items-center gap-1 mt-0.5">
                <span class="w-1.5 h-1.5 ${dotColorClass} rounded-full flex-shrink-0"></span>
                <span class="text-[11px] text-brand-dark font-medium truncate transition-colors">${displayStatus} • ${team}${timeHTML}</span>
              </div>
            </div>
            <i data-lucide="map-pin" class="staff-card-arrow opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 text-brand-dark"></i>
        `;

        card.addEventListener('click', () => {
            const marker = window._liveMapMarkers[emp.email];
            if (marker && window._liveMapInstance) {
                window._liveMapInstance.flyTo(marker.getLatLng(), 17, { duration: 1.5 });
                marker.openPopup();
            } else {
                showToast(`No location data available for ${name}`, false);
            }
        });

        if (status !== "offline") staffList.prepend(card);
        else staffList.appendChild(card);
        
        if (window.lucide) lucide.createIcons();
    }

    // ==========================================
    // GLOBAL DOM EVENT LISTENERS
    // ==========================================
    if (window._liveTrackingClickListener) document.body.removeEventListener('click', window._liveTrackingClickListener);
    
    window._liveTrackingClickListener = (e) => {
        if (!window._liveMapInstance) return;

        if (e.target.closest('#map-zoom-in')) window._liveMapInstance.zoomIn();
        if (e.target.closest('#map-zoom-out')) window._liveMapInstance.zoomOut();

        const recenterBtn = e.target.closest('#map-recenter');
        if (recenterBtn) {
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
                    const latLng = [position.coords.latitude, position.coords.longitude];
                    
                    window._liveMapInstance.flyTo(latLng, 16, { duration: 1.5 });

                    if (window.userLocationMarker) {
                        window.userLocationMarker.setLatLng(latLng);
                    } else {
                        const userIcon = L.divIcon({
                            className: 'user-location-marker',
                            html: `<div class="user-location-dot"></div>`,
                            iconSize: [24, 24],
                            iconAnchor: [12, 12]
                        });
                        
                        window.userLocationMarker = L.marker(latLng, { 
                            icon: userIcon, 
                            zIndexOffset: 9999 
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
                    if (error.code === 1) errorMsg = "Location access denied.";
                    if (error.code === 2) errorMsg = "Location unavailable.";
                    if (error.code === 3) errorMsg = "Location request timed out.";
                    showToast(errorMsg, false);
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        }
    };
    
    document.body.addEventListener('click', window._liveTrackingClickListener);

    if (window._liveTrackingInputListener) document.body.removeEventListener('input', window._liveTrackingInputListener);
    
    window._liveTrackingInputListener = (e) => {
        if (e.target.id === 'staff-search') {
            const term = e.target.value.toLowerCase().trim();
            const staffCards = document.querySelectorAll('.staff-card');
            
            staffCards.forEach(card => {
                const name = card.getAttribute('data-name').toLowerCase();
                const siteNode = card.querySelector('.truncate');
                const site = siteNode ? siteNode.textContent.toLowerCase() : '';
                
                if (name.includes(term) || site.includes(term)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }
    };
    
    document.body.addEventListener('input', window._liveTrackingInputListener);

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