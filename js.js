function toggleMenu() {
    document.getElementById("sidebar").classList.toggle("active");
}
function toltott() {
    let lang = leker("lang");
    console.log("language:", lang)
    if (currentLang != lang) {
        toggleLanguage()
    }
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
const languages = ["en", "hu", "de", "fr"]; // Add more languages here
let currentLang = localStorage.getItem("lang") || "en"; // Load saved language

document.getElementById("lang-select").value = currentLang; // Set dropdown to saved language

function changeLanguage() {
    currentLang = document.getElementById("lang-select").value;
    localStorage.setItem("lang", currentLang); // Save language selection

    // Show/hide elements based on selected language
    document.querySelectorAll("[data-lang]").forEach(el => {
        el.style.display = (el.getAttribute("data-lang") === currentLang) ? "block" : "none";
    });

    console.log("Language changed to:", currentLang);
}

// Initialize on page load
window.onload = setTimeout(changeLanguage, 200);
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
