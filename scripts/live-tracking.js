document.addEventListener('DOMContentLoaded', () => {
    
    const staffSearch = document.getElementById('staff-search');
    const staffCards = document.querySelectorAll('.staff-card');
    const mapPins = document.querySelectorAll('.map-pin');

    // 1. Search Functionality
    staffSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        
        staffCards.forEach(card => {
            const name = card.getAttribute('data-name').toLowerCase();
            if (name.includes(term)) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    });

    // 2. Locate on Map Logic
    staffCards.forEach(card => {
        card.addEventListener('click', () => {
            const userName = card.getAttribute('data-name');
            
            // Find corresponding pin
            mapPins.forEach(pin => {
                if (pin.getAttribute('data-user') === userName) {
                    // Visual feedback: Scale up and shake the pin
                    pin.style.transform = "scale(1.5)";
                    pin.style.zIndex = "50";
                    
                    setTimeout(() => {
                        pin.style.transform = "scale(1)";
                        pin.style.zIndex = "10";
                    }, 1000);
                    
                    // Optional: Show a message
                    console.log(`Centering map on ${userName}`);
                }
            });
        });
    });

    console.log("Interactive Locations initialized.");
});