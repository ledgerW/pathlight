// Form UI functionality for Pathlight

// Preload images
function preloadImages() {
    console.log('Preloading images...');
    imageNames.forEach(imageName => {
        const img = new Image();
        img.src = `/static/images/${imageName}`;
        console.log(`Preloaded image: ${imageName}`);
    });
}

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
        document.getElementById('formSlides').appendChild(newSlide);
    }
    
    console.log('Remaining slides generated.');
}

// Update tier badge based on current progress and payment tier
function updateTierBadge() {
    const progress = parseInt(user.progress_state);
    const tierBadge = document.getElementById('tierBadge');
    const totalQuestionsSpan = document.getElementById('totalQuestions');
    
    // Check URL parameters for tier
    const urlParams = new URLSearchParams(window.location.search);
    const urlTier = urlParams.get('tier');
    
    // Get the actual tier - use URL parameter, user's payment tier, or default to 'free'
    let actualTier = 'free';
    
    if (user.payment_tier && user.payment_tier !== 'none') {
        // Use the user's payment tier if it exists
        actualTier = user.payment_tier;
    } else if (urlTier) {
        // Otherwise use the URL parameter if it exists
        actualTier = urlTier;
    }
    
    console.log('Updating tier badge with actual tier:', actualTier);
    
    // If tier badge doesn't exist, just update the total questions span
    if (!tierBadge) {
        console.log('Tier badge element not found, updating only total questions');
        if (totalQuestionsSpan) {
            if (actualTier === 'premium' || actualTier === 'pursuit' || actualTier === 'plan') {
                totalQuestionsSpan.textContent = PREMIUM_TIER_QUESTIONS;
            } else {
                totalQuestionsSpan.textContent = BASIC_TIER_QUESTIONS;
            }
        }
        return;
    }
    
    // Make sure the progress tier badge is hidden
    const progressTierBadge = document.getElementById('progressTierBadge');
    if (progressTierBadge) {
        progressTierBadge.style.display = 'none';
    }
    
    // Update tier badge text and class based on the actual tier
    if (actualTier === 'pursuit') {
        tierBadge.textContent = 'Pursuit Tier';
        tierBadge.className = 'tier-badge premium';
        if (totalQuestionsSpan) totalQuestionsSpan.textContent = PREMIUM_TIER_QUESTIONS;
    } else if (actualTier === 'plan' || actualTier === 'premium') {
        tierBadge.textContent = 'Plan Tier';
        tierBadge.className = 'tier-badge premium';
        if (totalQuestionsSpan) totalQuestionsSpan.textContent = PREMIUM_TIER_QUESTIONS;
    } else if (actualTier === 'basic' || actualTier === 'purpose' || progress >= BASIC_TIER_QUESTIONS) {
        tierBadge.textContent = 'Purpose Tier';
        tierBadge.className = 'tier-badge basic';
        if (totalQuestionsSpan) totalQuestionsSpan.textContent = BASIC_TIER_QUESTIONS;
    } else {
        tierBadge.textContent = 'Free Tier';
        tierBadge.className = 'tier-badge free';
        if (totalQuestionsSpan) totalQuestionsSpan.textContent = BASIC_TIER_QUESTIONS;
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
    const submitButton = document.getElementById('submitButton');
    
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
    console.log('Actual tier for validation:', actualTier);
    
    // If we're in Plan or Pursuit tier mode, always enable the submit button
    if (actualTier === 'plan' || actualTier === 'pursuit') {
        console.log('Plan or Pursuit tier detected, bypassing validation');
        submitButton.disabled = false;
        submitButton.classList.remove('disabled');
        submitButton.title = 'Submit your information';
        return;
    }
    
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
    console.log('showSlide called with index:', slideIndex);
    
    // Hide all slides
    const slides = document.querySelectorAll('.form-slide');
    console.log('Found slides:', slides.length);
    
    // Debug: List all slides
    slides.forEach((slide, index) => {
        console.log(`Slide ${index + 1} data-slide:`, slide.getAttribute('data-slide'));
    });
    
    slides.forEach(slide => {
        slide.classList.remove('active');
        slide.style.display = 'none'; // Explicitly hide all slides
    });
    
    // Show the current slide using data-slide attribute
    const targetSlide = document.querySelector(`.form-slide[data-slide="${slideIndex}"]`);
    if (targetSlide) {
        targetSlide.classList.add('active');
        targetSlide.style.display = 'block'; // Explicitly show the target slide
        console.log('Activated slide with data-slide:', slideIndex);
    } else {
        console.error('Slide not found with data-slide:', slideIndex);
        
        // Fallback: Try to show the first slide if target not found
        const firstSlide = document.querySelector('.form-slide');
        if (firstSlide) {
            firstSlide.classList.add('active');
            firstSlide.style.display = 'block';
            console.log('Fallback: Showing first slide');
        }
    }
    
    // Handle progress display for question slides
    const progressTextElement = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');
    const currentQuestionSpan = document.getElementById('currentQuestion');
    const currentMarker = document.getElementById('currentMarker');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const submitButton = document.getElementById('submitButton');
    
    // Show question counter for question slides
    progressTextElement.style.visibility = 'visible';
    
    // Calculate progress percentage
    const totalQuestionsForProgress = PREMIUM_TIER_QUESTIONS;
    const progress = ((slideIndex) / totalQuestionsForProgress) * 100;
    progressFill.style.width = `${Math.min(progress, 100)}%`;
    
    // Update current question number
    currentQuestionSpan.textContent = slideIndex;
    
    // Update total questions display
    document.getElementById('totalQuestions').textContent = PREMIUM_TIER_QUESTIONS;
    
    // Update current marker position and image
    currentMarker.style.display = 'block';
    // Position the marker at the correct percentage point
    // Subtract half the width of the marker to center it
    currentMarker.style.left = `calc(${Math.min(progress, 100)}% - 20px)`;
    
    // Get the current image name based on the slide index
    const currentImageName = imageNames[slideIndex - 1];
    currentMarker.style.backgroundImage = `url('/static/images/${currentImageName}')`;
    
    // Update button states
    prevButton.disabled = slideIndex === 1; // Disable prev button on first question
    
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
    // Save current question response
    saveCurrentSlideData();
    
    // Check if we're at the end of basic tier and need to show payment modal
    if (currentSlide === BASIC_TIER_QUESTIONS && user.payment_tier === 'none') {
        // Show basic payment modal
        document.getElementById('basicPaymentModal').style.display = 'flex';
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
    } else if (!user.id && response) {
        // Save to localStorage for anonymous users
        try {
            // Get existing responses from localStorage
            let savedResponses = {};
            const existingResponses = localStorage.getItem('anonymousResponses');
            if (existingResponses) {
                savedResponses = JSON.parse(existingResponses);
            }
            
            // Update with current response
            savedResponses[questionNumber] = response;
            
            // Save back to localStorage
            localStorage.setItem('anonymousResponses', JSON.stringify(savedResponses));
            console.log('Saved anonymous response to localStorage:', questionNumber, response);
            console.log('All anonymous responses:', savedResponses);
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
    }
    
    // If we're on the last slide, update the submit button state
    if (currentSlide === BASIC_TIER_QUESTIONS || currentSlide === PREMIUM_TIER_QUESTIONS) {
        updateSubmitButtonState();
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
