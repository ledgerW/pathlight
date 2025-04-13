// Results page JavaScript for Pathlight

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
            const aiEndpoint = tier === 'premium' ? 
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
                    summaryContent.innerHTML = '<p class="error-message">Please complete your payment to view your summary.</p>';
                    return;
                }
                throw new Error('Failed to load summary');
            }
            
            const data = await response.json();
            
            // Format and display summary
            let formattedContent = formatContent(data.summary);
            
            // Add mantra if available
            if (data.mantra) {
                formattedContent += `<div class="mantra-section">
                    <h3>Your Personal Mantra</h3>
                    <blockquote class="mantra">${data.mantra}</blockquote>
                </div>`;
            }
            
            summaryContent.innerHTML = formattedContent;
            
        } catch (error) {
            console.error('Error loading summary:', error);
            summaryContent.innerHTML = '<p class="error-message">Error loading your summary. Please try again later.</p>';
        }
    }
    
    // Load full plan content
    async function loadFullPlan() {
        try {
            const response = await fetch(`/api/results/${userId}/full`);
            
            if (!response.ok) {
                if (response.status === 403) {
                    // Payment required
                    return false;
                }
                throw new Error('Failed to load full plan');
            }
            
            const data = await response.json();
            
            // Format and display full plan
            fullContent.innerHTML = formatContent(data.full_plan);
            
            return true;
            
        } catch (error) {
            console.error('Error loading full plan:', error);
            fullContent.innerHTML = '<p class="error-message">Error loading your full plan. Please try again later.</p>';
            return false;
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
            if (data.payment_tier === 'premium') {
                // User has premium tier, show full plan
                showFullPlan();
            } else if (data.payment_tier === 'basic') {
                // User has basic tier, show upgrade option
                // But hide the full plan section if they haven't completed all questions
                if (!data.has_paid) {
                    document.getElementById('fullResultsSection').style.display = 'none';
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
        paymentSection.style.display = 'none';
        
        // Update lock icon
        lockedIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path fill="none" d="M0 0h24v24H0z"/>
                <path d="M6 8V7a6 6 0 1 1 12 0v1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h2zm13 2H5v10h14V10zm-8 5.732a2 2 0 1 1 2 0V18h-2v-2.268zM8 8h8V7a4 4 0 1 0-8 0v1z"/>
            </svg>
        `;
        
        // Show full content
        fullContent.style.display = 'block';
        
        // Load full plan content if not already loaded
        const loaded = await loadFullPlan();
        
        if (!loaded) {
            // If loading failed due to payment required, show payment section
            paymentSection.style.display = 'block';
            fullContent.style.display = 'none';
        }
    }
    
    // Stripe payment elements
    let stripe;
    let elements;
    let paymentElement;
    let stripePaymentModal;
    let paymentForm;
    
    // Initialize Stripe
    async function initializeStripe() {
        return new Promise((resolve, reject) => {
            try {
                // Check if Stripe is already loaded
                if (typeof Stripe === 'undefined') {
                    // Load Stripe.js dynamically
                    const script = document.createElement('script');
                    script.src = 'https://js.stripe.com/v3/';
                    script.async = true;
                    script.onload = () => {
                        try {
                            stripe = Stripe('pk_test_51RBFMYIJ9UdLUkqAzojvqca8S7Xs4mXzUUN4p1rUMKGWZUOQRS9r6HaHLOGw26N7ko72iJPuoITaHqxGF8GTtfTg007gnFycP7');
                            console.log('Stripe.js loaded');
                            resolve(stripe);
                        } catch (error) {
                            console.error('Error initializing Stripe object:', error);
                            reject(error);
                        }
                    };
                    script.onerror = (error) => {
                        console.error('Error loading Stripe.js:', error);
                        reject(error);
                    };
                    document.head.appendChild(script);
                } else {
                    try {
                        stripe = Stripe('pk_test_51RBFMYIJ9UdLUkqAzojvqca8S7Xs4mXzUUN4p1rUMKGWZUOQRS9r6HaHLOGw26N7ko72iJPuoITaHqxGF8GTtfTg007gnFycP7');
                        console.log('Stripe.js already loaded');
                        resolve(stripe);
                    } catch (error) {
                        console.error('Error initializing Stripe object:', error);
                        reject(error);
                    }
                }
            } catch (error) {
                console.error('Error in initializeStripe:', error);
                reject(error);
            }
        });
    }
    
    // Create payment modal
    function createPaymentModal(productName, productDescription, amount) {
        // Create modal container if it doesn't exist
        if (!document.getElementById('stripePaymentModal')) {
            const modalContainer = document.createElement('div');
            modalContainer.id = 'stripePaymentModal';
            modalContainer.className = 'modal';
            modalContainer.style.display = 'none';
            
            // Create modal content
            modalContainer.innerHTML = `
                <div class="modal-content payment-modal-content">
                    <span class="close-modal" id="closeStripeModal">&times;</span>
                    <h2 id="paymentModalTitle">Complete Your Purchase</h2>
                    <p id="paymentModalDescription"></p>
                    <div id="paymentModalPrice" class="payment-price"></div>
                    
                    <form id="payment-form">
                        <div id="payment-element"></div>
                        <button id="submit-payment" class="btn-primary payment-button">
                            <div class="spinner hidden" id="spinner"></div>
                            <span id="button-text">Pay Now</span>
                        </button>
                        <div id="payment-message" class="payment-message"></div>
                    </form>
                </div>
            `;
            
            document.body.appendChild(modalContainer);
            
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .payment-modal-content {
                    max-width: 500px;
                }
                .payment-price {
                    font-size: 24px;
                    font-weight: bold;
                    margin: 20px 0;
                    color: #4a90e2;
                }
                #payment-element {
                    margin-bottom: 24px;
                }
                .payment-button {
                    background: #4a90e2;
                    color: white;
                    border: 0;
                    padding: 12px 16px;
                    border-radius: 4px;
                    margin-top: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    width: 100%;
                    transition: all 0.2s ease;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .payment-button:hover {
                    filter: brightness(1.1);
                }
                .payment-button:disabled {
                    opacity: 0.5;
                    cursor: default;
                }
                .spinner {
                    color: #ffffff;
                    font-size: 22px;
                    text-indent: -99999px;
                    margin: 0px auto;
                    position: relative;
                    width: 20px;
                    height: 20px;
                    box-shadow: inset 0 0 0 2px;
                    -webkit-transform: translateZ(0);
                    -ms-transform: translateZ(0);
                    transform: translateZ(0);
                    border-radius: 50%;
                    margin-right: 10px;
                }
                .spinner:before, .spinner:after {
                    position: absolute;
                    content: '';
                }
                .spinner:before {
                    width: 10.4px;
                    height: 20.4px;
                    background: #4a90e2;
                    border-radius: 20.4px 0 0 20.4px;
                    top: -0.2px;
                    left: -0.2px;
                    -webkit-transform-origin: 10.4px 10.2px;
                    transform-origin: 10.4px 10.2px;
                    -webkit-animation: loading 2s infinite ease 1.5s;
                    animation: loading 2s infinite ease 1.5s;
                }
                .spinner:after {
                    width: 10.4px;
                    height: 10.2px;
                    background: #4a90e2;
                    border-radius: 0 10.2px 10.2px 0;
                    top: -0.1px;
                    left: 10.2px;
                    -webkit-transform-origin: 0px 10.2px;
                    transform-origin: 0px 10.2px;
                    -webkit-animation: loading 2s infinite ease;
                    animation: loading 2s infinite ease;
                }
                .hidden {
                    display: none;
                }
                .payment-message {
                    color: rgb(105, 115, 134);
                    font-size: 16px;
                    line-height: 20px;
                    padding-top: 12px;
                    text-align: center;
                }
                @keyframes loading {
                    0% {
                        -webkit-transform: rotate(0deg);
                        transform: rotate(0deg);
                    }
                    100% {
                        -webkit-transform: rotate(360deg);
                        transform: rotate(360deg);
                    }
                }
            `;
            document.head.appendChild(style);
            
            // Add event listener for close button
            document.getElementById('closeStripeModal').addEventListener('click', () => {
                document.getElementById('stripePaymentModal').style.display = 'none';
            });
        }
        
        // Update modal content
        document.getElementById('paymentModalTitle').textContent = `Upgrade to ${productName}`;
        document.getElementById('paymentModalDescription').textContent = productDescription;
        document.getElementById('paymentModalPrice').textContent = `$${(amount / 100).toFixed(2)}`;
        
        // Store reference to modal
        stripePaymentModal = document.getElementById('stripePaymentModal');
        paymentForm = document.getElementById('payment-form');
        
        // Show the modal
        stripePaymentModal.style.display = 'flex';
    }
    
    // Initialize payment elements
    async function initializePaymentElements(clientSecret) {
        // Make sure elements is not already initialized
        if (elements) {
            elements.destroy();
        }
        
        // Create elements instance
        elements = stripe.elements({
            clientSecret: clientSecret,
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#4a90e2',
                    colorBackground: '#ffffff',
                    colorText: '#30313d',
                    colorDanger: '#df1b41',
                    fontFamily: 'Roboto, Open Sans, Segoe UI, sans-serif',
                    spacingUnit: '4px',
                    borderRadius: '4px'
                }
            }
        });
        
        // Create and mount the Payment Element
        paymentElement = elements.create('payment');
        paymentElement.mount('#payment-element');
        
        // Add event listener for form submission
        paymentForm.addEventListener('submit', handlePaymentSubmission);
    }
    
    // Handle payment submission
    async function handlePaymentSubmission(e) {
        e.preventDefault();
        
        // Show loading state
        setLoading(true);
        
        // Confirm payment
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + '/results/' + userId,
            },
            redirect: 'if_required'
        });
        
        if (error) {
            // Show error message
            const messageContainer = document.getElementById('payment-message');
            messageContainer.textContent = error.message;
            setLoading(false);
            return;
        }
        
        // Payment succeeded, get the PaymentIntent ID
        const paymentIntent = await stripe.retrievePaymentIntent(elements._commonOptions.clientSecret);
        
        if (paymentIntent.paymentIntent.status === 'succeeded') {
            // Confirm payment with our backend
            confirmPaymentWithBackend(paymentIntent.paymentIntent.id);
        } else {
            // Show error message
            const messageContainer = document.getElementById('payment-message');
            messageContainer.textContent = 'Payment failed. Please try again.';
            setLoading(false);
        }
    }
    
    // Confirm payment with backend
    async function confirmPaymentWithBackend(paymentIntentId) {
        try {
            const response = await fetch(`/api/payments/${userId}/confirm-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_intent_id: paymentIntentId,
                    tier: 'premium'
                })
            });
            
            const data = await response.json();
            
            if (data.payment_verified) {
                // Show success message
                const messageContainer = document.getElementById('payment-message');
                messageContainer.textContent = 'Payment successful! Generating your results...';
                
                // Hide payment modal after a short delay
                setTimeout(() => {
                    stripePaymentModal.style.display = 'none';
                    
                    // Show generating results message
                    const generatingMessage = document.createElement('div');
                    generatingMessage.className = 'generating-results-message';
                    generatingMessage.innerHTML = `
                        <div class="loading-spinner"></div>
                        <h3>Generating your comprehensive life plan...</h3>
                        <p>This may take a few moments. Please don't refresh the page.</p>
                    `;
                    document.body.prepend(generatingMessage);
                    
                    // Generate premium results
                    generatePremiumResults();
                }, 2000);
            } else {
                // Show error message
                const messageContainer = document.getElementById('payment-message');
                messageContainer.textContent = 'Payment verification failed. Please try again.';
                setLoading(false);
            }
        } catch (error) {
            console.error('Error confirming payment:', error);
            const messageContainer = document.getElementById('payment-message');
            messageContainer.textContent = 'Error confirming payment. Please try again.';
            setLoading(false);
        }
    }
    
    // Set loading state
    function setLoading(isLoading) {
        const submitButton = document.getElementById('submit-payment');
        const spinner = document.getElementById('spinner');
        const buttonText = document.getElementById('button-text');
        
        if (isLoading) {
            submitButton.disabled = true;
            spinner.classList.remove('hidden');
            buttonText.classList.add('hidden');
        } else {
            submitButton.disabled = false;
            spinner.classList.add('hidden');
            buttonText.classList.remove('hidden');
        }
    }
    
    // Generate premium results
    async function generatePremiumResults() {
        try {
            const response = await fetch(`/api/ai/${userId}/generate-premium`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate premium results');
            }
            
            // Refresh the page to show the premium content
            window.location.reload();
            
        } catch (error) {
            console.error('Error generating premium results:', error);
            
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
    
    // Initiate payment
    async function initiatePayment() {
        try {
            // Show payment modal
            paymentModal.style.display = 'flex';
            
            // Create checkout session for premium tier
            const response = await fetch(`/api/payments/${userId}/create-checkout-session/premium`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
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
            paymentModal.style.display = 'none';
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
                successModal.style.display = 'flex';
                
                // Remove session_id and tier from URL
                const url = new URL(window.location.href);
                url.searchParams.delete('session_id');
                url.searchParams.delete('tier');
                window.history.replaceState({}, '', url);
                
                // If premium tier, show full plan
                if (tier === 'premium') {
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
        
        // Replace lists
        formatted = formatted.replace(/- (.*?)(<br>|$)/g, '<li>$1</li>');
        
        // Wrap lists in <ul>
        if (formatted.includes('<li>')) {
            formatted = formatted.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
        }
        
        return formatted;
    }
    
    // Initialize
    init();
});
