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
        
        return true;
        
    } catch (error) {
        console.error('Error loading full plan:', error);
        document.getElementById('fullContent').innerHTML = '<p class="error-message">Error loading your plan. Please try again later.</p>';
        return false;
    }
}

// Display structured plan with separate sections
function displayStructuredPlan(fullPlanData) {
    // Check if we have structured data
    if (!fullPlanData || typeof fullPlanData !== 'object') {
        console.error('Invalid full plan data format');
        return;
    }
    
    // Get the plan sections
    const nextStepsSection = document.getElementById('nextStepsSection');
    const dailyPlanSection = document.getElementById('dailyPlanSection');
    const obstaclesSection = document.getElementById('obstaclesSection');
    
    // Process Next Steps section
    if (fullPlanData.next_steps) {
        nextStepsSection.style.display = 'block';
        
        // Check if next_steps is an object (new format) or a string (old format)
        if (typeof fullPlanData.next_steps === 'object' && fullPlanData.next_steps !== null) {
            // New structured format with Today, Next 7, 30, 180 days
            const nextSteps = fullPlanData.next_steps;
            
            // Check if we already have a Today section
            const existingTodaySection = document.getElementById('todaySteps');
            
            // Only create a new Today section if it doesn't already exist
            if (!existingTodaySection) {
                // Create a new timeline item for Today
                const timelineContainer = document.querySelector('.timeline-container');
                const todayItem = document.createElement('div');
                todayItem.className = 'timeline-item';
                todayItem.innerHTML = `
                    <div class="timeline-header">
                        <div class="timeline-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                                <path fill="none" d="M0 0h24v24H0z"/>
                                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm1-8h4v2h-6V7h2v5z" fill="currentColor"/>
                            </svg>
                        </div>
                        <h3>Today</h3>
                    </div>
                    <div class="timeline-content" id="todaySteps"></div>
                `;
                
                // Insert the Today item at the beginning of the timeline container
                timelineContainer.insertBefore(todayItem, timelineContainer.firstChild);
            }
            
            // Display the bullet points for each timeframe with appropriate identifiers
            displayBulletPoints('todaySteps', nextSteps.today, 'today');
            displayBulletPoints('next7Days', nextSteps.next_7_days, 'next7');
            displayBulletPoints('next30Days', nextSteps.next_30_days, 'next30');
            displayBulletPoints('next180Days', nextSteps.next_180_days, 'next180');
        } else {
            // Old string format - use the existing parsing logic
            const nextStepsContent = fullPlanData.next_steps;
            
            // Simple parsing strategy: look for sections with "7 days", "30 days", "180 days"
            const days7Content = extractTimeframeContent(nextStepsContent, [
                "7 days", "seven days", "week", "short term", "immediate"
            ]);
            const days30Content = extractTimeframeContent(nextStepsContent, [
                "30 days", "thirty days", "month", "medium term"
            ]);
            const days180Content = extractTimeframeContent(nextStepsContent, [
                "180 days", "six months", "long term"
            ]);
            
            // If we couldn't extract specific timeframes, just show the whole content
            if (!days7Content && !days30Content && !days180Content) {
                document.getElementById('next7Days').innerHTML = formatContent(nextStepsContent);
                document.getElementById('next30Days').innerHTML = '';
                document.getElementById('next180Days').innerHTML = '';
            } else {
                // Display the extracted content for each timeframe
                document.getElementById('next7Days').innerHTML = days7Content ? formatContent(days7Content) : '<p>No specific steps identified for this timeframe.</p>';
                document.getElementById('next30Days').innerHTML = days30Content ? formatContent(days30Content) : '<p>No specific steps identified for this timeframe.</p>';
                document.getElementById('next180Days').innerHTML = days180Content ? formatContent(days180Content) : '<p>No specific steps identified for this timeframe.</p>';
            }
        }
    }
    
    // Process Daily Plan section
    if (fullPlanData.daily_plan) {
        dailyPlanSection.style.display = 'block';
        
        // Create a container for the daily plan cards
        const dailyPlanContainer = document.getElementById('dailyPlanContainer');
        dailyPlanContainer.innerHTML = '';
        
        // Check if daily_plan is an object (new format) or a string (old format)
        if (typeof fullPlanData.daily_plan === 'object' && fullPlanData.daily_plan !== null) {
            // New structured format
            const dailyPlan = fullPlanData.daily_plan;
            
            // Create weekday section
            if (dailyPlan.weekdays) {
                const weekdaySection = document.createElement('div');
                weekdaySection.className = 'daily-plan-section weekday-section';
                weekdaySection.innerHTML = `
                    <h3 class="daily-plan-section-title">Weekdays (Monday-Friday)</h3>
                    <div class="daily-plan-timeframes">
                        ${createTimeframeCard('Morning', dailyPlan.weekdays.morning, 'sunrise')}
                        ${createTimeframeCard('Afternoon', dailyPlan.weekdays.afternoon, 'sun')}
                        ${createTimeframeCard('Evening', dailyPlan.weekdays.evening, 'moon')}
                    </div>
                `;
                dailyPlanContainer.appendChild(weekdaySection);
            }
            
            // Create weekend section
            if (dailyPlan.weekends) {
                const weekendSection = document.createElement('div');
                weekendSection.className = 'daily-plan-section weekend-section';
                weekendSection.innerHTML = `
                    <h3 class="daily-plan-section-title">Weekends (Saturday-Sunday)</h3>
                    <div class="daily-plan-timeframes">
                        ${createTimeframeCard('Morning', dailyPlan.weekends.morning, 'sunrise')}
                        ${createTimeframeCard('Afternoon', dailyPlan.weekends.afternoon, 'sun')}
                        ${createTimeframeCard('Evening', dailyPlan.weekends.evening, 'moon')}
                    </div>
                `;
                dailyPlanContainer.appendChild(weekendSection);
            }
        } else {
            // Old string format
            // Parse the daily plan content to extract morning, afternoon, evening items
            const dailyPlanContent = fullPlanData.daily_plan;
            
            // Extract time periods from the daily plan
            const morningContent = extractTimeframeContent(dailyPlanContent, ["morning", "am", "wake", "breakfast"]);
            const afternoonContent = extractTimeframeContent(dailyPlanContent, ["afternoon", "midday", "lunch", "noon"]);
            const eveningContent = extractTimeframeContent(dailyPlanContent, ["evening", "night", "pm", "dinner", "before bed"]);
            
            // If we couldn't extract specific timeframes, create a single card
            if (!morningContent && !afternoonContent && !eveningContent) {
                dailyPlanContainer.innerHTML = `
                    <div class="daily-plan-card">
                        <div class="daily-plan-header">
                            <div class="daily-plan-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                                    <path fill="none" d="M0 0h24v24H0z"/>
                                    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm1-8h4v2h-6V7h2v5z" fill="currentColor"/>
                                </svg>
                            </div>
                            <h3>Daily Routine</h3>
                        </div>
                        <div class="daily-plan-content">
                            ${formatContent(dailyPlanContent)}
                        </div>
                    </div>
                `;
            } else {
                // Create cards for each time period
                if (morningContent) {
                    dailyPlanContainer.innerHTML += createTimeframeCard('Morning', morningContent, 'sunrise');
                }
                
                if (afternoonContent) {
                    dailyPlanContainer.innerHTML += createTimeframeCard('Afternoon', afternoonContent, 'sun');
                }
                
                if (eveningContent) {
                    dailyPlanContainer.innerHTML += createTimeframeCard('Evening', eveningContent, 'moon');
                }
            }
        }
    }

// Function to select an appropriate icon based on content
function selectContentIcon(text) {
    // Define keyword-to-icon mappings
    const iconMappings = [
        { keywords: ['learn', 'study', 'read', 'book', 'course', 'education', 'knowledge'], icon: '📚' },
        { keywords: ['meditate', 'mindful', 'breath', 'calm', 'peace', 'relax'], icon: '🧘' },
        { keywords: ['exercise', 'workout', 'gym', 'fitness', 'strength', 'train'], icon: '💪' },
        { keywords: ['eat', 'food', 'meal', 'nutrition', 'diet', 'healthy'], icon: '🥗' },
        { keywords: ['sleep', 'rest', 'nap', 'bed', 'tired'], icon: '😴' },
        { keywords: ['write', 'journal', 'diary', 'note', 'document'], icon: '✍️' },
        { keywords: ['plan', 'organize', 'schedule', 'calendar', 'agenda'], icon: '📝' },
        { keywords: ['work', 'job', 'career', 'business', 'professional'], icon: '💼' },
        { keywords: ['analyze', 'track', 'measure', 'monitor', 'data'], icon: '📊' },
        { keywords: ['create', 'idea', 'brainstorm', 'design', 'invent'], icon: '💡' },
        { keywords: ['friend', 'social', 'people', 'network', 'community'], icon: '👥' },
        { keywords: ['talk', 'speak', 'communicate', 'conversation', 'discuss'], icon: '💬' },
        { keywords: ['connect', 'collaborate', 'partner', 'team', 'network'], icon: '🤝' },
        { keywords: ['family', 'love', 'relationship', 'partner', 'spouse'], icon: '❤️' },
        { keywords: ['walk', 'run', 'move', 'active', 'outside'], icon: '🏃' },
        { keywords: ['clean', 'tidy', 'organize', 'declutter', 'arrange'], icon: '🧹' },
        { keywords: ['buy', 'shop', 'purchase', 'store', 'errand'], icon: '🛒' },
        { keywords: ['grow', 'develop', 'improve', 'progress', 'advance'], icon: '🌱' },
        { keywords: ['habit', 'routine', 'daily', 'regular', 'consistent'], icon: '🔄' },
        { keywords: ['goal', 'target', 'aim', 'objective', 'achieve'], icon: '🎯' }
    ];
    
    // Default icons for timeframes (as fallbacks)
    const defaultIcons = {
        today: '✅',
        next7: '📅',
        next30: '📆',
        next180: '🗓️',
        morning: '🌅',
        afternoon: '☀️',
        evening: '🌙'
    };
    
    // Convert text to lowercase for matching
    const lowerText = text.toLowerCase();
    
    // Try to find a matching icon based on keywords
    for (const mapping of iconMappings) {
        if (mapping.keywords.some(keyword => lowerText.includes(keyword))) {
            return mapping.icon;
        }
    }
    
    // Return a default icon based on context if provided
    if (arguments.length > 1 && defaultIcons[arguments[1]]) {
        return defaultIcons[arguments[1]];
    }
    
    // Default fallback icon
    return '•';
}

// Helper function to display bullet points with content-specific icons
function displayBulletPoints(elementId, items, timeframe) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // If items is not an array or is empty, show a message
    if (!Array.isArray(items) || items.length === 0) {
        element.innerHTML = '<p>No specific steps identified for this timeframe.</p>';
        return;
    }
    
    // Create a list of bullet points with icons
    const bulletList = document.createElement('ul');
    bulletList.className = 'icon-bullet-list';
    
    items.forEach(item => {
        // Select an appropriate icon based on the content
        const icon = selectContentIcon(item, timeframe);
        
        const listItem = document.createElement('li');
        listItem.className = 'icon-bullet-item';
        listItem.innerHTML = `<span class="bullet-icon">${icon}</span> ${item}`;
        bulletList.appendChild(listItem);
    });
    
    element.innerHTML = '';
    element.appendChild(bulletList);
}

// Helper function to create a timeframe card
function createTimeframeCard(title, content, iconType) {
    let iconSvg = '';
    
    // Select the appropriate icon based on the time of day
    if (iconType === 'sunrise') {
        iconSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path fill="none" d="M0 0h24v24H0z"/>
                <path d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-6.32-5.98l-1.86-.5-.3 1.12 1.88.5.28-1.12zm12.32 1.12l1.88-.5-.3-1.12-1.86.5.28 1.12zm-7.99-7.62l.5-1.86-1.12-.3-.5 1.88 1.12.28zm3.99-.28l-.5-1.88-1.12.3.5 1.86 1.12-.28zm-7.62 11.99l-1.86.5.3 1.12 1.88-.5-.32-1.12zm11.62 0l-.28 1.12 1.88.5.3-1.12-1.9-.5zM20 11h2v2h-2v-2zm-2-9v2h-2V2h2zm-2 17h2v2h-2v-2zM9 2h2v2H9V2zM4 9h2v2H4V9zm-2 2h2v2H2v-2zM9 20h2v2H9v-2z" fill="currentColor"/>
            </svg>
        `;
    } else if (iconType === 'sun') {
        iconSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path fill="none" d="M0 0h24v24H0z"/>
                <path d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM11 1h2v3h-2V1zm0 19h2v3h-2v-3zM3.515 4.929l1.414-1.414L7.05 5.636 5.636 7.05 3.515 4.93zM16.95 18.364l1.414-1.414 2.121 2.121-1.414 1.414-2.121-2.121zm2.121-14.85l1.414 1.415-2.121 2.121-1.414-1.414 2.121-2.121zM5.636 16.95l1.414 1.414-2.121 2.121-1.414-1.414 2.121-2.121zM23 11v2h-3v-2h3zM4 11v2H1v-2h3z" fill="currentColor"/>
            </svg>
        `;
    } else if (iconType === 'moon') {
        iconSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path fill="none" d="M0 0h24v24H0z"/>
                <path d="M10 6a8 8 0 0 0 11.955 6.956C21.474 18.03 17.2 22 12 22 6.477 22 2 17.523 2 12c0-5.2 3.97-9.474 9.044-9.955A7.963 7.963 0 0 0 10 6zm-6 6a8 8 0 0 0 8 8 8.006 8.006 0 0 0 6.957-4.045c-.316.03-.636.045-.957.045-5.523 0-10-4.477-10-10 0-.321.015-.64.045-.957A8.006 8.006 0 0 0 4 12zm14.164-9.709L19 2.5v1l-.836.209a2 2 0 0 0-1.455 1.455L16.5 6h-1l-.209-.836a2 2 0 0 0-1.455-1.455L13 3.5v-1l.836-.209A2 2 0 0 0 15.29.836L15.5 0h1l.209.836a2 2 0 0 0 1.455 1.455zm5 5L24 7.5v1l-.836.209a2 2 0 0 0-1.455 1.455L21.5 11h-1l-.209-.836a2 2 0 0 0-1.455-1.455L18 8.5v-1l.836-.209a2 2 0 0 0 1.455-1.455L20.5 5h1l.209.836a2 2 0 0 0 1.455 1.455z" fill="currentColor"/>
            </svg>
        `;
    }
    
    // Create HTML content for the card
    let contentHTML = '';
    
    // Check if content is an array (new format) or a string (old format)
    if (Array.isArray(content)) {
        // Create a list of bullet points with content-specific icons
        contentHTML = '<ul class="daily-plan-list">';
        content.forEach(item => {
            // Select an appropriate icon based on the content
            const timeframeMap = {
                'Morning': 'morning',
                'Afternoon': 'afternoon',
                'Evening': 'evening'
            };
            const icon = selectContentIcon(item, timeframeMap[title] || '');
            
            contentHTML += `<li class="daily-plan-item"><span class="bullet-icon">${icon}</span> ${item}</li>`;
        });
        contentHTML += '</ul>';
    } else {
        // Use the formatContent function for string content
        contentHTML = formatContent(content);
    }
    
    return `
        <div class="daily-plan-card">
            <div class="daily-plan-header">
                <div class="daily-plan-icon">
                    ${iconSvg}
                </div>
                <h3>${title}</h3>
            </div>
            <div class="daily-plan-content">
                ${contentHTML}
            </div>
        </div>
    `;
}
    
    // Process Obstacles section
    if (fullPlanData.obstacles) {
        obstaclesSection.style.display = 'block';
        
        // Create the obstacles container
        const obstaclesContainer = document.getElementById('obstaclesContainer');
        obstaclesContainer.innerHTML = '';
        
        // Check if obstacles is an array (new format) or a string (old format)
        if (Array.isArray(fullPlanData.obstacles)) {
            // New format: array of obstacle objects
            fullPlanData.obstacles.forEach(obstacle => {
                obstaclesContainer.innerHTML += `
                    <div class="obstacle-card ${obstacle.type}-obstacle">
                        <div class="obstacle-type">${obstacle.type.charAt(0).toUpperCase() + obstacle.type.slice(1)}</div>
                        <div class="obstacle-header">Challenge</div>
                        <div class="obstacle-content">
                            ${formatContent(obstacle.challenge)}
                        </div>
                        <div class="solution-header">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" class="solution-icon">
                                <path fill="none" d="M0 0h24v24H0z"/>
                                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-.997-4L6.76 11.757l1.414-1.414 2.829 2.829 5.656-5.657 1.415 1.414L11.003 16z" fill="currentColor"/>
                            </svg>
                            Solution
                        </div>
                        <div class="solution-content">
                            ${formatContent(obstacle.solution)}
                        </div>
                    </div>
                `;
            });
        } else {
            // Old format: string content
            // Parse the obstacles content to extract obstacles and solutions
            const obstaclesContent = fullPlanData.obstacles;
            
            // Split the content into obstacles and solutions
            const obstacleItems = extractObstaclesAndSolutions(obstaclesContent);
            
            // If we couldn't extract specific obstacles, just show the whole content
            if (obstacleItems.length === 0) {
                obstaclesContainer.innerHTML = `
                    <div class="obstacle-card">
                        <div class="obstacle-header">Potential Challenges</div>
                        <div class="obstacle-content">
                            ${formatContent(obstaclesContent)}
                        </div>
                    </div>
                `;
            } else {
                // Create cards for each obstacle and solution pair
                obstacleItems.forEach(item => {
                    obstaclesContainer.innerHTML += `
                        <div class="obstacle-card">
                            <div class="obstacle-header">${item.obstacle ? 'Obstacle' : 'Challenge'}</div>
                            <div class="obstacle-content">
                                ${formatContent(item.obstacle || 'Potential challenge in your journey.')}
                            </div>
                            <div class="solution-header">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" class="solution-icon">
                                    <path fill="none" d="M0 0h24v24H0z"/>
                                    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-.997-4L6.76 11.757l1.414-1.414 2.829 2.829 5.656-5.657 1.415 1.414L11.003 16z" fill="currentColor"/>
                                </svg>
                                Solution
                            </div>
                            <div class="solution-content">
                                ${formatContent(item.solution || 'Work through this challenge with persistence and adaptability.')}
                            </div>
                        </div>
                    `;
                });
            }
        }
    }
}

// Helper function to extract content for a specific timeframe
function extractTimeframeContent(content, timeframeKeywords) {
    if (!content) return null;
    
    // Split content into paragraphs
    const paragraphs = content.split(/\n\n+/);
    
    // Look for paragraphs that contain the timeframe keywords
    for (const paragraph of paragraphs) {
        for (const keyword of timeframeKeywords) {
            if (paragraph.toLowerCase().includes(keyword.toLowerCase())) {
                return paragraph;
            }
        }
    }
    
    // If we can't find a specific paragraph, try to find bullet points
    const lines = content.split('\n');
    const relevantLines = [];
    
    let inRelevantSection = false;
    for (const line of lines) {
        // Check if this line contains a timeframe keyword
        const containsKeyword = timeframeKeywords.some(keyword => 
            line.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (containsKeyword) {
            inRelevantSection = true;
            relevantLines.push(line);
        } 
        // If we're in a relevant section, add bullet points
        else if (inRelevantSection && (line.trim().startsWith('-') || line.trim().startsWith('•'))) {
            relevantLines.push(line);
        }
        // If we hit another heading or empty line, end the section
        else if (inRelevantSection && (line.trim() === '' || line.trim().startsWith('#'))) {
            inRelevantSection = false;
        }
    }
    
    return relevantLines.length > 0 ? relevantLines.join('\n') : null;
}

// Helper function to extract obstacles and solutions
function extractObstaclesAndSolutions(content) {
    if (!content) return [];
    
    const obstacleItems = [];
    const lines = content.split('\n');
    
    let currentObstacle = null;
    let currentSolution = null;
    let collectingObstacle = false;
    let collectingSolution = false;
    
    for (const line of lines) {
        const lowerLine = line.toLowerCase().trim();
        
        // Check for obstacle indicators
        if (lowerLine.includes('obstacle:') || lowerLine.includes('challenge:') || 
            lowerLine.startsWith('obstacle ') || lowerLine.startsWith('challenge ')) {
            
            // If we already have an obstacle-solution pair, save it
            if (currentObstacle) {
                obstacleItems.push({
                    obstacle: currentObstacle,
                    solution: currentSolution
                });
            }
            
            // Start a new obstacle
            currentObstacle = line.replace(/^(obstacle|challenge)[s]?[:]/i, '').trim();
            currentSolution = null;
            collectingObstacle = true;
            collectingSolution = false;
        }
        // Check for solution indicators
        else if (lowerLine.includes('solution:') || lowerLine.includes('strategy:') || 
                 lowerLine.startsWith('solution ') || lowerLine.startsWith('strategy ')) {
            
            currentSolution = line.replace(/^(solution|strategy)[s]?[:]/i, '').trim();
            collectingObstacle = false;
            collectingSolution = true;
        }
        // Continue collecting the current obstacle or solution
        else if (collectingObstacle && line.trim() !== '') {
            currentObstacle += '\n' + line;
        }
        else if (collectingSolution && line.trim() !== '') {
            currentSolution += '\n' + line;
        }
        // Empty line might indicate a new section
        else if (line.trim() === '') {
            collectingObstacle = false;
            collectingSolution = false;
        }
    }
    
    // Add the last obstacle-solution pair if we have one
    if (currentObstacle) {
        obstacleItems.push({
            obstacle: currentObstacle,
            solution: currentSolution
        });
    }
    
    return obstacleItems;
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
