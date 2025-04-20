// Main results file that imports all modular components

// Set userId from the global variable passed from the template
document.addEventListener('DOMContentLoaded', function() {
    // Check URL parameters for payment verification
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    const tier = urlParams.get('tier');
    const generationError = urlParams.get('generation_error');
    const section = urlParams.get('section');
    
    // If payment was successful, update the UI to show the appropriate content
    if (paymentSuccess === 'true' && tier && userId) {
        console.log(`Payment successful for tier: ${tier}`);
        
        // Update the tier badge in the header
        const tierBadge = document.getElementById('tierBadge');
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
    
    // Initialize tab functionality
    initializeTabs();
    
    // Initialize update plan button
    initializeUpdatePlanButton();
    
    // If section parameter is set to 'plan', show the plan tab
    if (section === 'plan') {
        showTab('plan');
    }
    
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

// Initialize update plan button
function initializeUpdatePlanButton() {
    const updatePlanButton = document.getElementById('updatePlanButton');
    if (updatePlanButton) {
        updatePlanButton.addEventListener('click', function() {
            showRegenerationModal();
        });
    }
}

// Initialize tab functionality
function initializeTabs() {
    const purposeTab = document.getElementById('purposeTab');
    const planTab = document.getElementById('planTab');
    
    if (purposeTab && planTab) {
        // Add click handlers for tabs
        purposeTab.addEventListener('click', function() {
            showTab('purpose');
        });
        
        planTab.addEventListener('click', function() {
            showTab('plan');
        });
    }
}

// Show the specified tab
function showTab(tabName) {
    // Get tab buttons
    const purposeTab = document.getElementById('purposeTab');
    const planTab = document.getElementById('planTab');
    
    // Get tab sections
    const purposeSection = document.getElementById('purposeSection');
    const planSection = document.getElementById('planSection');
    
    // Remove active class from all tabs and sections
    purposeTab.classList.remove('active');
    planTab.classList.remove('active');
    purposeSection.classList.remove('active');
    planSection.classList.remove('active');
    
    // Add active class to selected tab and section
    if (tabName === 'purpose') {
        purposeTab.classList.add('active');
        purposeSection.classList.add('active');
    } else if (tabName === 'plan') {
        planTab.classList.add('active');
        planSection.classList.add('active');
        
        // Load full plan content if not already loaded
        loadFullPlan();
    }
}
