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
        console.log('Initializing form...');
        
        // Debug: Check if questions array is defined and has content
        if (!questions || !questions.length) {
            console.error('Questions array is empty or undefined!');
            // Try to recover by defining a default questions array
            if (typeof questions === 'undefined') {
                console.log('Attempting to recover by defining questions array');
                window.questions = [
                    "What activities make you feel most alive, most \"you,\" like time disappears while you're doing them?",
                    "What did you love doing as a child? What were you drawn to naturally, before anyone told you who to be?",
                    "Think of a moment you felt proud of yourself—not for how it looked on the outside, but how it felt on the inside. What was happening?",
                    "Are there sides of yourself you rarely show others? What are they, and why are they hidden?",
                    "When do you feel most authentically yourself? And when do you feel like you're wearing a mask?"
                ];
            }
        } else {
            console.log('Questions array is defined with', questions.length, 'items');
        }
        
        // Debug: Check if imageNames array is defined and has content
        if (!imageNames || !imageNames.length) {
            console.error('ImageNames array is empty or undefined!');
            // Try to recover by defining a default imageNames array
            if (typeof imageNames === 'undefined') {
                console.log('Attempting to recover by defining imageNames array');
                window.imageNames = [
                    "1TheSpark.png", "2TheRoot.png", "3TheFlame.png", "4TheVeil.png", "5TheMirror.png"
                ];
            }
        } else {
            console.log('ImageNames array is defined with', imageNames.length, 'items');
        }
        
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
            const isEndOfBasicTier = currentSlide === BASIC_TIER_QUESTIONS && user.payment_tier !== 'premium' && user.payment_tier !== 'plan' && user.payment_tier !== 'pursuit';
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
        const createAccountButton = document.getElementById('createAccountAndPay');
        
        if (accountCreationModal) {
            if (createAccountButton) {
                createAccountButton.addEventListener('click', () => {
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
            }
            
            // Add close button for account creation modal
            const closeModalButton = accountCreationModal.querySelector('.close-modal');
            if (closeModalButton) {
                closeModalButton.addEventListener('click', () => {
                    accountCreationModal.style.display = 'none';
                });
            }
        }
        
        // Copy URL button
        copyUrlButton.addEventListener('click', () => {
            if (copyToClipboard(uniqueUrlInput.value)) {
                showNotification('URL copied to clipboard!');
            } else {
                showNotification('Failed to copy URL. Please select and copy manually.', 'error');
            }
        });
        
        // Payment buttons
        const proceedToBasicPayment = document.getElementById('proceedToBasicPayment');
        if (proceedToBasicPayment) {
            proceedToBasicPayment.addEventListener('click', () => {
                initiatePayment('basic');
            });
        }
        
        const proceedToPremiumPayment = document.getElementById('proceedToPremiumPayment');
        if (proceedToPremiumPayment) {
            proceedToPremiumPayment.addEventListener('click', () => {
                initiatePayment('premium');
            });
        }
        
        const saveAndExitBasic = document.getElementById('saveAndExitBasic');
        if (saveAndExitBasic) {
            saveAndExitBasic.addEventListener('click', () => {
                if (basicPaymentModal) {
                    basicPaymentModal.style.display = 'none';
                }
                showSaveUrlModal();
            });
        }
        
        const saveAndExitPremium = document.getElementById('saveAndExitPremium');
        if (saveAndExitPremium) {
            saveAndExitPremium.addEventListener('click', () => {
                if (premiumPaymentModal) {
                    premiumPaymentModal.style.display = 'none';
                }
                showSaveUrlModal();
            });
        }
        
        // Regeneration payment modal button
        const confirmRegenerationButton = document.getElementById('confirmRegenerationButton');
        if (confirmRegenerationButton) {
            confirmRegenerationButton.addEventListener('click', () => {
                // Check if user is premium or plan tier to determine which tier to regenerate
                const tier = (user.payment_tier === 'premium' || user.payment_tier === 'plan') ? 'premium' : 'basic';
                initiatePayment(tier, true); // Pass true for regeneration
                
                const regenerationModal = document.getElementById('regenerationModal');
                if (regenerationModal) {
                    regenerationModal.style.display = 'none';
                }
            });
        }
        
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
        
        // Set up pricing options modal event listeners
        setupPricingOptionsModal();
        
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
            // Check if we have a tier parameter in the URL
            const urlTier = urlParams.get('tier');
            
            if (urlTier) {
                // If we have a tier parameter, show the appropriate content
                console.log('URL has tier parameter:', urlTier);
                
                if (urlTier === 'purpose') {
                    // Show first slide for Purpose tier
                    showSlide(currentSlide);
                } else if (urlTier === 'plan' || urlTier === 'pursuit') {
                    // Show account creation modal for Plan or Pursuit tier
                    const accountCreationModal = document.getElementById('accountCreationModal');
                    if (accountCreationModal) {
                        // Update the modal title and button text based on tier
                        const modalTitle = accountCreationModal.querySelector('h2');
                        const modalButton = accountCreationModal.querySelector('#createAccountAndPay');
                        const paymentSection = accountCreationModal.querySelector('.payment-section');
                        
                        if (modalTitle && modalButton && paymentSection) {
                            if (urlTier === 'pursuit') {
                                modalTitle.textContent = 'Create Your Account for Pursuit';
                                modalButton.textContent = 'Create Account & Continue';
                                
                                // Hide the payment section for Pursuit tier since user already knows what they're purchasing
                                if (paymentSection) {
                                    paymentSection.style.display = 'none';
                                }
                            }
                        }
                        
                        // Show the modal
                        accountCreationModal.style.display = 'flex';
                    }
                }
            } else {
                // If no tier parameter and no user ID, show pricing options modal for new visitors
                const pricingOptionsModal = document.getElementById('pricingOptionsModal');
                if (pricingOptionsModal) {
                    pricingOptionsModal.style.display = 'flex';
                } else {
                    // Fallback to showing first slide if modal doesn't exist
                    showSlide(currentSlide);
                }
            }
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
        
        // Check if we're in Plan or Pursuit tier mode
        const urlParams = new URLSearchParams(window.location.search);
        const urlTier = urlParams.get('tier');
        
        // Get server tier from the modal if available
        const accountCreationModal = document.getElementById('accountCreationModal');
        let serverTier = '';
        if (accountCreationModal && accountCreationModal.style.display === 'flex') {
            const modalTitle = accountCreationModal.querySelector('h2');
            if (modalTitle) {
                if (modalTitle.textContent.includes('Plan')) {
                    serverTier = 'plan';
                } else if (modalTitle.textContent.includes('Pursuit')) {
                    serverTier = 'pursuit';
                }
            }
        }
        
        // Determine the actual tier to use
        const actualTier = serverTier || urlTier || '';
        console.log('Actual tier for validation in continueSubmitProcess:', actualTier);
        
        // If we're not in Plan or Pursuit tier mode, check if all questions are answered
        if (actualTier !== 'plan' && actualTier !== 'pursuit') {
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
        } else {
            console.log('Plan or Pursuit tier detected in continueSubmitProcess, bypassing validation');
        }
        
        // Check if we're at question 5 with basic results and the submit button says "Update Purpose"
        const isAtBasicTier = currentSlide === BASIC_TIER_QUESTIONS;
        const hasBasicResults = user.payment_tier === 'basic' || user.payment_tier === 'premium' || user.payment_tier === 'plan' || user.payment_tier === 'pursuit';
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
            
            if (resultsData.has_results && user.payment_tier === 'purpose') {
                // Show regeneration payment modal
                showRegenerationPaymentModal(resultsData.last_generated_at, resultsData.regeneration_count);
                return;
            }
            
            // If no existing results or user hasn't paid yet, proceed with free Purpose tier
            if (user.payment_tier === 'none') {
                // Purpose tier is now free, so initiate the free tier process
                initiatePayment('purpose');
                return;
            }
        }
        
        // Check if we're at the end of premium tier and need to show payment modal
        if (currentSlide === PREMIUM_TIER_QUESTIONS && user.payment_tier !== 'premium' && user.payment_tier !== 'pursuit' && user.payment_tier !== 'plan') {
            // Show premium payment modal
            premiumPaymentModal.style.display = 'flex';
            return;
        }
        
        // If we're at the end of premium tier and the user is on Pursuit tier, generate results directly
        if (currentSlide === PREMIUM_TIER_QUESTIONS && user.payment_tier === 'pursuit') {
            // Show loading overlay
            loadingOverlay.style.display = 'flex';
            loadingMessage.textContent = 'Generating your comprehensive life plan...';
            generatePremiumResults();
            return;
        }
        
        // Check if we're at the end of premium tier and the submit button says "Update Plan"
        const isAtPremiumTier = currentSlide === PREMIUM_TIER_QUESTIONS;
        const hasPremiumResults = user.payment_tier === 'premium' || user.payment_tier === 'plan';
        const isPursuitTier = user.payment_tier === 'pursuit';
        
        if (isAtPremiumTier && submitButton.textContent === 'Update Plan') {
            // User wants to update their premium results
            
            // If user is on Pursuit tier, they can regenerate for free
            if (isPursuitTier) {
                // Show loading overlay
                loadingOverlay.style.display = 'flex';
                loadingMessage.textContent = 'Generating your comprehensive life plan...';
                generatePremiumResults();
                return;
            }
            
            // For Premium tier users, check if results already exist
            if (hasPremiumResults) {
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
        }
        
        // Show loading overlay for other cases
        loadingOverlay.style.display = 'flex';
        
        // Generate results based on tier for other cases
        if (user.payment_tier === 'premium' || user.payment_tier === 'plan') {
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
            console.log('createUserFromAnonymous called with dob:', dob);
            
            // Check if we're creating an account for Plan or Pursuit tier
            const urlParams = new URLSearchParams(window.location.search);
            const tier = urlParams.get('tier');
            console.log('URL tier parameter:', tier);
            
            // Get server tier from the modal if available
            const accountCreationModal = document.getElementById('accountCreationModal');
            let serverTier = '';
            if (accountCreationModal) {
                const modalTitle = accountCreationModal.querySelector('h2');
                if (modalTitle) {
                    if (modalTitle.textContent.includes('Plan')) {
                        serverTier = 'plan';
                    } else if (modalTitle.textContent.includes('Pursuit')) {
                        serverTier = 'pursuit';
                    }
                }
            }
            console.log('Server tier from modal:', serverTier);
            
            // Determine the actual tier to use
            const actualTier = serverTier || tier || 'purpose';
            console.log('Actual tier to use:', actualTier);
            
            // If we're creating an account for Plan or Pursuit tier, we don't need to check for responses
            if (actualTier === 'plan' || actualTier === 'pursuit') {
                console.log('Creating account for Plan or Pursuit tier, skipping response check');
                // Call the createUserFromAnonymous function from form-api.js
                await window.createUserFromAnonymous(dob, actualTier);
                return;
            }
            
            // For other tiers, check for responses in localStorage
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
            await window.createUserFromAnonymous(dob, 'purpose');
            
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
    
    // Set up pricing options modal event listeners
    function setupPricingOptionsModal() {
        const pricingOptionsModal = document.getElementById('pricingOptionsModal');
        if (!pricingOptionsModal) {
            console.log('Pricing options modal not found');
            return;
        }
        
        // Close button
        const closeButton = pricingOptionsModal.querySelector('.close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                pricingOptionsModal.style.display = 'none';
                // Show first slide
                showSlide(currentSlide);
            });
        }
        
        // Purpose tier button
        const purposeButton = document.getElementById('choosePurposeTier');
        if (purposeButton) {
            purposeButton.addEventListener('click', () => {
                pricingOptionsModal.style.display = 'none';
                // Redirect to form with purpose tier parameter
                window.location.href = '/form?tier=purpose';
            });
        }
        
        // Plan tier button
        const planButton = document.getElementById('choosePlanTier');
        if (planButton) {
            planButton.addEventListener('click', () => {
                pricingOptionsModal.style.display = 'none';
                // Redirect to form with plan tier parameter
                window.location.href = '/form?tier=plan';
            });
        }
        
        // Pursuit tier button
        const pursuitButton = document.getElementById('choosePursuitTier');
        if (pursuitButton) {
            pursuitButton.addEventListener('click', () => {
                pricingOptionsModal.style.display = 'none';
                // Redirect to form with pursuit tier parameter
                window.location.href = '/form?tier=pursuit';
            });
        }
        
        // Skip button
        const skipButton = document.getElementById('skipPricingSelection');
        if (skipButton) {
            skipButton.addEventListener('click', () => {
                pricingOptionsModal.style.display = 'none';
                // Show first slide
                showSlide(currentSlide);
            });
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
