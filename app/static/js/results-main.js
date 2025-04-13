// Main results file that imports all modular components

// Set userId from the global variable passed from the template
document.addEventListener('DOMContentLoaded', function() {
    // Check URL parameters for payment verification
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    const tier = urlParams.get('tier');
    const generationError = urlParams.get('generation_error');
    
    // If payment was successful, update the UI to show the appropriate content
    if (paymentSuccess === 'true' && tier && userId) {
        console.log(`Payment successful for tier: ${tier}`);
        
        // Update the tier badge
        const tierBadge = document.querySelector('.tier-badge');
        if (tierBadge) {
            tierBadge.className = `tier-badge ${tier}`;
            tierBadge.textContent = `${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier`;
        }
        
        // If premium tier, show the full plan
        if (tier === 'premium') {
            showFullPlan();
        }
        
        // Show appropriate message based on generation status
        if (generationError === 'true') {
            showNotification('Payment successful! Your results are still being generated. Please check back in a few minutes.', 'info');
        } else {
            showNotification('Payment successful! Your plan has been updated.', 'success');
        }
    }
    
    // Initialize the info icon functionality
    initializeInfoIcon();
    
    // Clean URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('payment_success');
    url.searchParams.delete('tier');
    url.searchParams.delete('generation_error');
    window.history.replaceState({}, '', url);
});

// Initialize the info icon functionality
function initializeInfoIcon() {
    const infoIcon = document.getElementById('infoIcon');
    if (infoIcon) {
        // Add click handler for mobile devices
        infoIcon.addEventListener('click', function(e) {
            const tooltip = this.querySelector('.info-tooltip');
            if (tooltip) {
                // Toggle tooltip visibility
                if (tooltip.style.display === 'block') {
                    tooltip.style.display = 'none';
                } else {
                    tooltip.style.display = 'block';
                }
                e.stopPropagation();
            }
        });
        
        // Add document click handler to close tooltip when clicking elsewhere
        document.addEventListener('click', function() {
            const tooltip = infoIcon.querySelector('.info-tooltip');
            if (tooltip && tooltip.style.display === 'block') {
                tooltip.style.display = 'none';
            }
        });
    }
}
