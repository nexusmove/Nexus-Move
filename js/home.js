const showcase = document.querySelector('.hero-visual');
const frame = showcase.querySelector('.hero-image-wrap');
const caption = showcase.querySelector('.showcase-caption');
const controls = showcase.querySelector('.showcase-controls');
const motionButton = controls.querySelector('.showcase-motion');
const firstImage = frame.querySelector('img');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const vehicles = [
    {
        title: 'Flota Nexus Move',
        facts: 'Autos y camionetas en Mendoza',
        alt: firstImage.alt,
        src: firstImage.getAttribute('src'),
        srcset: firstImage.getAttribute('srcset'),
    },
    {
        title: 'Ford Ranger XL 4x4 2025',
        facts: 'Camioneta 4x4 · 5 plazas · Gasoil',
        alt: 'Ford Ranger XL 4x4 de Nexus Move',
        src: 'img/ranger-xl-4x4-1120.webp',
        srcset: 'img/ranger-xl-4x4-560.webp 560w, img/ranger-xl-4x4-1120.webp 1120w',
    },
    {
        title: 'Citroën Basalt',
        facts: 'SUV coupé · 5 plazas · Nafta',
        alt: 'Citroën Basalt de Nexus Move',
        src: 'img/citroen-basalt-fleet-v2-1120.webp',
        srcset: 'img/citroen-basalt-fleet-v2-560.webp 560w, img/citroen-basalt-fleet-v2-1120.webp 1120w',
    },
    {
        title: 'Chevrolet S10 4x4',
        facts: 'Camioneta 4x4 · 5 plazas · Gasoil',
        alt: 'Chevrolet S10 4x4 de Nexus Move',
        src: 'img/s10-4x4-2017-1120.webp',
        srcset: 'img/s10-4x4-2017-560.webp 560w, img/s10-4x4-2017-1120.webp 1120w',
    },
    {
        title: 'Toyota Corolla',
        facts: 'Sedán de 4 puertas · 5 plazas · Nafta',
        alt: 'Toyota Corolla blanco de la flota de Nexus Move',
        src: 'img/toyota-corolla-1080.webp',
        srcset: 'img/toyota-corolla-560.webp 560w, img/toyota-corolla-1080.webp 1080w',
        imageClass: 'hero-image-corolla',
    },
    {
        title: 'Renault Logan',
        facts: 'Sedán · 5 plazas · Nafta',
        alt: 'Renault Logan de Nexus Move',
        src: 'img/renault-logan-fleet-v2-1120.webp',
        srcset: 'img/renault-logan-fleet-v2-560.webp 560w, img/renault-logan-fleet-v2-1120.webp 1120w',
    },
];

let selectedVehicle = 0;
let latestSlideRequest = 0;
let rotationTimer;
let rotating = !reducedMotion.matches;
let pointerInside = false;

async function showVehicle(offset) {
    selectedVehicle = (selectedVehicle + offset + vehicles.length) % vehicles.length;
    const request = ++latestSlideRequest;
    const vehicle = vehicles[selectedVehicle];
    const photo = new Image();
    photo.className = 'hero-image is-changing';
    if (vehicle.imageClass) photo.classList.add(vehicle.imageClass);
    photo.alt = vehicle.alt;
    photo.sizes = firstImage.sizes;
    photo.srcset = vehicle.srcset;
    photo.src = vehicle.src;

    try {
        await photo.decode();
    } catch {
        return;
    }

    if (request !== latestSlideRequest) return;
    frame.replaceChildren(photo);
    caption.querySelector('strong').textContent = vehicle.title;
    caption.querySelector('span').textContent = vehicle.facts;
}

function updateRotation() {
    window.clearInterval(rotationTimer);
    motionButton.textContent = rotating ? 'Pausar' : 'Reanudar';
    motionButton.setAttribute('aria-label', rotating ? 'Pausar carrusel' : 'Reanudar carrusel');
    caption.setAttribute('aria-live', rotating ? 'off' : 'polite');

    if (rotating && !pointerInside && !document.hidden) {
        rotationTimer = window.setInterval(() => showVehicle(1), 5600);
    }
}

function moveManually(offset) {
    rotating = false;
    updateRotation();
    showVehicle(offset);
}

controls.querySelector('.showcase-previous').addEventListener('click', () => moveManually(-1));
controls.querySelector('.showcase-next').addEventListener('click', () => moveManually(1));
motionButton.addEventListener('click', () => {
    rotating = !rotating;
    updateRotation();
});
showcase.addEventListener('mouseenter', () => {
    pointerInside = true;
    updateRotation();
});
showcase.addEventListener('mouseleave', () => {
    pointerInside = false;
    updateRotation();
});
showcase.addEventListener('focusin', event => {
    if (event.target.matches(':focus-visible') && rotating) {
        rotating = false;
        updateRotation();
    }
});
reducedMotion.addEventListener('change', event => {
    if (event.matches) {
        rotating = false;
        updateRotation();
    }
});
document.addEventListener('visibilitychange', updateRotation);

controls.hidden = false;
updateRotation();
