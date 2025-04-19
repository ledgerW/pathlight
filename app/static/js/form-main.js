// Main form file that imports all modular components

// Global variables and constants are defined in form-core.js

// Define currentTier for payment processing
let currentTier = null;

// Check if the document is loaded before executing any code
document.addEventListener('DOMContentLoaded', function() {
    // Check URL parameters for payment verification
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const tier = urlParams.get('tier');
    const startQuestion = urlParams.get('start');
    const slideParam = urlParams.get('slide');
    
    // If we have a session_id and tier, verify the payment
    if (sessionId && tier && user.id) {
        verifyPayment(sessionId, tier);
    }
    
    // If we have a slide parameter, set the current slide after loading user data
    if (slideParam !== null && !isNaN(parseInt(slideParam))) {
        window.startAtSlide = parseInt(slideParam);
        console.log('Will start at slide:', window.startAtSlide);
        
        // Force show slide 0 if it's the profile slide
        if (window.startAtSlide === 0) {
            setTimeout(() => {
                showSlide(0);
            }, 200);
        }
    }
    // If we have a start parameter, set the current slide after loading user data
    else if (startQuestion && !isNaN(parseInt(startQuestion))) {
        // We'll use this in the loadUserData callback
        window.startAtQuestion = parseInt(startQuestion);
        console.log('Will start at question:', window.startAtQuestion);
    }
    
    // Clean URL parameters but keep the slide=0 parameter for the profile page
    const url = new URL(window.location.href);
    url.searchParams.delete('session_id');
    url.searchParams.delete('tier');
    url.searchParams.delete('start');
    
    // Only remove the slide parameter if it's not 0
    if (slideParam !== '0') {
        url.searchParams.delete('slide');
    }
    
    window.history.replaceState({}, '', url);
});
