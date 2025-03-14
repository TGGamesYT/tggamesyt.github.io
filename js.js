        const englishToSga = {
            'a': 'ᔑ', 'b': 'ʖ', 'c': 'ᓵ', 'd': '↸', 'e': 'ᒷ', 'f': '⎓', 'g': '⊣', 'h': '⍑',
            'i': '╎', 'j': '⋮', 'k': 'ꖌ', 'l': 'ꖎ', 'm': 'ᒲ', 'n': 'リ', 'o': '𝙹', 'p': '!¡',
            'q': 'ᑑ', 'r': '∷', 's': 'ᓭ', 't': 'ℸ̣', 'u': '⚍', 'v': '⍊', 'w': '∴', 'x': '̇/',
            'y': '||', 'z': '⨅'
        };

        function translateToSga(text) {
            return text.split(' ').map(word =>  // Split words
                word.split('').map(char => {  // Split letters
                    if (char === char.toUpperCase() && /[A-Z]/.test(char)) {  
                        return `^${englishToSga[char.toLowerCase()] || char}`;  
                    }  
                    return englishToSga[char] || char;  
                }).join(' ') // Add 1 space between letters
            ).join('&nbsp;&nbsp;&nbsp;'); // Add 3 non-breaking spaces between words
        }
        async function googleTranslate(text, targetLang) {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            try {
                const response = await fetch(url);
                const result = await response.json();
                return result[0].map(item => item[0]).join('');
            } catch (error) {
                console.error("Translation error:", error);
                return text;
            }
        }

        async function translatePage() {
            const elements = document.querySelectorAll("[data-translate]");
            for (const element of elements) {
                const targetLang = element.getAttribute("data-translate");
                const originalText = element.innerText.trim();

                if (targetLang === "galactic") {
                    element.innerHTML = translateToSga(originalText);
                } else {
                    const translatedText = await googleTranslate(originalText, targetLang);
                    element.innerText = translatedText;
                }
            }
        }
onload = setTimeout(load, 20);
function dotwo() {
    toggleMenu();
    turn();
}
function jegyzes(nev, ertek) {
    localStorage.setItem(nev, JSON.stringify(ertek));
}

function leker(nev, defaultErtek = null) {
    const ertek = localStorage.getItem(nev);
    return ertek ? JSON.parse(ertek) : defaultErtek;
}
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
    let navContent = temp.querySelector('#langs');
    if (navContent) {
        document.getElementById('options').innerHTML = navContent.innerHTML;
    }
});
fetch('https://tggamesyt.github.io/outside.html')
.then(response => response.text())
.then(data => {
    let temp = document.createElement('div');
    temp.innerHTML = data;
    let navContent = temp.querySelector('#silly');
    if (navContent) {
        document.getElementById('silly').innerHTML = navContent.innerHTML;
    }
});
// silly navbar
function toggleVisibility() {
            let navbar = document.getElementById("navbar");
            let silly = document.getElementById("silly");

            if (navbar.style.display !== "none") {
                navbar.style.display = "none";
                silly.style.display = "block";
            } else {
                navbar.style.display = "block";
                silly.style.display = "none";
            }
}
// Language changer
function load() {
    let currentLang = leker("lang","en"); // Load saved language
    document.getElementById("lang-select").value = currentLang; // Set dropdown to saved language
    changeLanguage();
    translatePage();
}

function changeLanguage() {
    currentLang = document.getElementById("lang-select").value;
    jegyzes("lang", currentLang); // Save language selection

    // Show/hide elements based on selected language
    document.querySelectorAll("[data-lang]").forEach(el => {
        el.style.display = (el.getAttribute("data-lang") === currentLang) ? "block" : "none";
    });

    console.log("Language changed to:", currentLang);
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
// menu button animation
function turn() {
    const button = document.querySelector(".menu-btn");
    const spans = button.querySelectorAll("span");

    button.classList.toggle("open");

    if (button.classList.contains("open")) {
        spans[0].style.transform = "translateY(9px) rotate(45deg)";
        spans[1].style.opacity = "0";
        spans[2].style.transform = "translateY(-9px) rotate(-45deg)";
    } else {
        spans[0].style.transform = "translateY(0) rotate(0)";
        spans[1].style.opacity = "1";
        spans[2].style.transform = "translateY(0) rotate(0)";
    }
}
