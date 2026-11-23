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
            setRotation(false);
            goToSlide(index);
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
    let hovered = false;
    let interval;

    function currentSlide() {
        return Math.max(0, Math.round(track.scrollLeft / (track.clientWidth || 1))) % slides.length;
    }

    function goToSlide(index) {
        track.scrollTo({ left: index * track.clientWidth });
    }

    function scheduleRotation() {
        window.clearInterval(interval);
        if (!rotating || !visible || hovered || document.hidden) return;
        interval = window.setInterval(() => {
            goToSlide(currentSlide() + 1);
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

    function updateControls() {
        if (!track.clientWidth) return;
        if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 1) {
            track.scrollTo({ left: 0, behavior: 'instant' });
        }
        const selected = currentSlide();
        dots.forEach((dot, index) => dot.setAttribute('aria-current', String(index === selected)));
    }

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
        visible = entry.intersectionRatio >= 0.5;
        scheduleRotation();
    }, { threshold: 0.5 }).observe(track);
    setRotation(!reducedMotion.matches);
    controls.hidden = false;
    pagination.hidden = false;
    updateControls();
})();
