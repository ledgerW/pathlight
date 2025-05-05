// Main results file that imports all modular components

// Set userId from the global variable passed from the template
document.addEventListener('DOMContentLoaded', function() {
    // Initialize collapsible sections
    if (typeof initializeCollapsibleSections === 'function') {
        initializeCollapsibleSections();
    }
    
    // Create a custom event for when results are loaded
    window.resultsLoadedEvent = new Event('resultsLoaded');
    
    // Add event listener for results loaded event
    document.addEventListener('resultsLoaded', function() {
        // Initialize checkboxes after results are loaded
        initializeCheckboxes();
    });
    
    // Update progress bar width based on data-progress attribute
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill && progressFill.dataset.progress) {
        const progress = parseInt(progressFill.dataset.progress);
        const progressPercentage = Math.min((progress / 25) * 100, 100);
        progressFill.style.width = progressPercentage + '%';
        
        // Also update the current marker position and image
        const currentMarker = document.querySelector('.progress-marker');
        if (currentMarker) {
            currentMarker.style.left = `calc(${progressPercentage}% - 20px)`;
            
            // Update the marker image based on the progress
            // The image names follow the pattern: 1TheSpark.png, 2TheRoot.png, etc.
            // We need to get the correct image for the current progress
            if (progress >= 1 && progress <= 25) {
                // Get the image name for the current progress
                // We need to map the progress (1-25) to the corresponding image index (0-24)
                const imageIndex = progress - 1;
                
                // Fetch the image names from a global array if available, or use a hardcoded approach
                if (window.imageNames && window.imageNames[imageIndex]) {
                    currentMarker.style.backgroundImage = `url('/static/images/${window.imageNames[imageIndex]}')`;
                } else {
                    // Hardcoded approach as fallback
                    const imageNames = [
                        '1TheSpark.png', '2TheRoot.png', '3TheFlame.png', '4TheVeil.png', '5TheMirror.png',
                        '6TheBeacon.png', '7TheGift.png', '8TheDelight.png', '9TheStream.png', '10TheLonging.png',
                        '11TheCompass.png', '12TheMeasure.png', '13TheThread.png', '14TheImprint.png', '15TheAshes.png',
                        '16TheHorizon.png', '17TheWhisper.png', '18TheGate.png', '19TheMuse.png', '20TheDivide.png',
                        '21TheAche.png', '22TheBridge.png', '23TheVessel.png', '24TheRole.png', '25TheSeed.png'
                    ];
                    
                    if (imageIndex < imageNames.length) {
                        currentMarker.style.backgroundImage = `url('/static/images/${imageNames[imageIndex]}')`;
                    }
                }
            }
        }
    }
    
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
    
    // Info icon functionality removed as requested
    
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

// Initialize checkbox functionality
function initializeCheckboxes() {
    // Load saved states for all sections
    document.querySelectorAll('.checkable-list').forEach(list => {
        const sectionId = list.dataset.section;
        if (sectionId) {
            loadCheckboxStates(sectionId);
        }
    });
    
    // Add event listeners to all checkboxes
    document.querySelectorAll('.item-checkbox').forEach(checkbox => {
        const listItem = checkbox.closest('.checkable-item');
        const list = checkbox.closest('.checkable-list');
        
        if (listItem && list) {
            const sectionId = list.dataset.section;
            const itemIndex = listItem.dataset.index;
            
            // Remove any existing event listeners
            const newCheckbox = checkbox.cloneNode(true);
            checkbox.parentNode.replaceChild(newCheckbox, checkbox);
            
            // Add new event listener
            newCheckbox.addEventListener('change', function() {
                saveCheckboxState(sectionId, itemIndex, this.checked);
            });
        }
    });
    
    // Initialize reset buttons
    initializeResetButtons();
    
    // Make resetCheckboxes function available globally
    window.resetCheckboxes = resetCheckboxes;
}

// Initialize reset buttons
function initializeResetButtons() {
    console.log('Initializing reset buttons');
    
    // Use direct onclick handler for all reset buttons
    document.querySelectorAll('.reset-checklist-button').forEach(button => {
        // Remove any existing event listeners by cloning
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Get the section ID from the data attribute
        const sectionId = newButton.dataset.section;
        console.log('Found reset button for section:', sectionId);
        
        if (sectionId) {
            // Add direct onclick handler
            newButton.onclick = function(event) {
                console.log('Reset button clicked for section:', sectionId);
                event.preventDefault();
                event.stopPropagation();
                
                try {
                    // Call the resetCheckboxes function
                    if (typeof window.resetCheckboxes === 'function') {
                        window.resetCheckboxes(sectionId);
                    } else {
                        console.error('resetCheckboxes function not found');
                    }
                } catch (error) {
                    console.error('Error resetting checkboxes:', error);
                }
                
                return false;
            };
        }
    });
}
