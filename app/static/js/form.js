// Form page JavaScript for Pathlight

document.addEventListener('DOMContentLoaded', function() {
    // Debug: Check if questions and imageNames arrays are defined
    console.log('Questions array:', questions);
    console.log('Image names array:', imageNames);
    
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
    
    // State variables
    let currentSlide = 0;
    let totalSlides = 26; // 25 questions + 1 user info slide
    let userResponses = {};
    let user = {
        id: userId || null,
        name: '',
        email: '',
        progress_state: '0',
        payment_tier: 'none'
    };
    
    // Constants for tiers
    const BASIC_TIER_QUESTIONS = 5;
    const PREMIUM_TIER_QUESTIONS = 25;
    
    // Generate remaining question slides (from 6 to 25)
    function generateRemainingSlides() {
        console.log('Generating remaining question slides...');
        const templateDiv = document.getElementById('questionSlideTemplate');
        
        if (!templateDiv) {
            console.error('Question slide template not found!');
            return;
        }
        
        console.log('Template found:', templateDiv);
        
        // Start from index 5 (question 6) since we've hardcoded questions 1-5
        for (let i = 5; i < questions.length; i++) {
            const questionNumber = i + 1;
            const imageName = imageNames[i];
            const imageAlt = imageName.replace('.png', '');
            const questionText = questions[i];
            
            console.log(`Generating slide ${questionNumber} with image ${imageName}`);
            
            // Create a new slide element
            const newSlide = document.createElement('div');
            newSlide.className = 'form-slide';
            newSlide.setAttribute('data-slide', questionNumber);
            
            // Create the slide content
            newSlide.innerHTML = `
                <div class="slide-content">
                    <div class="slide-image-container">
                        <img src="/static/images/${imageName}" alt="${imageAlt}" class="slide-image">
                    </div>
                    <div class="slide-text">
                        <h2>Question ${questionNumber}</h2>
                        <p class="question-text">${questionText}</p>
                        <div class="form-fields">
                            <div class="form-field">
                                <textarea id="question${questionNumber}" name="question${questionNumber}" rows="6" placeholder="Your response..."></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Append the new slide to the form slides container
            formSlides.appendChild(newSlide);
        }
        
        console.log('Remaining slides generated.');
    }
    
    // Preload images
    function preloadImages() {
        console.log('Preloading images...');
        imageNames.forEach(imageName => {
            const img = new Image();
            img.src = `/static/images/${imageName}`;
            console.log(`Preloaded image: ${imageName}`);
        });
    }
    
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
            });
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
            loadUserData();
        } else {
            // Show first slide for new users
            showSlide(currentSlide);
        }
    }
    
    // Update tier badge based on current progress and payment tier
    function updateTierBadge() {
        const progress = parseInt(user.progress_state);
        
        if (user.payment_tier === 'premium') {
            tierBadge.textContent = 'Premium Tier';
            tierBadge.className = 'tier-badge premium';
            totalQuestionsSpan.textContent = PREMIUM_TIER_QUESTIONS;
        } else if (user.payment_tier === 'basic' || progress >= BASIC_TIER_QUESTIONS) {
            tierBadge.textContent = 'Basic Tier';
            tierBadge.className = 'tier-badge basic';
            totalQuestionsSpan.textContent = BASIC_TIER_QUESTIONS;
        } else {
            tierBadge.textContent = 'Free Tier';
            tierBadge.className = 'tier-badge free';
            totalQuestionsSpan.textContent = BASIC_TIER_QUESTIONS;
        }
    }
    
    // Set up textarea event listeners for real-time submit button updates
    function setupTextareaListeners() {
        // Add input event listeners to all textareas
        for (let i = 1; i <= 25; i++) {
            const textarea = document.getElementById(`question${i}`);
            if (textarea) {
                // Remove any existing listeners to avoid duplicates
                const newTextarea = textarea.cloneNode(true);
                textarea.parentNode.replaceChild(newTextarea, textarea);
                
                // Add new input listener
                newTextarea.addEventListener('input', function() {
                    // Only save if the value is not empty
                    if (this.value.trim()) {
                        // Save to state
                        userResponses[i] = this.value.trim();
                        
                        // If we're on the last slide, update submit button state
                        if (currentSlide === totalSlides - 1) {
                            updateSubmitButtonState();
                        }
                    }
                });
            }
        }
    }
    
    // Update submit button state based on form completion
    function updateSubmitButtonState() {
        console.log('Updating submit button state');
        
        // First, save any unsaved responses from textareas
        for (let i = 1; i <= BASIC_TIER_QUESTIONS; i++) {
            const textarea = document.getElementById(`question${i}`);
            if (textarea && textarea.value.trim() && !userResponses[i]) {
                userResponses[i] = textarea.value.trim();
            }
        }
        
        console.log('User responses:', userResponses);
        
        // Count responses up to the current tier limit
        let answeredQuestions = 0;
        const targetQuestions = user.payment_tier === 'premium' ? PREMIUM_TIER_QUESTIONS : BASIC_TIER_QUESTIONS;
        
        // Count responses for questions 1 through targetQuestions
        for (let i = 1; i <= targetQuestions; i++) {
            if (userResponses[i]) {
                answeredQuestions++;
                console.log(`Question ${i} has response: ${userResponses[i].substring(0, 20)}...`);
            } else {
                console.log(`Question ${i} has no response`);
            }
        }
        
        console.log(`Answered ${answeredQuestions} of ${targetQuestions} questions`);
        const allQuestionsAnswered = answeredQuestions >= targetQuestions;
        
        console.log(`All questions answered: ${allQuestionsAnswered}`);
        console.log(`Submit button before: disabled=${submitButton.disabled}, class=${submitButton.className}`);
        
        // Enable/disable submit button based on completion
        submitButton.disabled = !allQuestionsAnswered;
        
        // Add visual indication
        if (!allQuestionsAnswered) {
            submitButton.classList.add('disabled');
            submitButton.title = `Please answer all questions. You've completed ${answeredQuestions} of ${targetQuestions}.`;
        } else {
            submitButton.classList.remove('disabled');
            submitButton.title = 'Submit your responses';
        }
        
        console.log(`Submit button after: disabled=${submitButton.disabled}, class=${submitButton.className}`);
    }
    
    // Show a specific slide
    function showSlide(slideIndex) {
        // Hide all slides
        const slides = document.querySelectorAll('.form-slide');
        console.log('Found slides:', slides.length);
        
        slides.forEach(slide => {
            slide.classList.remove('active');
        });
        
        // Show the current slide
        if (slides[slideIndex]) {
            slides[slideIndex].classList.add('active');
            console.log('Activated slide:', slideIndex);
        } else {
            console.error('Slide not found:', slideIndex);
        }
        
        // Handle progress display differently for intro slide vs. question slides
        const progressTextElement = document.getElementById('progressText');
        
        if (slideIndex === 0) {
            // Hide question counter for intro slide
            progressTextElement.style.visibility = 'hidden';
            progressFill.style.width = '0%';
        } else {
            // Show question counter for question slides
            progressTextElement.style.visibility = 'visible';
            
            // Update progress bar
            const maxQuestions = user.payment_tier === 'premium' ? PREMIUM_TIER_QUESTIONS : BASIC_TIER_QUESTIONS;
            const progress = ((slideIndex - 1) / maxQuestions) * 100; // Adjust for intro slide
            progressFill.style.width = `${Math.min(progress, 100)}%`;
            
            // Update current question number
            currentQuestionSpan.textContent = slideIndex;
        }
        
        // Update button states
        prevButton.disabled = slideIndex === 0;
        
        // Check if we've reached the end of the current tier
        const isEndOfBasicTier = slideIndex === BASIC_TIER_QUESTIONS && user.payment_tier !== 'premium';
        const isEndOfPremiumTier = slideIndex === PREMIUM_TIER_QUESTIONS;
        
        if (isEndOfBasicTier || isEndOfPremiumTier) {
            // Special handling for question 5 when user already has basic results
            const hasBasicResults = user.payment_tier === 'basic' || user.payment_tier === 'premium';
            
            if (slideIndex === BASIC_TIER_QUESTIONS && hasBasicResults) {
                // Show both Next and Complete buttons for users with basic results
                nextButton.style.display = 'block';
                submitButton.style.display = 'block';
                
                // Update button text to "Update Purpose"
                submitButton.textContent = 'Update Purpose';
            } else if (slideIndex === PREMIUM_TIER_QUESTIONS && user.payment_tier === 'premium') {
                // Show only the Complete button for premium tier with text "Update Plan"
                nextButton.style.display = 'none';
                submitButton.style.display = 'block';
                submitButton.textContent = 'Update Plan';
            } else if (slideIndex === PREMIUM_TIER_QUESTIONS) {
                // Show only the Complete button for premium tier with text "Get Plan"
                nextButton.style.display = 'none';
                submitButton.style.display = 'block';
                submitButton.textContent = 'Get Plan';
            } else {
                // Default case for question 5 without basic results
                nextButton.style.display = 'none';
                submitButton.style.display = 'block';
                submitButton.textContent = 'Get Purpose';
            }
            
            // Update submit button state
            updateSubmitButtonState();
            
            // Set up textarea listeners for real-time updates
            setupTextareaListeners();
            
            // Check if we need to initialize the current slide's textarea
            const currentTextarea = document.getElementById(`question${slideIndex}`);
            if (currentTextarea) {
                // Add input event listener to the current textarea
                currentTextarea.addEventListener('input', function() {
                    // Save to userResponses on input
                    if (this.value.trim()) {
                        userResponses[slideIndex] = this.value.trim();
                        // Update submit button state immediately
                        updateSubmitButtonState();
                    }
                });
                
                // Also initialize if it already has content
                if (currentTextarea.value.trim()) {
                    userResponses[slideIndex] = currentTextarea.value.trim();
                    updateSubmitButtonState();
                }
            }
        } else {
            nextButton.style.display = 'block';
            submitButton.style.display = 'none';
        }
        
        // Set current slide
        currentSlide = slideIndex;
    }
    
    // Go to previous slide
    function goToPrevSlide() {
        if (currentSlide > 0) {
            saveCurrentSlideData();
            showSlide(currentSlide - 1);
        }
    }
    
    // Go to next slide
    function goToNextSlide() {
        if (currentSlide === 0) {
            // Validate user info
            const nameInput = document.getElementById('userName');
            const emailInput = document.getElementById('userEmail');
            const dobInput = document.getElementById('userDob');
            
            if (!nameInput.value.trim()) {
                showNotification('Please enter your name.', 'error');
                nameInput.focus();
                return;
            }
            
            if (!emailInput.value.trim() || !isValidEmail(emailInput.value.trim())) {
                showNotification('Please enter a valid email address.', 'error');
                emailInput.focus();
                return;
            }
            
            if (!dobInput.value) {
                showNotification('Please enter your date of birth.', 'error');
                dobInput.focus();
                return;
            }
            
            // Save user info
            const newName = nameInput.value.trim();
            const newEmail = emailInput.value.trim();
            const newDob = dobInput.value;
            
            // Check if user exists
            checkExistingUser(newEmail).then(existingUserData => {
                if (existingUserData) {
                    // User exists
                    const existingUserId = existingUserData.id;
                    
                    // Check if user has responses or results
                    if (existingUserData.has_responses || existingUserData.has_results) {
                        // User has existing data, send magic link for authentication
                        showNotification('You already have an account with saved responses. Sending a magic link to your email...', 'info');
                        
                        // Send magic link
                        sendMagicLink(newEmail).then(success => {
                            if (success) {
                                // Show message about checking email
                                showNotification('Please check your email to continue your journey.', 'success');
                            } else {
                                // Show error message
                                showNotification('Failed to send magic link. Please try again.', 'error');
                            }
                        });
                    } else {
                        // User exists but has no responses, redirect to their form
                        showNotification('You already have an account. Redirecting to continue your journey...', 'info');
                        setTimeout(() => {
                            window.location.href = `/form/${existingUserId}`;
                        }, 2000);
                    }
                } else {
                    // Create new user
                    user.name = newName;
                    user.email = newEmail;
                    createUser(newDob);
                }
            });
            
            return;
        } else {
            // Save current question response
            saveCurrentSlideData();
        }
        
        // Check if we're at the end of basic tier and need to show payment modal
        if (currentSlide === BASIC_TIER_QUESTIONS && user.payment_tier === 'none') {
            // Show basic payment modal
            basicPaymentModal.style.display = 'flex';
            return;
        }
        
        if (currentSlide < totalSlides - 1) {
            showSlide(currentSlide + 1);
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
        }
        
        // If we're on the last slide, update the submit button state
        if (currentSlide === BASIC_TIER_QUESTIONS || currentSlide === PREMIUM_TIER_QUESTIONS) {
            updateSubmitButtonState();
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
        
        // Check if we're at question 5 with basic results and the user wants to continue without updating
        const isAtBasicTier = currentSlide === BASIC_TIER_QUESTIONS;
        const hasBasicResults = user.payment_tier === 'basic' || user.payment_tier === 'premium';
        
        // If the button text is "Update Purpose" or "Update Plan", proceed with result generation
        // Otherwise, if we're at question 5 with basic results, we'll handle this in continueSubmitProcess
        
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
    function continueSubmitProcess() {
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
        
        if (isAtBasicTier && hasBasicResults && submitButton.textContent === 'Update Purpose') {
            // User wants to update their basic results
            // Show loading overlay
            loadingOverlay.style.display = 'flex';
            loadingMessage.textContent = 'Updating your personal insight...';
            generateBasicResults();
            return;
        }
        
        // Check if we're at the end of basic tier and need to show payment modal
        if (currentSlide === BASIC_TIER_QUESTIONS && user.payment_tier === 'none') {
            // Show basic payment modal
            basicPaymentModal.style.display = 'flex';
            return;
        }
        
        // Check if we're at the end of premium tier and need to show payment modal
        if (currentSlide === PREMIUM_TIER_QUESTIONS && user.payment_tier !== 'premium') {
            // Show premium payment modal
            premiumPaymentModal.style.display = 'flex';
            return;
        }
        
        // Show loading overlay
        loadingOverlay.style.display = 'flex';
        
        // Generate results based on tier
        if (user.payment_tier === 'premium') {
            loadingMessage.textContent = 'Generating your comprehensive life plan...';
            generatePremiumResults();
        } else {
            loadingMessage.textContent = 'Generating your personal insight...';
            generateBasicResults();
        }
    }
    
    // Show save URL modal
    function showSaveUrlModal() {
        if (user.id) {
            uniqueUrlInput.value = `${window.location.origin}/form/${user.id}`;
            saveUrlModal.style.display = 'flex';
        }
    }
    
    // Stripe payment elements
    let stripe;
    let elements;
    let paymentElement;
    let currentTier;
    let paymentModal;
    let paymentForm;
    
    // Initialize Stripe
    async function initializeStripe() {
        return new Promise((resolve, reject) => {
            try {
                // Check if Stripe is already loaded
                if (typeof Stripe === 'undefined') {
                    // Load Stripe.js dynamically
                    const script = document.createElement('script');
                    script.src = 'https://js.stripe.com/v3/';
                    script.async = true;
                    script.onload = () => {
                        try {
                            stripe = Stripe('pk_test_51RBFMYIJ9UdLUkqAzojvqca8S7Xs4mXzUUN4p1rUMKGWZUOQRS9r6HaHLOGw26N7ko72iJPuoITaHqxGF8GTtfTg007gnFycP7');
                            console.log('Stripe.js loaded');
                            resolve(stripe);
                        } catch (error) {
                            console.error('Error initializing Stripe object:', error);
                            reject(error);
                        }
                    };
                    script.onerror = (error) => {
                        console.error('Error loading Stripe.js:', error);
                        reject(error);
                    };
                    document.head.appendChild(script);
                } else {
                    try {
                        stripe = Stripe('pk_test_51RBFMYIJ9UdLUkqAzojvqca8S7Xs4mXzUUN4p1rUMKGWZUOQRS9r6HaHLOGw26N7ko72iJPuoITaHqxGF8GTtfTg007gnFycP7');
                        console.log('Stripe.js already loaded');
                        resolve(stripe);
                    } catch (error) {
                        console.error('Error initializing Stripe object:', error);
                        reject(error);
                    }
                }
            } catch (error) {
                console.error('Error in initializeStripe:', error);
                reject(error);
            }
        });
    }
    
    // Create payment modal
    function createPaymentModal(tier, productName, productDescription, amount) {
        // Create modal container if it doesn't exist
        if (!document.getElementById('stripePaymentModal')) {
            const modalContainer = document.createElement('div');
            modalContainer.id = 'stripePaymentModal';
            modalContainer.className = 'modal';
            modalContainer.style.display = 'none';
            
            // Create modal content
            modalContainer.innerHTML = `
                <div class="modal-content payment-modal-content">
                    <span class="close-modal" id="closeStripeModal">&times;</span>
                    <h2 id="paymentModalTitle">Complete Your Purchase</h2>
                    <p id="paymentModalDescription"></p>
                    <div id="paymentModalPrice" class="payment-price"></div>
                    
                    <form id="payment-form">
                        <div id="payment-element"></div>
                        <button id="submit-payment" class="btn-primary payment-button">
                            <div class="spinner hidden" id="spinner"></div>
                            <span id="button-text">Pay Now</span>
                        </button>
                        <div id="payment-message" class="payment-message"></div>
                    </form>
                </div>
            `;
            
            document.body.appendChild(modalContainer);
            
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .payment-modal-content {
                    max-width: 500px;
                }
                .payment-price {
                    font-size: 24px;
                    font-weight: bold;
                    margin: 20px 0;
                    color: #4a90e2;
                }
                #payment-element {
                    margin-bottom: 24px;
                }
                .payment-button {
                    background: #4a90e2;
                    color: white;
                    border: 0;
                    padding: 12px 16px;
                    border-radius: 4px;
                    margin-top: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    width: 100%;
                    transition: all 0.2s ease;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .payment-button:hover {
                    filter: brightness(1.1);
                }
                .payment-button:disabled {
                    opacity: 0.5;
                    cursor: default;
                }
                .spinner {
                    color: #ffffff;
                    font-size: 22px;
                    text-indent: -99999px;
                    margin: 0px auto;
                    position: relative;
                    width: 20px;
                    height: 20px;
                    box-shadow: inset 0 0 0 2px;
                    -webkit-transform: translateZ(0);
                    -ms-transform: translateZ(0);
                    transform: translateZ(0);
                    border-radius: 50%;
                    margin-right: 10px;
                }
                .spinner:before, .spinner:after {
                    position: absolute;
                    content: '';
                }
                .spinner:before {
                    width: 10.4px;
                    height: 20.4px;
                    background: #4a90e2;
                    border-radius: 20.4px 0 0 20.4px;
                    top: -0.2px;
                    left: -0.2px;
                    -webkit-transform-origin: 10.4px 10.2px;
                    transform-origin: 10.4px 10.2px;
                    -webkit-animation: loading 2s infinite ease 1.5s;
                    animation: loading 2s infinite ease 1.5s;
                }
                .spinner:after {
                    width: 10.4px;
                    height: 10.2px;
                    background: #4a90e2;
                    border-radius: 0 10.2px 10.2px 0;
                    top: -0.1px;
                    left: 10.2px;
                    -webkit-transform-origin: 0px 10.2px;
                    transform-origin: 0px 10.2px;
                    -webkit-animation: loading 2s infinite ease;
                    animation: loading 2s infinite ease;
                }
                .hidden {
                    display: none;
                }
                .payment-message {
                    color: rgb(105, 115, 134);
                    font-size: 16px;
                    line-height: 20px;
                    padding-top: 12px;
                    text-align: center;
                }
                @keyframes loading {
                    0% {
                        -webkit-transform: rotate(0deg);
                        transform: rotate(0deg);
                    }
                    100% {
                        -webkit-transform: rotate(360deg);
                        transform: rotate(360deg);
                    }
                }
            `;
            document.head.appendChild(style);
            
            // Add event listener for close button
            document.getElementById('closeStripeModal').addEventListener('click', () => {
                document.getElementById('stripePaymentModal').style.display = 'none';
            });
        }
        
        // Update modal content
        document.getElementById('paymentModalTitle').textContent = `Purchase ${productName}`;
        document.getElementById('paymentModalDescription').textContent = productDescription;
        document.getElementById('paymentModalPrice').textContent = `$${(amount / 100).toFixed(2)}`;
        
        // Store reference to modal
        paymentModal = document.getElementById('stripePaymentModal');
        paymentForm = document.getElementById('payment-form');
        
        // Show the modal
        paymentModal.style.display = 'flex';
    }
    
    // Initialize payment elements
    async function initializePaymentElements(clientSecret) {
        // Make sure elements is not already initialized
        if (elements) {
            elements.destroy();
        }
        
        // Create elements instance
        elements = stripe.elements({
            clientSecret: clientSecret,
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#4a90e2',
                    colorBackground: '#ffffff',
                    colorText: '#30313d',
                    colorDanger: '#df1b41',
                    fontFamily: 'Roboto, Open Sans, Segoe UI, sans-serif',
                    spacingUnit: '4px',
                    borderRadius: '4px'
                }
            }
        });
        
        // Create and mount the Payment Element
        paymentElement = elements.create('payment');
        paymentElement.mount('#payment-element');
        
        // Add event listener for form submission
        paymentForm.addEventListener('submit', handlePaymentSubmission);
    }
    
    // Handle payment submission
    async function handlePaymentSubmission(e) {
        e.preventDefault();
        
        // Show loading state
        setLoading(true);
        
        // Confirm payment
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + '/form/' + user.id,
            },
            redirect: 'if_required'
        });
        
        if (error) {
            // Show error message
            const messageContainer = document.getElementById('payment-message');
            messageContainer.textContent = error.message;
            setLoading(false);
            return;
        }
        
        // Payment succeeded, get the PaymentIntent ID
        const paymentIntent = await stripe.retrievePaymentIntent(elements._commonOptions.clientSecret);
        
        if (paymentIntent.paymentIntent.status === 'succeeded') {
            // Confirm payment with our backend
            confirmPaymentWithBackend(paymentIntent.paymentIntent.id, currentTier);
        } else {
            // Show error message
            const messageContainer = document.getElementById('payment-message');
            messageContainer.textContent = 'Payment failed. Please try again.';
            setLoading(false);
        }
    }
    
    // Confirm payment with backend
    async function confirmPaymentWithBackend(paymentIntentId, tier) {
        try {
            const response = await fetch(`/api/payments/${user.id}/confirm-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_intent_id: paymentIntentId,
                    tier: tier
                })
            });
            
            const data = await response.json();
            
            if (data.payment_verified) {
                // Show success message
                const messageContainer = document.getElementById('payment-message');
                messageContainer.textContent = 'Payment successful! Generating your results...';
                
                // Hide payment modal after a short delay
                setTimeout(() => {
                    paymentModal.style.display = 'none';
                    
                    // Show loading overlay
                    loadingOverlay.style.display = 'flex';
                    loadingMessage.textContent = tier === 'premium' ? 
                        'Generating your comprehensive life plan...' : 
                        'Generating your personal insight...';
                    
                    // Generate results
                    if (tier === 'premium') {
                        generatePremiumResults();
                    } else {
                        generateBasicResults();
                    }
                }, 2000);
            } else {
                // Show error message
                const messageContainer = document.getElementById('payment-message');
                messageContainer.textContent = 'Payment verification failed. Please try again.';
                setLoading(false);
            }
        } catch (error) {
            console.error('Error confirming payment:', error);
            const messageContainer = document.getElementById('payment-message');
            messageContainer.textContent = 'Error confirming payment. Please try again.';
            setLoading(false);
        }
    }
    
    // Set loading state
    function setLoading(isLoading) {
        const submitButton = document.getElementById('submit-payment');
        const spinner = document.getElementById('spinner');
        const buttonText = document.getElementById('button-text');
        
        if (isLoading) {
            submitButton.disabled = true;
            spinner.classList.remove('hidden');
            buttonText.classList.add('hidden');
        } else {
            submitButton.disabled = false;
            spinner.classList.add('hidden');
            buttonText.classList.remove('hidden');
        }
    }
    
    // Initiate payment process
    async function initiatePayment(tier) {
        try {
            // Store current tier
            currentTier = tier;
            
            // Hide payment modals
            basicPaymentModal.style.display = 'none';
            premiumPaymentModal.style.display = 'none';
            
            // Show loading overlay
            loadingOverlay.style.display = 'flex';
            loadingMessage.textContent = 'Preparing payment...';
            
            // Call payment API to create checkout session
            const response = await fetch(`/api/payments/${user.id}/create-checkout-session/${tier}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to create checkout session');
            }
            
            const data = await response.json();
            console.log('Checkout session created:', data);
            
            // Hide loading overlay
            loadingOverlay.style.display = 'none';
            
            // Redirect to Stripe Checkout
            window.location.href = data.checkout_url;
            
        } catch (error) {
            console.error('Error creating checkout session:', error);
            loadingOverlay.style.display = 'none';
            showNotification('Error processing payment. Please try again.', 'error');
        }
    }
    
    // Utility function to validate email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Utility function to copy text to clipboard
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            return successful;
        } catch (err) {
            document.body.removeChild(textarea);
            return false;
        }
    }
    
    // Utility function to show notifications
    function showNotification(message, type = 'success') {
        // Use the custom toast notification from base.js
        window.showNotification(message, type);
    }
    
    // API Functions
    
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
                // Return the full user data object
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
            
            // Check if we have a specific slide to start at
            if (window.startAtSlide !== undefined) {
                console.log('Starting at specific slide:', window.startAtSlide);
                // Force the slide to be shown immediately
                showSlide(window.startAtSlide);
                
                // Also force it again after a short delay to ensure it takes effect
                setTimeout(() => {
                    showSlide(window.startAtSlide);
                    console.log('Forced slide again:', window.startAtSlide);
                }, 100);
            }
            // Check if we have a specific question to start at
            else if (window.startAtQuestion !== undefined) {
                console.log('Starting at specific question:', window.startAtQuestion);
                setTimeout(() => {
                    showSlide(window.startAtQuestion);
                }, 100);
            }
            // Otherwise, go to the next unanswered question based on progress
            else {
                const progressState = parseInt(user.progress_state);
                console.log('User progress state:', progressState);
                
                if (progressState > 0) {
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
            loadingOverlay.style.display = 'none';
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
            loadingOverlay.style.display = 'none';
            showNotification('Error generating your results. Please try again.', 'error');
        }
    }
    
    // Initialize the form
    initForm();
});
