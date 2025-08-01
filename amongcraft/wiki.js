(async () => {
  const config = await fetch('https://tggamesyt.dev/amongcraft/config.json').then(r => r.json());

  document.documentElement.style.setProperty('--theme-color', config.themeColor);

  // Apply background images from config
  if (config["background-main"]) {
  document.documentElement.style.setProperty('--wiki-main-bg', `url('${config["background-main"]}')`);
}
if (config["background-nav"]) {
  document.documentElement.style.setProperty('--wiki-nav-bg', `url('${config["background-nav"]}')`);
}

  const root = document.getElementById('wiki-root');

  root.innerHTML = `
    <header id="wiki-header">
      <div class="left">
        <svg id="hamburger-btn" class="icon-btn" viewBox="0 0 24 24" aria-label="Open navigation" role="button" tabindex="0">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="center">
        <img src="${config.siteLogo}" alt="logo" class="logo" />
        <span>${config.siteName}</span>
      </div>
      <div class="right">
        <svg id="search-btn" class="icon-btn" viewBox="0 0 24 24" aria-label="Search" role="button" tabindex="0">
          <circle cx="11" cy="11" r="7" stroke="white" stroke-width="2" fill="none" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
    </header>

    <nav id="nav-drawer" class="closed" aria-label="Main navigation">
      <ul>
        ${config.navItems.map(item => `<li><a href="${item.url}">${item.name}</a></li>`).join('')}
      </ul>
    </nav>

    <aside id="search-panel" role="search">
      <input id="search-input" type="search" placeholder="Search..." aria-label="Search wiki" autocomplete="off" />
      <div id="search-results" role="listbox" aria-live="polite" aria-relevant="additions"></div>
    </aside>

    
  `;

  // Apply background to main and nav if defined
  const wikiContent = document.getElementById('wiki-content');
  const navDrawer = document.getElementById('nav-drawer');
  if (wikiContent && config["background-main"]) {
    wikiContent.style.backgroundImage = `url('${config["background-main"]}')`;
    wikiContent.style.backgroundRepeat = 'repeat';
  }
  if (navDrawer && config["background-nav"]) {
    navDrawer.style.backgroundImage = `url('${config["background-nav"]}')`;
    navDrawer.style.backgroundRepeat = 'repeat';
  }

  const hamburgerBtn = document.getElementById('hamburger-btn');
  const searchBtn = document.getElementById('search-btn');
  const searchPanel = document.getElementById('search-panel');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  hamburgerBtn?.addEventListener('click', () => {
    const isClosed = navDrawer.classList.contains('closed');
    navDrawer.classList.toggle('closed', !isClosed);
    navDrawer.classList.toggle('open', isClosed);
  });

  searchBtn?.addEventListener('click', () => {
    searchPanel.classList.toggle('open');
    if (searchPanel.classList.contains('open')) {
      searchInput.focus();
    } else {
      searchInput.value = '';
      searchResults.innerHTML = '';
    }
  });

  const pages = config.navItems;

  searchInput?.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      searchResults.innerHTML = '';
      if (window.innerWidth >= 768) searchResults.classList.remove('show');
      return;
    }
    const matches = pages.filter(p => p.name.toLowerCase().includes(query));
    searchResults.innerHTML = matches.map(p =>
      `<a href="${p.url}" role="option">${p.name}</a>`).join('');
    if (window.innerWidth >= 768) {
      searchResults.classList.toggle('show', matches.length > 0);
    }
  });

  document.addEventListener('click', e => {
    if (window.innerWidth >= 768 && !searchPanel.contains(e.target)) {
      searchResults.classList.remove('show');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!navDrawer.classList.contains('closed')) {
        navDrawer.classList.add('closed');
        navDrawer.classList.remove('open');
      }
      if (searchPanel.classList.contains('open')) {
        searchPanel.classList.remove('open');
        searchInput.value = '';
        searchResults.innerHTML = '';
      }
    }
  });
})();
