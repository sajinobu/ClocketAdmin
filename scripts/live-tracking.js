let map;
let markers = {};
const hqCoords = [14.6922, 120.9789]; // Default HQ Coordinates

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Leaflet Map
    map = L.map('map', {
        zoomControl: false // Hide default to use custom buttons
    }).setView(hqCoords, 15);

    // 2. Add Map Tiles (Stadia Smooth for a clean, professional look)
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
    }).addTo(map);

    // 3. Add Initial Employees
    addEmployeeMarker("Sarah Johnson", [14.6930, 120.9795], "HQ Office - Floor 1");
    addEmployeeMarker("Mike Chen", [14.6915, 120.9780], "Remote - Austin");
    addEmployeeMarker("Emma Wilson", [14.6900, 120.9810], "Site B - Warehouse");

    // 4. Custom Map Controls
    const zoomInBtn = document.getElementById('map-zoom-in');
    const zoomOutBtn = document.getElementById('map-zoom-out');
    const recenterBtn = document.getElementById('map-recenter');
    let userLocationMarker = null;

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => map.zoomIn());
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => map.zoomOut());

    // 5. Geolocation Logic (Find My Location)
    if (recenterBtn) {
        recenterBtn.addEventListener('click', () => {
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

                    // Fly to user location
                    map.flyTo(userCoords, 16, {
                        duration: 1.5,
                        easeLinearity: 0.25
                    });

                    // Update or create pulsing marker
                    if (userLocationMarker) {
                        userLocationMarker.setLatLng(userCoords);
                    } else {
                        const pulseIcon = L.divIcon({
                            className: 'custom-div-icon',
                            html: `<div class="user-location-dot"></div>`,
                            iconSize: [12, 12],
                            iconAnchor: [6, 6] 
                        });

                        userLocationMarker = L.marker(userCoords, { icon: pulseIcon }).addTo(map);
                        userLocationMarker.bindPopup("<div class='font-sans font-bold text-brand-darkest text-sm'>You are here</div>").openPopup();
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
        });
    }

    // 6. Sidebar Search Logic
    const staffSearch = document.getElementById('staff-search');
    const staffCards = document.querySelectorAll('.staff-card');

    if (staffSearch) {
        staffSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            staffCards.forEach(card => {
                const name = card.getAttribute('data-name').toLowerCase();
                const site = card.querySelector('.text-[11px]').textContent.toLowerCase();
                
                // Search by name or location
                if (name.includes(term) || site.includes(term)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // 7. Sidebar Card Click -> Map Interaction
    staffCards.forEach(card => {
        card.addEventListener('click', () => {
            const userName = card.getAttribute('data-name');
            const marker = markers[userName];

            if (marker) {
                // Fly to the marker
                map.flyTo(marker.getLatLng(), 17, {
                    duration: 1.5
                });
                // Open the popup automatically
                setTimeout(() => marker.openPopup(), 1000);
            }
        });
    });

    // --- Helper: Add Employee Marker ---
    function addEmployeeMarker(name, coords, site) {
        const marker = L.circleMarker(coords, {
            radius: 8,
            fillColor: "#001aff", // Brand Primary
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
        }).addTo(map);

        const popupContent = `
            <div class="font-sans p-1 min-w-[120px]">
                <p class="font-bold text-gray-800 text-sm mb-1">${name}</p>
                <p class="text-[10px] text-gray-500 uppercase font-bold tracking-widest">${site}</p>
            </div>
        `;

        marker.bindPopup(popupContent);
        markers[name] = marker;
    }

    // --- Helper: Toast Notification ---
    function showToast(message, isSuccess = true) {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-6 right-6 bg-[#000523] text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[9999]`;
        toast.style.cssText = "transform: translateY(20px); opacity: 0; transition: all 0.3s ease;";
        
        const iconColor = isSuccess ? "text-[#57e8ff]" : "text-red-400";
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
});