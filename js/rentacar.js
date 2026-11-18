function initializeRental(root) {
    const tabList = root.querySelector('.rental-tabs');
    const tabs = [...tabList.querySelectorAll('a[href^="#"]')];
    const panels = tabs.map(tab => root.querySelector(tab.hash));

    function showPanel(index) {
        tabs.forEach((tab, position) => {
            const active = position === index;
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
            panels[position].hidden = !active;
        });
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

    const footerFleet = document.querySelector('footer a[href="#flota"]');
    footerFleet?.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        activateTab(0);
        tabs[0].focus();
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
    return showPanelFromAddress;
}

const rentalPage = document.querySelector('#rentacar-content');
if (rentalPage) initializeRental(rentalPage);
