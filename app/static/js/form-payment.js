// Form payment functionality for Pathlight

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

// Initiate payment process
async function initiatePayment(tier, isRegeneration = false) {
    try {
        // Store current tier
        currentTier = tier;
        
        // Hide payment modals
        document.getElementById('basicPaymentModal').style.display = 'none';
        document.getElementById('premiumPaymentModal').style.display = 'none';
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingMessage = document.getElementById('loadingMessage');
        loadingOverlay.style.display = 'flex';
        loadingMessage.textContent = 'Preparing payment...';
        
        // Call payment API to create checkout session
        // Add is_regeneration parameter if needed
        const url = isRegeneration 
            ? `/api/payments/${user.id}/create-checkout-session/${tier}?is_regeneration=true`
            : `/api/payments/${user.id}/create-checkout-session/${tier}`;
            
        const response = await fetch(url, {
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
        
        // Hide loading overlay
        loadingOverlay.style.display = 'none';
        
        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
        
    } catch (error) {
        console.error('Error creating checkout session:', error);
        document.getElementById('loadingOverlay').style.display = 'none';
        showNotification('Error processing payment. Please try again.', 'error');
    }
}

// Verify payment
async function verifyPayment(sessionId, tier) {
    try {
        const response = await fetch(`/api/payments/${user.id}/verify-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: sessionId,
                tier: tier
            }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to verify payment');
        }
        
        const data = await response.json();
        
        if (data.payment_verified) {
            // Show success message
            showNotification(`Payment successful! Your ${tier} tier is now active.`, 'success');
            
            // Update user object
            user.payment_tier = tier;
            
            // Update tier badge
            updateTierBadge();
            
            // If premium tier, show all questions
            if (tier === 'premium') {
                // Redirect to form with all questions
                window.location.href = `/form/${user.id}`;
            } else {
                // Redirect to results page
                window.location.href = `/results/${user.id}`;
            }
        } else {
            showNotification('Payment verification failed. Please try again.', 'error');
        }
        
    } catch (error) {
        console.error('Error verifying payment:', error);
        showNotification('Error verifying payment. Please try again.', 'error');
    }
}
