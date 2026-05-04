const BACKEND_URL = "https://election-funny-game.onrender.com";

const partyList = [
  { key: "tvk", name: "TVK", color: "#ff3f3f", accent: "#ff8a7a", image: "images/vijay.jpg" },
  { key: "dmk", name: "DMK+", color: "#e88bff", accent: "#c375ff", image: "images/stalin.jpg" },
  { key: "ntk", name: "NTK", color: "#4ef1ff", accent: "#7cfeff", image: "images/seeman.jpeg" },
  { key: "aiadmk", name: "AIADMK+", color: "#ffd96e", accent: "#ffcb4c", image: "images/edapadi.jpg" }
];

const defaultVotes = {
  trichyEast: { tvk: 120, dmk: 95, ntk: 15, aiadmk: 3 },
  perambur: { tvk: 80, dmk: 110, ntk: 9, aiadmk: 1 }
};

const state = {
  constituency: "trichyEast",
  votes: JSON.parse(JSON.stringify(defaultVotes)),
  selected: "tvk"
};

const partyGrid = document.getElementById("partyGrid");
const heroParty = document.getElementById("heroParty");
const heroVotes = document.getElementById("heroVotes");
const heroRange = document.getElementById("heroRange");
const heroImage = document.getElementById("heroImage");
const cheerOverlay = document.getElementById("cheerOverlay");
const toast = document.getElementById("toast");
const tabs = [...document.querySelectorAll(".tab")];
const confettiCanvas = document.getElementById("confettiCanvas");
const ctx = confettiCanvas.getContext("2d");
const socket = io(BACKEND_URL);
let particles = [];
let confettiRunning = false;
const imageCache = new Map();

function createPartyCard(party) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "party-card";
  card.dataset.party = party.key;
  card.addEventListener("click", () => handlePartyClick(party.key));

  const avatar = document.createElement("div");
  avatar.className = "party-avatar";
  const avatarImage = document.createElement("img");
  avatarImage.src = party.image;
  avatarImage.alt = `${party.name} leader`;
  avatar.appendChild(avatarImage);

  const info = document.createElement("div");
  info.className = "party-info";
  info.innerHTML = `
    <div class="party-top">
      <div class="party-name">${party.name}</div>
      <div class="party-votes" id="votes-${party.key}">0</div>
    </div>
    <div class="party-range" id="range-${party.key}">0 - 0</div>
    <div class="progress-wrap">
      <div class="progress-bar">
        <div class="progress-fill" id="fill-${party.key}"></div>
      </div>
      <div class="progress-label"><span>Live power</span><span id="percent-${party.key}">0%</span></div>
    </div>
  `;

  card.appendChild(avatar);
  card.appendChild(info);
  return card;
}

function buildGrid() {
  partyGrid.innerHTML = "";
  partyList.forEach(party => {
    partyGrid.appendChild(createPartyCard(party));
  });
}

function render() {
  const votes = state.votes[state.constituency];
  const maxVotes = Math.max(...Object.values(votes), 1);
  const selectedParty = partyList.find(p => p.key === state.selected) || partyList[0];
  const selectedVotes = votes[state.selected];

  heroParty.textContent = `${selectedParty.name} is heating up`;
  heroVotes.textContent = selectedVotes.toLocaleString();
  heroRange.textContent = formatRange(selectedVotes);
  heroImage.src = selectedParty.image;
  heroImage.alt = `${selectedParty.name} leader`;

  partyList.forEach(party => {
    const voteCount = votes[party.key] || 0;
    const card = document.querySelector(`.party-card[data-party="${party.key}"]`);
    if (card) {
      card.classList.toggle("active", party.key === state.selected);
    }
    const votesNode = document.getElementById(`votes-${party.key}`);
    const rangeNode = document.getElementById(`range-${party.key}`);
    const fillNode = document.getElementById(`fill-${party.key}`);
    const percentNode = document.getElementById(`percent-${party.key}`);

    if (votesNode) votesNode.textContent = voteCount.toLocaleString();
    if (rangeNode) rangeNode.textContent = formatRange(voteCount);
    if (percentNode) percentNode.textContent = `${Math.round((voteCount / maxVotes) * 100)}%`;
    if (fillNode) fillNode.style.width = `${Math.round((voteCount / maxVotes) * 100)}%`;
    if (fillNode) fillNode.style.background = `linear-gradient(90deg, ${party.color}, ${party.accent})`;
  });
}

function formatRange(voteCount) {
  const lower = Math.max(0, voteCount - Math.floor(voteCount * 0.12 + 6));
  const upper = voteCount + Math.floor(voteCount * 0.18 + 9);
  return `${lower} - ${upper}`;
}

async function handlePartyClick(partyKey) {
  state.selected = partyKey;
  const winner = partyList.find(p => p.key === partyKey);

  try {
    const response = await fetch(`${BACKEND_URL}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ constituency: state.constituency, party: partyKey })
    });

    if (!response.ok) {
      throw new Error("Vote failed");
    }
  } catch (error) {
    showToast("Offline vote added locally", "#ffb347");
    state.votes[state.constituency][partyKey] += 1;
    render();
  }

  playPartyTone(partyKey);
  triggerConfetti(partyKey);
  showToast(`${winner.name} Celebrating!`, winner.color);
}

function handleTabSwitch(constituency) {
  state.constituency = constituency;
  state.selected = Object.keys(state.votes[constituency])[0];
  tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.constituency === constituency));
  render();
}

function showToast(message, background = "rgba(255,76,76,0.96)") {
  toast.textContent = message;
  toast.style.background = background;
  toast.classList.add("show");
  window.clearTimeout(toast.hideTimeout);
  toast.hideTimeout = window.setTimeout(() => toast.classList.remove("show"), 1600);
}

function playPartyTone(partyKey) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  let frequency = 300;

  if (partyKey === "tvk") frequency = 340;
  if (partyKey === "dmk") frequency = 260;
  if (partyKey === "ntk") frequency = 420;
  if (partyKey === "aiadmk") frequency = 190;

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.55);
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.55);
}

function resizeCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function triggerConfetti(partyKey) {
  const party = partyList.find(p => p.key === partyKey);
  if (!party) return;
  const image = imageCache.get(party.key);

  for (let i = 0; i < 24; i += 1) {
    particles.push({
      x: Math.random() * confettiCanvas.width,
      y: -20,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 4 + 2,
      size: Math.random() * 22 + 16,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 8 - 4,
      color: party.color,
      type: "image",
      image,
      alpha: 1
    });
  }

  for (let i = 0; i < 36; i += 1) {
    particles.push({
      x: Math.random() * confettiCanvas.width,
      y: -20,
      vx: (Math.random() - 0.5) * 3.5,
      vy: Math.random() * 4 + 2.5,
      size: Math.random() * 16 + 10,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 8 - 4,
      color: party.color,
      type: "emoji",
      content: "🎉",
      alpha: 1
    });
  }

  showCheerBanner(`${party.name} Rain!`, party.color);

  if (!confettiRunning) {
    confettiRunning = true;
    window.requestAnimationFrame(animateConfetti);
  }
}

function animateConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  particles = particles.filter(p => p.y < confettiCanvas.height + 100 && p.alpha > 0.02);

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotationSpeed;
    p.alpha -= 0.01;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.globalAlpha = p.alpha;

    if (p.type === "image" && p.image) {
      const size = p.size;
      ctx.drawImage(p.image, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = p.color;
      ctx.font = `${Math.round(p.size)}px serif`;
      ctx.fillText(p.content || "🎉", 0, 0);
    }

    ctx.restore();
  });

  if (particles.length > 0) {
    window.requestAnimationFrame(animateConfetti);
  } else {
    confettiRunning = false;
  }
}

function initEvents() {
  tabs.forEach(tab => {
    tab.addEventListener("click", () => handleTabSwitch(tab.dataset.constituency));
  });
  window.addEventListener("resize", resizeCanvas);
}

function initSocket() {
  socket.on("votes.updated", data => {
    state.votes = data;
    render();
  });
}

async function syncInitialVotes() {
  try {
    const response = await fetch(`${BACKEND_URL}/votes`);
    if (!response.ok) throw new Error("Failed to load votes");
    state.votes = await response.json();
  } catch (error) {
    console.warn("Could not fetch votes from server:", error);
  }
}

function preloadPartyImages() {
  return Promise.all(partyList.map(party => {
    return new Promise(resolve => {
      const img = new Image();
      img.src = party.image;
      img.onload = () => {
        imageCache.set(party.key, img);
        resolve();
      };
      img.onerror = () => {
        resolve();
      };
    });
  }));
}

function showCheerBanner(message, background = "rgba(255, 92, 92, 0.95)") {
  cheerOverlay.textContent = message;
  cheerOverlay.style.background = background;
  cheerOverlay.classList.add("show");
  window.clearTimeout(cheerOverlay.hideTimeout);
  cheerOverlay.hideTimeout = window.setTimeout(() => cheerOverlay.classList.remove("show"), 1800);
}

async function init() {
  buildGrid();
  initEvents();
  resizeCanvas();
  initSocket();
  await preloadPartyImages();
  await syncInitialVotes();
  render();
}

init();
