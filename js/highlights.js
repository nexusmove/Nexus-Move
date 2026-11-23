(() => {
    const track = document.getElementById('highlights-track');
    const controls = document.querySelector('.highlights-controls');
    const [previous, next] = controls.querySelectorAll('button');
    const [firstCard, secondCard] = track.children;

    function move(direction) {
        const step = secondCard.offsetLeft - firstCard.offsetLeft;
        track.scrollBy({ left: direction * step });
    }

    function updateControls() {
        previous.disabled = track.scrollLeft <= 1;
        next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 1;
    }

    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    track.addEventListener('scroll', updateControls, { passive: true });
    new ResizeObserver(updateControls).observe(track);
    controls.hidden = false;
    updateControls();
})();
