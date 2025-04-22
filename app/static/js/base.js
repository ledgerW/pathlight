// Base JavaScript for Pathlight

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

// Show mobile navigation for logged-in users
function setupMobileNavigation() {
    // Check if user is logged in by looking for mobile-nav element
    const mobileNav = document.querySelector('.mobile-nav');
    if (mobileNav) {
        // User is logged in, show mobile navigation
        mobileNav.style.display = 'block';
        // Add class to body for padding
        document.body.classList.add('has-mobile-nav');
    }
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
});
