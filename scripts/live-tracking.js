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
    // GLOBALS & CLEANUP
    // ==========================================
    if (window._liveMapMarkers) {
        Object.values(window._liveMapMarkers).forEach(m => {
            if (m && typeof m.setMap === 'function') m.setMap(null);
        });
    }
    window._liveMapMarkers = {}; 
    
    if (window._infoWindows) {
        Object.values(window._infoWindows).forEach(iw => {
            if (iw && typeof iw.close === 'function') iw.close();
        });
    }
    window._infoWindows = {};

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

    if (window._liveTrackingTimeInterval) clearInterval(window._liveTrackingTimeInterval);
    window._liveTrackingTimeInterval = setInterval(() => {
        document.querySelectorAll('.time-duration').forEach(el => {
            const ts = parseInt(el.getAttribute('data-timestamp'));
            if (ts) el.textContent = getDurationText(ts);
        });
    }, 60000);

    // ==========================================
    // MAP INIT (WITH SMOOTH FADE IN)
    // ==========================================
    window.initMap = function() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        // Start invisible for the smooth SPA transition
        mapContainer.style.opacity = '0';
        mapContainer.style.transition = 'opacity 0.7s ease-out';

        const hqCoords = { lat: 14.6922, lng: 120.9789 }; 
        
        window._liveMapInstance = new google.maps.Map(mapContainer, {
            center: hqCoords,
            zoom: 15,
            disableDefaultUI: true, 
            styles: [] 
        });

        // Fade in ONLY when visual tiles are fully downloaded
        google.maps.event.addListenerOnce(window._liveMapInstance, 'tilesloaded', () => {
            mapContainer.style.opacity = '1';
        });

        startLiveTracking();
    };

    // ==========================================
    // THE FIX: ROUTER-SAFE API LOADER
    // ==========================================
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        console.log('Live Tracking: Loading Google Maps via Proxy...');
        loadGoogleMapsProxy();
    } else {
        console.log('Live Tracking: Google Maps already loaded in memory.');
        // SPA Return Visit: Wait 200ms for the layout.js fade animation to finish injecting the DOM
        setTimeout(window.initMap, 200); 
    }

    function loadGoogleMapsProxy() {
        // Explicitly attach to 'window' so stringified functions can access them
        window.CORSproxyURL = [
            'https://corsproxy.io/?',
            'https://api.allorigins.win/get?url=',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        window.CORSproxyIndex = 0;
        
        var args = '';
        if (typeof language != 'undefined') args += '&language=' + language;

        window.sendRequestThroughCROSproxy = function(url, callback) {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        try {
                            if (window.CORSproxyIndex % window.CORSproxyURL.length === 0) {
                                if (callback) callback(xhttp.responseText);
                            } else {
                                var response = JSON.parse(xhttp.responseText);
                                if (callback && response.contents) callback(response.contents);
                            }
                        } catch (e) {
                            window.CORSproxyIndex++;
                            window.sendRequestThroughCROSproxy(url, callback);
                        }
                    } else {
                        window.CORSproxyIndex++;
                        if (window.CORSproxyIndex < window.CORSproxyURL.length * 3) {
                            window.sendRequestThroughCROSproxy(url, callback);
                        } else {
                            window.showMapError();
                        }
                    }
                }
            };
            xhttp.onerror = function() {
                window.CORSproxyIndex++;
                if (window.CORSproxyIndex < window.CORSproxyURL.length * 3) {
                    window.sendRequestThroughCROSproxy(url, callback);
                } else {
                    window.showMapError();
                }
            };
            xhttp.open("GET", window.CORSproxyURL[window.CORSproxyIndex % window.CORSproxyURL.length] + encodeURIComponent(url), true);
            xhttp.send();
        };

        window.showMapError = function() {
            var mapContainer = document.getElementById('map');
            if (mapContainer) {
                mapContainer.style.opacity = '1';
                mapContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; padding: 20px; text-align: center;">
                        <p style="margin-top: 16px;">Unable to load Google Maps via proxy.</p>
                    </div>
                `;
            }
        };

        var bypass = function (googleAPIcomponentJS, googleAPIcomponentURL) {
            if (googleAPIcomponentURL.toString().indexOf("common.js") != -1) {
                var removeFailureAlert = function(googleAPIcomponentURL) {
                    // Call the globally bound window function
                    window.sendRequestThroughCROSproxy(googleAPIcomponentURL, (responseText) => {
                        var anotherAppendChildToHeadJSRegex = /\.head;.*src=(.*?);/;
                        var anotherAppendChildToHeadJS = responseText.match(anotherAppendChildToHeadJSRegex);
                        if (!anotherAppendChildToHeadJS) {
                            var script = document.createElement('script');
                            script.innerHTML = responseText;
                            document.head.appendChild(script);
                            return;
                        }
                        var googleAPItrustedScriptURL = anotherAppendChildToHeadJS[1];
                        var bypassQuotaServicePayload = anotherAppendChildToHeadJS[0].replace(
                            googleAPItrustedScriptURL, 
                            googleAPItrustedScriptURL + '.toString().indexOf("QuotaService.RecordEvent")!=-1?"":' + googleAPItrustedScriptURL
                        );
                        var script = document.createElement('script');
                        script.innerHTML = responseText
                            .replace(new RegExp(/;if\(![a-z]+?\).*Failure.*?\}/), ";")
                            .replace(new RegExp(/(\|\|\(\(\)=\>\{\}\);\S+\?\S+?\()/), "$1true||")
                            .replace(anotherAppendChildToHeadJSRegex, bypassQuotaServicePayload);
                        document.head.appendChild(script);
                    });
                }
                googleAPIcomponentJS.innerHTML = '(' + removeFailureAlert.toString() + ')("' + googleAPIcomponentURL.toString() + '")';
            } else if (googleAPIcomponentURL.toString().indexOf("map.js") != -1) {
                var hijackMapJS = function(googleAPIcomponentURL) {
                    // Call the globally bound window function
                    window.sendRequestThroughCROSproxy(googleAPIcomponentURL, (responseText) => {
                        var script = document.createElement('script');
                        script.innerHTML = responseText.replace(new RegExp(/if\(\w+!==1&&\w+!==2\)/), "if(false)");
                        document.head.appendChild(script);
                    });
                }
                googleAPIcomponentJS.innerHTML = '(' + hijackMapJS.toString() + ')("' + googleAPIcomponentURL.toString() + '")';
            } else {
                googleAPIcomponentJS.src = googleAPIcomponentURL;
            }
        };

        var createAndExecutePayload = function (googleAPIjs) {
            var script = document.createElement('script');
            var appendChildToHeadJS = googleAPIjs.match(/(\w+)\.src=(_.*?);/);
            if (!appendChildToHeadJS) {
                script.innerHTML = googleAPIjs;
                document.head.appendChild(script);
                return;
            }
            var googleAPIcomponentJS = appendChildToHeadJS[1];
            var googleAPIcomponentURL = appendChildToHeadJS[2];
            script.innerHTML = googleAPIjs.replace(
                appendChildToHeadJS[0], 
                '(' + bypass.toString() + ')(' + googleAPIcomponentJS + ', ' + googleAPIcomponentURL + ');'
            );
            document.head.appendChild(script);
        };

        // Trigger the fetch using the window bound proxy request
        window.sendRequestThroughCROSproxy(
            'https://maps.googleapis.com/maps/api/js?key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg&callback=initMap' + args, 
            (googleAPIjs) => {
                createAndExecutePayload(googleAPIjs);
            }
        );
    }

    // ==========================================
    // CORE LOGIC: FETCH & RENDER
    // ==========================================
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
            
            if (window._liveTrackingUnsubscribe) window._liveTrackingUnsubscribe();

            window._liveTrackingUnsubscribe = onValue(locationsRef, (snapshot) => {
                const activeLocations = snapshot.exists() ? snapshot.val() : {};
                const rtdbDataArray = Object.values(activeLocations);

                Object.values(window._liveMapMarkers).forEach(m => m.setMap(null));
                window._liveMapMarkers = {};
                window._infoWindows = {};

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
        
        let statusColorHex = "475569"; 
        let displayStatus = "Offline";
        let dotColorClass = "bg-slate-600";
        let bgClass = "bg-[rgba(71,85,105,0.1)] text-slate-700";
        let markerScale = 6; 
        let markerZIndex = 1; 

        if (status === "online") {
            statusColorHex = "10B981"; 
            displayStatus = "Active";
            dotColorClass = "bg-emerald-500";
            bgClass = "bg-[rgba(16,185,129,0.1)] text-emerald-600";
            markerScale = 9; 
            markerZIndex = 10; 
        } else if (status === "break") {
            statusColorHex = "F59E0B"; 
            displayStatus = "On Break";
            dotColorClass = "bg-amber-500";
            bgClass = "bg-[rgba(245,158,11,0.1)] text-amber-600";
            markerScale = 9; 
            markerZIndex = 10; 
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

        if (lat && lng && window._liveMapInstance) {
            const marker = new google.maps.Marker({
                position: { lat, lng },
                map: window._liveMapInstance,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: markerScale,
                    fillColor: `#${statusColorHex}`,
                    fillOpacity: 1, 
                    strokeWeight: 2,
                    strokeColor: "#ffffff" 
                },
                title: `${name} - ${displayStatus}`,
                zIndex: markerZIndex 
            });

            const popupContent = `
                <div style="font-family: 'DM Sans', sans-serif; padding: 4px; min-width: 120px;">
                    <p style="font-weight: 700; color: #0f172a; font-size: 14px; margin: 0 0 4px 0;">${name}</p>
                    <p style="font-size: 10px; color: #${statusColorHex}; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin: 0;">${displayStatus} • ${team}${infoWindowTimeText}</p>
                </div>
            `;

            const infoWindow = new google.maps.InfoWindow({ content: popupContent });

            marker.addListener("click", () => {
                Object.values(window._infoWindows).forEach(iw => iw.close());
                infoWindow.open({ anchor: marker, map: window._liveMapInstance });
            });

            window._liveMapMarkers[emp.email] = marker;
            window._infoWindows[emp.email] = infoWindow;
        }

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
                window._liveMapInstance.panTo(marker.getPosition());
                window._liveMapInstance.setZoom(17);
                google.maps.event.trigger(marker, 'click');
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

    // ==========================================
    // EVENT LISTENERS & UI
    // ==========================================
    if (window._liveTrackingClickHandler) {
        document.body.removeEventListener('click', window._liveTrackingClickHandler);
    }
    
    window._liveTrackingClickHandler = (e) => {
        if (!document.getElementById('map')) return;

        if (e.target.closest('#map-zoom-in') && window._liveMapInstance) {
            window._liveMapInstance.setZoom(window._liveMapInstance.getZoom() + 1);
        }
        if (e.target.closest('#map-zoom-out') && window._liveMapInstance) {
            window._liveMapInstance.setZoom(window._liveMapInstance.getZoom() - 1);
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
                            },
                            zIndex: 999
                        });
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

    if (window._liveTrackingInputHandler) {
        document.body.removeEventListener('input', window._liveTrackingInputHandler);
    }
    
    window._liveTrackingInputHandler = (e) => {
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
    document.body.addEventListener('input', window._liveTrackingInputHandler);

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