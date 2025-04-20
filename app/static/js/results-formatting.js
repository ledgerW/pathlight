// Results formatting functionality for Pathlight

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
            return `<li class="icon-bullet-item"><span class="bullet-icon">${icon}</span> ${p2}</li>`;
        });
        
        // Wrap lists in <ul>
        if (formatted.includes('<li')) {
            formatted = formatted.replace(/(<li.*?<\/li>)+/g, '<ul class="icon-bullet-list">$&</ul>');
        }
    }
    
    return formatted;
}

// Function to select an appropriate icon based on content
function selectContentIcon(text, timeframe) {
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
    
    // Return a default icon based on timeframe if provided
    if (timeframe && defaultIcons[timeframe]) {
        return defaultIcons[timeframe];
    }
    
    // Content-specific icons based on keywords
    const contentIcons = [
        { keywords: ['exercise', 'workout', 'gym', 'fitness', 'run', 'jog', 'walk', 'hike'], icon: '💪' },
        { keywords: ['read', 'book', 'study', 'learn', 'research', 'education'], icon: '📚' },
        { keywords: ['meditate', 'mindfulness', 'breathing', 'relax', 'yoga', 'calm'], icon: '🧘' },
        { keywords: ['write', 'journal', 'blog', 'document', 'note'], icon: '✍️' },
        { keywords: ['plan', 'schedule', 'organize', 'prepare', 'strategy'], icon: '📝' },
        { keywords: ['meet', 'connect', 'network', 'call', 'conversation', 'discuss', 'talk'], icon: '👥' },
        { keywords: ['eat', 'food', 'meal', 'nutrition', 'diet', 'cook'], icon: '🍽️' },
        { keywords: ['sleep', 'rest', 'nap', 'bedtime'], icon: '😴' },
        { keywords: ['create', 'build', 'make', 'craft', 'design'], icon: '🛠️' },
        { keywords: ['family', 'kids', 'children', 'spouse', 'partner', 'parents'], icon: '👨‍👩‍👧‍👦' },
        { keywords: ['friend', 'social', 'community', 'relationship'], icon: '🤝' },
        { keywords: ['work', 'job', 'career', 'professional', 'business'], icon: '💼' },
        { keywords: ['finance', 'money', 'budget', 'save', 'invest'], icon: '💰' },
        { keywords: ['health', 'doctor', 'appointment', 'checkup', 'wellness'], icon: '🩺' },
        { keywords: ['travel', 'trip', 'vacation', 'visit', 'explore'], icon: '✈️' },
        { keywords: ['hobby', 'interest', 'passion', 'enjoy', 'fun', 'play'], icon: '🎯' },
        { keywords: ['goal', 'achieve', 'accomplish', 'success', 'milestone'], icon: '🏆' },
        { keywords: ['reflect', 'review', 'evaluate', 'assess', 'consider'], icon: '🤔' },
        { keywords: ['gratitude', 'thankful', 'appreciate', 'grateful'], icon: '🙏' },
        { keywords: ['nature', 'outdoor', 'environment', 'garden', 'plant'], icon: '🌿' }
    ];
    
    // Check if text contains any of the keywords
    if (text) {
        const lowerText = text.toLowerCase();
        for (const item of contentIcons) {
            if (item.keywords.some(keyword => lowerText.includes(keyword))) {
                return item.icon;
            }
        }
    }
    
    // Default fallback icon
    return '•';
}

// Helper function to display bullet points with content-specific icons
function displayBulletPoints(elementId, items, timeframe) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // If items is not an array or is empty, show a message
    if (!Array.isArray(items) || items.length === 0) {
        element.innerHTML = '<p>No specific steps identified for this timeframe.</p>';
        return;
    }
    
    // Create a list of bullet points with icons
    const bulletList = document.createElement('ul');
    bulletList.className = 'icon-bullet-list';
    
    items.forEach(item => {
        // Select an appropriate icon based on the content
        // We'll prioritize content-based icons over timeframe-based icons
        const icon = selectContentIcon(item);
        
        const listItem = document.createElement('li');
        listItem.className = 'icon-bullet-item';
        listItem.innerHTML = `<span class="bullet-icon">${icon}</span> ${item}`;
        bulletList.appendChild(listItem);
    });
    
    element.innerHTML = '';
    element.appendChild(bulletList);
}

// Helper function to create a timeframe card
function createTimeframeCard(title, content, iconType) {
    let iconSvg = '';
    
    // Select the appropriate icon based on the time of day
    if (iconType === 'sunrise') {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>`;
    } else if (iconType === 'sun') {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"/></svg>`;
    } else if (iconType === 'moon') {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M10 6a8 8 0 0 0 11.955 6.956C21.474 18.03 17.2 22 12 22 6.477 22 2 17.523 2 12c0-5.2 3.97-9.474 9.044-9.955A7.963 7.963 0 0 0 10 6z"/></svg>`;
    }
    
    // Create HTML content for the card
    let contentHTML = '';
    
    // Check if content is an array (new format) or a string (old format)
    if (Array.isArray(content)) {
        // Create a list of bullet points with content-specific icons
        contentHTML = '<ul class="daily-plan-list">';
        content.forEach(item => {
            // Select an appropriate icon based on the content
            // We'll prioritize content-based icons over timeframe-based icons
            const icon = selectContentIcon(item);
            
            contentHTML += `<li class="daily-plan-item"><span class="bullet-icon">${icon}</span> ${item}</li>`;
        });
        contentHTML += '</ul>';
    } else {
        // Use the formatContent function for string content
        contentHTML = formatContent(content);
    }
    
    return `
        <div class="daily-plan-card">
            <div class="daily-plan-header">
                <div class="daily-plan-icon">
                    ${iconSvg}
                </div>
                <h3>${title}</h3>
            </div>
            <div class="daily-plan-content">
                ${contentHTML}
            </div>
        </div>
    `;
}

// Export functions for use in other modules
window.formatContent = formatContent;
window.selectContentIcon = selectContentIcon;
window.displayBulletPoints = displayBulletPoints;
window.createTimeframeCard = createTimeframeCard;
