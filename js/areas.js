const areaPanels = new Map(
    [...document.querySelectorAll('[data-area-panel]')].map(panel => [panel.dataset.areaPanel, panel]),
);
const areaLinks = [...document.querySelectorAll('a[data-area]')];
const areaStatus = document.getElementById('area-status');
const rentalLink = areaLinks.find(link => link.dataset.area === 'rentacar');
const areaLabels = {
    transporte: 'Transporte',
    rentacar: 'Rent a Car',
    sostenibilidad: 'Sostenibilidad',
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
    return 'transporte';
}

function updateAreaAddress(area) {
    const address = new URL(window.location.href);
    if (area === 'transporte') address.searchParams.delete('area');
    else address.searchParams.set('area', area);
    address.hash = '';
    if (address.href !== window.location.href) {
        window.history.pushState(null, '', address);
    }
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
    for (const [name, panel] of areaPanels) {
        panel.hidden = name !== area;
        panel.classList.toggle('is-entering', changed && name === area && updateAddress);
    }

    for (const link of areaLinks) {
        const current = link.dataset.area === area;
        link.setAttribute('aria-controls', areaPanels.get(link.dataset.area).id);
        if (current) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
        link.closest('.hero-area')?.classList.toggle('is-selected', current);
    }

    areaStatus.textContent = areaLabels[area];
    if (updateAddress && changed && document.getElementById('inicio').getBoundingClientRect().bottom < 0) {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
}

document.addEventListener('click', async event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a');
    if (!link) return;

    const area = link.dataset.area;
    if (areaPanels.has(area)) {
        event.preventDefault();
        await showArea(area, true);
        return;
    }

    const fragment = link.getAttribute('href');
    if (selectedArea !== 'transporte' && ['#inicio', '#proceso', '#contacto'].includes(fragment)) {
        event.preventDefault();
        await showArea('transporte', true);
        window.location.hash = fragment;
    }
});

window.addEventListener('popstate', () => showArea(getAreaFromAddress()));
showArea(getAreaFromAddress());
if (window.location.protocol.startsWith('http')) {
    rentalLink.addEventListener('pointerenter', () => loadRental().catch(() => {}), { once: true });
}
