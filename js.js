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
// lang button relative font size
// Figyeljük a gombot és automatikusan módosítjuk a font méretét, ha szükséges
const langButton = document.querySelector('.lang-btn');

function adjustFontSize() {
    const buttonWidth = langButton.offsetWidth;
    let fontSize = 1.2; // alapértelmezett font size
    
    // Ha a gomb szélessége túl kicsi, csökkentjük a font méretét
    if (buttonWidth < langButton.scrollWidth) {
        fontSize = (buttonWidth / langButton.scrollWidth) * 1.2; // Kiszámoljuk az új font size-t
    }

    langButton.style.fontSize = `${fontSize}rem`;
}

// Az oldal betöltődésekor és ablak átméretezésekor is futtatjuk
window.addEventListener('load', adjustFontSize);
window.addEventListener('resize', adjustFontSize);
