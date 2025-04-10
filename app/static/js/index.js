// Index page JavaScript for Pathlight

document.addEventListener('DOMContentLoaded', function() {
    // Add animation to stars in the hero section
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        // Random twinkle animation
        const duration = Math.random() * 3 + 2; // 2-5 seconds
        const delay = Math.random() * 2; // 0-2 seconds delay
        
        star.style.animation = `twinkle ${duration}s ease-in-out ${delay}s infinite alternate`;
    });
    
    // Add twinkle animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes twinkle {
            0% { opacity: 0.3; transform: scale(1); }
            100% { opacity: 0.8; transform: scale(1.2); }
        }
    `;
    document.head.appendChild(style);
    
    // Add scroll animations for sections
    const sections = document.querySelectorAll('section');
    
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });
    
    // Add animation classes and observe sections
    sections.forEach(section => {
        section.classList.add('animate-on-scroll');
        observer.observe(section);
    });
    
    // Add animation styles
    const animationStyle = document.createElement('style');
    animationStyle.textContent = `
        .animate-on-scroll {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        
        .animate-on-scroll.visible {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(animationStyle);
    
    // Add hover effects to about columns
    const aboutColumns = document.querySelectorAll('.about-column');
    aboutColumns.forEach(column => {
        column.addEventListener('mouseenter', () => {
            column.style.transform = 'translateY(-10px)';
            column.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.1)';
        });
        
        column.addEventListener('mouseleave', () => {
            column.style.transform = 'translateY(0)';
            column.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        });
    });
    
    // Smooth scroll for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
});
