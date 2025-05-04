// Form core functionality for Pathlight

// Global variables
let currentSlide = 1; // Start with question 1 instead of user info slide
let totalSlides = 25; // 25 questions (removed user info slide)
// Anonymous session ID for temporary storage
let anonymousSessionId = null;
let userResponses = {};
let user = {
    id: null,
    name: '',
    email: '',
    progress_state: '0',
    payment_tier: 'none'
};

// Constants for tiers
const BASIC_TIER_QUESTIONS = 5;
const PREMIUM_TIER_QUESTIONS = 25;

document.addEventListener('DOMContentLoaded', function() {
    // Debug: Check if questions and imageNames arrays are defined
    console.log('Questions array:', questions);
    console.log('Image names array:', imageNames);
    
    // Initialize or retrieve anonymous session ID
    anonymousSessionId = localStorage.getItem('anonymousSessionId');
    if (!anonymousSessionId) {
        anonymousSessionId = 'anonymous-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('anonymousSessionId', anonymousSessionId);
    }
    
    // Load anonymous responses from localStorage if they exist
    const savedResponses = localStorage.getItem('anonymousResponses');
    if (savedResponses) {
        try {
            userResponses = JSON.parse(savedResponses);
            console.log('Loaded anonymous responses from localStorage:', userResponses);
        } catch (e) {
            console.error('Error parsing saved responses:', e);
        }
    }
    
    // Get DOM elements
    const formSlides = document.getElementById('formSlides');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const submitButton = document.getElementById('submitButton');
    const progressFill = document.getElementById('progressFill');
    const currentQuestionSpan = document.getElementById('currentQuestion');
    const totalQuestionsSpan = document.getElementById('totalQuestions');
    const tierBadge = document.getElementById('tierBadge');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    const saveUrlModal = document.getElementById('saveUrlModal');
    const basicPaymentModal = document.getElementById('basicPaymentModal');
    const premiumPaymentModal = document.getElementById('premiumPaymentModal');
    const uniqueUrlInput = document.getElementById('uniqueUrl');
    const copyUrlButton = document.getElementById('copyUrlButton');
    
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    let userId = urlParams.get('user_id');
    
    // Update global user.id
    user.id = userId || null;
    
    // Initialize form
    function initForm() {
        // Preload images
        preloadImages();
        
        // Generate remaining slides (from 6 to 25)
        generateRemainingSlides();
        
        // Set up event listeners
        prevButton.addEventListener('click', goToPrevSlide);
        nextButton.addEventListener('click', goToNextSlide);
        submitButton.addEventListener('click', submitForm);
        
        // Add direct click handler to submit button to bypass disabled state if needed
        submitButton.addEventListener('mousedown', function(e) {
            // Force check for all responses
            saveCurrentSlideData();
            updateSubmitButtonState();
            
            // If we're at the end of a tier, force enable the button
            const isEndOfBasicTier = currentSlide === BASIC_TIER_QUESTIONS && user.payment_tier !== 'premium';
            const isEndOfPremiumTier = currentSlide === PREMIUM_TIER_QUESTIONS;
            
            if (isEndOfBasicTier || isEndOfPremiumTier) {
                // Check if all questions are answered
                let answeredQuestions = 0;
                const targetQuestions = user.payment_tier === 'premium' ? PREMIUM_TIER_QUESTIONS : BASIC_TIER_QUESTIONS;
                
                // Count responses for questions 1 through targetQuestions
                for (let i = 1; i <= targetQuestions; i++) {
                    const textarea = document.getElementById(`question${i}`);
                    if (textarea && textarea.value.trim()) {
                        userResponses[i] = textarea.value.trim();
                        answeredQuestions++;
                    }
                }
                
                if (answeredQuestions >= targetQuestions) {
                    // Force enable the button
                    submitButton.disabled = false;
                    submitButton.classList.remove('disabled');
                    console.log('Force enabled submit button on click');
                }
            }
        });
        
        // Close modal buttons
        const closeModalButtons = document.querySelectorAll('.close-modal');
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                saveUrlModal.style.display = 'none';
                basicPaymentModal.style.display = 'none';
                premiumPaymentModal.style.display = 'none';
                document.getElementById('regenerationModal').style.display = 'none';
                document.getElementById('accountCreationModal').style.display = 'none';
            });
        });
        
        // Account creation modal buttons
        const accountCreationModal = document.getElementById('accountCreationModal');
        document.getElementById('createAccountAndPay').addEventListener('click', () => {
            const name = document.getElementById('createUserName').value.trim();
            const email = document.getElementById('createUserEmail').value.trim();
            const dob = document.getElementById('createUserDob').value;
            
            if (!name) {
                showNotification('Please enter your name.', 'error');
                return;
            }
            
            if (!email || !isValidEmail(email)) {
                showNotification('Please enter a valid email address.', 'error');
                return;
            }
            
            if (!dob) {
                showNotification('Please enter your date of birth.', 'error');
                return;
            }
            
            // Save user info to global user object
            user.name = name;
            user.email = email;
            
            // Create user account and proceed to payment
            createUserFromAnonymous(dob);
            accountCreationModal.style.display = 'none';
        });
        
        // Add close button for account creation modal
        document.querySelector('#accountCreationModal .close-modal').addEventListener('click', () => {
            accountCreationModal.style.display = 'none';
        });
        
        // Copy URL button
        copyUrlButton.addEventListener('click', () => {
            if (copyToClipboard(uniqueUrlInput.value)) {
                showNotification('URL copied to clipboard!');
            } else {
                showNotification('Failed to copy URL. Please select and copy manually.', 'error');
            }
        });
        
        // Payment buttons
        document.getElementById('proceedToBasicPayment').addEventListener('click', () => {
            initiatePayment('basic');
        });
        
        document.getElementById('proceedToPremiumPayment').addEventListener('click', () => {
            initiatePayment('premium');
        });
        
        document.getElementById('saveAndExitBasic').addEventListener('click', () => {
            basicPaymentModal.style.display = 'none';
            showSaveUrlModal();
        });
        
        document.getElementById('saveAndExitPremium').addEventListener('click', () => {
            premiumPaymentModal.style.display = 'none';
            showSaveUrlModal();
        });
        
        // Regeneration payment modal button
        document.getElementById('confirmRegenerationButton').addEventListener('click', () => {
            // Check if user is premium tier to determine which tier to regenerate
            const tier = user.payment_tier === 'premium' ? 'premium' : 'basic';
            initiatePayment(tier, true); // Pass true for regeneration
            document.getElementById('regenerationModal').style.display = 'none';
        });
        
        // Set initial tier badge
        updateTierBadge();
        
        // If user ID exists in URL path (not query parameter), extract it
        if (!userId) {
            const pathParts = window.location.pathname.split('/');
            if (pathParts.length > 2 && pathParts[1] === 'form') {
                userId = pathParts[2];
                console.log('Extracted user ID from path:', userId);
                user.id = userId;
            }
        }
        
        // If user ID exists, load saved responses
        if (userId) {
            loadUserData().then(() => {
                // Check if we need to initiate payment after loading user data
                if (window.initiatePaymentAfterLoad) {
                    console.log('Initiating payment after user data loaded');
                    
                    // Show the basic payment modal
                    setTimeout(() => {
                        // Make sure we're at the basic tier questions
                        showSlide(BASIC_TIER_QUESTIONS);
                        
                        // Show the basic payment modal
                        document.getElementById('basicPaymentModal').style.display = 'flex';
                    }, 500);
                }
            });
        } else {
            // Show first slide for new users
            showSlide(currentSlide);
        }
    }
    
    // Submit form
    function submitForm(event) {
        console.log('Submit button clicked');
        
        // Prevent default form submission
        if (event) {
            event.preventDefault();
        }
        
        // Save final question response
        saveCurrentSlideData();
        
        // Force save the current question response to the server
        const questionNumber = currentSlide;
        const responseTextarea = document.getElementById(`question${questionNumber}`);
        
        if (responseTextarea && responseTextarea.value.trim() && user.id) {
            // Save to state
            userResponses[questionNumber] = responseTextarea.value.trim();
            
            // Explicitly save to server before proceeding
            saveResponse(questionNumber, responseTextarea.value.trim())
                .then(() => {
                    console.log(`Explicitly saved question ${questionNumber} response before proceeding`);
                    continueSubmitProcess();
                })
                .catch(error => {
                    console.error(`Error saving question ${questionNumber} response:`, error);
                    // Continue anyway to avoid blocking the user
                    continueSubmitProcess();
                });
        } else {
            continueSubmitProcess();
        }
    }
    
    // Continue the submit process after saving the response
    async function continueSubmitProcess() {
        // Update submit button state
        updateSubmitButtonState();
        
        // Count responses to verify we have all required answers
        let answeredQuestions = 0;
        const targetQuestions = user.payment_tier === 'premium' ? PREMIUM_TIER_QUESTIONS : BASIC_TIER_QUESTIONS;
        
        // Count responses for questions 1 through targetQuestions
        for (let i = 1; i <= targetQuestions; i++) {
            if (userResponses[i]) {
                answeredQuestions++;
            }
        }
        
        console.log(`Submit check: Answered ${answeredQuestions} of ${targetQuestions} questions`);
        const allQuestionsAnswered = answeredQuestions >= targetQuestions;
        
        // If not all questions are answered, show error and don't proceed
        if (!allQuestionsAnswered) {
            showNotification(`Please answer all questions. You've completed ${answeredQuestions} of ${targetQuestions}.`, 'error');
            return;
        }
        
        // Check if we're at question 5 with basic results and the submit button says "Update Purpose"
        const isAtBasicTier = currentSlide === BASIC_TIER_QUESTIONS;
        const hasBasicResults = user.payment_tier === 'basic' || user.payment_tier === 'premium';
        const submitButton = document.getElementById('submitButton');
        
        if (isAtBasicTier && hasBasicResults && submitButton.textContent === 'Update Purpose') {
            // User wants to update their basic results
            // Check if results already exist
            checkExistingResults().then(resultsData => {
            if (resultsData.has_results) {
                // Show regeneration payment modal
                showRegenerationPaymentModal(resultsData.last_generated_at, resultsData.regeneration_count);
                } else {
                    // Show loading overlay
                    loadingOverlay.style.display = 'flex';
                    loadingMessage.textContent = 'Updating your personal insight...';
                    generateBasicResults();
                }
            }).catch(error => {
                console.error('Error checking existing results:', error);
                // Fallback to direct generation
                loadingOverlay.style.display = 'flex';
                loadingMessage.textContent = 'Updating your personal insight...';
                generateBasicResults();
            });
            return;
        }
        
        // Check if we're at the end of basic tier
        if (currentSlide === BASIC_TIER_QUESTIONS) {
            // If user is not logged in, show account creation modal
            if (!user.id) {
                // Show account creation modal
                document.getElementById('accountCreationModal').style.display = 'flex';
                return;
            }
            
            // Check if results already exist
            const resultsData = await checkExistingResults();
            
            if (resultsData.has_results && user.payment_tier === 'basic') {
                // Show regeneration payment modal
                showRegenerationPaymentModal(resultsData.last_generated_at, resultsData.regeneration_count);
                return;
            }
            
            // If no existing results or user hasn't paid yet, show basic payment modal
            if (user.payment_tier === 'none') {
                // Show basic payment modal
                basicPaymentModal.style.display = 'flex';
                return;
            }
        }
        
        // Check if we're at the end of premium tier and need to show payment modal
        if (currentSlide === PREMIUM_TIER_QUESTIONS && user.payment_tier !== 'premium') {
            // Show premium payment modal
            premiumPaymentModal.style.display = 'flex';
            return;
        }
        
        // Check if we're at the end of premium tier and the submit button says "Update Plan"
        const isAtPremiumTier = currentSlide === PREMIUM_TIER_QUESTIONS;
        const hasPremiumResults = user.payment_tier === 'premium';
        
        if (isAtPremiumTier && hasPremiumResults && submitButton.textContent === 'Update Plan') {
            // User wants to update their premium results
            // Check if results already exist
            checkExistingResults().then(resultsData => {
                if (resultsData.has_results) {
                    // Show regeneration payment modal
                    showRegenerationPaymentModal(resultsData.last_generated_at, resultsData.regeneration_count);
                } else {
                    // Show loading overlay
                    loadingOverlay.style.display = 'flex';
                    loadingMessage.textContent = 'Generating your comprehensive life plan...';
                    generatePremiumResults();
                }
            }).catch(error => {
                console.error('Error checking existing results:', error);
                // Fallback to direct generation
                loadingOverlay.style.display = 'flex';
                loadingMessage.textContent = 'Generating your comprehensive life plan...';
                generatePremiumResults();
            });
            return;
        }
        
        // Show loading overlay for other cases
        loadingOverlay.style.display = 'flex';
        
        // Generate results based on tier for other cases
        if (user.payment_tier === 'premium') {
            loadingMessage.textContent = 'Generating your comprehensive life plan...';
            generatePremiumResults();
        } else {
            loadingMessage.textContent = 'Generating your personal insight...';
            generateBasicResults();
        }
    }
    
    // Save current slide data
    function saveCurrentSlideData() {
        if (currentSlide === 0) {
            // User info slide - already handled in goToNextSlide
            return;
        }
        
        // Get question response
        const questionNumber = currentSlide;
        const responseTextarea = document.getElementById(`question${questionNumber}`);
        
        // Check if textarea exists
        if (!responseTextarea) {
            console.error(`Textarea for question ${questionNumber} not found`);
            return;
        }
        
        const response = responseTextarea.value.trim();
        
        // Save to state
        userResponses[questionNumber] = response;
        
        // Save to server if user exists and response is not empty
        if (user.id && response) {
            saveResponse(questionNumber, response);
        } else if (!user.id && response) {
            // Save to localStorage for anonymous users
            localStorage.setItem('anonymousResponses', JSON.stringify(userResponses));
            console.log('Saved anonymous response to localStorage:', questionNumber, response);
        }
        
        // If we're on the last slide, update the submit button state
        if (currentSlide === BASIC_TIER_QUESTIONS || currentSlide === PREMIUM_TIER_QUESTIONS) {
            updateSubmitButtonState();
        }
    }
    
    // Create user from anonymous responses
    async function createUserFromAnonymous(dob) {
        try {
            // First, make sure we have responses in localStorage
            const savedResponses = localStorage.getItem('anonymousResponses');
            if (!savedResponses) {
                console.error('No anonymous responses found in localStorage');
                showNotification('No responses found. Please answer the questions before proceeding.', 'error');
                return;
            }
            
            // Parse responses to verify we have enough
            try {
                const responses = JSON.parse(savedResponses);
                let validResponseCount = 0;
                
                // Count valid responses for questions 1-5
                for (let i = 1; i <= BASIC_TIER_QUESTIONS; i++) {
                    if (responses[i] && responses[i].trim()) {
                        validResponseCount++;
                    }
                }
                
                console.log(`Found ${validResponseCount} valid responses out of ${BASIC_TIER_QUESTIONS} required`);
                
                if (validResponseCount < BASIC_TIER_QUESTIONS) {
                    showNotification(`Please answer all ${BASIC_TIER_QUESTIONS} questions before proceeding. You've completed ${validResponseCount}.`, 'error');
                    return;
                }
            } catch (e) {
                console.error('Error parsing saved responses:', e);
                showNotification('Error processing your responses. Please try again.', 'error');
                return;
            }
            
            // Call the createUserFromAnonymous function from form-api.js
            await window.createUserFromAnonymous(dob);
            
        } catch (error) {
            console.error('Error in createUserFromAnonymous wrapper:', error);
            showNotification('Error creating user. Please try again.', 'error');
        }
    }
    
    // Show save URL modal
    function showSaveUrlModal() {
        if (user.id) {
            uniqueUrlInput.value = `${window.location.origin}/form/${user.id}`;
            saveUrlModal.style.display = 'flex';
        }
    }
    
    // Utility function to show notifications
    function showNotification(message, type = 'success') {
        // Use the custom toast notification from base.js
        window.showNotification(message, type);
    }
    
    // Initialize the form
    initForm();
});
