function initializeRental(root) {
    const tabList = root.querySelector('.rental-tabs');
    const tabs = [...tabList.querySelectorAll('a[href^="#"]')];
    const panels = tabs.map(tab => root.querySelector(tab.hash));
    const aboutLinks = [...document.querySelectorAll('.site-header [data-rental-about]')];
    const rentalLinks = [...document.querySelectorAll('.site-header a[data-area="rentacar"]:not([data-rental-about]), .site-header a[href="#reservas"]')];
    const areaPanel = root.closest('[data-area-panel]');

    function updateHeader(activePanel) {
        if (areaPanel?.hidden) return;
        const about = activePanel.id === 'rental-nosotros';
        for (const link of aboutLinks) {
            if (about) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        }
        for (const link of rentalLinks) {
            if (about) link.removeAttribute('aria-current');
            else link.setAttribute('aria-current', 'page');
        }
    }

    function showPanel(index) {
        tabs.forEach((tab, position) => {
            const active = position === index;
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
            panels[position].hidden = !active;
        });
        updateHeader(panels[index]);
    }

    function showPanelFromAddress() {
        const index = tabs.findIndex(tab => tab.hash === window.location.hash);
        showPanel(index === -1 ? 0 : index);
    }

    function activateTab(index) {
        showPanel(index);
        const { hash } = tabs[index];
        if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    }

    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'Explorar Rent a Car');
    tabs.forEach((tab, index) => {
        const panel = panels[index];
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', panel.id);
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        panel.tabIndex = 0;

        tab.addEventListener('click', event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            activateTab(index);
        });

        tab.addEventListener('keydown', event => {
            let next;
            switch (event.key) {
                case 'ArrowLeft': next = (index - 1 + tabs.length) % tabs.length; break;
                case 'ArrowRight': next = (index + 1) % tabs.length; break;
                case 'Home': next = 0; break;
                case 'End': next = tabs.length - 1; break;
                case ' ':
                    event.preventDefault();
                    activateTab(index);
                    return;
                default: return;
            }
            event.preventDefault();
            activateTab(next);
            tabs[next].focus();
        });
    });
    window.addEventListener('hashchange', showPanelFromAddress);
    window.addEventListener('popstate', showPanelFromAddress);
    showPanelFromAddress();

    if (!areaPanel) {
        for (const link of [...aboutLinks, ...rentalLinks]) {
            link.addEventListener('click', event => {
                if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                activateTab(tabs.findIndex(tab => tab.hash === link.hash));
                if (link.hasAttribute('data-rental-about')) focusRentalAbout();
                else panels[0].scrollIntoView({ block: 'start' });
            });
        }
    }

    const footerFleet = document.querySelector('footer a[href="#flota"]');
    footerFleet?.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const fleetIndex = tabs.findIndex(tab => tab.hash === '#flota');
        activateTab(fleetIndex);
        tabs[fleetIndex].focus();
    });

    const filters = root.querySelector('.fleet-filters');
    const filterButtons = [...filters.querySelectorAll('button[data-filter]')];
    const cards = [...root.querySelectorAll('.card[data-vehicle]')];
    const results = root.querySelector('#fleet-results');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const type = button.dataset.filter;
            filterButtons.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
            let visible = 0;
            cards.forEach(card => {
                const matches = type === 'todos' || card.dataset.vehicle === type;
                card.hidden = !matches;
                if (matches) visible++;
            });
            results.textContent = `Vehículos mostrados: ${visible}.`;
        });
    });
    filters.hidden = false;
    initializeBooking(root);
    return showPanelFromAddress;
}

function initializeBooking(root) {
    const form = root.querySelector('#rental-booking-form');
    const pickupDate = form.elements['pickup-date'];
    const pickupTime = form.elements['pickup-time'];
    const returnDate = form.elements['return-date'];
    const returnTime = form.elements['return-time'];
    const vehicle = form.elements.vehicle;
    const error = root.querySelector('#booking-error');
    const result = root.querySelector('#booking-result');
    const contact = root.querySelector('#booking-contact');
    let errorSource = '';

    const translate = source => window.NexusLanguage?.translate(source) ?? source;
    const locale = () => document.documentElement.lang || 'es';
    const mendozaTime = () => {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Argentina/Mendoza', year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(new Date());
        const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
        return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
    };
    const format = (date, time) => new Intl.DateTimeFormat(locale(), {
        timeZone: 'America/Argentina/Mendoza', dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23',
    }).format(new Date(`${date}T${time}:00-03:00`));

    function updateMinimumDates() {
        const today = mendozaTime().slice(0, 10);
        pickupDate.min = today;
        returnDate.min = pickupDate.value && pickupDate.value > today ? pickupDate.value : today;
    }

    function updateSummary() {
        if (result.hidden) return;
        const pickup = format(pickupDate.value, pickupTime.value);
        const returned = format(returnDate.value, returnTime.value);
        const selectedVehicle = vehicle.value === 'any' ? translate('Cualquier vehículo') : vehicle.selectedOptions[0].textContent;
        root.querySelector('#booking-pickup-summary').textContent = pickup;
        root.querySelector('#booking-return-summary').textContent = returned;
        root.querySelector('#booking-vehicle-summary').textContent = selectedVehicle;
        const message = [
            translate('Hola Nexus Move, vi que la flota está ocupada y quisiera consultar otras opciones.'),
            `${translate('Entrega')}: ${pickup}`,
            `${translate('Devolución')}: ${returned}`,
            `${translate('Vehículo')}: ${selectedVehicle}`,
        ].join('\n');
        const address = new URL('https://wa.me/5492613671376');
        address.searchParams.set('text', message);
        contact.href = address.href;
    }

    function clearResult() {
        result.hidden = true;
        contact.removeAttribute('href');
        error.hidden = true;
        errorSource = '';
        for (const field of form.querySelectorAll('[aria-invalid]')) {
            field.removeAttribute('aria-invalid');
            field.removeAttribute('aria-describedby');
        }
        updateMinimumDates();
    }

    function showError(source, field) {
        errorSource = source;
        error.textContent = translate(source);
        error.hidden = false;
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', error.id);
        field.focus();
    }

    form.addEventListener('input', clearResult);
    form.addEventListener('change', clearResult);
    form.addEventListener('submit', event => {
        event.preventDefault();
        clearResult();
        const missing = [...form.querySelectorAll('[required]')].find(field => !field.value || field.validity.badInput);
        if (missing) return showError('Completá las fechas y los horarios de entrega y devolución.', missing);
        const pickup = `${pickupDate.value}T${pickupTime.value}`;
        const returned = `${returnDate.value}T${returnTime.value}`;
        if (pickup < mendozaTime()) return showError('La entrega debe ser en una fecha y un horario futuros.', pickupDate);
        if (returned <= pickup) return showError('La devolución debe ser posterior a la entrega.', returnDate);
        result.hidden = false;
        updateSummary();
        result.focus({ preventScroll: true });
        result.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    });
    document.addEventListener('nexus:languagechange', () => {
        if (errorSource) error.textContent = translate(errorSource);
        updateSummary();
    });
    updateMinimumDates();
    form.hidden = false;
}

function focusRentalAbout() {
    const panel = document.getElementById('rental-nosotros');
    panel.focus({ preventScroll: true });
    panel.scrollIntoView({ block: 'start' });
}

const rentalPage = document.querySelector('#rentacar-content');
if (rentalPage) initializeRental(rentalPage);
