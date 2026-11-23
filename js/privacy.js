(() => {
    if (!['nexusmove.com.ar', 'www.nexusmove.com.ar'].includes(window.location.hostname)) return;

    const storageKey = 'nexus-analytics-choice';
    const notice = document.getElementById('privacy-notice');
    const settings = document.querySelector('.privacy-settings');
    let beaconStarted = false;
    let openedFromSettings = false;

    function readChoice() {
        try {
            return localStorage.getItem(storageKey);
        } catch {
            return null;
        }
    }

    function showNotice(visible) {
        notice.hidden = !visible;
        settings.setAttribute('aria-expanded', String(visible));
    }

    function startAnalytics() {
        if (beaconStarted) return;
        beaconStarted = true;
        const script = document.createElement('script');
        script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
        script.setAttribute('data-cf-beacon', JSON.stringify({ token: '969fb9efd2f346ae95d4078711652d0e' }));
        document.head.append(script);
    }

    function applyChoice(choice) {
        showNotice(choice !== 'accepted' && choice !== 'declined');
        if (choice === 'accepted') {
            startAnalytics();
        } else if (beaconStarted) {
            // The beacon has no stop API. Reload with the updated preference to unload it.
            window.location.reload();
        }
    }

    settings.hidden = false;
    settings.addEventListener('click', () => {
        openedFromSettings = true;
        showNotice(true);
        notice.focus();
    });

    notice.addEventListener('click', event => {
        const choice = event.target.closest('[data-analytics-choice]')?.dataset.analyticsChoice;
        if (!choice) return;
        try {
            localStorage.setItem(storageKey, choice);
        } catch {
            // The choice applies to this page when storage is unavailable.
        }
        applyChoice(choice);
        if (openedFromSettings) settings.focus({ preventScroll: true });
        openedFromSettings = false;
    });

    window.addEventListener('storage', event => {
        if (event.key === storageKey || event.key === null) applyChoice(readChoice());
    });

    window.addEventListener('pageshow', event => {
        if (event.persisted) applyChoice(readChoice());
    });

    applyChoice(readChoice());
})();
