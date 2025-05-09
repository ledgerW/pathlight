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
        
        // Hide payment section for plan and pursuit tier users regardless of plan data
        if (statusData.payment_tier === 'plan' || statusData.payment_tier === 'pursuit') {
            const paymentSection = document.getElementById('paymentSection');
            if (paymentSection) {
                paymentSection.style.display = 'none';
            }
        }
        
        // If user doesn't have plan or pursuit tier, don't show loading spinner
        if (statusData.payment_tier !== 'plan' && statusData.payment_tier !== 'pursuit') {
            // Hide loading spinner
            const loadingPlaceholder = document.querySelector('#fullContent .loading-placeholder');
            if (loadingPlaceholder) {
                loadingPlaceholder.style.display = 'none';
            }
            return false;
        }
        
        // Check if the user has completed all 25 questions
        // We can do this by checking the progress_state from the user's data
        // First, get the user's progress
        const userProgressResponse = await fetch(`/api/users/${userId}/progress`);
        if (userProgressResponse.ok) {
            const progressData = await userProgressResponse.json();
            const progress = parseInt(progressData.progress_state || "0");
            
            // If the user hasn't completed all 25 questions, show a message and don't try to load plan
            if (progress < 25) {
                // Hide the loading placeholder
                const loadingPlaceholder = document.querySelector('#fullContent .loading-placeholder');
                if (loadingPlaceholder) {
                    loadingPlaceholder.style.display = 'none';
                }
                
                // Show a message that plan results are not yet available
                const fullContent = document.getElementById('fullContent');
                if (fullContent) {
                    fullContent.innerHTML = '<p class="info-message">Your plan results will be available after you complete all 25 questions.</p>';
                }
                
                return false;
            }
        }
        
        // User has premium tier and has completed all questions, proceed to load full plan
        const response = await fetch(`/api/results/${userId}/full`);
        
        if (!response.ok) {
            // Hide the loading placeholder
            const loadingPlaceholder = document.querySelector('#fullContent .loading-placeholder');
            if (loadingPlaceholder) {
                loadingPlaceholder.style.display = 'none';
            }
            
            // Show appropriate message based on error type
            const fullContent = document.getElementById('fullContent');
            if (fullContent) {
                if (response.status === 403) {
                    // This can happen if the backend doesn't recognize the user's tier
                    // or if there's a mismatch between frontend and backend state
                    fullContent.innerHTML = '<p class="info-message">Your plan results are being prepared. Please check back in a few minutes or contact support if this persists.</p>';
                } else {
                    // Other errors
                    fullContent.innerHTML = '<p class="info-message">Your plan results will be available after you complete all 25 questions.</p>';
                }
            }
            
            if (response.status !== 403) {
                throw new Error('Failed to load full plan');
            }
            return false;
        }
        
        const data = await response.json();
        
        // Hide the loading placeholder
        const loadingPlaceholder = document.querySelector('#fullContent .loading-placeholder');
        if (loadingPlaceholder) {
            loadingPlaceholder.style.display = 'none';
        }
        
        // Display structured plan sections
        displayStructuredPlan(data.full_plan);
        
        // Dispatch the resultsLoaded event
        if (window.resultsLoadedEvent) {
            document.dispatchEvent(window.resultsLoadedEvent);
        }
        
        return true;
        
    } catch (error) {
        console.error('Error loading full plan:', error);
        // Error message is already displayed for 403 errors
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
