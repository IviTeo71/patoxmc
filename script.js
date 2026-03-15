function copyIP() {
    const ip = 'patox.mc.al';
    navigator.clipboard.writeText(ip).then(() => {
        const btn = document.querySelector('.btn-primary');
        const originalText = btn.innerHTML;

        btn.innerHTML = '<i data-lucide="check"></i> ¡Copiado!';
        btn.style.backgroundColor = '#22c55e';

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.backgroundColor = '';
            lucide.createIcons(); // Re-initialize icons
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

// Mobile menu placeholder (can be expanded)
// Mobile menu toggle
const menuBtn = document.querySelector('.mobile-menu-btn');
if (menuBtn) {
    const navLinks = document.querySelector('.nav-links');
    menuBtn.addEventListener('click', () => {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        if (navLinks.style.display === 'flex') {
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '70px';
            navLinks.style.left = '0';
            navLinks.style.width = '100%';
            navLinks.style.background = 'hsl(var(--bg-card))';
            navLinks.style.padding = '1rem';
            navLinks.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        }
    });
}

// Animation Observer
const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

window.revealObserver = observer;

document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.animate-on-scroll, .animate-scale, .animate-fade-in');
    animatedElements.forEach(el => observer.observe(el));
});
