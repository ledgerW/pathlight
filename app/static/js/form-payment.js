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
async function initiatePayment(tier, isRegeneration = false, isSubscription = false) {
    try {
        console.log(`Initiating payment for tier: ${tier}, isRegeneration: ${isRegeneration}, isSubscription: ${isSubscription}`);
        
        // Store current tier
        currentTier = tier;
        
        // Hide payment modals
        document.getElementById('basicPaymentModal').style.display = 'none';
        if (document.getElementById('premiumPaymentModal')) {
            document.getElementById('premiumPaymentModal').style.display = 'none';
        }
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingMessage = document.getElementById('loadingMessage');
        loadingOverlay.style.display = 'flex';
        
        // For Purpose tier (free), show different loading message
        if (tier === 'purpose') {
            loadingMessage.textContent = 'Preparing your free Purpose results...';
        } else {
            loadingMessage.textContent = 'Preparing payment...';
        }
        
        // Check if a magic link has been sent
        const magicLinkSent = localStorage.getItem('magic_link_sent') === 'true';
        
        // For Pursuit tier, always set isSubscription to true
        if (tier === 'pursuit') {
            isSubscription = true;
            console.log('Pursuit tier detected, setting isSubscription to true');
        }
        
        // Call payment API to create checkout session
        // Add is_regeneration and is_magic_link_sent parameters if needed
        let url = `/api/payments/${user.id}/create-checkout-session/${tier}`;
        
        // Add query parameters
        const params = new URLSearchParams();
        if (isRegeneration) {
            params.append('is_regeneration', 'true');
        }
        if (magicLinkSent) {
            params.append('is_magic_link_sent', 'true');
        }
        if (isSubscription) {
            params.append('is_subscription', 'true');
        }
        
        // Append parameters to URL if any exist
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
            
        // Get authentication token
        const authToken = localStorage.getItem('stytch_session_token');
        console.log('Using auth token for payment initiation:', authToken ? `${authToken.substring(0, 10)}...` : 'none');
        console.log('Magic link sent:', magicLinkSent);
        console.log('Payment URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to create checkout session');
        }
        
        const data = await response.json();
        console.log('Checkout session created:', data);
        
        // For Purpose tier (free), we might be redirected directly to results
        // For Pursuit tier, we'll be redirected to Stripe Checkout
        
        // Hide loading overlay
        loadingOverlay.style.display = 'none';
        
        // Redirect to the provided URL
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
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingOverlay && loadingMessage) {
            loadingOverlay.style.display = 'flex';
            loadingMessage.textContent = 'Verifying payment...';
        }
        
        // Get authentication token
        const authToken = localStorage.getItem('stytch_session_token');
        console.log('Using auth token for payment verification:', authToken ? `${authToken.substring(0, 10)}...` : 'none');
        
        const response = await fetch(`/api/payments/${user.id}/verify-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken ? `Bearer ${authToken}` : ''
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
            // Check if a magic link was sent during account creation
            const magicLinkSent = localStorage.getItem('magic_link_sent') === 'true';
            
            // Hide loading overlay
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            if (magicLinkSent) {
                // Clear the magic link flag
                localStorage.removeItem('magic_link_sent');
                
                // Redirect to the payment success page with instructions to check email
                window.location.href = `/payment-success?user_id=${user.id}&tier=${tier}&email=${encodeURIComponent(user.email)}`;
                return; // Exit early to prevent further processing
            }
            
            // For users who are already logged in (not using magic link flow)
            // Show regular success message
            showNotification(`Payment successful! Your ${tier} tier is now active.`, 'success');
            
            // Update user object
            user.payment_tier = tier;
            
            // If this is a free tier, update the UI to reflect that
            if (tier === 'purpose') {
                showNotification(`Your free Purpose tier is now active.`, 'success');
            }
            // If this is a subscription, update the UI to reflect that
            else if (data.is_subscription) {
                showNotification(`Subscription successful! Your ${tier} tier is now active.`, 'success');
            }
            
            // Update tier badge
            updateTierBadge();
            
            // Generate results based on tier
            if (loadingMessage) {
                if (tier === 'plan' || tier === 'pursuit') {
                    loadingOverlay.style.display = 'flex'; // Show loading overlay again
                    loadingMessage.textContent = 'Generating your comprehensive life plan...';
                    await generatePremiumResults();
                } else {
                    loadingOverlay.style.display = 'flex'; // Show loading overlay again
                    loadingMessage.textContent = 'Generating your personal insight...';
                    await generateBasicResults();
                }
            } else {
                // If pursuit tier, show all questions
                if (tier === 'pursuit') {
                    // Redirect to form with all questions
                    window.location.href = `/form/${user.id}`;
                } else {
                    // Redirect to results page
                    window.location.href = `/results/${user.id}`;
                }
            }
        } else {
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            showNotification('Payment verification failed. Please try again.', 'error');
        }
        
    } catch (error) {
        console.error('Error verifying payment:', error);
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        showNotification('Error verifying payment. Please try again.', 'error');
    }
}

// Add event listeners for payment buttons when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Pursuit (subscription) payment button
    const pursuitButton = document.getElementById('proceedToPursuitPayment');
    if (pursuitButton) {
        pursuitButton.addEventListener('click', function() {
            initiatePayment('pursuit', false, true);
        });
    }
    
    // Update the basic payment button to use 'purpose' tier (now free)
    const basicButton = document.getElementById('proceedToBasicPayment');
    if (basicButton) {
        basicButton.addEventListener('click', function() {
            initiatePayment('purpose');
        });
    }
    
    // Continue to Purpose button (free)
    const continueToFreeButton = document.getElementById('continueToFree');
    if (continueToFreeButton) {
        continueToFreeButton.addEventListener('click', function() {
            initiatePayment('purpose');
        });
    }
});
