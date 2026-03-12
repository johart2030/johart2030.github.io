import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { enableCloudSave, firebaseConfig } from "./firebase-config.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const coinsEl = document.getElementById("coins");
const speedEl = document.getElementById("speed");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const authState = document.getElementById("authState");
const authModal = document.getElementById("authModal");
const openAuthBtn = document.getElementById("openAuthBtn");
const closeAuthBtn = document.getElementById("closeAuthBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const emailLoginBtn = document.getElementById("emailLoginBtn");
const emailSignupBtn = document.getElementById("emailSignupBtn");
const authName = document.getElementById("authName");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const logoutBtn = document.getElementById("logoutBtn");
const spriteSelect = document.getElementById("spriteSelect");
const trailSelect = document.getElementById("trailSelect");
const colorSelect = document.getElementById("colorSelect");
const spriteActionBtn = document.getElementById("spriteActionBtn");
const trailActionBtn = document.getElementById("trailActionBtn");
const colorActionBtn = document.getElementById("colorActionBtn");
const shopMsg = document.getElementById("shopMsg");

const W = canvas.width;
const H = canvas.height;
const PROFILE_KEY = "wdash-profile";
const LEGACY_BEST_KEY = "wdash-best";
const OBSTACLE_CLEAR_POINTS = 100;

const SPRITES = [
  { id: "dart", name: "Dart", cost: 0, style: "dart" },
  { id: "nova", name: "Nova", cost: 150, style: "orb" },
  { id: "blade", name: "Blade", cost: 300, style: "blade" },
  { id: "void", name: "Void", cost: 500, style: "box" },
  { id: "chevron", name: "Chevron", cost: 800, style: "chevron" },
  { id: "stingray", name: "Stingray", cost: 1200, style: "dart" },
  { id: "halo", name: "Halo", cost: 1800, style: "orb" },
  { id: "razor", name: "Razor", cost: 2600, style: "blade" },
  { id: "mono", name: "Mono", cost: 3500, style: "box" },
  { id: "viper", name: "Viper", cost: 5000, style: "chevron" },
  { id: "arc", name: "Arc", cost: 7000, style: "orb" },
  { id: "scythe", name: "Scythe", cost: 9500, style: "blade" },
  { id: "ion", name: "Ion", cost: 13000, style: "dart" },
  { id: "prism", name: "Prism", cost: 18000, style: "box" },
  { id: "falcon", name: "Falcon", cost: 25000, style: "chevron" },
  { id: "ghost", name: "Ghost", cost: 35000, style: "orb" },
  { id: "sting", name: "Sting", cost: 50000, style: "blade" },
  { id: "flux", name: "Flux", cost: 70000, style: "dart" },
  { id: "wraith", name: "Wraith", cost: 90000, style: "box" },
  { id: "oracle", name: "Oracle", cost: 100000, style: "chevron" },
];

const TRAILS = [
  { id: "solid", name: "Solid Line", cost: 0, style: "solid" },
  { id: "dashed", name: "Dashed", cost: 150, style: "dashed" },
  { id: "neon", name: "Neon", cost: 300, style: "neon" },
  { id: "rainbow", name: "Rainbow", cost: 500, style: "rainbow" },
  { id: "pulse", name: "Pulse", cost: 800, style: "pulse" },
  { id: "spark", name: "Spark", cost: 1200, style: "spark" },
  { id: "comet", name: "Comet", cost: 1800, style: "neon" },
  { id: "glow", name: "Glow", cost: 2600, style: "neon" },
  { id: "trace", name: "Trace", cost: 3500, style: "solid" },
  { id: "drift", name: "Drift", cost: 5000, style: "dashed" },
  { id: "flash", name: "Flash", cost: 7000, style: "pulse" },
  { id: "arc-line", name: "Arc Line", cost: 9500, style: "solid" },
  { id: "signal", name: "Signal", cost: 13000, style: "dashed" },
  { id: "ember", name: "Ember", cost: 18000, style: "spark" },
  { id: "glass", name: "Glass", cost: 25000, style: "neon" },
  { id: "aura", name: "Aura", cost: 35000, style: "pulse" },
  { id: "flare", name: "Flare", cost: 50000, style: "spark" },
  { id: "strobe", name: "Strobe", cost: 70000, style: "dashed" },
  { id: "spectrum", name: "Spectrum", cost: 90000, style: "rainbow" },
  { id: "celestial", name: "Celestial", cost: 100000, style: "rainbow" },
];

const COLORS = [
  { id: "amber", name: "Amber", cost: 0, primary: "#ffd166", accent: "#ff5d73", trail: "rgba(115,242,255,0.95)", glow: "rgba(80,245,255,0.25)" },
  { id: "mint", name: "Mint", cost: 150, primary: "#8df5c7", accent: "#45d6a0", trail: "rgba(141,245,199,0.95)", glow: "rgba(118,248,219,0.25)" },
  { id: "crimson", name: "Crimson", cost: 300, primary: "#ff8f8f", accent: "#ff4d6d", trail: "rgba(255,120,120,0.95)", glow: "rgba(255,90,130,0.26)" },
  { id: "violet", name: "Violet", cost: 500, primary: "#b69cff", accent: "#7f5af0", trail: "rgba(186,158,255,0.95)", glow: "rgba(166,134,255,0.24)" },
  { id: "plasma", name: "Plasma", cost: 800, primary: "#7cf6ff", accent: "#2cc9ff", trail: "rgba(124,246,255,0.95)", glow: "rgba(83,224,255,0.28)" },
  { id: "ember", name: "Ember", cost: 1200, primary: "#ffb26b", accent: "#ff7a4f", trail: "rgba(255,178,107,0.95)", glow: "rgba(255,140,90,0.25)" },
  { id: "glacier", name: "Glacier", cost: 1800, primary: "#9bdcff", accent: "#5aa6ff", trail: "rgba(155,220,255,0.95)", glow: "rgba(120,190,255,0.26)" },
  { id: "lime", name: "Lime", cost: 2600, primary: "#b8ff6b", accent: "#69d64f", trail: "rgba(184,255,107,0.95)", glow: "rgba(150,230,90,0.25)" },
  { id: "ruby", name: "Ruby", cost: 3500, primary: "#ff7a8a", accent: "#d63a55", trail: "rgba(255,122,138,0.95)", glow: "rgba(230,80,110,0.25)" },
  { id: "cobalt", name: "Cobalt", cost: 5000, primary: "#7aa6ff", accent: "#3a5bd6", trail: "rgba(122,166,255,0.95)", glow: "rgba(90,130,230,0.25)" },
  { id: "aqua", name: "Aqua", cost: 7000, primary: "#63f0ff", accent: "#2aa8b5", trail: "rgba(99,240,255,0.95)", glow: "rgba(70,210,220,0.25)" },
  { id: "sunset", name: "Sunset", cost: 9500, primary: "#ffb1a3", accent: "#ff6f91", trail: "rgba(255,177,163,0.95)", glow: "rgba(255,120,150,0.25)" },
  { id: "orchid", name: "Orchid", cost: 13000, primary: "#e3a2ff", accent: "#a35bd6", trail: "rgba(227,162,255,0.95)", glow: "rgba(190,120,230,0.25)" },
  { id: "graphite", name: "Graphite", cost: 18000, primary: "#b0b8c7", accent: "#5b667a", trail: "rgba(176,184,199,0.95)", glow: "rgba(140,150,170,0.25)" },
  { id: "coral", name: "Coral", cost: 25000, primary: "#ff9f7a", accent: "#ff5f3a", trail: "rgba(255,159,122,0.95)", glow: "rgba(255,120,90,0.25)" },
  { id: "jade", name: "Jade", cost: 35000, primary: "#6bffb3", accent: "#2dc984", trail: "rgba(107,255,179,0.95)", glow: "rgba(70,220,150,0.25)" },
  { id: "steel", name: "Steel", cost: 50000, primary: "#9bb6cc", accent: "#4f6f8a", trail: "rgba(155,182,204,0.95)", glow: "rgba(120,150,175,0.25)" },
  { id: "ultraviolet", name: "Ultraviolet", cost: 70000, primary: "#7a6bff", accent: "#4430d9", trail: "rgba(122,107,255,0.95)", glow: "rgba(90,80,230,0.25)" },
  { id: "aurora", name: "Aurora", cost: 90000, primary: "#7dffea", accent: "#31c9b6", trail: "rgba(125,255,234,0.95)", glow: "rgba(90,220,200,0.25)" },
  { id: "eclipse", name: "Eclipse", cost: 100000, primary: "#f2f2ff", accent: "#202235", trail: "rgba(242,242,255,0.95)", glow: "rgba(200,200,230,0.25)" },
];

let state = "idle";
let score = 0;
let hold = false;
let last = performance.now();
let uid = null;
let auth = null;
let db = null;

let profile = loadLocalProfile();
let best = profile.bestScore;

const player = { x: 170, y: H * 0.5, vy: 0, r: 11 };
const trailPoints = [];

const world = {
  scroll: 260,
  speedScale: 1,
  obstacles: [],
  pickups: [],
  spawnTimer: 0,
  spawnEvery: 0.95,
  center: H * 0.5,
  time: 0,
};

bestEl.textContent = String(best);
coinsEl.textContent = String(profile.coins);

function validFirebaseConfig(config) {
  return Boolean(config.apiKey && config.projectId && config.authDomain);
}

if (validFirebaseConfig(firebaseConfig)) {
  const app = initializeApp(firebaseConfig);
  try {
    getAnalytics(app);
  } catch {
    // Analytics can fail in local or non-standard contexts.
  }

  db = getFirestore(app);
  auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  googleLoginBtn.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, provider);
      authModal.classList.add("hidden");
    } catch (err) {
      authState.textContent = `Login failed: ${err.code || "unknown-error"}`;
    }
  });

  emailLoginBtn.addEventListener("click", async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) {
      authState.textContent = "Enter email and password.";
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      authModal.classList.add("hidden");
    } catch (err) {
      authState.textContent = `Email login failed: ${err.code || "unknown-error"}`;
    }
  });

  emailSignupBtn.addEventListener("click", async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    const name = authName.value.trim();
    if (!email || !password) {
      authState.textContent = "Enter email and password.";
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      authModal.classList.add("hidden");
    } catch (err) {
      authState.textContent = `Sign up failed: ${err.code || "unknown-error"}`;
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
  });

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      uid = user.uid;
      authState.textContent = `Signed in: ${user.displayName || user.email || user.uid} (syncing...)`;
      openAuthBtn.textContent = "Account";
      logoutBtn.disabled = false;
      await loadPlayerData();
      authState.textContent = `Signed in: ${user.displayName || user.email || user.uid}`;
      authPassword.value = "";
    } else {
      uid = null;
      authState.textContent = "Guest mode (login optional)";
      openAuthBtn.textContent = "Login";
      logoutBtn.disabled = true;
    }
  });
} else {
  authState.textContent = "Guest mode (Firebase auth not configured)";
  openAuthBtn.disabled = true;
  googleLoginBtn.disabled = true;
  emailLoginBtn.disabled = true;
  emailSignupBtn.disabled = true;
  logoutBtn.disabled = true;
}

openAuthBtn.addEventListener("click", () => {
  authModal.classList.remove("hidden");
});

closeAuthBtn.addEventListener("click", () => {
  authModal.classList.add("hidden");
});

authModal.addEventListener("click", (e) => {
  if (e.target === authModal) authModal.classList.add("hidden");
});

function defaultProfile() {
  return {
    bestScore: 0,
    lastScore: 0,
    totalRuns: 0,
    totalScore: 0,
    coins: 0,
    ownedSprites: ["dart"],
    ownedTrails: ["solid"],
    ownedColors: ["amber"],
    equippedSprite: "dart",
    equippedTrail: "solid",
    equippedColor: "amber",
    updatedAt: Date.now(),
  };
}

function idsFrom(items) {
  return new Set(items.map((item) => item.id));
}

function sanitizeOwned(list, validIds, requiredId) {
  const owned = Array.isArray(list) ? list.filter((id) => validIds.has(id)) : [];
  if (!owned.includes(requiredId)) owned.unshift(requiredId);
  return [...new Set(owned)];
}

function normalizeProfile(data) {
  const spriteIds = idsFrom(SPRITES);
  const trailIds = idsFrom(TRAILS);
  const colorIds = idsFrom(COLORS);
  const normalized = {
    bestScore: Math.max(0, Number(data?.bestScore || 0)),
    lastScore: Math.max(0, Number(data?.lastScore || 0)),
    totalRuns: Math.max(0, Number(data?.totalRuns || 0)),
    totalScore: Math.max(0, Number(data?.totalScore || 0)),
    coins: Math.max(0, Number(data?.coins || 0)),
    ownedSprites: sanitizeOwned(data?.ownedSprites, spriteIds, "dart"),
    ownedTrails: sanitizeOwned(data?.ownedTrails, trailIds, "solid"),
    ownedColors: sanitizeOwned(data?.ownedColors, colorIds, "amber"),
    equippedSprite: String(data?.equippedSprite || "dart"),
    equippedTrail: String(data?.equippedTrail || "solid"),
    equippedColor: String(data?.equippedColor || "amber"),
    updatedAt: Math.max(0, Number(data?.updatedAt || 0)),
  };

  if (!normalized.ownedSprites.includes(normalized.equippedSprite)) normalized.equippedSprite = "dart";
  if (!normalized.ownedTrails.includes(normalized.equippedTrail)) normalized.equippedTrail = "solid";
  if (!normalized.ownedColors.includes(normalized.equippedColor)) normalized.equippedColor = "amber";

  return normalized;
}

function loadLocalProfile() {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) return normalizeProfile(JSON.parse(saved));
  } catch {
    // Ignore invalid local profile payloads.
  }

  const fallback = defaultProfile();
  const legacyBest = Math.max(0, Number(localStorage.getItem(LEGACY_BEST_KEY) || 0));
  fallback.bestScore = legacyBest;
  fallback.lastScore = legacyBest;
  return fallback;
}

function persistLocalProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(LEGACY_BEST_KEY, String(profile.bestScore));
}

function mergeProfiles(localProfile, remoteProfile) {
  if (!remoteProfile) return localProfile;

  const remoteIsNewer = remoteProfile.updatedAt > localProfile.updatedAt;
  const ownedSprites = [...new Set([...localProfile.ownedSprites, ...remoteProfile.ownedSprites])];
  const ownedTrails = [...new Set([...localProfile.ownedTrails, ...remoteProfile.ownedTrails])];
  const ownedColors = [...new Set([...localProfile.ownedColors, ...remoteProfile.ownedColors])];

  const preferredSprite = remoteIsNewer ? remoteProfile.equippedSprite : localProfile.equippedSprite;
  const preferredTrail = remoteIsNewer ? remoteProfile.equippedTrail : localProfile.equippedTrail;
  const preferredColor = remoteIsNewer ? remoteProfile.equippedColor : localProfile.equippedColor;

  return {
    bestScore: Math.max(localProfile.bestScore, remoteProfile.bestScore),
    lastScore: remoteIsNewer ? remoteProfile.lastScore : localProfile.lastScore,
    totalRuns: Math.max(localProfile.totalRuns, remoteProfile.totalRuns),
    totalScore: Math.max(localProfile.totalScore, remoteProfile.totalScore),
    coins: remoteIsNewer ? remoteProfile.coins : localProfile.coins,
    ownedSprites,
    ownedTrails,
    ownedColors,
    equippedSprite: ownedSprites.includes(preferredSprite) ? preferredSprite : "dart",
    equippedTrail: ownedTrails.includes(preferredTrail) ? preferredTrail : "solid",
    equippedColor: ownedColors.includes(preferredColor) ? preferredColor : "amber",
    updatedAt: Math.max(localProfile.updatedAt, remoteProfile.updatedAt, Date.now()),
  };
}

async function loadPlayerData() {
  if (!enableCloudSave || !uid || !db) return;
  try {
    const ref = doc(db, "players", uid);
    const snap = await getDoc(ref);
    const remoteProfile = snap.exists() ? normalizeProfile(snap.data().profile) : null;

    profile = normalizeProfile(mergeProfiles(profile, remoteProfile));
    best = profile.bestScore;
    bestEl.textContent = String(best);
    coinsEl.textContent = String(profile.coins);
    persistLocalProfile();
    refreshShopUi();

    await setDoc(
      ref,
      {
        profile,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    authState.textContent = `Signed in (sync failed: ${err.code || "unknown-error"})`;
  }
}

async function savePlayerData() {
  if (!enableCloudSave || !uid || !db) return;
  try {
    await setDoc(
      doc(db, "players", uid),
      {
        profile,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    authState.textContent = `Signed in (autosave failed: ${err.code || "unknown-error"})`;
  }
}

function getItem(items, id) {
  return items.find((item) => item.id === id);
}

function getShopContext(type) {
  if (type === "sprite") {
    return {
      items: SPRITES,
      owned: profile.ownedSprites,
      equipped: profile.equippedSprite,
      select: spriteSelect,
      button: spriteActionBtn,
      applyEquip: (id) => {
        profile.equippedSprite = id;
      },
    };
  }
  if (type === "trail") {
    return {
      items: TRAILS,
      owned: profile.ownedTrails,
      equipped: profile.equippedTrail,
      select: trailSelect,
      button: trailActionBtn,
      applyEquip: (id) => {
        profile.equippedTrail = id;
      },
    };
  }
  return {
    items: COLORS,
    owned: profile.ownedColors,
    equipped: profile.equippedColor,
    select: colorSelect,
    button: colorActionBtn,
    applyEquip: (id) => {
      profile.equippedColor = id;
    },
  };
}

function describeItem(item, owned) {
  if (!item) return "Unknown";
  return owned ? `${item.name} (owned)` : `${item.name} (${item.cost} pts)`;
}

function populateSelect(select, items, ownedIds) {
  const previous = select.value;
  select.innerHTML = "";
  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = describeItem(item, ownedIds.includes(item.id));
    select.appendChild(option);
  }
  if (items.some((item) => item.id === previous)) {
    select.value = previous;
  }
}

function updateActionButton(type) {
  const { items, owned, equipped, select, button } = getShopContext(type);

  const item = getItem(items, select.value);
  if (!item) {
    button.textContent = "Unavailable";
    button.disabled = true;
    return;
  }

  if (equipped === item.id) {
    button.textContent = "Equipped";
    button.disabled = true;
    return;
  }

  if (owned.includes(item.id)) {
    button.textContent = "Equip";
    button.disabled = false;
    return;
  }

  button.textContent = `Buy (${item.cost})`;
  button.disabled = profile.coins < item.cost;
}

function refreshShopUi() {
  populateSelect(spriteSelect, SPRITES, profile.ownedSprites);
  populateSelect(trailSelect, TRAILS, profile.ownedTrails);
  populateSelect(colorSelect, COLORS, profile.ownedColors);
  if (!profile.ownedSprites.includes(spriteSelect.value)) spriteSelect.value = profile.equippedSprite;
  if (!profile.ownedTrails.includes(trailSelect.value)) trailSelect.value = profile.equippedTrail;
  if (!profile.ownedColors.includes(colorSelect.value)) colorSelect.value = profile.equippedColor;
  updateActionButton("sprite");
  updateActionButton("trail");
  updateActionButton("color");
}

function shopAction(type) {
  const { items, select, owned, applyEquip } = getShopContext(type);
  const item = getItem(items, select.value);

  if (!item) return;

  if (!owned.includes(item.id)) {
    if (profile.coins < item.cost) {
      shopMsg.textContent = "Not enough points yet.";
      updateActionButton(type);
      return;
    }
    profile.coins -= item.cost;
    owned.push(item.id);
    shopMsg.textContent = `Bought ${item.name}.`;
  } else {
    shopMsg.textContent = `${item.name} equipped.`;
  }

  applyEquip(item.id);

  profile.updatedAt = Date.now();
  coinsEl.textContent = String(profile.coins);
  persistLocalProfile();
  refreshShopUi();
  void savePlayerData();
}

spriteSelect.addEventListener("change", () => updateActionButton("sprite"));
trailSelect.addEventListener("change", () => updateActionButton("trail"));
colorSelect.addEventListener("change", () => updateActionButton("color"));
spriteActionBtn.addEventListener("click", () => shopAction("sprite"));
trailActionBtn.addEventListener("click", () => shopAction("trail"));
colorActionBtn.addEventListener("click", () => shopAction("color"));

function hardReset() {
  state = "idle";
  score = 0;
  world.speedScale = 1;
  world.scroll = 260;
  world.obstacles = [];
  world.pickups = [];
  world.spawnTimer = 0;
  world.center = H * 0.5;
  world.time = 0;
  trailPoints.length = 0;
  player.y = H * 0.5;
  player.vy = 0;
  showOverlay("Press Space To Start", "Avoid randomized hazards and earn points to buy styles.");
}

function startGame() {
  state = "running";
  score = 0;
  world.obstacles.length = 0;
  world.pickups.length = 0;
  world.spawnTimer = 0;
  world.speedScale = 1;
  world.scroll = 260;
  world.center = H * 0.5;
  world.time = 0;
  trailPoints.length = 0;
  player.y = H * 0.5;
  player.vy = 0;
  hideOverlay();
}

function applyRunResult(runScore) {
  profile.lastScore = runScore;
  profile.totalRuns += 1;
  profile.totalScore += runScore;
  profile.coins += runScore;
  profile.bestScore = Math.max(profile.bestScore, runScore);
  profile.updatedAt = Date.now();

  best = profile.bestScore;
  bestEl.textContent = String(best);
  coinsEl.textContent = String(profile.coins);
  persistLocalProfile();
  refreshShopUi();
}

function lose() {
  state = "dead";
  const rounded = Math.floor(score);
  applyRunResult(rounded);
  shopMsg.textContent = `Run ended: +${rounded} points.`;
  void savePlayerData();
  showOverlay("Crashed", `Score ${rounded}. Press Space or click to restart.`);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function spawnObstacle() {
  world.center += rand(-170, 170);
  world.center = clamp(world.center, 90, H - 90);

  const roll = Math.random();
  if (roll < 0.43) {
    world.obstacles.push({
      kind: "gate",
      x: W + 70,
      w: rand(52, 74),
      center: world.center,
      gap: rand(125, 170),
      scored: false,
    });
  } else if (roll < 0.74) {
    world.obstacles.push({
      kind: "movingGate",
      x: W + 70,
      w: rand(54, 78),
      baseCenter: world.center,
      amp: rand(22, 65),
      freq: rand(1.2, 2.5),
      phase: rand(0, Math.PI * 2),
      gap: rand(120, 165),
      scored: false,
    });
  } else if (roll < 0.92) {
    world.obstacles.push({
      kind: "pulseGate",
      x: W + 70,
      w: rand(56, 82),
      center: world.center,
      baseGap: rand(130, 180),
      pulse: rand(12, 35),
      freq: rand(1.8, 3.2),
      phase: rand(0, Math.PI * 2),
      scored: false,
    });
  } else {
    world.obstacles.push({
      kind: "spinner",
      x: W + 70,
      radius: rand(10, 14),
      armLen: rand(40, 58),
      angle: rand(0, Math.PI * 2),
      spin: (Math.random() < 0.5 ? -1 : 1) * rand(2.1, 3.4),
      baseY: rand(90, H - 90),
      swayAmp: rand(18, 48),
      swayFreq: rand(1.1, 2.2),
      phase: rand(0, Math.PI * 2),
      scored: false,
    });
  }

  if (Math.random() < 0.55) {
    world.pickups.push({
      x: W + 95,
      y: clamp(world.center + rand(-60, 60), 36, H - 36),
      r: 9,
      value: Math.floor(rand(12, 32)),
    });
  }
}

function gateState(obstacle) {
  if (obstacle.kind === "gate") {
    return { center: obstacle.center, gap: obstacle.gap };
  }

  if (obstacle.kind === "movingGate") {
    return {
      center: clamp(
        obstacle.baseCenter + Math.sin(world.time * obstacle.freq + obstacle.phase) * obstacle.amp,
        70,
        H - 70
      ),
      gap: obstacle.gap,
    };
  }

  return {
    center: obstacle.center,
    gap: clamp(
      obstacle.baseGap + Math.sin(world.time * obstacle.freq + obstacle.phase) * obstacle.pulse,
      95,
      190
    ),
  };
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function pointSegmentDistanceSq(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return distSq(px, py, ax, ay);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return distSq(px, py, bx, by);
  const t = c1 / c2;
  const qx = ax + t * vx;
  const qy = ay + t * vy;
  return distSq(px, py, qx, qy);
}

function obstacleRightEdge(obstacle) {
  if (obstacle.kind === "spinner") {
    return obstacle.x + obstacle.armLen + obstacle.radius;
  }
  return obstacle.x + obstacle.w;
}

function update(dt) {
  if (state !== "running") return;

  world.time += dt;
  world.speedScale += dt * 0.064;
  world.scroll = 260 * world.speedScale;

  player.vy = hold ? -world.scroll : world.scroll;
  player.y += player.vy * dt;

  // Move existing trail points with the world so the trail follows behind the player.
  for (const p of trailPoints) p.x -= world.scroll * dt;
  trailPoints.push({ x: player.x, y: player.y, life: 0.9 });
  for (const p of trailPoints) p.life -= dt;
  while (
    trailPoints.length > 65 ||
    (trailPoints[0] && (trailPoints[0].life <= 0 || trailPoints[0].x < -30))
  ) {
    trailPoints.shift();
  }

  world.spawnTimer += dt;
  if (world.spawnTimer >= world.spawnEvery) {
    world.spawnTimer = 0;
    spawnObstacle();
  }

  for (const obstacle of world.obstacles) {
    obstacle.x -= world.scroll * dt;
    if (obstacle.kind === "spinner") obstacle.angle += obstacle.spin * dt;
  }

  for (const pickup of world.pickups) {
    pickup.x -= world.scroll * dt;
  }

  for (const obstacle of world.obstacles) {
    if (!obstacle.scored && obstacleRightEdge(obstacle) < player.x - player.r) {
      obstacle.scored = true;
      score += OBSTACLE_CLEAR_POINTS;
      shopMsg.textContent = `Obstacle cleared +${OBSTACLE_CLEAR_POINTS} score`;
    }
  }

  world.obstacles = world.obstacles.filter((obstacle) => obstacle.x > -120);
  world.pickups = world.pickups.filter((pickup) => pickup.x > -40);

  if (player.y - player.r < 0 || player.y + player.r > H) {
    lose();
    return;
  }

  for (const obstacle of world.obstacles) {
    if (obstacle.kind === "spinner") {
      const cy = obstacle.baseY + Math.sin(world.time * obstacle.swayFreq + obstacle.phase) * obstacle.swayAmp;
      if (distSq(player.x, player.y, obstacle.x, cy) <= (player.r + obstacle.radius) ** 2) {
        lose();
        return;
      }

      const tipX = obstacle.x + Math.cos(obstacle.angle) * obstacle.armLen;
      const tipY = cy + Math.sin(obstacle.angle) * obstacle.armLen;
      if (pointSegmentDistanceSq(player.x, player.y, obstacle.x, cy, tipX, tipY) <= (player.r + 4) ** 2) {
        lose();
        return;
      }
      continue;
    }

    const stateNow = gateState(obstacle);
    const gapTop = stateNow.center - stateNow.gap * 0.5;
    const gapBottom = stateNow.center + stateNow.gap * 0.5;

    if (player.x + player.r < obstacle.x || player.x - player.r > obstacle.x + obstacle.w) continue;
    if (player.y - player.r < gapTop || player.y + player.r > gapBottom) {
      lose();
      return;
    }
  }

  for (let i = world.pickups.length - 1; i >= 0; i--) {
    const pickup = world.pickups[i];
    if (distSq(player.x, player.y, pickup.x, pickup.y) <= (player.r + pickup.r) ** 2) {
      score += pickup.value;
      shopMsg.textContent = `Coin +${pickup.value} score`;
      world.pickups.splice(i, 1);
    }
  }
}

function drawBackground(t) {
  const wave = Math.sin(t * 0.0015) * 10;
  ctx.fillStyle = "#081728";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 35; i++) {
    const x = (i * 147 + t * 0.08) % (W + 120) - 60;
    const y = ((i * 97) % H) + wave;
    ctx.fillStyle = "rgba(130,220,255,0.17)";
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawTrail() {
  if (trailPoints.length < 2) return;

  const trail = profile.equippedTrail;
  const trailDef = getItem(TRAILS, trail);
  const trailStyle = trailDef?.style || trail;
  const color = getItem(COLORS, profile.equippedColor) || COLORS[0];

  if (trailStyle === "rainbow") {
    for (let i = 1; i < trailPoints.length; i++) {
      const a = trailPoints[i - 1];
      const b = trailPoints[i];
      const hue = (i * 14 + world.time * 220) % 360;
      ctx.strokeStyle = `hsla(${hue}, 90%, 62%, ${Math.max(0.15, b.life)})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    return;
  }

  ctx.beginPath();
  ctx.moveTo(trailPoints[0].x, trailPoints[0].y);
  for (let i = 1; i < trailPoints.length; i++) ctx.lineTo(trailPoints[i].x, trailPoints[i].y);

  if (trailStyle === "dashed") {
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = color.trail;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  if (trailStyle === "neon") {
    ctx.strokeStyle = color.glow;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = color.trail;
    ctx.lineWidth = 2.6;
    ctx.stroke();
    return;
  }

  if (trailStyle === "pulse") {
    const pulse = 2.2 + Math.sin(world.time * 8) * 1.2;
    ctx.strokeStyle = color.glow;
    ctx.lineWidth = pulse + 5;
    ctx.stroke();
    ctx.strokeStyle = color.trail;
    ctx.lineWidth = pulse;
    ctx.stroke();
    return;
  }

  if (trailStyle === "spark") {
    ctx.strokeStyle = color.trail;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = color.trail;
    for (let i = 0; i < trailPoints.length; i += 5) {
      const p = trailPoints[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // Default starter trail is a solid line.
  ctx.strokeStyle = color.trail;
  ctx.lineWidth = 2.8;
  ctx.stroke();
}

function drawObstacle(obstacle) {
  if (obstacle.kind === "spinner") {
    const cy = obstacle.baseY + Math.sin(world.time * obstacle.swayFreq + obstacle.phase) * obstacle.swayAmp;
    const tipX = obstacle.x + Math.cos(obstacle.angle) * obstacle.armLen;
    const tipY = cy + Math.sin(obstacle.angle) * obstacle.armLen;

    ctx.strokeStyle = "#9ed8ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(obstacle.x, cy);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.fillStyle = "#ff5d73";
    ctx.beginPath();
    ctx.arc(obstacle.x, cy, obstacle.radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const current = gateState(obstacle);
  const topH = current.center - current.gap * 0.5;
  const botY = current.center + current.gap * 0.5;

  ctx.fillStyle = obstacle.kind === "movingGate" ? "#13273b" : "#0d2234";
  ctx.fillRect(obstacle.x, 0, obstacle.w, topH);
  ctx.fillRect(obstacle.x, botY, obstacle.w, H - botY);

  ctx.fillStyle = obstacle.kind === "pulseGate" ? "#ffae57" : "#73f2ff";
  ctx.fillRect(obstacle.x + obstacle.w - 6, topH - 3, 6, 3);
  ctx.fillRect(obstacle.x + obstacle.w - 6, botY, 6, 3);
}

function drawPickups() {
  for (const pickup of world.pickups) {
    ctx.fillStyle = "rgba(255, 214, 102, 0.28)";
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, pickup.r + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, pickup.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  const angle = hold ? -Math.PI * 0.25 : Math.PI * 0.25;
  const sprite = profile.equippedSprite;
  const spriteDef = getItem(SPRITES, sprite);
  const spriteStyle = spriteDef?.style || sprite;
  const color = getItem(COLORS, profile.equippedColor) || COLORS[0];

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(angle);

  if (spriteStyle === "orb") {
    ctx.fillStyle = color.primary;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(2, -2, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (spriteStyle === "blade") {
    ctx.fillStyle = color.primary;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(0, -9);
    ctx.lineTo(-10, 0);
    ctx.lineTo(0, 9);
    ctx.closePath();
    ctx.fill();
  } else if (spriteStyle === "box") {
    ctx.fillStyle = color.primary;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = color.accent;
    ctx.fillRect(-3, -3, 6, 6);
  } else if (spriteStyle === "chevron") {
    ctx.strokeStyle = color.primary;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, -8);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 8);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = color.accent;
    ctx.beginPath();
    ctx.arc(-4, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = color.primary;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-10, -8);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = color.accent;
    ctx.beginPath();
    ctx.arc(-8, 0, 2.7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawUi() {
  scoreEl.textContent = String(Math.floor(score));
  speedEl.textContent = `${world.speedScale.toFixed(2)}x`;
  coinsEl.textContent = String(profile.coins);
}

function render(t) {
  const dt = Math.min(0.033, (t - last) / 1000);
  last = t;

  update(dt);
  drawBackground(t);
  drawTrail();
  for (const obstacle of world.obstacles) drawObstacle(obstacle);
  drawPickups();
  drawPlayer();
  drawUi();
  requestAnimationFrame(render);
}

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function onPress() {
  hold = true;
  if (state === "idle" || state === "dead") startGame();
}

function onRelease() {
  hold = false;
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    onPress();
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space") onRelease();
});
canvas.addEventListener("pointerdown", onPress);
window.addEventListener("pointerup", onRelease);
window.addEventListener("blur", onRelease);

refreshShopUi();
hardReset();
requestAnimationFrame(render);
