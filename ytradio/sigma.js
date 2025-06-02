const seed = "SigmaRadioSeed";
const startTime = new Date("2025-06-01T00:00:00Z").getTime();
let manifest = [];
let currentPlaylist = [];
let currentTrackIndex = -1;
let currentOffset = 0;
let isPaused = true;
const prefix = "Yt Radio | ";

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
  console.log("Generating playlist from elapsed seconds:", elapsedSec);
  const playlist = [];
  let t = 0;
  let last = null;
  let safetyCounter = 0;
  const maxIterations = 1000; // safety limit to avoid infinite loops

  while (t < elapsedSec + 60 && safetyCounter < maxIterations) {
    let candidate;
    let tries = 0;
    do {
      candidate = manifest[Math.floor(rand() * manifest.length)];
      tries++;
      if (tries > 50) {
        console.warn("Too many retries picking a new candidate, breaking loop");
        break;
      }
    } while (last && candidate.link === last.link);

    if (!candidate) {
      console.error("No candidate found in manifest. Manifest empty?");
      break;
    }

    playlist.push({ ...candidate, isYap: false });
    t += candidate.duration;
    last = candidate;
    safetyCounter++;
  }

  if (safetyCounter >= maxIterations) {
    console.warn("Safety counter reached in generatePlaylist — breaking infinite loop");
  }

  console.log("Generated playlist length:", playlist.length, "Total duration:", t);
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
  const id = match ? match[1] : null;
  console.log("Extracted video ID from link", link, "→", id);
  return id;
}

function checkVideoEnd() {
  if (isPaused || expectedEndTimestamp === null) return;

  const now = Date.now();
  if (now >= expectedEndTimestamp) {
    console.log("Detected video end via timestamp check, playing next...");
    expectedEndTimestamp = null;
    playNext();
  } else {
    setTimeout(checkVideoEnd, 1000);
  }
}

let expectedEndTimestamp = null;

function playCurrent() {
  try {
    console.log("Attempting to play current track...");
    if (currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length) {
      const track = currentPlaylist[currentTrackIndex];
      const vid = extractVideoID(track.link);
      if (!vid) {
        console.error("Failed to extract video ID!");
        return;
      }
      const startTimeSec = Math.floor(currentOffset);
      const remainingDuration = track.duration - startTimeSec;
      console.log("Playing video:", vid, "Start at:", startTimeSec, "seconds");
      const src = `https://www.youtube.com/embed/${vid}?start=${startTimeSec}&enablejsapi=1&rel=0&playsinline=1&autoplay=1`;
      iframe.src = src;
      expectedEndTimestamp = Date.now() + (remainingDuration * 1000);
      startVideoTimer(remainingDuration);
      checkVideoEnd();
      playerContainer.style.display = "block";
      updateTrackList();
    } else {
      console.warn("Invalid currentTrackIndex:", currentTrackIndex);
    }
  } catch (err) {
    console.error("Error during playCurrent:", err);
  }
}

let videoEndTimeout = 0;

function startVideoTimer(duration) {
  console.log("video timer: "+duration*1000)
  if (videoEndTimeout) clearTimeout(videoEndTimeout);
  console.log("Starting video timer for", duration, "seconds");
  videoEndTimeout = setTimeout(() => {
    console.log("Video timer ended. Moving to next track...");
    playNext();
  }, duration * 1000);
}

function playNext() {
  console.log("playNext() called");
  currentTrackIndex++;
  currentOffset = 0;
  if (currentTrackIndex < currentPlaylist.length) {
    playCurrent();
  } else {
    console.warn("Reached end of playlist, re-syncing...");
    syncToLive();
  }
}

function syncToLive() {
  console.log("Syncing to live radio...");
  const now = Date.now();
  const elapsed = Math.floor((now - startTime) / 1000);
  console.log("Elapsed seconds since start:", elapsed);
  const rand = seededRandom(seed);
  currentPlaylist = generatePlaylist(elapsed, rand);
  let t = 0;
  for (let i = 0; i < currentPlaylist.length; i++) {
    const item = currentPlaylist[i];
    if (t + item.duration > elapsed) {
      currentTrackIndex = i;
      currentOffset = elapsed - t;
      console.log("Selected track index:", i, "Offset:", currentOffset);
      iframe.src = ""; //
      setTimeout(() => {
        playCurrent();
      }, 10);
      return;
    }
    t += item.duration;
  }
  console.error("No valid track found for time sync!");
}

async function initPlayer() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const playParam = urlParams.get("play");
    const manifestFile = playParam ? `${playParam}.json` : "manifest.json";
    console.log("Loading manifest:", manifestFile);
    const res = await fetch("https://tg.is-a.dev/ytradio/" + manifestFile);
    manifest = await res.json();
    console.log("Loaded manifest with", manifest.length, "entries");

    document.getElementById("playPauseBtn").addEventListener("click", () => {
      if (isPaused) {
        console.log("Play clicked, syncing and playing...");
        syncToLive();
        isPaused = false;
        document.getElementById("playPauseBtn").textContent = "Pause";
      } else {
        console.log("Pause clicked, stopping playback.");
        iframe.src = "";
        isPaused = true;
        document.getElementById("playPauseBtn").textContent = "Resume";
      }
    });

    document.getElementById("volumeSlider").addEventListener("input", (e) => {
      const vol = parseInt(e.target.value);
      console.log("Volume slider moved to", vol);
    });

    document.getElementById("playlistSelector").addEventListener("change", function () {
      const selected = this.value;
      const url = new URL(window.location.href);
      url.searchParams.set("play", selected);
      window.location.href = url.toString();
    });

    const currentPlay = new URLSearchParams(window.location.search).get("play") || "manifest";
    document.getElementById("playlistSelector").value = currentPlay;

    console.log("Player initialized. Ready for interaction.");
  } catch (e) {
    console.error("initPlayer error:", e);
  }
}

initPlayer();
