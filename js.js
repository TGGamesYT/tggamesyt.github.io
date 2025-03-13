// sidebar
function toggleMenu() {
    document.getElementById("sidebar").classList.toggle("active");
}
// outside html fetcher
fetch('https://tggamesyt.github.io/outside.html')
.then(response => response.text())
.then(data => {
    let temp = document.createElement('div');
    temp.innerHTML = data;
    let navContent = temp.querySelector('#navigation');
    if (navContent) {
        document.getElementById('navbar').innerHTML = navContent.innerHTML;
    }
});
fetch('https://tggamesyt.github.io/outside.html')
.then(response => response.text())
.then(data => {
    let temp = document.createElement('div');
    temp.innerHTML = data;
    let navContent = temp.querySelector('#maintance');
    if (navContent) {
        document.getElementById('maintance').innerHTML = navContent.innerHTML;
    }
});
// Language changer
 let currentLang = 'en'; // Alapértelmezett nyelv

    function toggleLanguage() {
        currentLang = (currentLang === 'en') ? 'hu' : 'en';

        // Szövegek megjelenítése/elrejtése
        document.querySelectorAll('[data-lang]').forEach(el => {
            el.style.display = (el.getAttribute('data-lang') === currentLang) ? 'block' : 'none';
        });

        // Gomb szövegének frissítése
        document.getElementById('lang-btn').textContent = (currentLang === 'en') ? '🇭🇺' : '🇬🇧';
    }
// button clicking
document.addEventListener("DOMContentLoaded", function () {
    const button = document.querySelector("button");

    button.addEventListener("click", function () {
        this.classList.toggle("clicked");
    });
});
// navbar fixing
document.addEventListener("DOMContentLoaded", function () {
    const menuBtn = document.querySelector(".menu-btn");
    const logoTextNav = document.querySelector(".logo_nav");
    const logoTextMain = document.querySelector(".logo_main");
    const body = document.body;

    menuBtn.addEventListener("click", function () {
        const navLogoRect = logoTextNav.getBoundingClientRect();
        const mainLogoRect = logoTextMain.getBoundingClientRect();
        // Toggle a scroll tiltás
        body.classList.toggle("menu-active");
    });
});
