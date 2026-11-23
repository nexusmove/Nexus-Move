(() => {
    const section = document.getElementById('home-highlights');
    const track = document.getElementById('highlights-track');
    const controls = document.querySelector('.highlights-controls');
    const motion = controls.querySelector('.highlights-motion');
    const pagination = section.querySelector('.highlights-dots');
    const slides = Array.from(track.children);
    const dots = slides.map((slide, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', slide.querySelector('h3').textContent);
        dot.setAttribute('aria-controls', track.id);
        dot.addEventListener('click', () => {
            goToSlide(index);
            scheduleRotation();
        });
        pagination.append(dot);
        return dot;
    });

    // The last transition scrolls forward into a copy, then returns to the identical first card.
    const loopStart = slides[0].cloneNode(true);
    loopStart.inert = true;
    loopStart.setAttribute('aria-hidden', 'true');
    track.append(loopStart);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let rotating;
    let visible = false;
    let activePointer = null;
    let timer;

    function currentSlide() {
        return Math.max(0, Math.round(track.scrollLeft / (track.clientWidth || 1))) % slides.length;
    }

    function goToSlide(index) {
        track.scrollTo({ left: index * track.clientWidth });
    }

    function scheduleRotation() {
        window.clearTimeout(timer);
        if (!rotating || !visible || activePointer !== null || document.hidden) return;
        timer = window.setTimeout(() => {
            goToSlide(currentSlide() + 1);
        }, 3000);
    }

    function setRotation(active) {
        if (rotating !== active) {
            rotating = active;
            motion.textContent = rotating ? 'Pausar' : 'Reanudar';
            motion.setAttribute('aria-label', rotating ? 'Pausar destacados' : 'Reanudar destacados');
        }
        scheduleRotation();
    }

    function updateControls() {
        if (!track.clientWidth) return;
        if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 1) {
            track.scrollTo({ left: 0, behavior: 'instant' });
        }
        const selected = currentSlide();
        dots.forEach((dot, index) => dot.setAttribute('aria-current', String(index === selected)));
    }

    motion.addEventListener('click', () => setRotation(!rotating));
    track.addEventListener('pointerdown', event => {
        activePointer = event.pointerId;
        scheduleRotation();
    }, { passive: true });
    function releasePointer(event) {
        if (activePointer !== event.pointerId) return;
        activePointer = null;
        scheduleRotation();
    }
    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);
    reducedMotion.addEventListener('change', event => {
        if (event.matches) setRotation(false);
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) activePointer = null;
        scheduleRotation();
    });

    track.addEventListener('scroll', () => {
        updateControls();
        scheduleRotation();
    }, { passive: true });
    new ResizeObserver(updateControls).observe(track);
    new IntersectionObserver(([entry]) => {
        visible = entry.intersectionRatio >= 0.5;
        scheduleRotation();
    }, { threshold: 0.5 }).observe(track);
    setRotation(!reducedMotion.matches);
    controls.hidden = false;
    pagination.hidden = false;
    updateControls();
})();
