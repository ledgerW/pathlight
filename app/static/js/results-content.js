// Results content loading functionality for Pathlight

// Load summary content
async function loadSummary() {
    try {
        const response = await fetch(`/api/results/${userId}/summary`);
        
        if (!response.ok) {
            if (response.status === 403) {
                // Payment required
                document.getElementById('summaryContent').innerHTML = '<p class="error-message">Please complete your payment to view your summary.</p>';
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
        
        document.getElementById('summaryContent').innerHTML = formattedContent;
        
    } catch (error) {
        console.error('Error loading summary:', error);
        document.getElementById('summaryContent').innerHTML = '<p class="error-message">Error loading your summary. Please try again later.</p>';
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
        
        // If user doesn't have premium tier, don't show loading spinner
        if (statusData.payment_tier !== 'premium') {
            // Hide loading spinner
            const loadingPlaceholder = document.querySelector('#fullContent .loading-placeholder');
            if (loadingPlaceholder) {
                loadingPlaceholder.style.display = 'none';
            }
            return false;
        }
        
        // User has premium tier, proceed to load full plan
        const response = await fetch(`/api/results/${userId}/full`);
        
        if (!response.ok) {
            if (response.status === 403) {
                // Payment required
                return false;
            }
            throw new Error('Failed to load full plan');
        }
        
        const data = await response.json();
        
        // Hide the loading placeholder
        const loadingPlaceholder = document.querySelector('#fullContent .loading-placeholder');
        if (loadingPlaceholder) {
            loadingPlaceholder.style.display = 'none';
        }
        
        // Display structured plan sections
        displayStructuredPlan(data.full_plan);
        
        // Hide payment section for premium users
        const paymentSection = document.getElementById('paymentSection');
        if (paymentSection) {
            paymentSection.style.display = 'none';
        }
        
        // Dispatch the resultsLoaded event
        if (window.resultsLoadedEvent) {
            document.dispatchEvent(window.resultsLoadedEvent);
        }
        
        return true;
        
    } catch (error) {
        console.error('Error loading full plan:', error);
        document.getElementById('fullContent').innerHTML = '<p class="error-message">Error loading your plan. Please try again later.</p>';
        return false;
    }
}

// Initialize collapsible sections after all sections are loaded
function initializeCollapsibleSectionsAfterLoad() {
    if (typeof initializeCollapsibleSections === 'function') {
        initializeCollapsibleSections();
    }
}

// Export functions for use in other modules
window.loadSummary = loadSummary;
window.loadFullPlan = loadFullPlan;
window.initializeCollapsibleSectionsAfterLoad = initializeCollapsibleSectionsAfterLoad;
