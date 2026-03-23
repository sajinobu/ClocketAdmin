(() => {
    // 1. RUN EVERY TIME (UI Initialization)
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
    // 2. GOOGLE MAPS INITIALIZATION
    // ==========================================
    window._liveMapMarkers = {}; 
    window._infoWindows = {};

    window.initMap = function() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        const hqCoords = { lat: 14.6922, lng: 120.9789 }; 
        
        window._liveMapInstance = new google.maps.Map(mapContainer, {
            center: hqCoords,
            zoom: 15,
            disableDefaultUI: true, 
            styles: [] 
        });

        addEmployeeMarker("Sarah Johnson", { lat: 14.6930, lng: 120.9795 }, "HQ Office - Floor 1");
        addEmployeeMarker("Mike Chen", { lat: 14.6915, lng: 120.9780 }, "Remote - Austin");
        addEmployeeMarker("Emma Wilson", { lat: 14.6900, lng: 120.9810 }, "Site B - Warehouse");
    };

    function addEmployeeMarker(name, coords, site) {
        if (!window._liveMapInstance) return;

        const marker = new google.maps.Marker({
            position: coords,
            map: window._liveMapInstance,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#4f46e5", 
                fillOpacity: 0.9,
                strokeWeight: 2,
                strokeColor: "#ffffff"
            },
            title: name
        });

        const popupContent = `
            <div style="font-family: 'DM Sans', sans-serif; padding: 4px; min-width: 120px;">
                <p style="font-weight: 700; color: #0f172a; font-size: 14px; margin: 0 0 4px 0;">${name}</p>
                <p style="font-size: 10px; color: #334155; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin: 0;">${site}</p>
            </div>
        `;

        const infoWindow = new google.maps.InfoWindow({ content: popupContent });

        marker.addListener("click", () => {
            Object.values(window._infoWindows).forEach(iw => iw.close());
            infoWindow.open({ anchor: marker, map: window._liveMapInstance });
        });

        window._liveMapMarkers[name] = marker;
        window._infoWindows[name] = infoWindow;
    }

    // --- NEW: DYNAMIC SCRIPT INJECTOR ---
    // This allows the map to load perfectly during SPA navigation!
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        const mapScript = document.createElement('script');
        mapScript.src = "https://cdn.jsdelivr.net/gh/somanchiu/Keyless-Google-Maps-API@v7.1/mapsJavaScriptAPI.js";
        mapScript.async = true;
        mapScript.defer = true;
        // The Keyless script automatically looks for window.initMap() when it finishes loading
        document.head.appendChild(mapScript);
    } else {
        // If Google Maps is already loaded from a previous visit, just initialize it
        window.initMap();
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
        if (!document.getElementById('map')) return;

        if (e.target.closest('#map-zoom-in') && window._liveMapInstance) {
            const currentZoom = window._liveMapInstance.getZoom();
            window._liveMapInstance.setZoom(currentZoom + 1);
        }
        if (e.target.closest('#map-zoom-out') && window._liveMapInstance) {
            const currentZoom = window._liveMapInstance.getZoom();
            window._liveMapInstance.setZoom(currentZoom - 1);
        }

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
                    const userCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
                    window._liveMapInstance.panTo(userCoords);
                    window._liveMapInstance.setZoom(16);

                    if (window.userLocationMarker) {
                        window.userLocationMarker.setPosition(userCoords);
                    } else {
                        window.userLocationMarker = new google.maps.Marker({
                            position: userCoords,
                            map: window._liveMapInstance,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 6,
                                fillColor: "#818cf8", 
                                fillOpacity: 1,
                                strokeWeight: 2,
                                strokeColor: "#ffffff"
                            }
                        });
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

        const staffCard = e.target.closest('.staff-card');
        if (staffCard && window._liveMapInstance) {
            const userName = staffCard.getAttribute('data-name');
            const marker = window._liveMapMarkers[userName];

            if (marker) {
                window._liveMapInstance.panTo(marker.getPosition());
                window._liveMapInstance.setZoom(17);
                google.maps.event.trigger(marker, 'click');
            }
        }
    });

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