// Results core functionality for Pathlight

// Global variables
// userId is already declared in the template
let stripe = null;
let elements = null;
let paymentElement = null;
let stripePaymentModal = null;
let paymentForm = null;
let currentTier = null;

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const summaryContent = document.getElementById('summaryContent');
    const fullContent = document.getElementById('fullContent');
    const paymentSection = document.getElementById('paymentSection');
    const lockedIcon = document.getElementById('lockedIcon');
    const unlockButton = document.getElementById('unlockButton');
    const paymentModal = document.getElementById('paymentModal');
    const successModal = document.getElementById('successModal');
    const viewPlanButton = document.getElementById('viewPlanButton');
    
    // Check if user ID is available
    if (!userId) {
        showNotification('User ID not found. Please start from the beginning.', 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
        return;
    }
    
    // Initialize
    function init() {
        // Check URL parameters for payment success
        const urlParams = new URLSearchParams(window.location.search);
        const paymentSuccess = urlParams.get('payment_success');
        const paymentError = urlParams.get('payment_error');
        const tier = urlParams.get('tier');
        const sessionId = urlParams.get('session_id');
        
        // If payment was just successful, show generating results message and trigger AI generation
        if (paymentSuccess === 'true' && tier) {
            showGeneratingResultsMessage();
            generateResults(tier);
        } else if (paymentError === 'true') {
            showNotification('There was an issue with your payment. Please try again.', 'error');
        } else if (sessionId && tier) {
            // If we have a session_id, verify the payment
            verifyPayment(sessionId, tier);
        }
        
        // Load summary content
        loadSummary();
        
        // Check payment status
        checkPaymentStatus();
        
        // Set up event listeners
        unlockButton.addEventListener('click', initiatePayment);
        
        // Close modal buttons
        const closeModalButtons = document.querySelectorAll('.close-modal');
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                paymentModal.style.display = 'none';
                successModal.style.display = 'none';
            });
        });
        
        // View plan button
        viewPlanButton.addEventListener('click', () => {
            successModal.style.display = 'none';
            showFullPlan();
        });
        
        // Check if upgrade button should be shown
        if (typeof showUpgrade !== 'undefined' && showUpgrade) {
            // Show upgrade section
            paymentSection.style.display = 'block';
            fullContent.style.display = 'none';
        }
        
        // Clean URL parameters
        const url = new URL(window.location.href);
        url.searchParams.delete('payment_success');
        url.searchParams.delete('payment_error');
        url.searchParams.delete('tier');
        url.searchParams.delete('session_id');
        window.history.replaceState({}, '', url);
    }
    
    // Utility function to show notifications
    function showNotification(message, type = 'success') {
        // Use the custom toast notification from base.js
        window.showNotification(message, type);
    }
    
    // Initialize
    init();
});
