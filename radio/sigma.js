    const base = "https://tg.is-a.dev/assets/radio/";
    const seed = "SigmaRadioSeed";
    const startTime = new Date("2025-01-01T00:00:00Z").getTime();

    let manifest = [];
    let audio = document.getElementById('player');
    let currentTrackIndex = -1;
    let currentOffset = 0;
    let currentPlaylist = [];
    let isPaused = true;
    let prefix = "Sigma Radio | ";

    function seededRandom(seed) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
      }
      return () => {
        h += h << 13; h ^= h >>> 7;
        h += h << 3;  h ^= h >>> 17;
        h += h << 5;
        return (h >>> 0) / 4294967296;
      };
    }
    
    function createTimeAnnouncement(date) {
      /*setTitle(prefix, "Sigma Songs 24/7")*/
      const hour = date.getHours() % 12 || 12;
      const minute = date.getMinutes();
      const isAM = date.getHours() < 12;

      const timeDir = base + "time/";
      const announcement = [
        { file: timeDir + "intro.mp3", duration: 3, isYap: true },
        { file: timeDir + `hour_${hour}.mp3`, duration: 1, isYap: true }
      ];

      if (minute !== 0) {
        const minuteStr = minute.toString().padStart(2, '0');
        announcement.push({ file: timeDir + `minute_${minuteStr}.mp3`, duration: 1, isYap: true });
      }

      announcement.push(
        { file: timeDir + `${isAM ? "am" : "pm"}.mp3`, duration: 1, isYap: true },
        { file: timeDir + "outro.mp3", duration: 3, isYap: true }
      );
        
      return announcement;
    }

    function generatePlaylist(elapsedSec, rand) {
      const playlist = [];
      let t = 0;
      let songCount = 0;
      let announceAfter = 8 + Math.floor(rand() * 5);
      let lastSong = null;

      while (t < elapsedSec + 60) {
        if (songCount >= announceAfter) {
          const bundle = createTimeAnnouncement(new Date());
          playlist.push(...bundle);
          t += bundle.reduce((sum, item) => sum + item.duration, 0);
          songCount = 0;
          announceAfter = 8 + Math.floor(rand() * 5);
          lastSong = null; // reset for safety
        } else {
          let candidate;
          do {
            candidate = manifest[Math.floor(rand() * manifest.length)];
          } while (lastSong && candidate.file === lastSong.file);

          lastSong = candidate;
          playlist.push({
            file: base + "songs/" + candidate.file,
            duration: candidate.duration,
            isYap: false
          });
          t += candidate.duration;
          songCount++;
        }
      }

      return playlist;
    }

    function updateTrackList() {
    const list = document.getElementById("trackList");
    list.innerHTML = "<b>Now Playing:</b><br>";

    let displayCount = 0;
    let i = currentTrackIndex; // Start at the current track index

    // Display current and next 5 songs
    while (i < currentPlaylist.length && displayCount < 6) {
        const item = currentPlaylist[i];

        // If it's a yapping block, handle it as a single entity
        if (item.isYap) {
        let j = i;
        // Skip through consecutive yapping blocks (intro, hour, minute, am/pm, outro)
        while (j < currentPlaylist.length && currentPlaylist[j].isYap) j++;
        const label = displayCount === 0 ? "▶️ " : "⏩ ";
        list.innerHTML += label + "🗣️ Time announcement<br>";
        i = j; // Skip over all yapping blocks
        } else {
        // Normal song entry
        const label = displayCount === 0 ? "▶️ " : "⏩ ";
        const filename = item.file.split("/").pop();
        const manifestItem = manifest.find(m => m.file === filename);
        const name = manifestItem ? manifestItem.title : filename.replace(".mp3", "");
        list.innerHTML += label + name + "<br>";
        if (label === "▶️ ") {
            setTitle(prefix, name)
        }
        i++; // Move to the next track
        }

        displayCount++; // Increment the number of tracks we've displayed
    }
    }




    async function initPlayer() {
      manifest = await fetch(base + 'manifest.json').then(res => res.json());
            function syncToLive() {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const rand = seededRandom(seed);
        currentPlaylist = generatePlaylist(elapsed, rand);

        let t = 0;
        for (let i = 0; i < currentPlaylist.length; i++) {
            const item = currentPlaylist[i];
            if (t + item.duration > elapsed) {
            currentTrackIndex = i;  // Ensure the current track index is set properly
            currentOffset = elapsed - t;
            playCurrent();
            break;
            }
            t += item.duration;
        }
        }


      function playCurrent() {
        if (currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length) {
          const track = currentPlaylist[currentTrackIndex];
          audio.src = track.file;
          audio.currentTime = currentOffset;
          audio.play();
          updateTrackList();
        }
      }

      function playNext() {
        currentTrackIndex++;
        currentOffset = 0;
        if (currentTrackIndex < currentPlaylist.length) {
          playCurrent();
        } else {
          syncToLive(); // refresh playlist
        }
      }
      audio.addEventListener('ended', () => {
        if (!isPaused) playNext();
      });

      document.getElementById("volumeSlider").addEventListener("input", (e) => {
        audio.volume = parseFloat(e.target.value);
      });

      const btn = document.getElementById("playPauseBtn");
      btn.addEventListener("click", () => {
        if (isPaused) {
          syncToLive();
          isPaused = false;
          btn.textContent = "Pause";
        } else {
          audio.pause();
          isPaused = true;
          btn.textContent = "Resume";
        }
      });
    }

    initPlayer();
function insertForceButton() {
  // Prevent multiple buttons
  if (document.getElementById("forceTimeAnnouncementBtn")) return;

  const btn = document.createElement("button");
  btn.id = "forceTimeAnnouncementBtn";
  btn.textContent = "🔊 Force Time Announcement";
  btn.style.marginTop = "10px";
  btn.onclick = async () => {
    const p = createTimeAnnouncement(new Date());
    for (const a of p) {
      await new Promise(r => {
        const au = new Audio(a.file);
        au.onended = r;
        au.onerror = r;
        au.play();
      });
    }
    console.log("sigma");
  };
  document.body.appendChild(btn);
}

// Run immediately if the cookie is already set
if (document.cookie.includes("SigmaRadioTG=true")) {
  insertForceButton();
}

// Monitor for cookie changes every 500ms
setInterval(() => {
  if (document.cookie.includes("SigmaRadioTG=true")) {
    insertForceButton();
  }
}, 500);



//audio visuality
window.onload = function () {
  const audio = document.getElementById("player");
  const canvas = document.getElementById("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  const context = new (window.AudioContext || window.webkitAudioContext)();
  const src = context.createMediaElementSource(audio);
  const analyser = context.createAnalyser();

  src.connect(analyser);
  analyser.connect(context.destination);
  analyser.fftSize = 256;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const barWidth = (WIDTH / bufferLength) * 2.5;

  function renderFrame() {
    requestAnimationFrame(renderFrame);
    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i];
      const r = barHeight + 25 * (i / bufferLength);
      const g = 250 * (i / bufferLength);
      const b = 50;

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
  }

  // Ensure context is resumed when audio is played
  audio.addEventListener("play", () => {
    if (context.state === "suspended") {
      context.resume();
    }
    renderFrame();
  });
};
function setTitle(prefix, value) {
      document.title = prefix + value;
    }
