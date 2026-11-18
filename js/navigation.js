const siteHeader = document.querySelector('.site-header');
const menuButton = siteHeader.querySelector('.menu-button');
const navLinks = document.getElementById('nav-links');

function setMenuOpen(open) {
    navLinks.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menuButton.querySelector('i').className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
}

menuButton.addEventListener('click', () => setMenuOpen(!navLinks.classList.contains('open')));
siteHeader.addEventListener('click', event => {
    if (event.target.closest('a')) setMenuOpen(false);
});
siteHeader.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !navLinks.classList.contains('open')) return;
    setMenuOpen(false);
    menuButton.focus();
});
