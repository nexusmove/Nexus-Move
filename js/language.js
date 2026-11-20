(() => {
    const languages = ['es', 'pt-BR', 'en', 'it'];
    const translations = new Map(window.NexusTranslations.map(row => [row[0], row]));
    const originalText = new WeakMap();
    const originalAttributes = new WeakMap();
    const selector = document.getElementById('site-language');
    const excluded = 'script, style, select, [translate="no"]';
    const attributes = ['aria-label', 'aria-roledescription', 'alt', 'title', 'placeholder'];
    let language = 'es';

    function translate(source) {
        const key = source.trim().replace(/\s+/g, ' ');
        const row = translations.get(key);
        if (row) return source.replace(source.trim(), row[languages.indexOf(language)]);
        const count = key.match(/^Vehículos mostrados: (\d+)\.$/);
        if (count) return translate('Vehículos mostrados: {count}.').replace('{count}', count[1]);
        return source;
    }

    function translatedValue(current, records, key) {
        const prior = records.get(key);
        const source = prior && current === prior.rendered ? prior.source : current;
        const rendered = translate(source);
        records.set(key, { source, rendered });
        return rendered;
    }

    function translateText(node) {
        if (!node.parentElement || node.parentElement.closest(excluded)) return;
        const rendered = translatedValue(node.data, originalText, node);
        if (node.data !== rendered) node.data = rendered;
    }

    function translateElement(element) {
        if (element.closest(excluded)) return;
        let records = originalAttributes.get(element);
        if (!records) {
            records = new Map();
            originalAttributes.set(element, records);
        }
        for (const name of attributes) {
            if (!element.hasAttribute(name)) continue;
            const current = element.getAttribute(name);
            const rendered = translatedValue(current, records, name);
            if (current !== rendered) element.setAttribute(name, rendered);
        }
        if (element.matches('meta[name="description"]')) {
            const current = element.content;
            const rendered = translatedValue(current, records, 'content');
            if (current !== rendered) element.content = rendered;
        }
        if (element.matches('a[href]')) {
            const current = element.getAttribute('href');
            const previous = records.get('href');
            const source = previous && previous.rendered === current ? previous.source : current;
            const url = new URL(source, document.baseURI);
            if (url.hostname !== 'wa.me' || !url.searchParams.has('text')) return;
            if (language !== 'es') url.searchParams.set('text', translate(url.searchParams.get('text')));
            const rendered = language === 'es' ? source : url.href;
            records.set('href', { source, rendered });
            if (current !== rendered) element.setAttribute('href', rendered);
        }
    }

    function translateTree(root) {
        if (root.nodeType === Node.TEXT_NODE) {
            translateText(root);
            return;
        }
        if (root.nodeType !== Node.ELEMENT_NODE || root.closest(excluded)) return;
        translateElement(root);
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.nodeType === Node.TEXT_NODE) translateText(node);
            else translateElement(node);
        }
    }

    function chooseLanguage(value) {
        if (!languages.includes(value)) return;
        language = value;
        document.documentElement.lang = value;
        selector.value = value;
        translateTree(document.documentElement);
        try {
            localStorage.setItem('nexus-language', value);
        } catch {
            // Language switching also works when the browser blocks local storage.
        }
    }

    try {
        const saved = localStorage.getItem('nexus-language');
        if (languages.includes(saved)) language = saved;
    } catch {
        // Spanish is the initial language when no preference can be read.
    }
    selector.addEventListener('change', event => chooseLanguage(event.target.value));
    document.querySelector('.language-control').hidden = false;
    chooseLanguage(language);

    const observer = new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'characterData') translateText(record.target);
            else if (record.type === 'attributes') translateElement(record.target);
            else for (const node of record.addedNodes) translateTree(node);
        }
    });
    observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: [...attributes, 'href', 'content'],
    });
})();
