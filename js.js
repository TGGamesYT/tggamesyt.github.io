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
fetch('https://tggamesyt.dev/outside.html')
.then(response => response.text())
.then(data => {
    let temp = document.createElement('div');
    temp.innerHTML = data;
    let navContent = temp.querySelector('#navigation');
    if (navContent) {
        document.getElementById('navbar').innerHTML = navContent.innerHTML;
    }
});
fetch('https://tggamesyt.dev/outside.html')
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

window.addEventListener("load", () => {
      const params = new URLSearchParams(window.location.search);
      const text = params.get("text");
      if (text) {
        alert(text);
      }
    });
(async () => {
  const params = new URLSearchParams(window.location.search);
  const gh = params.get("gh");
  if (!gh) return;

  const shortcuts = {
    site: "tggamesyt.github.io"
  };

  const parts = gh.split("/");
  let repo = parts.shift();
  const extraPath = parts.join("/");

  if (shortcuts[repo]) {
    repo = shortcuts[repo];
  }

  // basic safety check
  if (!/^[a-zA-Z0-9._-]+$/.test(repo)) return;

  const repoApiUrl = `https://api.github.com/repos/tggamesyt/${repo}`;

  try {
    const res = await fetch(repoApiUrl, { method: "HEAD" });

    // repo exists
    if (res.ok) {
      const redirectUrl =
        `https://github.com/tggamesyt/${repo}` +
        (extraPath ? "/" + extraPath : "");

      window.location.replace(redirectUrl);
    }
  } catch {
    // network error → do nothing
  }
})();
