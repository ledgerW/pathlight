// Results plan functionality for Pathlight

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
    
    return null;
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
        if (lowerLine.includes('obstacle:') || lowerLine.includes('challenge:')) {
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
        else if (lowerLine.includes('solution:') || lowerLine.includes('strategy:')) {
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
                if (timelineContainer) {
                    timelineContainer.insertBefore(todayItem, timelineContainer.firstChild);
                }
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
        if (dailyPlanContainer) {
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
                            ${createTimeframeCard('Morning', dailyPlan.weekdays.morning, 'sunrise', 'weekday')}
                            ${createTimeframeCard('Afternoon', dailyPlan.weekdays.afternoon, 'sun', 'weekday')}
                            ${createTimeframeCard('Evening', dailyPlan.weekdays.evening, 'moon', 'weekday')}
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
                            ${createTimeframeCard('Morning', dailyPlan.weekends.morning, 'sunrise', 'weekend')}
                            ${createTimeframeCard('Afternoon', dailyPlan.weekends.afternoon, 'sun', 'weekend')}
                            ${createTimeframeCard('Evening', dailyPlan.weekends.evening, 'moon', 'weekend')}
                        </div>
                    `;
                    dailyPlanContainer.appendChild(weekendSection);
                }
            } else {
                // Old string format
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
                            ${formatContent(fullPlanData.daily_plan)}
                        </div>
                    </div>
                `;
            }
        }
    }
    
    // Process Obstacles section
    if (fullPlanData.obstacles) {
        obstaclesSection.style.display = 'block';
        
        // Create the obstacles container
        const obstaclesContainer = document.getElementById('obstaclesContainer');
        if (obstaclesContainer) {
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
    
    // Initialize collapsible sections after all sections are loaded
    initializeCollapsibleSectionsAfterLoad();
}

// Export functions for use in other modules
window.extractTimeframeContent = extractTimeframeContent;
window.extractObstaclesAndSolutions = extractObstaclesAndSolutions;
window.displayStructuredPlan = displayStructuredPlan;
