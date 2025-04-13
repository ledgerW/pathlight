// Form core functionality for Pathlight

// Global variables
let currentSlide = 0;
let totalSlides = 26; // 25 questions + 1 user info slide
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
    
    // Utility function to show notifications
    function showNotification(message, type = 'success') {
        // Use the custom toast notification from base.js
        window.showNotification(message, type);
    }
    
    // Initialize the form
    initForm();
});
