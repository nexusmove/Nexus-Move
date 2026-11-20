const areaPanels = new Map(
    [...document.querySelectorAll('[data-area-panel]')].map(panel => [panel.dataset.areaPanel, panel]),
);
const areaLinks = [...document.querySelectorAll('a[data-area]')];
const areaStatus = document.getElementById('area-status');
const rentalLink = areaLinks.find(link => link.dataset.area === 'rentacar');
const hero = document.getElementById('inicio');
const heroLabel = document.getElementById('hero-label');
const heroTitle = document.getElementById('hero-title');
const heroAccent = heroTitle.querySelector('span');
const heroDescription = document.getElementById('hero-description');
const heroChoices = hero.querySelector('.hero-areas');
const sectionViews = {
    inicio: {
        label: 'Mendoza, Argentina',
        title: 'Soluciones integrales',
        accent: 'de movilidad',
    },
    transporte: {
        label: 'Nexus Move | Transporte',
        title: 'Transporte con',
        accent: 'chofer',
        description: 'Traslados para empresas, instituciones y particulares, con más de 17 años de experiencia en el sector.',
    },
    rentacar: {
        label: 'Nexus Move | Rent a Car',
        title: 'Alquiler de autos',
        accent: 'y camionetas',
        description: 'Elegí un vehículo para tu viaje en Mendoza y consultá la disponibilidad para tus fechas.',
    },
    sostenibilidad: {
        label: 'Nexus Move | Sostenibilidad',
        title: 'Movilidad responsable',
        accent: 'y desarrollo sostenible',
        description: 'Medimos nuestra huella de carbono y buscamos mejorar cómo cuidamos la flota, a las personas y los recursos.',
    },
};

let selectedArea;
let areaRequest = 0;
let rentalContent;
let syncRentalTabs;

function loadRental() {
    if (rentalContent) return rentalContent;

    rentalContent = fetch(rentalLink.href, { mode: 'same-origin' })
        .then(response => {
            if (!response.ok) throw new Error('No se pudo cargar Rent a Car');
            return response.text();
        })
        .then(html => {
            const rental = new DOMParser().parseFromString(html, 'text/html');
            const content = rental.getElementById('rentacar-content');
            if (!content) throw new Error('No está el contenido de Rent a Car');
            const embedded = document.importNode(content, true);
            document.getElementById('rentacar-embed').replaceChildren(embedded);
            syncRentalTabs = initializeRental(embedded);
        })
        .catch(error => {
            rentalContent = undefined;
            throw error;
        });

    return rentalContent;
}

function getAreaFromAddress() {
    const requested = new URL(window.location.href).searchParams.get('area');
    if (areaPanels.has(requested)) return requested;
    if (window.location.hash === '#sostenibilidad') return 'sostenibilidad';
    if (['#servicios', '#proceso', '#contacto', '#nosotros'].includes(window.location.hash)) return 'transporte';
    return 'inicio';
}

function updateAreaAddress(area) {
    const address = new URL(window.location.href);
    if (area === 'inicio') address.searchParams.delete('area');
    else address.searchParams.set('area', area);
    address.hash = '';
    if (address.href !== window.location.href) {
        window.history.pushState(null, '', address);
    }
}

function showHero(area) {
    const { label, title, accent, description } = sectionViews[area];
    hero.dataset.view = area;
    heroLabel.textContent = label;
    heroAccent.textContent = accent;
    heroTitle.replaceChildren(document.createTextNode(title + ' '), heroAccent);
    heroDescription.textContent = description ?? '';
    heroDescription.hidden = !description;
    heroChoices.hidden = area !== 'inicio';
}

async function showArea(area, updateAddress = false) {
    const request = ++areaRequest;
    if (area === 'rentacar') {
        areaStatus.textContent = 'Cargando Rent a Car';
        try {
            await loadRental();
        } catch {
            if (request === areaRequest) window.location.assign(rentalLink.href);
            return;
        }
    }
    if (request !== areaRequest) return;

    if (updateAddress && area !== selectedArea) updateAreaAddress(area);
    if (area === 'rentacar') syncRentalTabs();

    const changed = selectedArea !== area;
    selectedArea = area;
    const activePanel = area === 'inicio' ? 'transporte' : area;
    if (changed) showHero(area);
    for (const [name, panel] of areaPanels) {
        panel.hidden = name !== activePanel;
        panel.classList.toggle('is-entering', changed && name === activePanel && updateAddress);
    }

    for (const link of areaLinks) {
        const current = link.dataset.area === area;
        if (areaPanels.has(link.dataset.area)) link.setAttribute('aria-controls', areaPanels.get(link.dataset.area).id);
        if (current) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
        link.closest('.hero-area')?.classList.toggle('is-selected', current);
    }

    const view = sectionViews[area];
    areaStatus.textContent = changed ? view.title + ' ' + view.accent : '';
    if (updateAddress && changed && heroTitle.getBoundingClientRect().top < document.querySelector('.site-header').getBoundingClientRect().bottom) {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
}

document.addEventListener('click', async event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a');
    if (!link) return;

    const area = link.dataset.area;
    if (area === 'inicio' || areaPanels.has(area)) {
        event.preventDefault();
        const focusHeading = link.closest('.hero-areas') && link.matches(':focus-visible');
        await showArea(area, true);
        if (focusHeading && selectedArea === area) heroTitle.focus({ preventScroll: true });
        return;
    }

    const fragment = link.getAttribute('href');
    if (selectedArea !== 'transporte' && ['#proceso', '#contacto'].includes(fragment)) {
        event.preventDefault();
        await showArea('transporte', true);
        window.location.hash = fragment;
    }
});

window.addEventListener('popstate', () => showArea(getAreaFromAddress()));
showArea(getAreaFromAddress());
if (window.location.protocol.startsWith('http')) {
    for (const link of areaLinks.filter(link => link.dataset.area === 'rentacar')) {
        link.addEventListener('pointerenter', () => loadRental().catch(() => {}), { once: true });
    }
}
