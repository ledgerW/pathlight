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
    
    // If we have a session_id and tier, verify the payment
    if (sessionId && tier && user.id) {
        verifyPayment(sessionId, tier);
    }
    
    // If we have a start parameter, set the current slide after loading user data
    if (startQuestion && !isNaN(parseInt(startQuestion))) {
        // We'll use this in the loadUserData callback
        window.startAtQuestion = parseInt(startQuestion);
        console.log('Will start at question:', window.startAtQuestion);
    }
    
    // Clean URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('session_id');
    url.searchParams.delete('tier');
    url.searchParams.delete('start');
    window.history.replaceState({}, '', url);
});
