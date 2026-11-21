// Run with Node and Playwright available (or set NEXUS_PLAYWRIGHT to its module path).
const { chromium } = require(process.env.NEXUS_PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { readFileSync, existsSync } = require('node:fs');
const { resolve, extname, sep } = require('node:path');
const { runInNewContext } = require('node:vm');

const root = resolve(__dirname, '..');
const sandbox = { window: {} };
runInNewContext(readFileSync(resolve(root, 'js/translations.js'), 'utf8'), sandbox);
const rows = sandbox.window.NexusTranslations;
const languages = ['es', 'pt-BR', 'en', 'it'];
const dictionary = new Map(rows.map(row => [row[0], row]));
assert.equal(dictionary.size, rows.length, 'Duplicate translation sources');
assert(rows.every(row => row.length === 4 && row.every(value => typeof value === 'string' && value.trim())));
const tr = (source, language) => dictionary.get(source)?.[languages.indexOf(language)] || source;

const policy = readFileSync(resolve(root, '_headers'), 'utf8')
    .split(/\r?\n/).find(line => line.includes('Content-Security-Policy:'))
    .split('Content-Security-Policy:')[1].trim();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = resolve(root, pathname === '/' ? 'index.html' : pathname === '/flota' ? 'flota.html' : '.' + pathname);
    if (!file.startsWith(root + sep) || !mime[extname(file)] || !existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { 'Content-Type': mime[extname(file)], 'Content-Security-Policy': policy }).end(readFileSync(file));
});

async function inspect(page, language) {
    const sources = rows.filter(row => row[0] !== row[languages.indexOf(language)]).map(row => row[0]);
    const untranslated = await page.evaluate(keys => {
        const known = new Set(keys), found = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.parentElement.closest('script,style,[translate=no]')) continue;
            const value = node.data.trim().replace(/\s+/g, ' ');
            if (known.has(value)) found.push(value);
        }
        return [...new Set(found)];
    }, sources);
    assert.deepEqual(untranslated, [], 'Untranslated content in ' + language);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page overflow');
    assert(await page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
        return new Set(ids).size === ids.length;
    }), 'Duplicate IDs');
}

async function exercise(browser, base, width, embedded) {
    const page = await browser.newPage({
        viewport: { width, height: 1000 }, reducedMotion: 'reduce',
        isMobile: width < 1000, hasTouch: width < 1000, timezoneId: 'Asia/Tokyo',
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
        window.policyErrors = [];
        document.addEventListener('securitypolicyviolation', event => policyErrors.push(event.effectiveDirective));
    });
    await page.goto(base + (embedded ? '?area=rentacar' : 'flota.html'));
    const form = page.locator('#rental-booking-form');
    await form.waitFor({ state: 'visible' });
    const submit = form.locator('button[type=submit]');
    const tabs = page.locator('.rental-tabs [role=tab]');
    const choose = id => page.locator('#tab-' + id).click();
    const day = (offset) => {
        const value = new Date();
        value.setUTCDate(value.getUTCDate() + offset);
        return value.toISOString().slice(0, 10);
    };
    const tomorrow = day(2), later = day(4);
    const minimum = await page.locator('#pickup-date').getAttribute('min');
    const mendozaDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Mendoza', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    assert.equal(minimum, mendozaDate, 'Calendar must use Mendoza date, regardless of visitor timezone');

    for (const language of languages) {
        const hero = await page.locator('.hero').elementHandle();
        await page.locator('#site-language').selectOption(language);
        await choose('reservas');
        assert(await page.locator('#booking-notice').isVisible());
        await page.locator('#pickup-date').fill('');
        await page.locator('#return-date').fill('');
        await submit.click();
        assert.equal(await page.locator('#booking-error').innerText(),
            tr('Completá las fechas y los horarios de entrega y devolución.', language));
        assert.equal(await page.locator('#booking-result').isVisible(), false);
        assert.equal(await page.locator('#pickup-date').getAttribute('aria-invalid'), 'true');

        await page.locator('#pickup-date').fill('2000-01-01');
        await page.locator('#return-date').fill(later);
        await submit.click();
        assert.equal(await page.locator('#booking-error').innerText(),
            tr('La entrega debe ser en una fecha y un horario futuros.', language));

        await page.locator('#pickup-date').fill(tomorrow);
        await page.locator('#return-date').fill(tomorrow);
        await page.locator('#pickup-time').fill('12:00');
        await page.locator('#return-time').fill('11:00');
        await submit.click();
        assert.equal(await page.locator('#booking-error').innerText(),
            tr('La devolución debe ser posterior a la entrega.', language));
        await page.locator('#return-time').fill('12:00');
        await submit.click();
        assert(await page.locator('#booking-error').isVisible(), 'Equal pickup and return must be rejected');

        await page.locator('#return-time').fill('18:00');
        await page.locator('#booking-vehicle').selectOption('corolla');
        await submit.click();
        assert(await page.locator('#booking-result').isVisible(), 'Same-day later return should be valid');
        assert.equal(await page.locator('#booking-result-title').innerText(),
            tr('Sin disponibilidad para reservar', language));
        assert.equal(await page.locator('#booking-vehicle-summary').innerText(), 'Toyota Corolla');
        const href = await page.locator('#booking-contact').getAttribute('href');
        const url = new URL(href);
        assert.equal(url.hostname, 'wa.me');
        assert.equal(url.pathname, '/5492613671376');
        const message = url.searchParams.get('text');
        assert(message.startsWith(tr('Hola Nexus Move, vi que la flota está ocupada y quisiera consultar otras opciones.', language)));
        assert(message.includes(tr('Entrega', language) + ':'));
        assert(message.includes('Toyota Corolla'));

        // A changed date invalidates the previous summary and its WhatsApp link.
        await page.locator('#return-date').fill(later);
        assert.equal(await page.locator('#booking-result').isVisible(), false);
        assert.equal(await page.locator('#booking-contact').getAttribute('href'), null);
        await page.locator('#booking-vehicle').selectOption('any');
        await submit.click();
        assert.equal(await page.locator('#booking-vehicle-summary').innerText(), tr('Cualquier vehículo', language));
        await inspect(page, language);

        // Language changes must also update an already-generated summary and message.
        const alternate = language === 'en' ? 'pt-BR' : 'en';
        await page.locator('#site-language').selectOption(alternate);
        assert.equal(await page.locator('#booking-vehicle-summary').innerText(), tr('Cualquier vehículo', alternate));
        assert(new URL(await page.locator('#booking-contact').getAttribute('href')).searchParams.get('text')
            .startsWith(tr('Hola Nexus Move, vi que la flota está ocupada y quisiera consultar otras opciones.', alternate)));
        await page.locator('#site-language').selectOption(language);

        await choose('flota');
        assert.equal(await page.locator('.card .availability').count(), 5);
        for (const badge of await page.locator('.card .availability').all())
            assert.equal(await badge.innerText(), tr('Sin disponibilidad', language));
        await page.locator('[data-filter=auto]').click();
        assert.equal(await page.locator('.card:visible').count(), 3);
        await page.locator('[data-filter=todos]').click();

        await choose('nosotros');
        assert((await page.locator('.rental-story').innerText()).includes('17'));
        await choose('preguntas-frecuentes');
        assert.equal(await page.locator('.rental-faq details').count(), 12);
        for (const detail of await page.locator('.rental-faq details').all()) {
            await detail.locator('summary').click();
            assert(await detail.locator('p').isVisible());
        }
        assert((await page.locator('.rental-faq').innerText()).includes('25'));
        await inspect(page, language);
        assert(await hero.evaluate(element => element.isConnected), 'Shared hero should remain in place');

        await choose('adicionales');
        await choose('como-alquilar');
        await choose('flota');
        await page.goBack();
        assert.equal(await page.locator('#tab-como-alquilar').getAttribute('aria-selected'), 'true');
        await choose('reservas');
        await tabs.first().focus();
        await page.keyboard.press('End');
        assert.equal(await tabs.last().getAttribute('aria-selected'), 'true');
        await page.keyboard.press('Home');
        assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
        await page.reload();
        await form.waitFor({ state: 'visible' });
        assert.equal(await page.locator('#site-language').inputValue(), language);
    }
    if (process.env.NEXUS_SCREENSHOT_DIR) {
        await page.locator('#site-language').selectOption('es');
        await page.locator('#reservas-titulo').scrollIntoViewIfNeeded();
        await page.screenshot({ path: resolve(process.env.NEXUS_SCREENSHOT_DIR, 'reservas-' + width + '-' + (embedded ? 'web' : 'flota') + '.jpg'), quality: 85 });
    }
    assert.deepEqual(await page.evaluate(() => policyErrors), []);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(width + 'px ' + (embedded ? 'web' : 'flota') + ': 4 idiomas, validación, sin disponibilidad, FAQ, historia y navegación OK');
}

(async () => {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = process.env.NEXUS_TEST_URL || 'http://127.0.0.1:' + server.address().port + '/';
    const browser = await chromium.launch({ headless: true, ...(process.env.NEXUS_CHROME ? { executablePath: process.env.NEXUS_CHROME } : { channel: 'chrome' }) });
    try {
        await Promise.all([[320, true], [390, true], [820, true], [1440, true], [390, false], [1440, false]]
            .map(([width, embedded]) => exercise(browser, base, width, embedded)));
        const context = await browser.newContext({ javaScriptEnabled: false });
        const page = await context.newPage();
        await page.goto(base + 'flota.html');
        assert(await page.locator('#booking-notice').isVisible(), 'Unavailable status must be visible without JavaScript');
        assert.equal(await page.locator('#rental-booking-form').isVisible(), false, 'No unhandled form without JavaScript');
        await context.close();
    } finally {
        await browser.close();
        server.close();
    }
})().catch(error => { console.error(error.stack); process.exitCode = 1; server.close(); });

