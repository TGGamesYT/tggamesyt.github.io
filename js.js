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
const langButton = document.querySelector('.lang-btn');

function adjustFontSize() {
    const buttonWidth = langButton.offsetWidth;
    let fontSize = 1.2; // Kezdő font méret (rem-ben)

    // Ha a szöveg túl nagy lenne a gombhoz képest
    while (langButton.scrollWidth > langButton.clientWidth && fontSize > 0.5) {
        fontSize -= 0.05; // Csökkentjük a betűméretet kis lépésekben
        langButton.style.fontSize = `${fontSize}rem`;
    }
}

// Betöltéskor és átméretezéskor is alkalmazzuk
window.addEventListener('load', adjustFontSize);
window.addEventListener('resize', adjustFontSize);
