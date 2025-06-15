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
        if (unlockButton) {
            unlockButton.addEventListener('click', function() {
                // Call the initiatePayment function
                initiatePayment();
            });
        }
        
        // Close modal buttons
        const closeModalButtons = document.querySelectorAll('.close-modal');
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (paymentModal) paymentModal.style.display = 'none';
                if (successModal) successModal.style.display = 'none';
            });
        });
        
        // View plan button
        if (viewPlanButton) {
            viewPlanButton.addEventListener('click', () => {
                successModal.style.display = 'none';
                showFullPlan();
            });
        }
        
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
    
    // Show generating results message
    function showGeneratingResultsMessage() {
        // Create a message element
        const messageContainer = document.createElement('div');
        messageContainer.className = 'generating-results-message';
        messageContainer.innerHTML = `
            <div class="loading-spinner"></div>
            <h3>Your results are being generated...</h3>
            <p>This may take a few moments. Please don't refresh the page.</p>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .generating-results-message {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background-color: rgba(255, 255, 255, 0.9);
                padding: 20px;
                text-align: center;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .loading-spinner {
                display: inline-block;
                width: 40px;
                height: 40px;
                border: 4px solid rgba(0, 0, 0, 0.1);
                border-radius: 50%;
                border-top-color: #4a90e2;
                animation: spin 1s ease-in-out infinite;
                margin-bottom: 10px;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        // Add to the page
        document.body.prepend(messageContainer);
        
        return messageContainer;
    }
    
    // Generate results based on tier
    async function generateResults(tier) {
        try {
            // Call the appropriate AI generation endpoint based on the tier
            const aiEndpoint = tier === 'premium' || tier === 'pursuit' ? 
                `/api/ai/${userId}/generate-premium` : 
                `/api/ai/${userId}/generate-basic`;
            
            // Make the API call
            const response = await fetch(aiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            // Remove the generating results message
            const messageElement = document.querySelector('.generating-results-message');
            if (messageElement) {
                messageElement.innerHTML = `
                    <h3>Your results are ready!</h3>
                    <p>Refreshing the page...</p>
                `;
                
                // Refresh the page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
            
            if (!response.ok) {
                throw new Error('Failed to generate results');
            }
            
        } catch (error) {
            console.error('Error generating results:', error);
            
            // Update the message
            const messageElement = document.querySelector('.generating-results-message');
            if (messageElement) {
                messageElement.innerHTML = `
                    <h3>There was an issue generating your results</h3>
                    <p>Please refresh the page to try again.</p>
                    <button onclick="window.location.reload()" class="refresh-button">Refresh Page</button>
                `;
            }
        }
    }
    
    // Load summary content
    async function loadSummary() {
        try {
            const response = await fetch(`/api/results/${userId}/summary`);
            
            if (!response.ok) {
                if (response.status === 403) {
                    // Payment required
                    if (summaryContent) {
                        summaryContent.innerHTML = '<p class="error-message">Please complete your payment to view your summary.</p>';
                    }
                    return;
                }
                throw new Error('Failed to load summary');
            }
            
            const data = await response.json();
            
            // Start with an empty content string
            let formattedContent = '';
            
            // Add mantra if available with new theme-oriented style (displayed first)
            if (data.mantra) {
                formattedContent += `
                    <div class="mantra-section">
                        <h2 class="mantra-title">Your Personal Mantra</h2>
                        <blockquote class="mantra">${data.mantra}</blockquote>
                    </div>`;
            }
            
            // Add purpose (summary) with new theme-oriented style
            formattedContent += `
                <div class="purpose-section">
                    <h2 class="purpose-title">Your Purpose</h2>
                    <div class="purpose-content">${formatContent(data.summary)}</div>
                </div>`;
            
            if (summaryContent) {
                summaryContent.innerHTML = formattedContent;
            }
            
        } catch (error) {
            console.error('Error loading summary:', error);
            if (summaryContent) {
                summaryContent.innerHTML = '<p class="error-message">Error loading your summary. Please try again later.</p>';
            }
        }
    }
    
    // Check payment status
    async function checkPaymentStatus() {
        try {
            const response = await fetch(`/api/payments/${userId}/payment-status`);
            
            if (!response.ok) {
                throw new Error('Failed to check payment status');
            }
            
            const data = await response.json();
            
            // Update UI based on payment tier
            if (data.payment_tier === 'pursuit' || data.payment_tier === 'premium') {
                // User has premium tier, show full plan
                showFullPlan();
            } else if (data.payment_tier === 'purpose') {
                // User has purpose tier, show basic content only
                // Hide payment section if they're on purpose tier
                if (paymentSection) {
                    paymentSection.style.display = 'block'; // Still show upgrade option
                }
            } else {
                // User hasn't paid, redirect to form
                showNotification('Please complete the form and payment to view your results.', 'error');
                setTimeout(() => {
                    window.location.href = `/form/${userId}`;
                }, 3000);
            }
            
        } catch (error) {
            console.error('Error checking payment status:', error);
        }
    }
    
    // Show full plan
    async function showFullPlan() {
        // Hide payment section
        if (paymentSection) {
            paymentSection.style.display = 'none';
        }
        
        // Update lock icon
        if (lockedIcon) {
            lockedIcon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="none" d="M0 0h24v24H0z"/>
                    <path d="M6 8V7a6 6 0 1 1 12 0v1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h2zm13 2H5v10h14V10zm-8 5.732a2 2 0 1 1 2 0V18h-2v-2.268zM8 8h8V7a4 4 0 1 0-8 0v1z"/>
                </svg>
            `;
        }
        
        // Show full content
        if (fullContent) {
            fullContent.style.display = 'block';
        }
        
        // Load full plan content if not already loaded
        const loaded = await loadFullPlan();
        
        if (!loaded) {
            // If loading failed due to payment required, show payment section
            if (paymentSection) {
                paymentSection.style.display = 'block';
            }
            if (fullContent) {
                fullContent.style.display = 'none';
            }
        }
    }
    
    // Load full plan content
    async function loadFullPlan() {
        try {
            // First check if the user has a premium tier
            const statusResponse = await fetch(`/api/payments/${userId}/payment-status`);
            if (!statusResponse.ok) {
                throw new Error('Failed to check payment status');
            }
            
            const statusData = await statusResponse.json();
            
            // Hide payment section for plan and pursuit tier users regardless of plan data
            if (statusData.payment_tier === 'plan' || statusData.payment_tier === 'pursuit') {
                if (paymentSection) {
                    paymentSection.style.display = 'none';
                }
            }
            
            // If user doesn't have plan or pursuit tier, don't show loading spinner
            if (statusData.payment_tier !== 'plan' && statusData.payment_tier !== 'pursuit') {
                // Hide loading spinner
                const loadingPlaceholder = document.querySelector('#fullContent .loading-placeholder');
                if (loadingPlaceholder) {
                    loadingPlaceholder.style.display = 'none';
                }
                return false;
            }
            
            const response = await fetch(`/api/results/${userId}/full`);
            
            if (!response.ok) {
                // Hide the loading placeholder
                const loadingPlaceholder = document.querySelector('#fullContent .loading-placeholder');
                if (loadingPlaceholder) {
                    loadingPlaceholder.style.display = 'none';
                }
                
                if (response.status !== 403) {
                    throw new Error('Failed to load full plan');
                }
                return false;
            }
            
            const data = await response.json();
            
            // Hide the loading placeholder
            const loadingPlaceholder = document.querySelector('#fullContent .loading-placeholder');
            if (loadingPlaceholder) {
                loadingPlaceholder.style.display = 'none';
            }
            
            // Display structured plan sections
            if (typeof displayStructuredPlan === 'function') {
                displayStructuredPlan(data.full_plan);
            }
            
            return true;
            
        } catch (error) {
            console.error('Error loading full plan:', error);
            return false;
        }
    }
    
    // Initiate payment
    async function initiatePayment() {
        try {
            // Show payment modal
            if (paymentModal) {
                paymentModal.style.display = 'flex';
            }
            
            // Create checkout session for pursuit tier (subscription)
            const response = await fetch(`/api/payments/${userId}/create-checkout-session/pursuit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    is_subscription: true
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create checkout session');
            }
            
            const data = await response.json();
            console.log('Checkout session created:', data);
            
            // Redirect to Stripe Checkout
            window.location.href = data.checkout_url;
            
        } catch (error) {
            console.error('Error initiating payment:', error);
            if (paymentModal) {
                paymentModal.style.display = 'none';
            }
            showNotification('Error processing payment. Please try again.', 'error');
        }
    }
    
    // Verify payment
    async function verifyPayment(sessionId, tier) {
        try {
            const response = await fetch(`/api/payments/${userId}/verify-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    tier: tier
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to verify payment');
            }
            
            const data = await response.json();
            
            if (data.payment_verified) {
                // Show success modal
                if (successModal) {
                    successModal.style.display = 'flex';
                }
                
                // Remove session_id and tier from URL
                const url = new URL(window.location.href);
                url.searchParams.delete('session_id');
                url.searchParams.delete('tier');
                window.history.replaceState({}, '', url);
                
                // If pursuit tier, show full plan
                if (tier === 'pursuit') {
                    showFullPlan();
                } else {
                    // Reload the page to refresh the summary
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                }
            }
            
        } catch (error) {
            console.error('Error verifying payment:', error);
        }
    }
    
    // Format content with Markdown-like syntax
    function formatContent(content) {
        if (!content) return '';
        
        // Replace newlines with <br>
        let formatted = content.replace(/\n/g, '<br>');
        
        // Replace headers
        formatted = formatted.replace(/# (.*?)(<br>|$)/g, '<h2>$1</h2>');
        formatted = formatted.replace(/## (.*?)(<br>|$)/g, '<h3>$1</h3>');
        formatted = formatted.replace(/### (.*?)(<br>|$)/g, '<h4>$1</h4>');
        
        // Replace bold
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Replace italic
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Identify bullet points (both - and •)
        const hasBulletPoints = /(^|\<br\>)[\s]*[-•][\s]+(.*?)($|\<br\>)/g.test(formatted);
        
        if (hasBulletPoints) {
            // Replace bullet points with proper list items
            formatted = formatted.replace(/(^|\<br\>)[\s]*[-•][\s]+(.*?)($|\<br\>)/g, function(match, p1, p2, p3) {
                return `<li class="icon-bullet-item"><span class="bullet-icon">•</span> ${p2}</li>`;
            });
            
            // Wrap lists in <ul>
            if (formatted.includes('<li')) {
                formatted = formatted.replace(/(<li.*?<\/li>)+/g, '<ul class="icon-bullet-list">$&</ul>');
            }
        }
        
        return formatted;
    }
    
    // Utility function to show notifications
    function showNotification(message, type = 'success') {
        // Use the custom toast notification from base.js
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type}: ${message}`);
        }
    }
    
    // Initialize
    init();
});

// Make functions globally accessible
window.initiatePayment = function() {
    // This will be called by the unlock button
    const event = new CustomEvent('initiatePayment');
    document.dispatchEvent(event);
};

window.showGeneratingResultsMessage = function() {
    // Create a message element
    const messageContainer = document.createElement('div');
    messageContainer.className = 'generating-results-message';
    messageContainer.innerHTML = `
        <div class="loading-spinner"></div>
        <h3>Your results are being generated...</h3>
        <p>This may take a few moments. Please don't refresh the page.</p>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('style[data-generating-results]')) {
        const style = document.createElement('style');
        style.setAttribute('data-generating-results', 'true');
        style.textContent = `
            .generating-results-message {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background-color: rgba(255, 255, 255, 0.9);
                padding: 20px;
                text-align: center;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .loading-spinner {
                display: inline-block;
                width: 40px;
                height: 40px;
                border: 4px solid rgba(0, 0, 0, 0.1);
                border-radius: 50%;
                border-top-color: #4a90e2;
                animation: spin 1s ease-in-out infinite;
                margin-bottom: 10px;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add to the page
    document.body.prepend(messageContainer);
    
    return messageContainer;
};
