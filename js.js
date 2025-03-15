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
// language changer
let currentLang = 'en'; // Default language

// Function to handle the language change
function changeLanguage() {
    currentLang = document.getElementById("lang-select").value;

    // Show the input field for custom language if "Custom" is selected
    if (currentLang === "custom") {
        document.getElementById("custom-lang-input").style.display = "block";
    } else {
        document.getElementById("custom-lang-input").style.display = "none";
        jegyzes("lang", currentLang); // Save language selection

        // Show/hide elements based on selected language
        document.querySelectorAll("[data-lang]").forEach(el => {
            if (el.getAttribute("data-lang") === currentLang) {
                el.style.display = "block";
            } else {
                el.style.display = "none";
            }
        });
        translatePage(); // Translate text based on the selected language
    }

    console.log("Language changed to:", currentLang);
}

// Function to handle custom language input
function handleCustomLangChange() {
    let customLangCode = document.getElementById("custom-lang-input").value.trim();

    if (customLangCode) {
        currentLang = customLangCode;
        jegyzes("lang", currentLang); // Save custom language selection

        // Apply translation for all translatable elements
        translatePage();
    }
}

// Function to translate the entire page
function translatePage() {
    document.querySelectorAll("[data-lang]").forEach(el => {
        let defaultText = el.innerHTML;
        let targetLang = currentLang;

        // Avoid translating text inside <tags> or HTML elements
        let textContent = el.innerText || el.textContent;

        // Call Google Translate API to translate text content
        if (targetLang !== 'en') {
            googleTranslateText(textContent, targetLang, (translatedText) => {
                el.innerHTML = defaultText.replace(textContent, translatedText);
            });
        } else {
            el.innerHTML = defaultText; // Keep the default text for English
        }
    });
}

// Function to handle translation using Google Translate's unofficial API
function googleTranslateText(text, targetLang, callback) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            // The translation comes back as an array, the first element contains the translated text
            const translatedText = data[0][0][0];
            callback(translatedText); // Invoke callback with translated text
        })
        .catch(error => {
            console.error("Translation error:", error);
            callback(text); // Return original text in case of an error
        });
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
window.onload = load;
window.onbeforeunload = function () {
    if (performance.navigation.type === 1) { // 1 = Reload
        changeLanguage();
    }
};
