const seed = "SigmaRadioSeed";
const startTime = new Date("2025-01-01T00:00:00Z").getTime();
let manifest = [];
let currentPlaylist = [];
let currentTrackIndex = -1;
let currentOffset = 0;
let isPaused = true;
const prefix = "MC Radio | ";

const iframe = document.getElementById("ytPlayer");
const playerContainer = document.getElementById("playerContainer");

function seededRandom(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return () => {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967296;
  };
}

function generatePlaylist(elapsedSec, rand) {
  const playlist = [];
  let t = 0;
  let last = null;
  while (t < elapsedSec + 60) {
    let candidate;
    do {
      candidate = manifest[Math.floor(rand() * manifest.length)];
    } while (last && candidate.link === last.link);
    playlist.push({ ...candidate, isYap: false });
    t += candidate.duration;
    last = candidate;
  }
  return playlist;
}

function updateTrackList() {
  const list = document.getElementById("trackList");
  list.innerHTML = "<b>Now Playing:</b><br>";
  let displayCount = 0;
  let i = currentTrackIndex;
  while (i < currentPlaylist.length && displayCount < 6) {
    const item = currentPlaylist[i];
    const label = displayCount === 0 ? "▶️ " : "⏩ ";
    const name = item.title || `Video ${i}`;
    list.innerHTML += label + name + "<br>";
    if (label === "▶️ ") setTitle(prefix, name);
    i++;
    displayCount++;
  }
}

function setTitle(prefix, value) {
  document.title = prefix + value;
}

function extractVideoID(link) {
  const match = link.match(/(?:v=|\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

function playCurrent() {
  if (currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length) {
    const track = currentPlaylist[currentTrackIndex];
    const vid = extractVideoID(track.link);
    if (!vid) return;
    const startTime = Math.floor(currentOffset);
    const src = `https://www.youtube.com/embed/${vid}?autoplay=1&start=${startTime}&enablejsapi=1&rel=0&playsinline=1`;
    iframe.src = src;
    playerContainer.style.display = "block";
    updateTrackList();
  }
}

function playNext() {
  currentTrackIndex++;
  currentOffset = 0;
  if (currentTrackIndex < currentPlaylist.length) {
    playCurrent();
  } else {
    syncToLive();
  }
}

function syncToLive() {
  const now = Date.now();
  const elapsed = Math.floor((now - startTime) / 1000);
  const rand = seededRandom(seed);
  currentPlaylist = generatePlaylist(elapsed, rand);
  let t = 0;
  for (let i = 0; i < currentPlaylist.length; i++) {
    const item = currentPlaylist[i];
    if (t + item.duration > elapsed) {
      currentTrackIndex = i;
      currentOffset = elapsed - t;
      playCurrent();
      break;
    }
    t += item.duration;
  }
}

async function initPlayer() {
  const urlParams = new URLSearchParams(window.location.search);
  const playParam = urlParams.get("play");
  const manifestFile = playParam ? `${playParam}.json` : "manifest.json";
  const res = await fetch("https://tg.is-a.dev/ytradio" + manifestFile);
  manifest = await res.json();

  document.getElementById("playPauseBtn").addEventListener("click", () => {
    if (isPaused) {
      syncToLive();
      isPaused = false;
      document.getElementById("playPauseBtn").textContent = "Pause";
    } else {
      iframe.src = "";
      isPaused = true;
      document.getElementById("playPauseBtn").textContent = "Resume";
    }
  });

  document.getElementById("volumeSlider").addEventListener("input", (e) => {
    // YouTube iframe doesn't support setting volume directly unless using YouTube Player API.
    // You could implement this later with postMessage if needed.
    console.warn("Volume control is limited without YouTube Player API.");
  });

  document.getElementById("playlistSelector").addEventListener("change", function () {
    const selected = this.value;
    const url = new URL(window.location.href);
    url.searchParams.set("play", selected);
    window.location.href = url.toString();
  });

  const currentPlay = new URLSearchParams(window.location.search).get("play") || "manifest";
  document.getElementById("playlistSelector").value = currentPlay;
}

initPlayer();
