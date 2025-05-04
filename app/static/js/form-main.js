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
    const initiatePayment = urlParams.get('initiate_payment');
    
    // If we have a session_id and tier, verify the payment
    if (sessionId && tier && user.id) {
        verifyPayment(sessionId, tier);
    }
    
    // If initiate_payment is true, trigger the payment flow after loading user data
    if (initiatePayment === 'true') {
        console.log('Initiating payment after authentication');
        
        // Set a flag to initiate payment after user data is loaded
        window.initiatePaymentAfterLoad = true;
    }
    
    // If we have a slide parameter, set the current slide after loading user data
    if (slideParam !== null && !isNaN(parseInt(slideParam))) {
        window.startAtSlide = parseInt(slideParam);
        console.log('Will start at slide:', window.startAtSlide);
        
        // If slide parameter is 0, update it to 1 since we removed the profile slide
        if (window.startAtSlide === 0) {
            window.startAtSlide = 1;
            console.log('Updated to start at slide 1 instead of 0 (profile slide removed)');
        }
    }
    // If we have a start parameter, set the current slide after loading user data
    else if (startQuestion && !isNaN(parseInt(startQuestion))) {
        // We'll use this in the loadUserData callback
        window.startAtQuestion = parseInt(startQuestion);
        console.log('Will start at question:', window.startAtQuestion);
    }
    
    // Clean URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('session_id');
    url.searchParams.delete('tier');
    url.searchParams.delete('start');
    url.searchParams.delete('slide');
    url.searchParams.delete('initiate_payment');
    
    window.history.replaceState({}, '', url);
    
    // We removed the logout button since we removed the user info slide
});
