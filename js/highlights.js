(() => {
    const section = document.getElementById('home-highlights');
    const track = document.getElementById('highlights-track');
    const controls = document.querySelector('.highlights-controls');
    const [previous, motion, next] = controls.querySelectorAll('button');
    const last = track.children.length - 1;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let rotating;
    let visible = false;
    let hovered = false;
    let interval;
    let rotationDirection = 1;

    function currentSlide() {
        return Math.min(last, Math.max(0, Math.round(track.scrollLeft / (track.clientWidth || 1))));
    }

    function goToSlide(index) {
        const target = Math.min(last, Math.max(0, index));
        track.scrollTo({ left: target * track.clientWidth });
    }

    function scheduleRotation() {
        window.clearInterval(interval);
        if (!rotating || !visible || hovered || document.hidden) return;
        interval = window.setInterval(() => {
            const index = currentSlide();
            if (index === last) rotationDirection = -1;
            if (index === 0) rotationDirection = 1;
            goToSlide(index + rotationDirection);
        }, 6500);
    }

    function setRotation(active) {
        if (rotating !== active) {
            rotating = active;
            motion.textContent = rotating ? 'Pausar' : 'Reanudar';
            motion.setAttribute('aria-label', rotating ? 'Pausar destacados' : 'Reanudar destacados');
        }
        scheduleRotation();
    }

    function moveManually(direction) {
        setRotation(false);
        goToSlide(currentSlide() + direction);
    }

    function updateControls() {
        previous.disabled = track.scrollLeft <= 1;
        next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 1;
    }

    previous.addEventListener('click', () => moveManually(-1));
    next.addEventListener('click', () => moveManually(1));
    motion.addEventListener('click', () => setRotation(!rotating));
    track.addEventListener('pointerdown', () => setRotation(false), { passive: true });
    section.addEventListener('focusin', event => {
        if (event.target !== motion && event.target.matches(':focus-visible')) setRotation(false);
    });
    section.addEventListener('mouseenter', () => {
        hovered = true;
        scheduleRotation();
    });
    section.addEventListener('mouseleave', () => {
        hovered = false;
        scheduleRotation();
    });
    reducedMotion.addEventListener('change', event => {
        if (event.matches) setRotation(false);
    });
    document.addEventListener('visibilitychange', scheduleRotation);

    track.addEventListener('scroll', updateControls, { passive: true });
    new ResizeObserver(updateControls).observe(track);
    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        scheduleRotation();
    }, { threshold: 0.5 }).observe(track);
    setRotation(!reducedMotion.matches);
    controls.hidden = false;
    updateControls();
})();
