export function initRipple() {
  const handleRipple = (e: MouseEvent | TouchEvent) => {
    const target = e.target as HTMLElement;
    const button = target.closest('button') || target.closest('.role-card') || target.closest('.reveal-card') || target.closest('.icon-button') || target.closest('.fab-button');
    if (!button) return;
    
    if (button.classList.contains('disabled') || button.hasAttribute('disabled')) return;
    if (window.getComputedStyle(button).cursor === 'default') return;

    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const rect = button.getBoundingClientRect();
    
    let container = button.querySelector('.ripple-container');
    if (!container) {
      container = document.createElement('span');
      container.className = 'ripple-container';
      button.appendChild(container);
    }

    const circle = document.createElement('span');
    
    const diameter = Math.max(rect.width, rect.height) * 2;
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${clientX - rect.left - radius}px`;
    circle.style.top = `${clientY - rect.top - radius}px`;
    circle.classList.add('android-ripple-effect');

    const existing = container.getElementsByClassName('android-ripple-effect')[0];
    if (existing) {
      existing.remove();
    }

    container.appendChild(circle);

    const animationDuration = 500;
    
    setTimeout(() => {
      if (circle.parentElement) {
        circle.remove();
      }
    }, animationDuration);
  };

  document.addEventListener('mousedown', handleRipple as EventListener);
  document.addEventListener('touchstart', handleRipple as EventListener, {passive: true});
}
