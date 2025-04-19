// Form API functionality for Pathlight

// Check if user exists by email
async function checkExistingUser(email) {
    try {
        const response = await fetch(`/api/users/find-by-email?email=${encodeURIComponent(email)}`);
        
        // Check if response is ok before trying to parse JSON
        if (!response.ok) {
            console.error('Error response from find-by-email:', response.status, response.statusText);
            return null;
        }
        
        const data = await response.json();
        
        if (data && data.found) {
            // If user exists, return the full data object
            return data;
        }
        
        return null;
    } catch (error) {
        console.error('Error checking existing user:', error);
        return null;
    }
}

// Send magic link for authentication
async function sendMagicLink(email) {
    try {
        const response = await fetch('/auth/login_or_create_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Magic link sent! Please check your email to continue.', 'success');
            return true;
        } else {
            showNotification('Error sending magic link: ' + (data.error || 'Unknown error'), 'error');
            return false;
        }
    } catch (error) {
        console.error('Error sending magic link:', error);
        showNotification('Error sending magic link. Please try again.', 'error');
        return false;
    }
}

// Create user
async function createUser(dobValue) {
    try {
        // Format date as ISO string
        const dob = new Date(dobValue);
        // Ensure the date is valid
        if (isNaN(dob.getTime())) {
            showNotification('Please enter a valid date of birth.', 'error');
            return;
        }
        
        // Use UTC date string to avoid timezone issues
        const dobString = dob.toISOString();
        
        const userData = {
            name: user.name,
            email: user.email,
            dob: dobString,
            progress_state: '0',
            payment_tier: 'none'
        };
        
        console.log('Creating user with data:', userData);
        
        const response = await fetch('/api/users/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            showNotification(`Error creating user: ${response.status} ${response.statusText}`, 'error');
            throw new Error(`Failed to create user: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        user.id = data.id;
        
        // Update URL with user ID
        const newUrl = `${window.location.pathname}/${user.id}`;
        window.history.replaceState({}, '', newUrl);
        
        // Proceed to first question without showing the URL modal
        showSlide(1);
        
        showNotification('Your progress will be saved automatically.');
        
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification('Error creating user. Please try again.', 'error');
    }
}

// Update user
async function updateUser() {
    try {
        // Only update fields that have changed
        const updateData = {
            progress_state: user.progress_state,
            payment_tier: user.payment_tier
        };
        
        // Only include name if it has changed
        if (document.getElementById('userName').value.trim() !== user.name) {
            updateData.name = document.getElementById('userName').value.trim();
        }
        
        const response = await fetch(`/api/users/${user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });
        
        if (!response.ok) {
            throw new Error('Failed to update user');
        }
        
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification('Error updating user. Please try again.', 'error');
    }
}

// Save response
async function saveResponse(questionNumber, response) {
    try {
        const responseData = {
            user_id: user.id,
            question_number: questionNumber,
            response: response
        };
        
        console.log('Saving response data:', responseData);
        
        const apiResponse = await fetch('/api/form-responses/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(responseData),
        });
        
        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('Server error response:', errorText);
            showNotification(`Error saving response: ${apiResponse.status} ${apiResponse.statusText}`, 'error');
            throw new Error(`Failed to save response: ${apiResponse.status} ${apiResponse.statusText}`);
        }
        
        // Update progress state
        if (parseInt(user.progress_state) < questionNumber) {
            user.progress_state = questionNumber.toString();
            
            // Update user progress on server
            try {
                console.log(`Updating progress to ${user.progress_state} for user ${user.id}`);
                const progressResponse = await fetch(`/api/users/${user.id}/progress`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        progress_state: user.progress_state
                    }),
                });
                
                if (!progressResponse.ok) {
                    const errorText = await progressResponse.text();
                    console.error('Error updating progress:', progressResponse.status, progressResponse.statusText, errorText);
                } else {
                    console.log('Progress updated successfully');
                }
            } catch (progressError) {
                console.error('Exception updating progress:', progressError);
            }
        }
        
    } catch (error) {
        console.error('Error saving response:', error);
        showNotification('Error saving your response. Please try again.', 'error');
    }
}

// Load user data
async function loadUserData() {
    try {
        // Get user data
        const userResponse = await fetch(`/api/users/${user.id}`);
        if (!userResponse.ok) {
            throw new Error('Failed to load user data');
        }
        
        const userData = await userResponse.json();
        user = userData;
        
        // Update tier badge
        updateTierBadge();
        
        // Fill user info fields
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        
        // Make email field read-only for returning users
        document.getElementById('userEmail').readOnly = true;
        document.getElementById('userEmail').classList.add('readonly-field');
        
        // Format and display DOB
        if (user.dob) {
            // Convert ISO date string to YYYY-MM-DD format for date input
            const dobDate = new Date(user.dob);
            if (!isNaN(dobDate.getTime())) {
                const year = dobDate.getFullYear();
                const month = String(dobDate.getMonth() + 1).padStart(2, '0');
                const day = String(dobDate.getDate()).padStart(2, '0');
                document.getElementById('userDob').value = `${year}-${month}-${day}`;
            }
        }
        
        // Get user responses
        const responsesResponse = await fetch(`/api/form-responses/user/${user.id}`);
        if (!responsesResponse.ok) {
            throw new Error('Failed to load responses');
        }
        
        const responsesData = await responsesResponse.json();
        
        // Fill responses
        responsesData.forEach(response => {
            userResponses[response.question_number] = response.response;
            
            const textarea = document.getElementById(`question${response.question_number}`);
            if (textarea) {
                textarea.value = response.response;
            }
        });
        
        // Go to the next unanswered question
        const progressState = parseInt(user.progress_state);
        console.log('User progress state:', progressState);
        
        // Check if we have a specific slide to start at (for profile page)
        if (window.startAtSlide === 0) {
            console.log('Starting at profile slide (slide 0)');
            
            // Force the slide to be shown
            setTimeout(() => {
                showSlide(0);
            }, 100);
        }
        // Check if we have a specific starting question from URL parameter
        else if (window.startAtQuestion && window.startAtQuestion > 0 && window.startAtQuestion <= PREMIUM_TIER_QUESTIONS) {
            console.log('Starting at specified question:', window.startAtQuestion);
            
            // Force the slide to be shown
            setTimeout(() => {
                showSlide(window.startAtQuestion);
                
                // If we're at the end of a tier, update submit button state
                const isEndOfBasicTier = window.startAtQuestion === BASIC_TIER_QUESTIONS && user.payment_tier !== 'premium';
                const isEndOfPremiumTier = window.startAtQuestion === PREMIUM_TIER_QUESTIONS;
                
                if (isEndOfBasicTier || isEndOfPremiumTier) {
                    updateSubmitButtonState();
                }
            }, 100);
        } else if (progressState > 0) {
            // Make sure we're showing the correct slide based on progress
            // This is critical for returning users
            console.log('Showing slide based on progress state:', progressState);
            
            // Force the slide to be shown
            setTimeout(() => {
                showSlide(progressState);
                
                // If we're at the end of a tier, update submit button state
                const isEndOfBasicTier = progressState === BASIC_TIER_QUESTIONS && user.payment_tier !== 'premium';
                const isEndOfPremiumTier = progressState === PREMIUM_TIER_QUESTIONS;
                
                if (isEndOfBasicTier || isEndOfPremiumTier) {
                    updateSubmitButtonState();
                }
            }, 100);
        } else {
            showSlide(1); // Start at the first question
        }
        
        showNotification('Your saved responses have been loaded.');
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Error loading your saved data. Starting a new form.', 'error');
    }
}

// Generate basic results (summary and mantra)
async function generateBasicResults() {
    try {
        const response = await fetch(`/api/ai/${user.id}/generate-basic`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate basic results');
        }
        
        const data = await response.json();
        
        // Redirect to results page
        window.location.href = `/results/${user.id}`;
        
    } catch (error) {
        console.error('Error generating basic results:', error);
        document.getElementById('loadingOverlay').style.display = 'none';
        showNotification('Error generating your results. Please try again.', 'error');
    }
}

// Generate premium results (full path and plan)
async function generatePremiumResults() {
    try {
        const response = await fetch(`/api/ai/${user.id}/generate-premium`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate premium results');
        }
        
        const data = await response.json();
        
        // Redirect to results page
        window.location.href = `/results/${user.id}`;
        
    } catch (error) {
        console.error('Error generating premium results:', error);
        document.getElementById('loadingOverlay').style.display = 'none';
        showNotification('Error generating your results. Please try again.', 'error');
    }
}

// Check if results already exist
async function checkExistingResults() {
    try {
        const response = await fetch(`/api/results/${user.id}/check-results`);
        if (!response.ok) {
            throw new Error('Failed to check results status');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error checking results status:', error);
        return { has_results: false };
    }
}

// Show regeneration payment modal
function showRegenerationPaymentModal(lastGeneratedAt, regenerationCount = 0) {
    // Update the last generated date in the modal
    document.getElementById('lastGeneratedDate').textContent = lastGeneratedAt || 'an earlier date';
    
    // Update the regeneration count in the modal
    document.getElementById('regenerationCount').textContent = regenerationCount;
    
    // Show the modal
    document.getElementById('regenerationPaymentModal').style.display = 'flex';
}
