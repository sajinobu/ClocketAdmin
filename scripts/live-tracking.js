(() => {
    // ==========================================
    // 1. RUN EVERY TIME (UI Initialization)
    // ==========================================
    if (window.lucide) lucide.createIcons();

    // Ensure Sidebar Highlight
    setTimeout(() => {
        document.querySelectorAll('.sidebar-item, .nav-link').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') && item.getAttribute('href').startsWith('live-tracking')) {
                item.classList.add('active');
            }
        });
    }, 100);

    // ==========================================
    // 2. INTELLIGENT MAP INITIALIZATION
    // ==========================================
    window._liveMapMarkers = {}; 

    function initMap() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        // CRITICAL SPA FIX 1: Destroy old map instance on reload
        if (window._liveMapInstance) {
            window._liveMapInstance.remove();
            window._liveMapInstance = null;
        }

        const hqCoords = [14.6922, 120.9789]; 
        
        window._liveMapInstance = L.map('map', {
            zoomControl: false 
        }).setView(hqCoords, 15);

        L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
        }).addTo(window._liveMapInstance);

        // Add Initial Employees
        addEmployeeMarker("Sarah Johnson", [14.6930, 120.9795], "HQ Office - Floor 1");
        addEmployeeMarker("Mike Chen", [14.6915, 120.9780], "Remote - Austin");
        addEmployeeMarker("Emma Wilson", [14.6900, 120.9810], "Site B - Warehouse");

        // CRITICAL SPA FIX 2: Wait for CSS fade-in animations to finish, then force 
        // Leaflet to recalculate its dimensions so the tiles don't break!
        setTimeout(() => {
            if (window._liveMapInstance) {
                window._liveMapInstance.invalidateSize();
            }
        }, 350); 
    }

    function addEmployeeMarker(name, coords, site) {
        if (!window._liveMapInstance) return;

        const marker = L.circleMarker(coords, {
            radius: 8,
            fillColor: "#4f46e5", // Matches brand-primary
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
        }).addTo(window._liveMapInstance);

        const popupContent = `
            <div class="font-sans p-1 min-w-[120px]">
                <p class="font-bold text-[var(--brand-darkest)] text-sm mb-1">${name}</p>
                <p class="text-[10px] text-[var(--brand-dark)] uppercase font-bold tracking-widest">${site}</p>
            </div>
        `;

        marker.bindPopup(popupContent);
        window._liveMapMarkers[name] = marker;
    }

    // CRITICAL SPA FIX 3: Dependency Injector
    // If the SPA Router ignored the Leaflet CDN script in the HTML, we inject it manually here!
    if (typeof L === 'undefined') {
        const leafletCss = document.createElement('link');
        leafletCss.rel = 'stylesheet';
        leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCss);

        const leafletScript = document.createElement('script');
        leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        leafletScript.onload = () => {
            initMap(); // Only initialize after the script has fully downloaded
        };
        document.head.appendChild(leafletScript);
    } else {
        initMap(); // Leaflet is already loaded, proceed normally
    }


    // ==========================================
    // 3. SPA EVENT GUARD (Run Only Once)
    // ==========================================
    if (window.liveTrackingSPAInitialized) return;
    window.liveTrackingSPAInitialized = true;


    // ==========================================
    // 4. EVENT DELEGATION LISTENERS
    // ==========================================
    document.body.addEventListener('click', (e) => {
        // NEW PAGE GUARD: Only run if the map is on the screen!
        if (!document.getElementById('map')) return;
        // Map Controls: Zoom In / Zoom Out
        if (e.target.closest('#map-zoom-in') && window._liveMapInstance) {
            window._liveMapInstance.zoomIn();
        }
        if (e.target.closest('#map-zoom-out') && window._liveMapInstance) {
            window._liveMapInstance.zoomOut();
        }

        // Map Controls: Recenter (Geolocation)
        const recenterBtn = e.target.closest('#map-recenter');
        if (recenterBtn && window._liveMapInstance) {
            if (!navigator.geolocation) {
                showToast("Geolocation is not supported by your browser", false);
                return;
            }

            const originalIcon = recenterBtn.innerHTML;
            recenterBtn.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin"></i>`;
            if (window.lucide) lucide.createIcons();

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const userCoords = [lat, lng];

                    window._liveMapInstance.flyTo(userCoords, 16, {
                        duration: 1.5,
                        easeLinearity: 0.25
                    });

                    if (window.userLocationMarker) {
                        window.userLocationMarker.setLatLng(userCoords);
                    } else {
                        const pulseIcon = L.divIcon({
                            className: 'custom-div-icon',
                            html: `<div class="user-location-dot"></div>`,
                            iconSize: [12, 12],
                            iconAnchor: [6, 6] 
                        });

                        window.userLocationMarker = L.marker(userCoords, { icon: pulseIcon }).addTo(window._liveMapInstance);
                        window.userLocationMarker.bindPopup("<div class='font-sans font-bold text-[var(--brand-darkest)] text-sm'>You are here</div>").openPopup();
                    }

                    recenterBtn.innerHTML = originalIcon;
                    if (window.lucide) lucide.createIcons();
                },
                (error) => {
                    recenterBtn.innerHTML = originalIcon;
                    if (window.lucide) lucide.createIcons();
                    
                    let errorMsg = "Unable to retrieve your location";
                    if (error.code === 1) errorMsg = "Location access denied. Please enable it in browser settings.";
                    
                    showToast(errorMsg, false);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }

        // Sidebar Card Click -> Map Interaction
        const staffCard = e.target.closest('.staff-card');
        if (staffCard && window._liveMapInstance) {
            const userName = staffCard.getAttribute('data-name');
            const marker = window._liveMapMarkers[userName];

            if (marker) {
                window._liveMapInstance.flyTo(marker.getLatLng(), 17, {
                    duration: 1.5
                });
                setTimeout(() => marker.openPopup(), 1000);
            }
        }
    });

    // Sidebar Search Logic
    document.body.addEventListener('input', (e) => {
        if (e.target.id === 'staff-search') {
            const term = e.target.value.toLowerCase().trim();
            const staffCards = document.querySelectorAll('.staff-card');
            
            staffCards.forEach(card => {
                const name = card.getAttribute('data-name').toLowerCase();
                const siteNode = card.querySelector('.text-\\[11px\\]') || card.querySelector('.text-xs') || card.querySelector('span.truncate');
                const site = siteNode ? siteNode.textContent.toLowerCase() : '';
                
                if (name.includes(term) || site.includes(term)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }
    });

    // --- Modern Brand Toast Utility ---
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