// Results payment functionality for Pathlight

// Get Stripe publishable key from server
async function getStripePublishableKey() {
    try {
        const response = await fetch('/api/payments/config');
        if (!response.ok) {
            throw new Error('Failed to get Stripe configuration');
        }
        const data = await response.json();
        return data.publishableKey;
    } catch (error) {
        console.error('Error getting Stripe publishable key:', error);
        showNotification('Error initializing payment system. Please try again.', 'error');
        return null;
    }
}

// Initialize Stripe
async function initializeStripe() {
    return new Promise(async (resolve, reject) => {
        try {
            // Get publishable key from server
            const publishableKey = await getStripePublishableKey();
            if (!publishableKey) {
                throw new Error('Failed to get Stripe publishable key');
            }
            
            // Check if Stripe is already loaded
            if (typeof Stripe === 'undefined') {
                // Load Stripe.js dynamically
                const script = document.createElement('script');
                script.src = 'https://js.stripe.com/v3/';
                script.async = true;
                script.onload = () => {
                    try {
                        stripe = Stripe(publishableKey);
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
                    stripe = Stripe(publishableKey);
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

// Note: Direct payment flow code has been removed as we've migrated to Stripe Checkout

// Initiate payment
async function initiatePayment() {
    try {
        // Show payment modal
        document.getElementById('paymentModal').style.display = 'flex';
        
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
        document.getElementById('paymentModal').style.display = 'none';
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
            document.getElementById('successModal').style.display = 'flex';
            
            // Remove session_id and tier from URL
            const url = new URL(window.location.href);
            url.searchParams.delete('session_id');
            url.searchParams.delete('tier');
            window.history.replaceState({}, '', url);
            
            // If premium, plan, or pursuit tier, show full plan
            if (tier === 'premium' || tier === 'plan' || tier === 'pursuit') {
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
