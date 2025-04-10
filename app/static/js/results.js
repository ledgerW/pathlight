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
        
        // Check URL parameters for payment success
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const tier = urlParams.get('tier');
        
        if (sessionId && tier) {
            verifyPayment(sessionId, tier);
        }
        
        // Check if upgrade button should be shown
        if (typeof showUpgrade !== 'undefined' && showUpgrade) {
            // Show upgrade section
            paymentSection.style.display = 'block';
            fullContent.style.display = 'none';
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
            
            // Redirect to checkout
            window.location.href = data.checkout_url;
            
        } catch (error) {
            console.error('Error initiating payment:', error);
            paymentModal.style.display = 'none';
            showNotification('Error initiating payment. Please try again.', 'error');
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
