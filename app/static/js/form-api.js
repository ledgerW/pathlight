// Form API functionality for Pathlight

// Check if user exists by email
async function checkExistingUser(email) {
    try {
        // Use POST request with email in the body
        console.log('Checking for existing user with email:', email);
        const response = await fetch('/api/users/find-by-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        if (!response.ok) {
            console.error('Error response from find-by-email:', response.status, response.statusText);
            return null;
        }
        
        const data = await response.json();
        console.log('Response from find-by-email:', data);
        
        if (data && data.found) {
            console.log('User found:', data);
            console.log('User found type:', typeof data);
            
            // Ensure the id is a string
            if (data.id) {
                data.id = String(data.id);
                console.log('User ID (string):', data.id);
                console.log('User ID type after conversion:', typeof data.id);
            }
            
            // Log the entire data object for debugging
            console.log('Full user data object:', JSON.stringify(data));
            
            // Return a new object with primitive values to avoid reference issues
            return {
                found: true,
                id: data.id ? String(data.id) : null,
                name: data.name ? String(data.name) : '',
                email: data.email ? String(data.email) : '',
                dob: data.dob ? String(data.dob) : null,
                progress_state: data.progress_state ? String(data.progress_state) : '0',
                payment_tier: data.payment_tier ? String(data.payment_tier) : 'none',
                has_responses: !!data.has_responses,
                response_count: data.response_count ? Number(data.response_count) : 0,
                has_results: !!data.has_results,
                last_generated_at: data.last_generated_at ? String(data.last_generated_at) : null,
                regeneration_count: data.regeneration_count ? Number(data.regeneration_count) : 0
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error checking existing user:', error);
        return null;
    }
}

// Send magic link for authentication
async function sendMagicLink(email, showNotifications = true) {
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
            if (showNotifications) {
                showNotification('Magic link sent! Please check your email to continue.', 'success');
            }
            return true;
        } else {
            if (showNotifications) {
                showNotification('Error sending magic link: ' + (data.error || 'Unknown error'), 'error');
            }
            return false;
        }
    } catch (error) {
        console.error('Error sending magic link:', error);
        if (showNotifications) {
            showNotification('Error sending magic link. Please try again.', 'error');
        }
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
        
        // Show notification about the magic link
        showNotification('Account created! We\'ve sent a magic link to your email. Please check your inbox to continue.', 'success');
        
        // Send magic link for authentication
        sendMagicLink(user.email);
        
        // DO NOT store the user ID or update the URL
        // DO NOT redirect - user will click the magic link in their email
        
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification('Error creating user. Please try again.', 'error');
    }
}

// Update user
async function updateUser() {
    try {
        // Update progress state and payment tier
        const updateData = {
            progress_state: user.progress_state,
            payment_tier: user.payment_tier
        };
        
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
    return new Promise(async (resolve, reject) => {
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
            
            // Check if we have a specific slide to start at
            if (window.startAtSlide === 0) {
                console.log('Starting at first question (slide 1) instead of profile slide (slide 0)');
                
                // Force the slide to be shown - start at question 1 since profile slide was removed
                setTimeout(() => {
                    showSlide(1);
                    resolve(); // Resolve the promise after showing the slide
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
                    
                    resolve(); // Resolve the promise after showing the slide
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
                    
                    resolve(); // Resolve the promise after showing the slide
                }, 100);
            } else {
                showSlide(1); // Start at the first question
                resolve(); // Resolve the promise after showing the slide
            }
            
            showNotification('Your saved responses have been loaded.');
            
        } catch (error) {
            console.error('Error loading user data:', error);
            showNotification('Error loading your saved data. Starting a new form.', 'error');
            reject(error); // Reject the promise on error
        }
    });
}

// Generate basic results (summary and mantra)
async function generateBasicResults() {
    try {
        // Get authentication token
        const authToken = localStorage.getItem('stytch_session_token');
        console.log('Using auth token for basic results generation:', authToken ? `${authToken.substring(0, 10)}...` : 'none');
        
        const response = await fetch(`/api/ai/${user.id}/generate-basic`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error generating basic results:', errorText);
            throw new Error(`Failed to generate basic results: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Basic results generated successfully:', data);
        
        // Check if this is a background request (from payment_success.html)
        const isBackgroundRequest = response.headers.get('X-Background-Request') === 'true';
        
        // Only redirect if this is not a background request
        if (!isBackgroundRequest) {
            // Redirect to results page
            window.location.href = `/results/${user.id}`;
        }
        
    } catch (error) {
        console.error('Error generating basic results:', error);
        document.getElementById('loadingOverlay').style.display = 'none';
        showNotification('Error generating your results. Please try again.', 'error');
    }
}

// Generate premium results (full path and plan)
async function generatePremiumResults() {
    try {
        // Get authentication token
        const authToken = localStorage.getItem('stytch_session_token');
        console.log('Using auth token for premium results generation:', authToken ? `${authToken.substring(0, 10)}...` : 'none');
        
        const response = await fetch(`/api/ai/${user.id}/generate-premium`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken ? `Bearer ${authToken}` : ''
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error generating premium results:', errorText);
            throw new Error(`Failed to generate premium results: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Premium results generated successfully:', data);
        
        // Check if this is a background request (from payment_success.html)
        const isBackgroundRequest = response.headers.get('X-Background-Request') === 'true';
        
        // Only redirect if this is not a background request
        if (!isBackgroundRequest) {
            // Redirect to results page
            window.location.href = `/results/${user.id}`;
        }
        
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

// Create user from anonymous responses
// Make this function globally accessible so it can be called from form-core.js
window.createUserFromAnonymous = async function(dobValue) {
    try {
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingMessage = document.getElementById('loadingMessage');
        loadingOverlay.style.display = 'flex';
        loadingMessage.textContent = 'Creating your account...';
        
        // Format date as ISO string
        const dob = new Date(dobValue);
        // Ensure the date is valid
        if (isNaN(dob.getTime())) {
            showNotification('Please enter a valid date of birth.', 'error');
            loadingOverlay.style.display = 'none';
            return;
        }
        
        // Use UTC date string to avoid timezone issues
        const dobString = dob.toISOString();
        
        // Step 1: Create the new user account
        const userData = {
            name: user.name,
            email: user.email,
            dob: dobString,
            progress_state: BASIC_TIER_QUESTIONS.toString(),
            payment_tier: 'none',
            anonymous_session_id: anonymousSessionId
        };
        
        console.log('Creating user from anonymous data:', userData);
        
        const response = await fetch('/api/users/from-anonymous', {
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
            loadingOverlay.style.display = 'none';
            throw new Error(`Failed to create user: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Update user object with new user ID
        user.id = data.id;
        
        // Step 2: Save form responses to the user
        loadingMessage.textContent = 'Saving your responses...';
        
        // Get anonymous responses from localStorage
        const savedResponses = localStorage.getItem('anonymousResponses');
        if (!savedResponses) {
            console.error('No anonymous responses found in localStorage');
            showNotification('No responses found. Please answer the questions before proceeding.', 'error');
            loadingOverlay.style.display = 'none';
            return;
        }
        
        // Parse responses
        const responses = JSON.parse(savedResponses);
        
        // Save each response individually using the standard saveResponse function
        for (const [questionNum, responseText] of Object.entries(responses)) {
            if (responseText && responseText.trim()) {
                try {
                    const questionNumber = parseInt(questionNum);
                    await saveResponse(questionNumber, responseText.trim());
                    console.log(`Saved response for question ${questionNum}`);
                } catch (err) {
                    console.error(`Error saving response for question ${questionNum}:`, err);
                }
            }
        }
        
        // Clear anonymous responses from localStorage
        localStorage.removeItem('anonymousResponses');
        
        // Step 3: Email the stytch magic link but don't show notification yet
        loadingMessage.textContent = 'Preparing your account...';
        await sendMagicLink(user.email, false); // Pass false to suppress notification
        
        // Set a flag to indicate that a magic link has been sent
        localStorage.setItem('magic_link_sent', 'true');
        
        // Store authentication data in localStorage for immediate use
        localStorage.setItem('pathlight_session', 'true');
        localStorage.setItem('pathlight_session_created', new Date().toISOString());
        localStorage.setItem('pathlight_user_id', user.id);
        localStorage.setItem('pathlight_user_email', user.email);
        
        // Set up authentication for future requests
        const tempAuthToken = `temp-token-${user.id}`;
        localStorage.setItem('stytch_session_token', tempAuthToken);
        
        // Step 4: Proceed directly to payment without showing email notification
        loadingMessage.textContent = 'Preparing payment...';
        
        // Proceed to payment
        initiatePayment('basic');
        
    } catch (error) {
        console.error('Error creating user from anonymous:', error);
        document.getElementById('loadingOverlay').style.display = 'none';
        showNotification('Error creating user. Please try again.', 'error');
    }
}

// Show authentication required modal
// Make this function globally accessible so it can be called from createUserFromAnonymous
window.showAuthenticationRequiredModal = function(userId) {
    // Create modal if it doesn't exist
    let authModal = document.getElementById('authenticationRequiredModal');
    
    if (!authModal) {
        // Create the modal element
        authModal = document.createElement('div');
        authModal.id = 'authenticationRequiredModal';
        authModal.className = 'modal';
        authModal.style.display = 'none';
        
        // Create modal content
        authModal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2>Check Your Email</h2>
                <p>We've sent a magic link to your email address. Please check your inbox and click the link to complete your account setup.</p>
                <p>After clicking the link, you'll be redirected back to continue with payment and generate your results.</p>
                <p>If you don't see the email, please check your spam folder.</p>
                <div class="modal-buttons">
                    <button id="resendMagicLinkButton" class="button">Resend Magic Link</button>
                </div>
            </div>
        `;
        
        // Add modal to the document
        document.body.appendChild(authModal);
        
        // Add event listeners
        document.querySelector('#authenticationRequiredModal .close-modal').addEventListener('click', () => {
            authModal.style.display = 'none';
        });
        
        document.getElementById('resendMagicLinkButton').addEventListener('click', async () => {
            if (user && user.email) {
                // Show loading message
                document.getElementById('resendMagicLinkButton').textContent = 'Sending...';
                
                // Resend magic link
                await sendMagicLink(user.email);
                
                // Reset button text
                setTimeout(() => {
                    document.getElementById('resendMagicLinkButton').textContent = 'Resend Magic Link';
                }, 2000);
            }
        });
    }
    
    // Show the modal
    authModal.style.display = 'flex';
    
    // Save user ID to localStorage for later use
    localStorage.setItem('pendingAuthUserId', userId);
}

// Transfer anonymous responses to the new user
async function transferAnonymousResponses(userId, anonymousSessionId) {
    try {
        // Get anonymous responses from localStorage
        const savedResponses = localStorage.getItem('anonymousResponses');
        if (!savedResponses) {
            console.log('No anonymous responses found in localStorage');
            return null;
        }
        
        // Parse anonymous responses
        const responses = JSON.parse(savedResponses);
        console.log('Transferring anonymous responses:', responses);
        
        // Format responses correctly for the API
        // The API expects a map of question numbers to response text
        const formattedResponses = {};
        for (const [questionNum, responseText] of Object.entries(responses)) {
            // Only include non-empty responses
            if (responseText && responseText.trim()) {
                formattedResponses[questionNum] = responseText.trim();
            }
        }
        
        // Check if we have any responses to transfer
        if (Object.keys(formattedResponses).length === 0) {
            console.error('No valid responses to transfer');
            return null;
        }
        
        console.log('Formatted responses for API:', formattedResponses);
        
        // Create the request body with the exact structure expected by the API
        // The server expects a structure where 'responses' is the formatted responses object directly
        const requestBody = {
            user_id: userId,
            anonymous_session_id: anonymousSessionId,
            responses: formattedResponses
        };
        
        console.log('Request body for transfer-anonymous:', JSON.stringify(requestBody));
        
        // Log the exact request we're sending for debugging
        console.log('Sending transfer-anonymous request with body:', JSON.stringify(requestBody, null, 2));
        
        // Call the transfer-anonymous endpoint
        // The endpoint expects query parameters for user_id and anonymous_session_id, not in the body
        const response = await fetch(`/api/form-responses/transfer-anonymous?user_id=${userId}&anonymous_session_id=${anonymousSessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ responses: formattedResponses }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error transferring anonymous responses:', errorText);
            throw new Error(`Failed to transfer anonymous responses: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Anonymous responses transferred:', data);
        
        // Clear anonymous responses from localStorage
        localStorage.removeItem('anonymousResponses');
        
        return data;
    } catch (error) {
        console.error('Error transferring anonymous responses:', error);
        return null;
    }
}

// Show regeneration modal
function showRegenerationPaymentModal(lastGeneratedAt, regenerationCount = 0) {
    // Hide loading overlay if it's visible
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
    
    // Update the price text based on user's tier
    const isPremiumTier = user.payment_tier === 'premium';
    const priceText = isPremiumTier ? '$4.99' : '$0.99';
    const modalTitle = isPremiumTier ? 'Update Your Life Plan' : 'Update Your Personal Insight';
    
    // Update modal title
    document.querySelector('#regenerationModal h2').textContent = modalTitle;
    
    // Update button text with correct price
    const buttonElement = document.getElementById('confirmRegenerationButton');
    if (buttonElement) {
        buttonElement.textContent = `Update My Plan (${priceText})`;
    }
    
    // Show the modal
    document.getElementById('regenerationModal').style.display = 'flex';
}
