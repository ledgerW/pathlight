// Results UI functionality for Pathlight

// Initialize collapsible sections
function initializeCollapsibleSections() {
    // Get all section headers
    const sectionHeaders = document.querySelectorAll('.section-header');
    
    // Add click event to each header
    sectionHeaders.forEach(header => {
        // Remove any existing event listeners
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
        
        // Add new event listener
        newHeader.addEventListener('click', function() {
            // Get the section this header belongs to
            const section = this.closest('.plan-section');
            const sectionName = this.getAttribute('data-section');
            
            // Toggle active class
            if (section.classList.contains('active')) {
                section.classList.remove('active');
            } else {
                // Close all sections first
                document.querySelectorAll('.plan-section').forEach(s => {
                    s.classList.remove('active');
                });
                
                // Open this section
                section.classList.add('active');
            }
        });
    });
    
    // Open the first section by default (Next Steps)
    const firstSection = document.getElementById('nextStepsSection');
    if (firstSection && firstSection.style.display !== 'none') {
        firstSection.classList.add('active');
    }
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

// Show full plan
async function showFullPlan() {
    // Hide payment section
    const paymentSection = document.getElementById('paymentSection');
    const fullContent = document.getElementById('fullContent');
    const nextStepsSection = document.getElementById('nextStepsSection');
    const dailyPlanSection = document.getElementById('dailyPlanSection');
    const obstaclesSection = document.getElementById('obstaclesSection');
    const updatePlanSection = document.getElementById('updatePlanSection');
    const lockedIcon = document.getElementById('lockedIcon');
    
    // Hide payment section
    paymentSection.style.display = 'none';
    
    // Show update plan section for premium users
    if (updatePlanSection) {
        updatePlanSection.style.display = 'block';
    }
    
    // Update lock icon
    lockedIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path fill="none" d="M0 0h24v24H0z"/>
            <path d="M6 8V7a6 6 0 1 1 12 0v1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h2zm13 2H5v10h14V10zm-8 5.732a2 2 0 1 1 2 0V18h-2v-2.268zM8 8h8V7a4 4 0 1 0-8 0v1z"/>
        </svg>
    `;
    
    // Show loading spinner
    fullContent.style.display = 'block';
    
    // Hide plan sections until they're loaded
    nextStepsSection.style.display = 'none';
    dailyPlanSection.style.display = 'none';
    obstaclesSection.style.display = 'none';
    
    // Load full plan content if not already loaded
    const loaded = await loadFullPlan();
    
    if (!loaded) {
        // If loading failed due to payment required, show payment section
        paymentSection.style.display = 'block';
        fullContent.style.display = 'none';
        nextStepsSection.style.display = 'none';
        dailyPlanSection.style.display = 'none';
        obstaclesSection.style.display = 'none';
        
        // Hide update plan section
        if (updatePlanSection) {
            updatePlanSection.style.display = 'none';
        }
    } else {
        // Initialize collapsible sections
        initializeCollapsibleSections();
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
        // Create a temporary div to manipulate the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = formatted;
        
        // Convert text to HTML nodes
        const textNodes = tempDiv.childNodes;
        const bulletPattern = /(^|\<br\>)[\s]*[-•][\s]+(.*?)($|\<br\>)/g;
        
        // Replace bullet points with proper list items
        formatted = formatted.replace(bulletPattern, function(match, p1, p2, p3) {
            return `<li class="icon-bullet-item"><span class="bullet-icon">•</span> ${p2}</li>`;
        });
        
        // Wrap lists in <ul>
        if (formatted.includes('<li')) {
            formatted = formatted.replace(/(<li.*?<\/li>)+/g, '<ul class="icon-bullet-list">$&</ul>');
        }
    }
    
    return formatted;
}

// Set loading state for payment form
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

// Show regeneration modal
async function showRegenerationModal() {
    const regenerationModal = document.getElementById('regenerationModal');
    if (regenerationModal) {
        // Check if user is a subscription user
        try {
            const response = await fetch(`/api/payments/${userId}/payment-status`);
            if (!response.ok) {
                throw new Error('Failed to check payment status');
            }
            
            const statusData = await response.json();
            const isSubscriptionUser = statusData.payment_tier === 'pursuit';
            
            // Check if user has a subscription
            let hasActiveSubscription = false;
            if (isSubscriptionUser) {
                const subscriptionResponse = await fetch(`/api/payments/${userId}/subscription-status`);
                if (subscriptionResponse.ok) {
                    const subscriptionData = await subscriptionResponse.json();
                    hasActiveSubscription = subscriptionData.has_subscription && 
                                           subscriptionData.subscription_status === 'active';
                }
            }
            
            // Update the modal content based on subscription status
            if (hasActiveSubscription) {
                // Create subscription content if it doesn't exist
                let subscriptionContent = document.getElementById('subscriptionRegenerationContent');
                if (!subscriptionContent) {
                    // Create subscription content
                    subscriptionContent = document.createElement('div');
                    subscriptionContent.id = 'subscriptionRegenerationContent';
                    subscriptionContent.innerHTML = `
                        <p>As a Pursuit subscriber, you have unlimited plan regenerations!</p>
                        <p>Regenerating your plan will provide fresh insights and guidance based on your responses.</p>
                        <div class="regeneration-actions">
                            <button id="confirmSubscriptionRegenerationButton" class="cta-button">Update My Plan (Free)</button>
                        </div>
                    `;
                    
                    // Replace the existing content
                    const existingContent = regenerationModal.querySelector('.modal-content');
                    existingContent.innerHTML = `
                        <span class="close-modal">&times;</span>
                        <h2>Update Your Life Plan</h2>
                    `;
                    existingContent.appendChild(subscriptionContent);
                } else {
                    subscriptionContent.style.display = 'block';
                    const oneTimeContent = document.getElementById('oneTimeRegenerationContent');
                    if (oneTimeContent) {
                        oneTimeContent.style.display = 'none';
                    }
                }
                
                // Add event listener for subscription regeneration button
                const confirmSubscriptionButton = document.getElementById('confirmSubscriptionRegenerationButton');
                if (confirmSubscriptionButton) {
                    // Remove any existing event listeners
                    const newButton = confirmSubscriptionButton.cloneNode(true);
                    confirmSubscriptionButton.parentNode.replaceChild(newButton, confirmSubscriptionButton);
                    
                    // Add new event listener
                    newButton.addEventListener('click', initiateSubscriptionRegeneration);
                }
            } else {
                // Show one-time regeneration content
                let oneTimeContent = document.getElementById('oneTimeRegenerationContent');
                if (!oneTimeContent) {
                    // Create one-time content
                    oneTimeContent = document.createElement('div');
                    oneTimeContent.id = 'oneTimeRegenerationContent';
                    oneTimeContent.innerHTML = `
                        <p>Regenerating your plan will provide fresh insights and guidance based on your responses.</p>
                        <div class="regeneration-details">
                            <div class="regeneration-info">
                                <p><strong>Cost:</strong> $4.99</p>
                                <p><strong>What you'll get:</strong> A completely new life plan with updated insights, next steps, daily plan, and strategies.</p>
                            </div>
                        </div>
                        <div class="regeneration-actions">
                            <button id="confirmRegenerationButton" class="cta-button">Update My Plan ($4.99)</button>
                        </div>
                    `;
                    
                    // Replace the existing content
                    const existingContent = regenerationModal.querySelector('.modal-content');
                    existingContent.innerHTML = `
                        <span class="close-modal">&times;</span>
                        <h2>Update Your Life Plan</h2>
                    `;
                    existingContent.appendChild(oneTimeContent);
                } else {
                    oneTimeContent.style.display = 'block';
                    const subscriptionContent = document.getElementById('subscriptionRegenerationContent');
                    if (subscriptionContent) {
                        subscriptionContent.style.display = 'none';
                    }
                }
                
                // Add event listener for one-time regeneration button
                const confirmButton = document.getElementById('confirmRegenerationButton');
                if (confirmButton) {
                    // Remove any existing event listeners
                    const newButton = confirmButton.cloneNode(true);
                    confirmButton.parentNode.replaceChild(newButton, confirmButton);
                    
                    // Add new event listener
                    newButton.addEventListener('click', initiateRegenerationPayment);
                }
            }
        } catch (error) {
            console.error('Error checking subscription status:', error);
            // Default to showing one-time content if there's an error
            const existingContent = regenerationModal.querySelector('.modal-content');
            existingContent.innerHTML = `
                <span class="close-modal">&times;</span>
                <h2>Update Your Life Plan</h2>
                <p>Regenerating your plan will provide fresh insights and guidance based on your responses.</p>
                <div class="regeneration-details">
                    <div class="regeneration-info">
                        <p><strong>Cost:</strong> $4.99</p>
                        <p><strong>What you'll get:</strong> A completely new life plan with updated insights, next steps, daily plan, and strategies.</p>
                    </div>
                </div>
                <div class="regeneration-actions">
                    <button id="confirmRegenerationButton" class="cta-button">Update My Plan ($4.99)</button>
                </div>
            `;
            
            // Add event listener for regeneration button
            const confirmButton = document.getElementById('confirmRegenerationButton');
            if (confirmButton) {
                confirmButton.addEventListener('click', initiateRegenerationPayment);
            }
        }
        
        regenerationModal.style.display = 'flex';
        
        // Add event listeners for close buttons
        const closeButtons = regenerationModal.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                regenerationModal.style.display = 'none';
                // Also hide payment modal if it's visible
                const paymentModal = document.getElementById('paymentModal');
                if (paymentModal) {
                    paymentModal.style.display = 'none';
                }
            });
        });
        
        // Add event listener for one-time regeneration button
        const confirmButton = document.getElementById('confirmRegenerationButton');
        if (confirmButton) {
            confirmButton.addEventListener('click', initiateRegenerationPayment);
        }
        
        // Add event listener for subscription regeneration button
        const confirmSubscriptionButton = document.getElementById('confirmSubscriptionRegenerationButton');
        if (confirmSubscriptionButton) {
            confirmSubscriptionButton.addEventListener('click', initiateSubscriptionRegeneration);
        }
    }
}

// Initiate free regeneration for subscription users
async function initiateSubscriptionRegeneration() {
    try {
        // Show loading overlay
        const loadingMessage = showGeneratingResultsMessage();
        
        // Hide regeneration modal
        document.getElementById('regenerationModal').style.display = 'none';
        
        // Call the regenerate endpoint directly (no payment needed for subscribers)
        const response = await fetch(`/api/ai/${userId}/regenerate-premium`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to regenerate plan');
        }
        
        // Reload the page to show the new plan
        window.location.reload();
        
    } catch (error) {
        console.error('Error regenerating plan:', error);
        // Remove loading message
        const loadingMessage = document.querySelector('.generating-results-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
        showNotification('Error regenerating plan. Please try again.', 'error');
    }
}

// Initiate regeneration payment for one-time users
async function initiateRegenerationPayment() {
    try {
        // Show payment modal
        document.getElementById('paymentModal').style.display = 'flex';
        document.getElementById('regenerationModal').style.display = 'none';
        
        // Create checkout session for premium tier with regeneration flag
        const response = await fetch(`/api/payments/${userId}/create-checkout-session/premium?is_regeneration=true`, {
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
        console.error('Error initiating regeneration payment:', error);
        document.getElementById('paymentModal').style.display = 'none';
        showNotification('Error processing payment. Please try again.', 'error');
    }
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
