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
    const userId = urlParams.get('user_id');
    
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
        
        // Show first slide
        showSlide(currentSlide);
        
        // If user ID exists, load saved responses
        if (userId) {
            loadUserData();
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
        const answeredQuestions = Object.keys(userResponses).length;
        const targetQuestions = user.payment_tier === 'premium' ? PREMIUM_TIER_QUESTIONS : BASIC_TIER_QUESTIONS;
        const allQuestionsAnswered = answeredQuestions >= targetQuestions;
        
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
        
        // Update progress bar
        const maxQuestions = user.payment_tier === 'premium' ? PREMIUM_TIER_QUESTIONS : BASIC_TIER_QUESTIONS;
        const progress = (slideIndex / maxQuestions) * 100;
        progressFill.style.width = `${Math.min(progress, 100)}%`;
        
        // Update current question number (adjust for user info slide)
        if (slideIndex > 0) {
            currentQuestionSpan.textContent = slideIndex;
        }
        
        // Update button states
        prevButton.disabled = slideIndex === 0;
        
        // Check if we've reached the end of the current tier
        const isEndOfBasicTier = slideIndex === BASIC_TIER_QUESTIONS && user.payment_tier !== 'premium';
        const isEndOfPremiumTier = slideIndex === PREMIUM_TIER_QUESTIONS;
        
        if (isEndOfBasicTier || isEndOfPremiumTier) {
            nextButton.style.display = 'none';
            submitButton.style.display = 'block';
            
            // Update submit button state
            updateSubmitButtonState();
            
            // Set up textarea listeners for real-time updates
            setupTextareaListeners();
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
            
            // Save user info
            user.name = nameInput.value.trim();
            user.email = emailInput.value.trim();
            
            // Create or update user
            if (!user.id) {
                createUser();
            } else {
                updateUser();
            }
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
    function submitForm() {
        // Save final question response
        saveCurrentSlideData();
        
        // Update submit button state
        updateSubmitButtonState();
        
        // If button is disabled, don't proceed
        if (submitButton.disabled || submitButton.classList.contains('disabled')) {
            const answeredQuestions = Object.keys(userResponses).length;
            const targetQuestions = user.payment_tier === 'premium' ? PREMIUM_TIER_QUESTIONS : BASIC_TIER_QUESTIONS;
            showNotification(`Please answer all questions. You've completed ${answeredQuestions} of ${targetQuestions}.`, 'error');
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
    
    // Initiate payment process
    function initiatePayment(tier) {
        // Hide payment modals
        basicPaymentModal.style.display = 'none';
        premiumPaymentModal.style.display = 'none';
        
        // Show loading overlay
        loadingOverlay.style.display = 'flex';
        loadingMessage.textContent = 'Preparing payment...';
        
        // Call payment API
        fetch(`/api/payments/${user.id}/create-checkout-session/${tier}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to create checkout session');
            }
            return response.json();
        })
        .then(data => {
            // Redirect to checkout URL
            window.location.href = data.checkout_url;
        })
        .catch(error => {
            console.error('Error creating checkout session:', error);
            loadingOverlay.style.display = 'none';
            showNotification('Error processing payment. Please try again.', 'error');
        });
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
    
    // Create user
    async function createUser() {
        try {
            const response = await fetch('/api/users/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: user.name,
                    email: user.email,
                    dob: new Date().toISOString(), // This should be collected in the registration page
                    progress_state: '0',
                    payment_tier: 'none'
                }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to create user');
            }
            
            const data = await response.json();
            user.id = data.id;
            
            // Update URL with user ID
            const newUrl = `${window.location.pathname}/${user.id}`;
            window.history.replaceState({}, '', newUrl);
            
            // Show save URL modal
            showSaveUrlModal();
            
            showNotification('Your progress will be saved automatically.');
            
        } catch (error) {
            console.error('Error creating user:', error);
            showNotification('Error creating user. Please try again.', 'error');
        }
    }
    
    // Update user
    async function updateUser() {
        try {
            const response = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: user.name,
                    email: user.email,
                    progress_state: user.progress_state,
                    payment_tier: user.payment_tier
                }),
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
            
            const apiResponse = await fetch('/api/form-responses/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(responseData),
            });
            
            if (!apiResponse.ok) {
                throw new Error('Failed to save response');
            }
            
            // Update progress state
            if (parseInt(user.progress_state) < questionNumber) {
                user.progress_state = questionNumber.toString();
                
                // Update user progress on server
                await fetch(`/api/users/${user.id}/progress`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        progress_state: user.progress_state
                    }),
                });
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
            if (progressState > 0) {
                showSlide(progressState);
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
