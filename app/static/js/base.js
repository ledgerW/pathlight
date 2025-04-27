// Base JavaScript for Pathlight

// Session Management Functions
const SESSION_KEY = 'pathlight_session';
const SESSION_CREATED_KEY = 'pathlight_session_created';
const USER_ID_KEY = 'pathlight_user_id';
const USER_EMAIL_KEY = 'pathlight_user_email';
const AUTH_TOKEN_KEY = 'stytch_session_token';  // Match the cookie name used by the server

// Check if user has an active session in localStorage
function hasLocalSession() {
    return localStorage.getItem(SESSION_KEY) === 'true';
}

// Get session information from localStorage
function getSessionInfo() {
    if (!hasLocalSession()) {
        return null;
    }
    
    return {
        sessionCreated: localStorage.getItem(SESSION_CREATED_KEY),
        userId: localStorage.getItem(USER_ID_KEY),
        userEmail: localStorage.getItem(USER_EMAIL_KEY),
        authToken: localStorage.getItem(AUTH_TOKEN_KEY)
    };
}

// Get authentication token from localStorage
function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

// Check session status with the server
async function checkServerSession() {
    try {
        // Create headers object
        const headers = new Headers({
            'Content-Type': 'application/json'
        });
        
        // If we have an auth token in localStorage, add it to the request headers
        const authToken = getAuthToken();
        if (authToken) {
            headers.append('Authorization', `Bearer ${authToken}`);
            console.log('Using auth token for session check: ' + authToken.substring(0, 10) + '...');
        } else {
            console.log('No auth token available for session check');
        }
        
        // Make the request with the headers
        console.log('Sending session check request to server...');
        const response = await fetch('/auth/check-session', {
            headers: headers,
            credentials: 'include' // Include cookies in the request
        });
        
        console.log('Session check response status:', response.status);
        
        // Handle non-OK responses
        if (!response.ok) {
            console.warn('Session check returned non-OK status:', response.status);
            
            // If we have a token in localStorage but the server rejected it,
            // we might need to clear it
            if (authToken) {
                console.warn('Server rejected our token, may need to re-authenticate');
            }
        }
        
        const data = await response.json();
        console.log('Session check response data:', data);
        
        // If server says we're authenticated but localStorage doesn't have session,
        // update localStorage
        if (data.authenticated && !hasLocalSession()) {
            console.log('Server session found but no local session, updating localStorage');
            localStorage.setItem(SESSION_KEY, 'true');
            localStorage.setItem(SESSION_CREATED_KEY, new Date().toISOString());
            
            if (data.user_id) {
                localStorage.setItem(USER_ID_KEY, data.user_id);
            }
            
            if (data.email) {
                localStorage.setItem(USER_EMAIL_KEY, data.email);
            }
            
            // Try to manually set the session cookie if it's not already set
            if (document.cookie.indexOf('stytch_session_js=true') === -1) {
                console.log('Manually setting session cookie');
                document.cookie = "stytch_session_js=true; path=/; max-age=2592000; SameSite=Lax";
            }
        }
        // If server says we're not authenticated but localStorage has session,
        // clear localStorage
        else if (!data.authenticated && hasLocalSession()) {
            console.log('No server session but local session exists, clearing localStorage');
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(SESSION_CREATED_KEY);
            localStorage.removeItem(USER_ID_KEY);
            localStorage.removeItem(USER_EMAIL_KEY);
            localStorage.removeItem(AUTH_TOKEN_KEY);
        }
        
        return data.authenticated;
    } catch (error) {
        console.error('Error checking session:', error);
        
        // If we're on a page that requires authentication, show a notification
        const requiresAuth = window.location.pathname.includes('/form/') || 
                            window.location.pathname.includes('/results/');
        
        if (requiresAuth) {
            console.error('Authentication error on protected page');
            showNotification('Authentication error. Please try logging in again.', 'error');
        }
        
        return false;
    }
}

// Helper function to format dates
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString(undefined, options);
}

// Helper function to show a notification
function showNotification(message, type = 'info') {
    // Check if notification container exists, create if not
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '1000';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.backgroundColor = type === 'error' ? '#f8d7da' : '#d4edda';
    notification.style.color = type === 'error' ? '#721c24' : '#155724';
    notification.style.padding = '10px 20px';
    notification.style.marginBottom = '10px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    notification.style.position = 'relative';
    notification.style.animation = 'fadeIn 0.3s ease-out';
    
    // Add close button
    const closeButton = document.createElement('span');
    closeButton.innerHTML = '&times;';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '10px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '18px';
    closeButton.onclick = function() {
        notification.remove();
    };
    
    notification.textContent = message;
    notification.appendChild(closeButton);
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
    }
`;
document.head.appendChild(style);

// Helper function to validate email
function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// Helper function to copy text to clipboard
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
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

// Add celestial decorations to the page
function addCelestialDecorations() {
    const container = document.createElement('div');
    container.className = 'celestial-background';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    
    // Add stars
    for (let i = 0; i < 20; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.position = 'absolute';
        star.style.backgroundColor = '#C4A96A';
        star.style.width = `${Math.random() * 10 + 5}px`;
        star.style.height = `${Math.random() * 10 + 5}px`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
        star.style.opacity = '0.3';
        container.appendChild(star);
    }
    
    document.body.appendChild(container);
}

// Set active navigation item based on current page
function setActiveNavItem() {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const section = searchParams.get('section');
    const slide = searchParams.get('slide');
    
    // Get all nav items
    const navItems = document.querySelectorAll('.nav-item');
    
    // Remove active class from all items
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Set active class based on current path
    if (path.includes('/form')) {
        // If we're on the form page
        if (slide === '0') {
            // If we're on the profile slide
            document.querySelectorAll('.nav-item[data-section="profile"]').forEach(item => {
                item.classList.add('active');
            });
        } else {
            // Otherwise we're on reflection
            document.querySelectorAll('.nav-item[data-section="reflection"]').forEach(item => {
                item.classList.add('active');
            });
        }
    } else if (path.includes('/results')) {
        // If we're on the results page
        if (section === 'plan') {
            // If we're viewing the guidance
            document.querySelectorAll('.nav-item[data-section="guidance"]').forEach(item => {
                item.classList.add('active');
            });
        } else {
            // Otherwise we're viewing the insights
            document.querySelectorAll('.nav-item[data-section="insights"]').forEach(item => {
                item.classList.add('active');
            });
        }
    }
}

// Toggle hamburger menu
function toggleHamburgerMenu() {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    if (hamburgerMenu) {
        hamburgerMenu.classList.toggle('active');
    }
}

// Close hamburger menu when clicking outside
function closeHamburgerMenuOnClickOutside(event) {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const hamburgerIcon = document.querySelector('.hamburger-icon');
    
    if (hamburgerMenu && hamburgerMenu.classList.contains('active')) {
        if (!hamburgerMenu.contains(event.target) || !hamburgerIcon.contains(event.target)) {
            hamburgerMenu.classList.remove('active');
        }
    }
}

// Show mobile navigation for logged-in users on mobile devices only
function setupMobileNavigation() {
    // Check if user is logged in by looking for mobile-nav element
    const mobileNav = document.querySelector('.mobile-nav');
    if (mobileNav) {
        // Only show mobile nav on mobile devices
        if (window.innerWidth <= 768) {
            // User is logged in and on mobile, show mobile navigation
            mobileNav.style.display = 'block';
            // Add class to body for padding
            document.body.classList.add('has-mobile-nav');
        } else {
            // On desktop, hide mobile navigation
            mobileNav.style.display = 'none';
            document.body.classList.remove('has-mobile-nav');
        }
    }
}

// Add auth token to fetch requests
function addAuthTokenToFetch() {
    // Store the original fetch function
    const originalFetch = window.fetch;
    
    // Override the fetch function
    window.fetch = function(url, options = {}) {
        // Create headers if they don't exist
        options.headers = options.headers || {};
        
        // If we have an auth token in localStorage, add it to the request headers
        const authToken = getAuthToken();
        if (authToken) {
            console.log('Adding auth token to request: ' + authToken.substring(0, 10) + '...');
            
            // Convert headers to Headers object if it's not already
            if (!(options.headers instanceof Headers)) {
                const headers = new Headers(options.headers);
                headers.append('Authorization', `Bearer ${authToken}`);
                options.headers = headers;
            } else {
                options.headers.append('Authorization', `Bearer ${authToken}`);
            }
        } else {
            console.log('No auth token found in localStorage');
        }
        
        // Call the original fetch with the modified options
        const fetchPromise = originalFetch(url, options);
        
        // Add handling for authentication errors
        return fetchPromise.then(response => {
            // If this is an authentication check and it failed, try to recover
            if (url.includes('/auth/check-session') && !response.ok) {
                console.error('Authentication check failed:', response.status);
                // We'll handle this in the checkServerSession function
            }
            return response;
        }).catch(error => {
            console.error('Fetch error:', error);
            throw error;
        });
    };
}

// Add auth token to XMLHttpRequest
function addAuthTokenToXHR() {
    // Store the original open method
    const originalOpen = XMLHttpRequest.prototype.open;
    
    // Override the open method
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        // Call the original open method
        originalOpen.apply(this, arguments);
        
        // Add event listener for when the request is about to be sent
        this.addEventListener('readystatechange', function() {
            if (this.readyState === 1) { // OPENED
                // If we have an auth token in localStorage, add it to the request headers
                const authToken = getAuthToken();
                if (authToken) {
                    this.setRequestHeader('Authorization', `Bearer ${authToken}`);
                }
            }
        });
    };
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add celestial decorations
    addCelestialDecorations();
    
    // Set current year in footer
    const currentYearElement = document.getElementById('currentYear');
    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }
    
    // Set active navigation item
    setActiveNavItem();
    
    // Setup hamburger menu
    const hamburgerIcon = document.querySelector('.hamburger-icon');
    if (hamburgerIcon) {
        hamburgerIcon.addEventListener('click', toggleHamburgerMenu);
        // Close menu when clicking outside
        document.addEventListener('click', closeHamburgerMenuOnClickOutside);
    }
    
    // Setup mobile navigation for logged-in users
    setupMobileNavigation();
    
    // Update mobile navigation on window resize
    window.addEventListener('resize', setupMobileNavigation);
    
    // Override fetch to add auth token to all requests
    addAuthTokenToFetch();
    
    // Override XMLHttpRequest to add auth token to all requests
    addAuthTokenToXHR();
    
    // Check session status on page load
    checkSessionStatus();
    
    // Periodically check session status
    setInterval(checkSessionStatus, 5 * 60 * 1000); // Check every 5 minutes
});

// Check session status and handle accordingly
async function checkSessionStatus() {
    console.log('Checking session status...');
    
    try {
        // First check localStorage
        const hasSession = hasLocalSession();
        console.log('Local session exists:', hasSession);
        
        // Check for the JS-accessible cookie that indicates a session
        const hasSessionCookie = document.cookie.indexOf('stytch_session_js=true') !== -1;
        console.log('Session cookie exists:', hasSessionCookie);
        
        // Log all cookies for debugging
        console.log('All cookies:', document.cookie || 'none');
        
        // Try to manually set the session cookie if we have a token but no cookie
        if (hasSession && !hasSessionCookie) {
            console.log('Attempting to manually set session cookie');
            document.cookie = "stytch_session_js=true; path=/; max-age=2592000; SameSite=Lax";
            
            // Check if it worked
            const cookieSet = document.cookie.indexOf('stytch_session_js=true') !== -1;
            console.log('Manual cookie setting ' + (cookieSet ? 'successful' : 'failed'));
        }
        
        // Log session info if it exists in localStorage
        if (hasSession) {
            const sessionInfo = getSessionInfo();
            console.log('Session info from localStorage:', sessionInfo);
            
            // Verify token format
            const authToken = sessionInfo.authToken;
            if (authToken) {
                console.log('Token format check:', {
                    length: authToken.length,
                    startsWithSession: authToken.startsWith('session-'),
                    containsDots: authToken.includes('.')
                });
            }
        } else if (hasSessionCookie) {
            // If we have a session cookie but no localStorage session, update localStorage
            console.log('Session cookie exists but no localStorage session, updating localStorage...');
        }
        
        // Check if we're on a page that requires authentication
        const requiresAuth = window.location.pathname.includes('/form/') || 
                            window.location.pathname.includes('/results/');
        
        // If we're on a page that requires auth or we have some session indicator, verify with server
        if (requiresAuth || hasSession || hasSessionCookie) {
            console.log('Verifying authentication with server...');
            const isAuthenticated = await checkServerSession();
            console.log('Server authentication check result:', isAuthenticated);
            
            // If server says we're not authenticated but we're on an auth-required page,
            // redirect to login
            if (!isAuthenticated && requiresAuth) {
                console.warn('Not authenticated but on protected page, redirecting to login');
                
                // Show a notification before redirecting
                showNotification('Your session has expired. Please log in again.', 'error');
                
                // Delay redirect slightly to allow notification to be seen
                setTimeout(() => {
                    // Add a parameter to indicate we're coming from a session timeout
                    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}&timeout=true`;
                }, 1500);
            }
        }
    } catch (error) {
        console.error('Error in checkSessionStatus:', error);
        
        // If we're on a page that requires authentication, show an error
        const requiresAuth = window.location.pathname.includes('/form/') || 
                            window.location.pathname.includes('/results/');
        
        if (requiresAuth) {
            showNotification('Error checking authentication status. Please try refreshing the page.', 'error');
        }
    }
}
