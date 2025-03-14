window.onload = load;
window.onbeforeunload = changeLanguage;
        const englishToSga = {
            'a': 'ᔑ', 'b': 'ʖ', 'c': 'ᓵ', 'd': '↸', 'e': 'ᒷ', 'f': '⎓', 'g': '⊣', 'h': '⍑',
            'i': '╎', 'j': '⋮', 'k': 'ꖌ', 'l': 'ꖎ', 'm': 'ᒲ', 'n': 'リ', 'o': '𝙹', 'p': '!¡',
            'q': 'ᑑ', 'r': '∷', 's': 'ᓭ', 't': 'ℸ̣', 'u': '⚍', 'v': '⍊', 'w': '∴', 'x': '̇/',
            'y': '||', 'z': '⨅'
        };

        function translateToSga(text) {
            return text.split(' ').map(word => 
                word.split('').map(char => {  
                    if (char === char.toUpperCase() && /[A-Z]/.test(char)) {  
                        return `^${englishToSga[char.toLowerCase()] || char}`;  
                    }  
                    return englishToSga[char] || char;  
                }).join(' ') // Add 1 space between letters
            ).join('  '); // Use actual non-breaking spaces for 3-space gaps
        }

        function translateFromSga(sgaText) {
            return sgaText.split('  ').map(word => 
                word.split(' ').map(char => {  
                    for (let key in englishToSga) {
                        if (englishToSga[key] === char) return key;  
                    }
                    if (char.startsWith('^')) return char[1].toUpperCase();
                    return char;
                }).join('')
            ).join(' '); // Restore single space between words
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

        function translateHTMLContent(element, targetLang) {
            let walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
            let nodes = [];

            while (walker.nextNode()) {
                nodes.push(walker.currentNode);
            }

            nodes.forEach(node => {
                if (targetLang === "galactic") {
                    node.nodeValue = translateToSga(node.nodeValue);
                } else {
                    googleTranslate(node.nodeValue, targetLang).then(translatedText => {
                        node.nodeValue = translatedText;
                    });
                }
            });
        }

        function translatePage() {
            document.querySelectorAll("[data-translate]").forEach(element => {
                let targetLang = element.getAttribute("data-translate");
                translateHTMLContent(element, targetLang);
            });
        }
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
    console.log("load currentlang: ", currentLang);
    document.getElementById("lang-select").value = currentLang; // Set dropdown to saved language
    changeLanguage();
    translatePage();
}
const languages = ["en", "hu", "de", "fr", "pl", "gl", "no", "pr"];
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
