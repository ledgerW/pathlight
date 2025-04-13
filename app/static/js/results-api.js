// Results API functionality for Pathlight

// Generate results based on tier
async function generateResults(tier) {
    try {
        // Call the appropriate AI generation endpoint based on the tier
        const aiEndpoint = tier === 'premium' ? 
            `/api/ai/${userId}/generate-premium` : 
            `/api/ai/${userId}/generate-basic`;
        
        // Make the API call
        const response = await fetch(aiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        // Remove the generating results message
        const messageElement = document.querySelector('.generating-results-message');
        if (messageElement) {
            messageElement.innerHTML = `
                <h3>Your results are ready!</h3>
                <p>Refreshing the page...</p>
            `;
            
            // Refresh the page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
        
        if (!response.ok) {
            throw new Error('Failed to generate results');
        }
        
    } catch (error) {
        console.error('Error generating results:', error);
        
        // Update the message
        const messageElement = document.querySelector('.generating-results-message');
        if (messageElement) {
            messageElement.innerHTML = `
                <h3>There was an issue generating your results</h3>
                <p>Please refresh the page to try again.</p>
                <button onclick="window.location.reload()" class="refresh-button">Refresh Page</button>
            `;
        }
    }
}

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
        
        // Update the top progress bar if we have progress data
        updateProgressBar(data);
        
    } catch (error) {
        console.error('Error loading summary:', error);
        document.getElementById('summaryContent').innerHTML = '<p class="error-message">Error loading your summary. Please try again later.</p>';
    }
}

// Update the progress bar with user progress
function updateProgressBar(data) {
    // This would ideally use actual progress data from the API
    // For now, we're just showing a static "5/25 questions completed"
    const progressSection = document.getElementById('topProgressSection');
    if (progressSection) {
        // If we're in premium tier, hide the progress section
        if (data.payment_tier === 'premium') {
            progressSection.style.display = 'none';
        } else {
            progressSection.style.display = 'flex';
        }
    }
}

// Update the continue journey section with user progress
function updateContinueJourneySection(data) {
    // This would ideally use actual progress data from the API
    // For now, we're just showing a static "5/25 questions completed"
    const continueSection = document.getElementById('continueJourneySection');
    if (continueSection) {
        // If we're in premium tier, hide the continue section
        if (data.payment_tier === 'premium') {
            continueSection.style.display = 'none';
        } else {
            continueSection.style.display = 'block';
        }
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
        document.getElementById('fullContent').innerHTML = formatContent(data.full_plan);
        
        return true;
        
    } catch (error) {
        console.error('Error loading full plan:', error);
        document.getElementById('fullContent').innerHTML = '<p class="error-message">Error loading your full plan. Please try again later.</p>';
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

// Generate premium results
async function generatePremiumResults() {
    try {
        const response = await fetch(`/api/ai/${userId}/generate-premium`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate premium results');
        }
        
        // Refresh the page to show the premium content
        window.location.reload();
        
    } catch (error) {
        console.error('Error generating premium results:', error);
        
        // Update the message
        const messageElement = document.querySelector('.generating-results-message');
        if (messageElement) {
            messageElement.innerHTML = `
                <h3>There was an issue generating your results</h3>
                <p>Please refresh the page to try again.</p>
                <button onclick="window.location.reload()" class="refresh-button">Refresh Page</button>
            `;
        }
    }
}
