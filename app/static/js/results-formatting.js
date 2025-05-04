// Results formatting functionality for Pathlight

// Define icon categories
const ICON_CATEGORIES = [
  { category: "health", icon: "💪", keywords: ["exercise", "workout", "gym", "fitness", "run", "jog", "walk", "hike", "health"] },
  { category: "learning", icon: "📚", keywords: ["read", "book", "study", "learn", "research", "education", "course"] },
  { category: "mindfulness", icon: "🧘", keywords: ["meditate", "mindfulness", "breathing", "relax", "yoga", "calm"] },
  { category: "writing", icon: "✍️", keywords: ["write", "journal", "blog", "document", "note"] },
  { category: "planning", icon: "📝", keywords: ["plan", "schedule", "organize", "prepare", "strategy"] },
  { category: "social", icon: "👥", keywords: ["meet", "connect", "network", "call", "conversation", "discuss", "talk"] },
  { category: "nutrition", icon: "🍽️", keywords: ["eat", "food", "meal", "nutrition", "diet", "cook"] },
  { category: "rest", icon: "😴", keywords: ["sleep", "rest", "nap", "bedtime"] },
  { category: "creativity", icon: "🛠️", keywords: ["create", "build", "make", "craft", "design"] },
  { category: "family", icon: "👨‍👩‍👧‍👦", keywords: ["family", "kids", "children", "spouse", "partner", "parents"] },
  { category: "friendship", icon: "🤝", keywords: ["friend", "social", "community", "relationship"] },
  { category: "career", icon: "💼", keywords: ["work", "job", "career", "professional", "business"] },
  { category: "finance", icon: "💰", keywords: ["finance", "money", "budget", "save", "invest"] },
  { category: "medical", icon: "🩺", keywords: ["doctor", "appointment", "checkup", "wellness", "therapy"] },
  { category: "travel", icon: "✈️", keywords: ["travel", "trip", "vacation", "visit", "explore"] },
  { category: "hobbies", icon: "🎯", keywords: ["hobby", "interest", "passion", "enjoy", "fun", "play"] },
  { category: "goals", icon: "🏆", keywords: ["goal", "achieve", "accomplish", "success", "milestone"] },
  { category: "reflection", icon: "🤔", keywords: ["reflect", "review", "evaluate", "assess", "consider"] },
  { category: "gratitude", icon: "🙏", keywords: ["gratitude", "thankful", "appreciate", "grateful"] },
  { category: "nature", icon: "🌿", keywords: ["nature", "outdoor", "environment", "garden", "plant"] }
];

// Format content with Markdown-like syntax
function formatContent(content) {
    if (!content) return '';
    
    // Replace newlines with <br>
    let formatted = content.replace(/\n/g, '<br>');
    
    // Replace headers
    formatted = formatted.replace(/# (.*?)(<br>|$)/g, '<h2>$1</h2>');
    formatted = formatted.replace(/## (.*?)(<br>|$)/g, '<h3>$1</h3>');
    formatted = formatted.replace(/### (.*?)(<br>|$)/g, '<h4>$1</h4>');
    
    // Replace bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Identify bullet points (both - and •)
    const hasBulletPoints = /(^|\<br\>)[\s]*[-•][\s]+(.*?)($|\<br\>)/g.test(formatted);
    
    if (hasBulletPoints) {
        // Create a temporary div to manipulate the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = formatted;
        
        // Convert text to HTML nodes
        const textNodes = tempDiv.childNodes;
        const bulletPattern = /(^|\<br\>)[\s]*[-•][\s]+(.*?)($|\<br\>)/g;
        
        // Replace bullet points with proper list items and content-specific icons
        formatted = formatted.replace(bulletPattern, function(match, p1, p2, p3) {
            // Use selectContentIcon to get a content-specific icon
            const icon = selectContentIcon(p2);
            return `<li class="icon-bullet-item">${icon} ${p2}</li>`;
        });
        
        // Wrap lists in <ul>
        if (formatted.includes('<li')) {
            formatted = formatted.replace(/(<li.*?<\/li>)+/g, '<ul class="icon-bullet-list">$&</ul>');
        }
    }
    
    return formatted;
}

// Function to select an appropriate icon based on content
function selectContentIcon(item, timeframe) {
    // Debug logging to understand what we're receiving
    console.log('selectContentIcon received item:', item);
    
    // Default icons for timeframes
    const defaultIcons = {
        today: '✅',
        next7: '📅',
        next30: '📆',
        next180: '🗓️',
        morning: '🌅',
        afternoon: '☀️',
        evening: '🌙'
    };
    
    // Check for category first - prioritize category over timeframe
    if (item && typeof item === 'object') {
        console.log('Item is an object, checking for category');
        
        // Log all available categories for debugging
        console.log('Available categories:', ICON_CATEGORIES.map(c => c.category));
        
        if (item.category) {
            const category = item.category.toLowerCase();
            console.log('Found category:', category);
            
            // Try to find an exact match first
            const iconMapping = ICON_CATEGORIES.find(c => c.category === category);
            if (iconMapping) {
                console.log('Found exact matching icon for category:', iconMapping.icon);
                return iconMapping.icon;
            } else {
                console.log('No exact match found for category:', category);
                
                // If no exact match, try to find a partial match
                for (const cat of ICON_CATEGORIES) {
                    if (category.includes(cat.category) || cat.category.includes(category)) {
                        console.log('Found partial match:', cat.category, 'for', category);
                        return cat.icon;
                    }
                }
                
                // If still no match, try to match against keywords
                for (const cat of ICON_CATEGORIES) {
                    if (cat.keywords.some(keyword => category.includes(keyword))) {
                        console.log('Found keyword match:', cat.category, 'for', category);
                        return cat.icon;
                    }
                }
            }
        }
    }
    
    // If no category match was found, use timeframe as fallback
    if (timeframe && defaultIcons[timeframe]) {
        console.log('Using timeframe icon as fallback for:', timeframe);
        return defaultIcons[timeframe];
    }
    
    // Get text content from item (handle both string and object formats)
    const text = typeof item === 'string' ? item : (item && item.text ? item.text : '');
    console.log('Using text for icon selection:', text);
    
    // If no text to analyze, return default
    if (!text) {
        console.log('No text found, using default icon');
        return '•';
    }
    
    // Check if text contains any of the keywords from our categories
    const lowerText = text.toLowerCase();
    for (const category of ICON_CATEGORIES) {
        if (category.keywords.some(keyword => lowerText.includes(keyword))) {
            return category.icon;
        }
    }
    
    // Default fallback icon
    return '•';
}

// Helper function to display bullet points with content-specific icons
function displayBulletPoints(elementId, items, timeframe) {
    console.log(`Displaying bullet points for ${elementId}:`, items);
    
    const element = document.getElementById(elementId);
    if (!element) {
        console.log(`Element not found: ${elementId}`);
        return;
    }
    
    // If items is not an array or is empty, show a message
    if (!Array.isArray(items) || items.length === 0) {
        console.log(`No items or empty array for ${elementId}`);
        element.innerHTML = '<p>No specific steps identified for this timeframe.</p>';
        return;
    }
    
    console.log(`Processing ${items.length} items for ${elementId}`);
    
    // Create a list of checkable bullet points with icons
    const bulletList = document.createElement('ul');
    bulletList.className = 'icon-bullet-list checkable-list';
    bulletList.dataset.section = elementId;
    
    items.forEach((item, index) => {
        console.log(`Item ${index} type:`, typeof item);
        console.log(`Item ${index} content:`, item);
        
        if (typeof item === 'object') {
            console.log(`Item ${index} category:`, item.category);
            console.log(`Item ${index} text:`, item.text);
        }
        
        // Handle both new format (object with text and category) and old format (string)
        const itemText = typeof item === 'string' ? item : (item && item.text ? item.text : '');
        console.log(`Item ${index} extracted text:`, itemText);
        
        // Select an appropriate icon based on the content
        const icon = selectContentIcon(item, timeframe);
        console.log(`Item ${index} selected icon:`, icon);
        
        const listItem = document.createElement('li');
        listItem.className = 'icon-bullet-item checkable-item';
        listItem.dataset.index = index;
        
        // Create checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'item-checkbox';
        checkbox.id = `${elementId}-item-${index}`;
        
        // Create label with icon
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.innerHTML = `${icon} ${itemText}`;
        
        // Add checkbox and label to list item
        listItem.appendChild(checkbox);
        listItem.appendChild(label);
        
        // Add event listener to save checkbox state
        checkbox.addEventListener('change', function() {
            saveCheckboxState(elementId, index, this.checked);
        });
        
        bulletList.appendChild(listItem);
    });
    
    // Create reset button with direct onclick handler
    const resetButton = document.createElement('button');
    resetButton.className = 'reset-checklist-button';
    resetButton.textContent = 'Reset All';
    resetButton.dataset.section = elementId;
    resetButton.onclick = function(event) {
        console.log('Reset button clicked for element:', elementId);
        event.preventDefault();
        event.stopPropagation();
        resetCheckboxes(elementId);
        return false;
    };
    
    // Clear element and add the list and reset button
    element.innerHTML = '';
    element.appendChild(bulletList);
    element.appendChild(resetButton);
    
    // Load saved checkbox states
    loadCheckboxStates(elementId);
}

// Cookie utility functions
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function eraseCookie(name) {
    document.cookie = name + '=; Max-Age=-99999999; path=/';
}

// Save checkbox state to cookies
function saveCheckboxState(sectionId, itemIndex, isChecked) {
    console.log('Saving checkbox state:', sectionId, itemIndex, isChecked);
    
    const userId = window.userId || 'anonymous';
    console.log('Using userId for cookies:', userId);
    
    const cookieName = `pathlight_checklist_${userId}`;
    let savedStates = {};
    
    // Get existing states from cookie
    const cookieValue = getCookie(cookieName);
    if (cookieValue) {
        try {
            savedStates = JSON.parse(cookieValue);
        } catch (e) {
            console.error('Error parsing cookie value:', e);
            savedStates = {};
        }
    }
    
    // Initialize section if it doesn't exist
    if (!savedStates[sectionId]) {
        savedStates[sectionId] = {};
    }
    
    // Save the state
    savedStates[sectionId][itemIndex] = isChecked;
    
    // Store in cookie (30 days expiration)
    setCookie(cookieName, JSON.stringify(savedStates), 30);
    console.log('Saved state to cookie:', cookieName);
}

// Load checkbox states from cookies
function loadCheckboxStates(sectionId) {
    console.log('Loading checkbox states for section:', sectionId);
    
    const userId = window.userId || 'anonymous';
    console.log('Using userId for cookies:', userId);
    
    const cookieName = `pathlight_checklist_${userId}`;
    const cookieValue = getCookie(cookieName);
    
    if (!cookieValue) {
        console.log('No saved states found in cookie');
        return;
    }
    
    let savedStates = {};
    try {
        savedStates = JSON.parse(cookieValue);
    } catch (e) {
        console.error('Error parsing cookie value:', e);
        return;
    }
    
    if (savedStates[sectionId]) {
        console.log('Found saved states for section:', sectionId);
        
        // Find checkboxes using the data-section attribute
        const selector = `[data-section="${sectionId}"] .item-checkbox`;
        const checkboxes = document.querySelectorAll(selector);
        console.log('Found checkboxes:', checkboxes.length);
        
        checkboxes.forEach((checkbox, index) => {
            if (savedStates[sectionId][index] !== undefined) {
                checkbox.checked = savedStates[sectionId][index];
                console.log('Set checkbox', index, 'to', checkbox.checked);
            }
        });
    }
}

// Reset all checkboxes in a section
function resetCheckboxes(sectionId) {
    console.log('Resetting checkboxes for section:', sectionId);
    
    const userId = window.userId || 'anonymous';
    console.log('Using userId for cookies:', userId);
    
    // Uncheck all checkboxes in the section
    const selector = `[data-section="${sectionId}"] .item-checkbox`;
    console.log('Using selector:', selector);
    
    const checkboxes = document.querySelectorAll(selector);
    console.log('Found checkboxes:', checkboxes.length);
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Clear saved states for this section
    const cookieName = `pathlight_checklist_${userId}`;
    let savedStates = {};
    
    // Get existing states from cookie
    const cookieValue = getCookie(cookieName);
    if (cookieValue) {
        try {
            savedStates = JSON.parse(cookieValue);
            
            // Clear the section
            if (savedStates[sectionId]) {
                savedStates[sectionId] = {};
                
                // Store updated states in cookie
                setCookie(cookieName, JSON.stringify(savedStates), 30);
                console.log('Cleared section in cookie:', sectionId);
            }
        } catch (e) {
            console.error('Error parsing cookie value:', e);
        }
    }
    
    console.log('Reset complete for section:', sectionId);
}

// Helper function to create a timeframe card
function createTimeframeCard(title, content, iconType, dayType = 'generic') {
    console.log(`Creating timeframe card for ${dayType} ${title}:`, content);
    console.log('Icon type:', iconType);
    
    let iconSvg = '';
    
    // Select the appropriate icon based on the time of day
    if (iconType === 'sunrise') {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>`;
    } else if (iconType === 'sun') {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"/></svg>`;
    } else if (iconType === 'moon') {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M10 6a8 8 0 0 0 11.955 6.956C21.474 18.03 17.2 22 12 22 6.477 22 2 17.523 2 12c0-5.2 3.97-9.474 9.044-9.955A7.963 7.963 0 0 0 10 6z"/></svg>`;
    }
    
    // Use a consistent ID based on day type and time of day
    // This ensures the same ID is used across sessions for the same timeframe
    const cardId = `timeframe-${dayType}-${title.toLowerCase()}`;
    console.log('Using consistent card ID:', cardId);
    
    // Create HTML for the card
    let html = `
        <div class="daily-plan-card">
            <div class="daily-plan-header">
                <div class="daily-plan-icon">
                    ${iconSvg}
                </div>
                <h3>${title}</h3>
            </div>
            <div class="daily-plan-content">`;
    
    // Check if content is an array (new format) or a string (old format)
    if (Array.isArray(content)) {
        console.log(`Content is an array with ${content.length} items`);
        
        // Create a list of checkable bullet points with content-specific icons
        html += `<ul class="daily-plan-list checkable-list" data-section="${cardId}">`;
        
        content.forEach((item, index) => {
            console.log(`Processing item ${index}:`, item);
            
            // Handle both new format (object with text and category) and old format (string)
            const itemText = typeof item === 'string' ? item : (item && item.text ? item.text : '');
            console.log(`Item text: ${itemText}`);
            
            // Map the iconType to a timeframe for fallback
            const timeframeIcon = iconType === 'sunrise' ? 'morning' : 
                                 iconType === 'sun' ? 'afternoon' : 'evening';
            console.log(`Mapped timeframe icon (for fallback): ${timeframeIcon}`);
            
            // Pass the timeframe as a fallback, but the function will prioritize category
            const icon = selectContentIcon(item, timeframeIcon);
            console.log(`Selected icon for item: ${icon}`);
            
            html += `
                <li class="daily-plan-item checkable-item" data-index="${index}">
                    <input type="checkbox" class="item-checkbox" id="${cardId}-item-${index}">
                    <label for="${cardId}-item-${index}">
                        ${icon} ${itemText}
                    </label>
                </li>
            `;
        });
        
        html += `</ul>
                <button class="reset-checklist-button" data-section="${cardId}">
                    Reset All
                </button>`;
    } else {
        // Use the formatContent function for string content
        html += formatContent(content);
    }
    
    html += `</div>
        </div>`;
    
    // Create a temporary container to hold the HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = html;
    
    // Add event listeners to checkboxes
    const checkboxes = tempContainer.querySelectorAll('.item-checkbox');
    checkboxes.forEach((checkbox, index) => {
        checkbox.addEventListener('change', function() {
            saveCheckboxState(cardId, index, this.checked);
        });
    });
    
    // Add direct onclick handler to reset button
    const resetButton = tempContainer.querySelector('.reset-checklist-button');
    if (resetButton) {
        resetButton.onclick = function(event) {
            console.log('Reset button clicked for card:', cardId);
            event.preventDefault();
            event.stopPropagation();
            resetCheckboxes(cardId);
            return false;
        };
    }
    
    // Load saved checkbox states after the card is added to the DOM
    setTimeout(() => {
        loadCheckboxStates(cardId);
    }, 0);
    
    return tempContainer.innerHTML;
}

// Export functions for use in other modules
window.formatContent = formatContent;
window.selectContentIcon = selectContentIcon;
window.displayBulletPoints = displayBulletPoints;
window.createTimeframeCard = createTimeframeCard;
window.saveCheckboxState = saveCheckboxState;
window.loadCheckboxStates = loadCheckboxStates;
window.resetCheckboxes = resetCheckboxes;
