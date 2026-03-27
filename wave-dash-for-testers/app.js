import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import {
  getDatabase,
  ref as dbRef,
  onValue,
  update as dbUpdate,
  get as dbGet,
  set as dbSet,               // ✅ ADD THIS
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp,
  remove as dbRemove,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { enableCloudSave, firebaseConfig } from "./firebase-config.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const gameWrap = document.getElementById("gameWrap");
const difficultySelect = document.getElementById("difficultySelect");
const musicToggleBtn = document.getElementById("musicToggleBtn");
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
const shopPreviewTitle = document.getElementById("shopPreviewTitle");
const shopPreviewText = document.getElementById("shopPreviewText");
const shopMsg = document.getElementById("shopMsg");
const leaderboardList = document.getElementById("leaderboardList");
const editorToggleBtn = document.getElementById("editorToggleBtn");
const editorPlayBtn = document.getElementById("editorPlayBtn");
const editorKind = document.getElementById("editorKind");
const editorAddBtn = document.getElementById("editorAddBtn");
const editorGap = document.getElementById("editorGap");
const editorWidth = document.getElementById("editorWidth");
const editorData = document.getElementById("editorData");
const editorExportBtn = document.getElementById("editorExportBtn");
const editorImportBtn = document.getElementById("editorImportBtn");
const editorClearBtn = document.getElementById("editorClearBtn");
const editorMsg = document.getElementById("editorMsg");
const editorPanelToggleBtn = document.getElementById("editorPanelToggleBtn");
const editorPanel = document.getElementById("editorPanel");
const adCopy = document.getElementById("adCopy");
const mobileFlyBtn = document.getElementById("mobileFlyBtn");
const mpToggleBtn = document.getElementById("mpToggleBtn");
const mpStatus = document.getElementById("mpStatus");
const onlineCountEl = document.getElementById("onlineCount");
const versionText = document.getElementById("versionText");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const mpRoomBtn = document.getElementById("mpRoomBtn");
const roomModal = document.getElementById("roomModal");
const closeRoomBtn = document.getElementById("closeRoomBtn");
const roomCodeInput = document.getElementById("roomCodeInput");
const roomCreateBtn = document.getElementById("roomCreateBtn");
const roomJoinBtn = document.getElementById("roomJoinBtn");
const roomStartBtn = document.getElementById("roomStartBtn");
const roomLeaveBtn = document.getElementById("roomLeaveBtn");
const roomStatus = document.getElementById("roomStatus");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const roomListSelect = document.getElementById("roomListSelect");

const W = canvas.width;
const H = canvas.height;
const PROFILE_KEY = "wdash-profile";
const LEGACY_BEST_KEY = "wdash-best";
const MULTI_PUBLIC_ROOM_ID = "public";
const MULTI_PING_MS = 200;
const MULTI_STALE_MS = 9000;
const RACE_COUNTDOWN_SEC = 3;
const SITE_VERSION = 19.10;
const REMOTE_NAME_LIMIT = 18;
const DIFFICULTY_KEY = "wdash-difficulty";
const MUSIC_KEY = "wdash-music-enabled";
const ROOM_CODE_RE = /^[A-Z2-9]{5}$/;
const PLAYER_SCREEN_X = 280;
const OBSTACLE_SPAWN_X = W + 28;
const PICKUP_SPAWN_X = W + 54;

const DEV_UIDS = new Set([]);
const DEV_EMAILS = new Set([]);

const DIFFICULTIES = {
  easy: {
    id: "easy",
    name: "Easy",
    baseScroll: 225,
    speedGrowth: 0.048,
    spawnEvery: 1.12,
    centerJitter: 135,
    gapScale: 1.1,
    pickupBias: 0.7,
    clearPoints: 80,
  },
  medium: {
    id: "medium",
    name: "Medium",
    baseScroll: 260,
    speedGrowth: 0.064,
    spawnEvery: 0.95,
    centerJitter: 170,
    gapScale: 1,
    pickupBias: 0.55,
    clearPoints: 100,
  },
  hard: {
    id: "hard",
    name: "Hard",
    baseScroll: 300,
    speedGrowth: 0.084,
    spawnEvery: 0.8,
    centerJitter: 205,
    gapScale: 0.87,
    pickupBias: 0.42,
    clearPoints: 125,
  },
};

const HOUSE_ADS = [
  "Need a break between runs? Challenge friends in a private room and settle it clean.",
  "House Ad: Try Hard mode if Medium starts feeling comfortable. It ramps faster and pays more.",
  "Wave Dash tip: custom maps are for practice now, not farming points. Use them to learn patterns.",
  "Sponsored by your next best score. Full screen and music both work better after one tap.",
];

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
  { id: "dev-core", name: "Dev Core", cost: 0, style: "orb", devOnly: true },
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
  { id: "dev-signal", name: "Dev Signal", cost: 0, style: "neon", devOnly: true },
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
  { id: "dev-grid", name: "Dev Grid", cost: 0, primary: "#ffffff", accent: "#00f0ff", trail: "rgba(255,255,255,0.95)", glow: "rgba(0,240,255,0.34)", devOnly: true },
];

let state = "idle";
let score = 0;
let hold = false;
let last = performance.now();
let uid = null;
let auth = null;
let db = null;
let rtdb = null;
let rtdbOffsetMs = 0;
let unsubscribeProfile = null;
let saveTimer = null;
let mpEnabled = false;
let mpPlayerId = null;
let mpPlayerRef = null;
let mpRoomRef = null;
let mpPlayersUnsub = null;
let mpRoomUnsub = null;
let mpSendCooldown = 0;
let mpPlayers = new Map();
let localClears = 0;
let mpRoomId = null;
let mpOwnerId = null;
let mpTrails = new Map();
let localDistance = 0;
let leaderboardUnsub = null;
let roomListUnsub = null;
let onlineCountUnsub = null;
let presenceRef = null;
let presencePingTimer = null;
let editorEnabled = false;
let editorArmed = false;
let editorLevel = [];
let currentRunCountsForProgress = true;
let selectedDifficultyId = localStorage.getItem(DIFFICULTY_KEY) || "medium";
let musicEnabled = localStorage.getItem(MUSIC_KEY) === "true";
let adIndex = Math.floor(Math.random() * HOUSE_ADS.length);
let audioCtx = null;
let musicTimer = null;
let musicNextAt = 0;
let sharedSpawnCache = [];

let profile = loadLocalProfile();
let best = profile.bestScore;

const player = { x: PLAYER_SCREEN_X, y: H * 0.5, vy: 0, r: 11 };
const trailPoints = [];

const world = {
  scroll: DIFFICULTIES.medium.baseScroll,
  speedScale: 1,
  obstacles: [],
  pickups: [],
  spawnTimer: 0,
  spawnEvery: DIFFICULTIES.medium.spawnEvery,
  center: H * 0.5,
  time: 0,
  sharedSeed: null,
  sharedDifficulty: null,
  sharedStartMs: null,
  raceStartLocalMs: null,
  raceId: 0,
  raceActiveId: 0,
  joinTimeSec: 0,
  publicStartOverrideMs: null,
  spawnIndex: 0,
  awaitingRaceStart: false,
};

bestEl.textContent = String(best);
coinsEl.textContent = String(profile.coins);

function validFirebaseConfig(config) {
  return Boolean(config.apiKey && config.projectId && config.authDomain);
}

if (validFirebaseConfig(firebaseConfig)) {
  const app = initializeApp(firebaseConfig);

  db = getFirestore(app);
  rtdb = getDatabase(app);
  onValue(dbRef(rtdb, ".info/serverTimeOffset"), (snap) => {
    rtdbOffsetMs = Number(snap.val() || 0);
  });
  auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  googleLoginBtn.addEventListener("click", async () => {
    await startGoogleSignIn(auth, provider);
  });

  emailLoginBtn.addEventListener("click", async () => {
    const email = normalizeEmail(authEmail.value);
    const password = authPassword.value;
    authEmail.value = email;
    if (!isValidEmail(email) || !isStrongEnoughPassword(password)) {
      authState.textContent = "Enter a valid email and password.";
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      authModal.classList.add("hidden");
    } catch {
      authState.textContent = "Email login failed. Please check your credentials.";
    }
  });

  emailSignupBtn.addEventListener("click", async () => {
    const email = normalizeEmail(authEmail.value);
    const password = authPassword.value;
    const name = sanitizeDisplayName(authName.value);
    authEmail.value = email;
    authName.value = name;
    if (!isValidEmail(email) || !isStrongEnoughPassword(password)) {
      authState.textContent = "Use a valid email and a password with at least 8 characters.";
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      authModal.classList.add("hidden");
    } catch {
      authState.textContent = "Sign up failed. Please verify your details and try again.";
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
      subscribeLeaderboard();
    } else {
      uid = null;
      authState.textContent = "Guest mode (login optional)";
      openAuthBtn.textContent = "Login";
      logoutBtn.disabled = true;
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (leaderboardUnsub) {
        leaderboardUnsub();
        leaderboardUnsub = null;
      }
      leaderboardList.innerHTML = "";
      if (mpEnabled) {
        stopMultiplayer();
        mpStatus.textContent = "Multiplayer: Sign in required";
      }
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

mpToggleBtn.addEventListener("click", () => {
  if (!rtdb) {
    mpStatus.textContent = "Multiplayer: Firebase not configured";
    return;
  }
  if (!uid) {
    mpStatus.textContent = "Multiplayer: Sign in required";
    authModal.classList.remove("hidden");
    return;
  }
  if (mpEnabled) {
    stopMultiplayer();
    hardReset();
  } else {
    startMultiplayer(MULTI_PUBLIC_ROOM_ID, { autoStart: true });
  }
});

mpRoomBtn.addEventListener("click", () => {
  if (!rtdb) {
    mpStatus.textContent = "Multiplayer: Firebase not configured";
    return;
  }
  if (!uid) {
    mpStatus.textContent = "Multiplayer: Sign in required";
    authModal.classList.remove("hidden");
    return;
  }
  roomModal.classList.remove("hidden");
  startRoomList();
});

difficultySelect.addEventListener("change", () => {
  selectedDifficultyId = normalizeDifficultyId(difficultySelect.value);
  localStorage.setItem(DIFFICULTY_KEY, selectedDifficultyId);
  if (!mpEnabled) {
    world.sharedDifficulty = null;
    applyDifficultySettings();
    hardReset();
    shopMsg.textContent = `${DIFFICULTIES[selectedDifficultyId].name} mode selected.`;
    return;
  }
  if (mpRoomId === MULTI_PUBLIC_ROOM_ID) {
    mpStatus.textContent = `Public room difficulty stays shared. Rejoin to change local solo mode.`;
    difficultySelect.value = getCurrentDifficultyId();
    return;
  }
  const isOwner = mpOwnerId === getMultiplayerId();
  if (!isOwner) {
    roomStatus.textContent = "Only the room owner can change private room difficulty.";
    difficultySelect.value = getCurrentDifficultyId();
    return;
  }
  roomStatus.textContent = `${DIFFICULTIES[selectedDifficultyId].name} will apply on the next room start.`;
});

musicToggleBtn.addEventListener("click", () => {
  if (musicEnabled) stopMusic();
  else startMusic();
});

closeRoomBtn.addEventListener("click", () => {
  roomModal.classList.add("hidden");
  stopRoomList();
});

roomModal.addEventListener("click", (e) => {
  if (e.target === roomModal) {
    roomModal.classList.add("hidden");
    stopRoomList();
  }
});

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
  const updatedAt = coerceTimestampMs(data?.updatedAt);
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
    updatedAt,
  };

  if (!normalized.ownedSprites.includes(normalized.equippedSprite)) normalized.equippedSprite = "dart";
  if (!normalized.ownedTrails.includes(normalized.equippedTrail)) normalized.equippedTrail = "solid";
  if (!normalized.ownedColors.includes(normalized.equippedColor)) normalized.equippedColor = "amber";

  return normalized;
}

function coerceTimestampMs(value) {
  if (!value) return 0;
  if (typeof value === "number") return Math.max(0, value);
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return Math.max(0, value.seconds * 1000);
  if (typeof value?.[".sv"] === "string") return 0;
  return 0;
}

function sanitizePlayerName(value) {
  const trimmed = String(value || "Player").trim() || "Player";
  return trimmed.slice(0, REMOTE_NAME_LIMIT);
}

function sanitizeDisplayName(value) {
  return String(value || "")
    .replace(/[^\w .-]/g, "")
    .trim()
    .slice(0, 24);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 120);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isStrongEnoughPassword(value) {
  return typeof value === "string" && value.length >= 8 && value.length <= 128;
}

function normalizeRoomCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, "")
    .slice(0, 5);
}

function describeGoogleAuthError(err) {
  const code = String(err?.code || "");
  if (code === "auth/popup-closed-by-user") return "Google sign-in was closed before it finished.";
  if (code === "auth/popup-blocked") return "Google sign-in popup was blocked. Trying redirect instead can help.";
  if (code === "auth/cancelled-popup-request") return "Another sign-in request is already in progress.";
  if (code === "auth/unauthorized-domain") {
    return "This site is not authorized for Google sign-in in Firebase yet.";
  }
  if (code === "auth/operation-not-supported-in-this-environment") {
    return "This browser blocked popup sign-in. Redirect sign-in should work instead.";
  }
  if (code === "auth/network-request-failed") return "Google sign-in failed because of a network error.";
  if (code) return `Google sign-in failed (${code}).`;
  return "Google sign-in failed. Please try again.";
}

async function startGoogleSignIn(authRef, provider) {
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    authState.textContent = "Opening Google sign-in...";
    await signInWithPopup(authRef, provider);
    authModal.classList.add("hidden");
  } catch (err) {
    const code = String(err?.code || "");
    if (
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment"
    ) {
      try {
        authState.textContent = "Popup unavailable. Redirecting to Google sign-in...";
        await signInWithRedirect(authRef, provider);
        return;
      } catch (redirectErr) {
        authState.textContent = describeGoogleAuthError(redirectErr);
        return;
      }
    }
    authState.textContent = describeGoogleAuthError(err);
  }
}

function isCustomMapRun() {
  return editorEnabled && editorLevel.length > 0 && !mpEnabled;
}

function isDevAccount() {
  const email = auth?.currentUser?.email || "";
  return (
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    DEV_UIDS.has(uid || "") ||
    DEV_EMAILS.has(email)
  );
}

function visibleItems(items) {
  return items.filter((item) => !item.devOnly || isDevAccount());
}

function normalizeDifficultyId(value) {
  return DIFFICULTIES[value] ? value : "medium";
}

function getSelectedDifficultyId() {
  return normalizeDifficultyId(selectedDifficultyId);
}

function getCurrentDifficultyId() {
  return normalizeDifficultyId(world.sharedDifficulty || getSelectedDifficultyId());
}

function getDifficultySettings() {
  return DIFFICULTIES[getCurrentDifficultyId()] || DIFFICULTIES.medium;
}

function applyDifficultySettings() {
  const settings = getDifficultySettings();
  world.spawnEvery = settings.spawnEvery;
  if (state !== "running") {
    world.speedScale = 1;
    world.scroll = settings.baseScroll;
  }
}

function resetWorldMotion() {
  const settings = getDifficultySettings();
  world.speedScale = 1;
  world.scroll = settings.baseScroll;
  world.spawnEvery = settings.spawnEvery;
}

function computeSharedDistanceWithSettings(elapsedSec, settings) {
  return settings.baseScroll * (elapsedSec + 0.5 * settings.speedGrowth * elapsedSec * elapsedSec);
}

function updateAdCopy() {
  adCopy.textContent = HOUSE_ADS[adIndex % HOUSE_ADS.length];
}

function rotateAdCopy() {
  adIndex += 1;
  updateAdCopy();
}

function ensureDevItemsUnlocked() {
  if (!isDevAccount()) return;
  for (const item of SPRITES.filter((entry) => entry.devOnly)) {
    if (!profile.ownedSprites.includes(item.id)) profile.ownedSprites.push(item.id);
  }
  for (const item of TRAILS.filter((entry) => entry.devOnly)) {
    if (!profile.ownedTrails.includes(item.id)) profile.ownedTrails.push(item.id);
  }
  for (const item of COLORS.filter((entry) => entry.devOnly)) {
    if (!profile.ownedColors.includes(item.id)) profile.ownedColors.push(item.id);
  }
}

function ensureAudioContext() {
  if (!audioCtx) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    audioCtx = new AudioCtor();
  }
  return audioCtx;
}

function playTone(startAt, frequency, duration, gain = 0.02, type = "sine") {
  const ctxRef = ensureAudioContext();
  if (!ctxRef) return;
  const osc = ctxRef.createOscillator();
  const amp = ctxRef.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  amp.gain.setValueAtTime(0.0001, startAt);
  amp.gain.exponentialRampToValueAtTime(gain, startAt + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(amp);
  amp.connect(ctxRef.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

function scheduleMusicLoop() {
  const ctxRef = ensureAudioContext();
  if (!ctxRef || !musicEnabled) return;
  if (ctxRef.state === "suspended") {
    void ctxRef.resume();
  }
  const now = ctxRef.currentTime;
  if (musicNextAt < now + 0.05) musicNextAt = now + 0.08;
  const notes = [220, 246.94, 261.63, 293.66, 329.63, 392];
  while (musicNextAt < now + 1.6) {
    const base = notes[Math.floor(Math.random() * notes.length)];
    playTone(musicNextAt, base, 0.35, 0.018, "triangle");
    playTone(musicNextAt + 0.18, base * 0.5, 0.45, 0.01, "sine");
    if (Math.random() > 0.45) {
      playTone(musicNextAt + 0.08, base * 1.5, 0.18, 0.006, "square");
    }
    musicNextAt += 0.45 + Math.random() * 0.12;
  }
}

function startMusic() {
  musicEnabled = true;
  localStorage.setItem(MUSIC_KEY, "true");
  musicToggleBtn.textContent = "Music: On";
  const ctxRef = ensureAudioContext();
  if (!ctxRef) {
    musicToggleBtn.textContent = "Music Unsupported";
    return;
  }
  if (musicTimer) clearInterval(musicTimer);
  musicNextAt = ctxRef.currentTime;
  scheduleMusicLoop();
  musicTimer = setInterval(scheduleMusicLoop, 600);
}

function enableMusicFromGesture() {
  if (!musicEnabled) return;
  if (musicTimer) {
    const ctxRef = ensureAudioContext();
    if (ctxRef?.state === "suspended") void ctxRef.resume();
    return;
  }
  startMusic();
}

function stopMusic() {
  musicEnabled = false;
  localStorage.setItem(MUSIC_KEY, "false");
  musicToggleBtn.textContent = "Music: Off";
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
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

async function initSharedRoom(roomRef, { allowStartIfMissing } = {}) {
  try {
    const seed = Math.floor(Math.random() * 1e9) + 1;
    const difficultyId = getSelectedDifficultyId();
    await runTransaction(roomRef, (current) => {
      const next = { ...(current || {}) };
      if (!next.seed) next.seed = seed;
      if (!next.difficulty) next.difficulty = difficultyId;
      if (allowStartIfMissing && !next.startAt) {
        next.startAt = rtdbServerTimestamp();
        next.raceId = (Number(current?.raceId || 0) + 1) || 1;
      }
      return next;
    });
    const snap = await dbGet(roomRef);
    if (snap.exists()) {
      const data = snap.val();
      if (data.seed) {
        world.sharedSeed = Number(data.seed);
        world.sharedDifficulty = normalizeDifficultyId(data.difficulty || difficultyId);
        sharedSpawnCache = [];
        applyDifficultySettings();
        difficultySelect.value = world.sharedDifficulty;
        const startAtMs = coerceTimestampMs(data.startAt);
        if (startAtMs) {
          if (mpRoomId === MULTI_PUBLIC_ROOM_ID) {
            world.sharedStartMs = startAtMs;
            world.raceStartLocalMs = null;
            world.awaitingRaceStart = false;
            const now = Date.now() + rtdbOffsetMs;
            world.joinTimeSec = Math.max(0, (now - world.sharedStartMs) / 1000);
            hideOverlay();
          } else {
            world.raceStartLocalMs = startAtMs;
            world.sharedStartMs = startAtMs + RACE_COUNTDOWN_SEC * 1000;
            world.raceActiveId = 0;
            world.awaitingRaceStart = true;
            world.joinTimeSec = 0;
            prepareRaceStart();
          }
        } else {
          world.sharedStartMs = null;
          world.awaitingRaceStart = false;
          world.joinTimeSec = 0;
          showOverlay("Waiting", "Waiting for the race to start.");
        }
      }
    }
    world.spawnIndex = 0;
  } catch {
    mpStatus.textContent = "Multiplayer: Room init failed";
  }
}

async function loadRoomState(roomRef) {
  try {
    const snap = await dbGet(roomRef);
    if (snap.exists()) {
      const data = snap.val();
      if (data.seed) {
        world.sharedSeed = Number(data.seed);
        world.sharedDifficulty = normalizeDifficultyId(data.difficulty || getSelectedDifficultyId());
        sharedSpawnCache = [];
        applyDifficultySettings();
        difficultySelect.value = world.sharedDifficulty;
        const startAtMs = coerceTimestampMs(data.startAt);
        if (startAtMs) {
          if (mpRoomId === MULTI_PUBLIC_ROOM_ID) {
            world.sharedStartMs = startAtMs;
            world.raceStartLocalMs = null;
            world.awaitingRaceStart = false;
            if (!world.publicStartOverrideMs) {
              const now = Date.now() + rtdbOffsetMs;
              world.joinTimeSec = Math.max(0, (now - world.sharedStartMs) / 1000);
            }
            hideOverlay();
          } else {
            world.raceStartLocalMs = startAtMs;
            world.sharedStartMs = startAtMs + RACE_COUNTDOWN_SEC * 1000;
            world.awaitingRaceStart = true;
            world.joinTimeSec = 0;
            prepareRaceStart();
          }
        } else {
          world.sharedStartMs = null;
          world.raceStartLocalMs = null;
          world.awaitingRaceStart = false;
          world.joinTimeSec = 0;
          showOverlay("Waiting", "Waiting for the race to start.");
        }
      }
      mpOwnerId = data.ownerId || mpOwnerId;
    }
  } catch {
    roomStatus.textContent = "Room load failed.";
  }
}

async function resetRoomSeed(roomRef) {
  try {
    const difficultyId = getSelectedDifficultyId();
    const newSeed = Math.floor(Math.random() * 1e9) + 1;
    await runTransaction(roomRef, (current) => {
      const next = { ...(current || {}) };
      next.seed = newSeed; // Always generate a fresh seed for each race
      next.difficulty = difficultyId;
      next.startAt = rtdbServerTimestamp();
      next.raceId = (Number(current?.raceId || 0) + 1) || 1;
      return next;
    });
    world.sharedDifficulty = difficultyId;
    sharedSpawnCache = [];
    applyDifficultySettings();
    difficultySelect.value = world.sharedDifficulty;
    const now = Date.now() + rtdbOffsetMs;
    world.raceId += 1;
    world.raceStartLocalMs = now;
    world.sharedStartMs = now + RACE_COUNTDOWN_SEC * 1000;
    world.awaitingRaceStart = true;
    world.raceActiveId = 0;
    prepareRaceStart();
  } catch {
    roomStatus.textContent = "Start failed.";
  }
}

function subscribeLeaderboard() {
  if (!db || leaderboardUnsub) return;
  const q = query(collection(db, "leaderboard"), orderBy("bestScore", "desc"), limit(10));
  leaderboardUnsub = onSnapshot(q, (snap) => {
    leaderboardList.innerHTML = "";
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const li = document.createElement("li");
      const name = data.name || "Player";
      const displayScore = Number(data.bestScore || 0);
      li.textContent = `${name}: ${displayScore}`;
      leaderboardList.appendChild(li);
    });
  });
}

function getMultiplayerId() {
  if (uid) return uid;
  const key = "wdash-guest-id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const generated = `guest-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(key, generated);
  return generated;
}

function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function setRoomUiState({ inRoom, owner, code }) {
  roomStartBtn.disabled = !inRoom || !owner;
  roomLeaveBtn.disabled = !inRoom;
  roomCodeDisplay.textContent = code ? `Room code: ${code}` : "";
  const difficultyName = DIFFICULTIES[getCurrentDifficultyId()].name;
  if (inRoom) {
    const ownerMsg = `You are the room owner. ${difficultyName} mode is armed for the next start.`;
    const guestMsg = `Waiting for the owner to start the ${difficultyName} race.`;
    roomStatus.textContent = owner ? ownerMsg : guestMsg;
    mpStatus.textContent = owner
      ? `Room ${code}: you are owner`
      : `Room ${code}: waiting for start`;
  } else {
    roomStatus.textContent = "Create or join a room to race together.";
  }
}

async function createRoom() {
  if (!rtdb || !uid) {
    roomStatus.textContent = "You must be signed in to create a room.";
    return;
  }

  roomCreateBtn.disabled = true;
  roomStatus.textContent = "Creating room...";

  try {
    const code = generateRoomCode();
    const roomRef = dbRef(rtdb, `rooms/${code}`);
    const ownerId = getMultiplayerId();
    const seed = Math.floor(Math.random() * 1e9) + 1;

    console.log("Creating room:", code);

    // ✅ Create FULL room structure
    await dbSet(roomRef, {
      ownerId,
      createdAt: rtdbServerTimestamp(),
      seed,
      difficulty: getSelectedDifficultyId(),
      startAt: null,
      raceId: 0,
      players: {
        [ownerId]: {
          joinedAt: Date.now(),
          lastSeen: Date.now()
      }
    }
    });

    console.log("Room created:", code);

    startMultiplayer(code, { autoStart: false, ownerId });
    setRoomUiState({ inRoom: true, owner: true, code });

    roomModal.classList.add("hidden");
    stopRoomList();

  } catch (e) {
    console.error("CREATE ROOM ERROR:", e);
    roomStatus.textContent = "Failed to create room. Check console.";
  } finally {
    roomCreateBtn.disabled = false;
  }
}

async function joinRoom() {
  if (!rtdb || !uid) {
    roomStatus.textContent = "You must be signed in to join a room.";
    return;
  }

  const manualCode = normalizeRoomCode(roomCodeInput.value);
  const listedCode = normalizeRoomCode(roomListSelect.value);
  const code = manualCode || listedCode;

  roomCodeInput.value = manualCode;

  if (!code) {
    roomStatus.textContent = "Enter a valid 5-character room code or pick one.";
    return;
  }

  if (!ROOM_CODE_RE.test(code)) {
    roomStatus.textContent = "Room codes must be exactly 5 letters or numbers.";
    return;
  }

  roomJoinBtn.disabled = true;
  roomStatus.textContent = "Joining room...";

  try {
    const roomRef = dbRef(rtdb, `rooms/${code}`);
    const snap = await dbGet(roomRef);

    if (!snap.exists()) {
      roomStatus.textContent = "Room not found. Check the code.";
      return;
    }

    const data = snap.val() || {};
    const playerId = getMultiplayerId();
    const isOwner = data.ownerId === playerId;

    console.log("Joining room:", code);

    // ✅ Add player to room
    await dbUpdate(dbRef(rtdb, `rooms/${code}/players`), {
      [getMultiplayerId()]: {
        joinedAt: Date.now(),
        lastSeen: Date.now()
      }
    });

    console.log("Joined room:", code);

    startMultiplayer(code, { autoStart: false, ownerId: data.ownerId || null });
    setRoomUiState({ inRoom: true, owner: isOwner, code });

    roomModal.classList.add("hidden");
    stopRoomList();

  } catch (e) {
    console.error("JOIN ROOM ERROR:", e);
    roomStatus.textContent = "Failed to join room. Check console.";
  } finally {
    roomJoinBtn.disabled = false;
  }
}

function leaveRoom() {
  stopMultiplayer();
  setRoomUiState({ inRoom: false, owner: false, code: "" });
  hardReset();
}

function startRoomList() {
  if (!rtdb || roomListUnsub) return;

  const roomsRef = dbRef(rtdb, "rooms");

  roomListUnsub = onValue(roomsRef, (snap) => {
    roomListSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a room";
    roomListSelect.appendChild(placeholder);

    if (!snap.exists()) return;

    const rooms = snap.val() || {};
    const now = Date.now();

    for (const [code, data] of Object.entries(rooms)) {
      if (!code || code === MULTI_PUBLIC_ROOM_ID) continue;

      const players = data.players || {};

      const activePlayers = Object.values(players).filter((p) => {
        const lastSeen = coerceTimestampMs(p?.lastSeen);
        return lastSeen && now - lastSeen <= MULTI_STALE_MS;
      });

      const count = activePlayers.length;
      const difficultyName =
        DIFFICULTIES[normalizeDifficultyId(data.difficulty)].name;

      const option = document.createElement("option");
      option.value = code;
      option.textContent = `${code} — ${count} player${count !== 1 ? "s" : ""} (${difficultyName})`;

      roomListSelect.appendChild(option);
    }
  });
}

function stopRoomList() {
  if (roomListUnsub) {
    roomListUnsub();
    roomListUnsub = null;
  }
}

function formatPreviewMessage(item, owned, equipped) {
  if (!item) return "Preview unavailable.";
  if (equipped === item.id) return `${item.name} is currently equipped.`;
  if (owned) return `${item.name} is owned and ready to equip.`;
  return `${item.name} costs ${item.cost} points.`;
}

function updateShopPreview() {
  const sprite = getItem(SPRITES, spriteSelect.value) || getItem(SPRITES, profile.equippedSprite) || SPRITES[0];
  const trail = getItem(TRAILS, trailSelect.value) || getItem(TRAILS, profile.equippedTrail) || TRAILS[0];
  const color = getItem(COLORS, colorSelect.value) || getItem(COLORS, profile.equippedColor) || COLORS[0];
  let selectedType = "sprite";
  if (document.activeElement === trailSelect) selectedType = "trail";
  if (document.activeElement === colorSelect) selectedType = "color";
  const context =
    selectedType === "trail"
      ? { item: trail, owned: profile.ownedTrails.includes(trail.id), equipped: profile.equippedTrail }
      : selectedType === "color"
        ? { item: color, owned: profile.ownedColors.includes(color.id), equipped: profile.equippedColor }
        : { item: sprite, owned: profile.ownedSprites.includes(sprite.id), equipped: profile.equippedSprite };
  shopPreviewTitle.textContent = `${sprite.name} / ${trail.name} / ${color.name}`;
  shopPreviewText.textContent = `${formatPreviewMessage(
    context.item,
    context.owned,
    context.equipped
  )} Loadout preview uses ${color.name.toLowerCase()} colors with the ${trail.name.toLowerCase()} trail.`;
}

function updateOnlineCount() {
  if (!rtdb || onlineCountUnsub) return;
  // Watch the dedicated presence/ node which all players (solo + mp) write to.
  onlineCountUnsub = onValue(dbRef(rtdb, "presence"), (snap) => {
    const now = Date.now() + rtdbOffsetMs;
    const uniquePlayers = new Set();
    if (snap.exists()) {
      const entries = snap.val() || {};
      for (const [id, data] of Object.entries(entries)) {
        const lastSeen = coerceTimestampMs(data?.lastSeen);
        if (lastSeen && now - lastSeen <= MULTI_STALE_MS) {
          uniquePlayers.add(id);
        }
      }
    }
    onlineCountEl.textContent = String(uniquePlayers.size);
  });
}

// Write a heartbeat to presence/{id} every 4 seconds so this player
// shows up in the online count even during solo play.
function startPresence() {
  if (!rtdb) return;
  const id = getMultiplayerId();
  presenceRef = dbRef(rtdb, `presence/${id}`);

  function ping() {
    if (!presenceRef) return;
    void dbUpdate(presenceRef, { lastSeen: rtdbServerTimestamp() });
  }

  ping();
  if (presencePingTimer) clearInterval(presencePingTimer);
  presencePingTimer = setInterval(ping, 4000);

  // Remove this player's presence entry when they close the tab.
  onDisconnect(presenceRef).remove();
}

function stopPresence() {
  if (presencePingTimer) {
    clearInterval(presencePingTimer);
    presencePingTimer = null;
  }
  if (presenceRef) {
    void dbRemove(presenceRef);
    presenceRef = null;
  }
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await gameWrap.requestFullscreen();
  } catch {
    mpStatus.textContent = "Full screen is not available here";
  }
}

function setEditorEnabled(value) {
  editorEnabled = value;
  editorToggleBtn.textContent = editorEnabled ? "Editor: On" : "Editor: Off";
  editorMsg.textContent = editorEnabled
    ? "Click the canvas to place obstacles."
    : "Enable editor, then click the canvas to place obstacles.";
  if (!editorEnabled) {
    editorArmed = false;
    editorAddBtn.textContent = "Place On Click";
  }
}

function setEditorPanelVisible(value) {
  if (!editorPanel) return;
  editorPanel.classList.toggle("hidden", !value);
  editorPanelToggleBtn.textContent = value ? "Hide Level Editor" : "Level Editor";
}

function editorObstacleFromClick(kind, x, y) {
  const gap = Math.max(80, Math.min(220, Number(editorGap.value || 150)));
  const width = Math.max(40, Math.min(100, Number(editorWidth.value || 64)));
  if (kind === "spinner") {
    return {
      kind,
      x,
      radius: 12,
      armLen: 46,
      angle: 0,
      spin: 2.6,
      baseY: y,
      swayAmp: 28,
      swayFreq: 1.6,
      phase: 0,
      scored: false,
      editor: true,
    };
  }
  if (kind === "movingGate") {
    return {
      kind,
      x,
      w: width,
      baseCenter: y,
      amp: 40,
      freq: 1.8,
      phase: 0,
      gap,
      scored: false,
      editor: true,
    };
  }
  if (kind === "pulseGate") {
    return {
      kind,
      x,
      w: width,
      center: y,
      baseGap: gap,
      pulse: 20,
      freq: 2.4,
      phase: 0,
      scored: false,
      editor: true,
    };
  }
  if (kind === "corridor") {
    const centerB = clamp(y + 80, 90, H - 90);
    return {
      kind,
      x,
      w: Math.max(140, width * 2),
      centerA: y,
      centerB,
      gap,
      split: 0.5,
      scored: false,
      editor: true,
    };
  }
  return {
    kind: "gate",
    x,
    w: width,
    center: y,
    gap,
    scored: false,
    editor: true,
  };
}

function exportEditorLevel() {
  editorData.value = JSON.stringify(editorLevel, null, 2);
  editorMsg.textContent = `Exported ${editorLevel.length} obstacles.`;
}

function importEditorLevel() {
  try {
    const parsed = JSON.parse(editorData.value || "[]");
    if (!Array.isArray(parsed)) throw new Error("Invalid format");
    editorLevel = parsed.map((o) => ({ ...o, scored: false, editor: true }));
    editorMsg.textContent = `Imported ${editorLevel.length} obstacles.`;
  } catch {
    editorMsg.textContent = "Import failed: invalid JSON.";
  }
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

    if (unsubscribeProfile) unsubscribeProfile();
    unsubscribeProfile = onSnapshot(ref, (liveSnap) => {
      if (!liveSnap.exists()) return;
      const liveProfile = normalizeProfile(liveSnap.data().profile);
      const merged = mergeProfiles(profile, liveProfile);
      if (merged.updatedAt !== profile.updatedAt) {
        profile = normalizeProfile(merged);
        best = profile.bestScore;
        bestEl.textContent = String(best);
        coinsEl.textContent = String(profile.coins);
        persistLocalProfile();
        refreshShopUi();
      }
    });
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

function startMultiplayer(roomId, { autoStart, ownerId } = {}) {
  if (mpEnabled) stopMultiplayer();
  mpEnabled = true;
  mpPlayerId = getMultiplayerId();
  mpRoomId = roomId;
  mpOwnerId = ownerId || null;
  mpRoomRef = dbRef(rtdb, `rooms/${roomId}`);
  mpPlayerRef = dbRef(rtdb, `rooms/${roomId}/players/${mpPlayerId}`);
  mpStatus.textContent = "Multiplayer: Connecting...";
  world.publicStartOverrideMs = null;
  world.sharedDifficulty = autoStart && roomId === MULTI_PUBLIC_ROOM_ID ? getSelectedDifficultyId() : null;
  world.joinTimeSec = 0;
  world.obstacles = [];
  world.pickups = [];
  sharedSpawnCache = [];
  world.spawnIndex = 0;
  world.spawnTimer = 0;
  resetWorldMotion();
  world.raceId = 0;
  world.raceActiveId = 0;
  mpSendCooldown = 0;
  state = "idle";
  currentRunCountsForProgress = true;
  resetPlayerToCenter("Waiting for the race to start.");

  if (autoStart) {
    const allowStartIfMissing = roomId === MULTI_PUBLIC_ROOM_ID;
    void initSharedRoom(mpRoomRef, { allowStartIfMissing });
  } else {
    void loadRoomState(mpRoomRef);
  }

  mpRoomUnsub = onValue(mpRoomRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.val();
    const seed = Number(data.seed || 0);
    const startAtMs = coerceTimestampMs(data.startAt);
    const raceId = Number(data.raceId || 0);
    world.sharedDifficulty = normalizeDifficultyId(data.difficulty || world.sharedDifficulty || getSelectedDifficultyId());
    applyDifficultySettings();
    difficultySelect.value = world.sharedDifficulty;
    if (seed && seed !== world.sharedSeed) {
      world.sharedSeed = seed;
      sharedSpawnCache = [];
      world.spawnIndex = 0;
      world.spawnTimer = 0;
      world.obstacles = [];
      world.pickups = [];
      world.center = H * 0.5;
    }
    if (raceId && raceId !== world.raceId) {
      world.raceId = raceId;
      world.raceActiveId = 0;
      if (startAtMs) {
        if (mpRoomId === MULTI_PUBLIC_ROOM_ID) {
          world.sharedStartMs = startAtMs;
          world.raceStartLocalMs = null;
          if (!world.publicStartOverrideMs) {
            const now = Date.now() + rtdbOffsetMs;
            world.joinTimeSec = Math.max(0, (now - world.sharedStartMs) / 1000);
          }
        } else {
          world.raceStartLocalMs = startAtMs;
          world.sharedStartMs = startAtMs + RACE_COUNTDOWN_SEC * 1000;
          world.joinTimeSec = 0;
        }
      } else {
        const now = Date.now() + rtdbOffsetMs;
        if (mpRoomId === MULTI_PUBLIC_ROOM_ID) {
          world.sharedStartMs = now;
          world.raceStartLocalMs = null;
          world.joinTimeSec = 0;
        } else {
          world.raceStartLocalMs = now;
          world.sharedStartMs = now + RACE_COUNTDOWN_SEC * 1000;
          world.joinTimeSec = 0;
        }
      }
      world.spawnIndex = 0;
      world.spawnTimer = 0;
      world.obstacles = [];
      world.pickups = [];
      world.center = H * 0.5;
      world.time = 0;
      localDistance = 0;
      resetWorldMotion();
      if (mpRoomId === MULTI_PUBLIC_ROOM_ID) {
        world.awaitingRaceStart = false;
        hideOverlay();
      } else {
        const shouldCountdown = world.raceActiveId !== world.raceId;
        world.awaitingRaceStart = shouldCountdown;
        if (shouldCountdown) prepareRaceStart();
      }
    } else if (startAtMs && startAtMs !== world.raceStartLocalMs) {
      if (mpRoomId === MULTI_PUBLIC_ROOM_ID) {
        world.sharedStartMs = startAtMs;
        world.raceStartLocalMs = null;
        if (!world.publicStartOverrideMs) {
          const now = Date.now() + rtdbOffsetMs;
          world.joinTimeSec = Math.max(0, (now - world.sharedStartMs) / 1000);
        }
      } else {
        world.raceStartLocalMs = startAtMs;
        world.sharedStartMs = startAtMs + RACE_COUNTDOWN_SEC * 1000;
        world.joinTimeSec = 0;
      }
      world.raceActiveId = 0;
      world.spawnIndex = 0;
      world.spawnTimer = 0;
      world.obstacles = [];
      world.pickups = [];
      world.center = H * 0.5;
      world.time = 0;
      localDistance = 0;
      resetWorldMotion();
      if (mpRoomId === MULTI_PUBLIC_ROOM_ID) {
        world.awaitingRaceStart = false;
        hideOverlay();
      } else {
        const shouldCountdown = world.raceActiveId !== world.raceId;
        world.awaitingRaceStart = shouldCountdown;
        if (shouldCountdown) prepareRaceStart();
      }
    } else if (!startAtMs && !world.raceStartLocalMs && !world.awaitingRaceStart) {
      // Only reset if we have no local race start time already in progress.
      // This guards against the Firebase server timestamp sentinel ({".sv":"timestamp"})
      // briefly appearing as 0 before the real value arrives, which would
      // otherwise clobber the countdown the owner just started.
      world.sharedStartMs = null;
      world.raceStartLocalMs = null;
      world.awaitingRaceStart = false;
      world.joinTimeSec = 0;
      world.obstacles = [];
      world.pickups = [];
      score = 0;
      state = "idle";
      resetPlayerToCenter("Waiting for the race to start.");
    }
    mpOwnerId = data.ownerId || mpOwnerId;
    if (mpRoomId && mpRoomId !== MULTI_PUBLIC_ROOM_ID) {
      const isOwner = mpOwnerId === getMultiplayerId();
      roomStartBtn.disabled = !isOwner;
      roomLeaveBtn.disabled = false;
    }
  });

  mpPlayersUnsub = onValue(dbRef(rtdb, `rooms/${roomId}/players`), (snap) => {
    const now = Date.now() + rtdbOffsetMs;
    const next = new Map();
    if (snap.exists()) {
      const data = snap.val();
      for (const [key, value] of Object.entries(data)) {
        if (!value || key === mpPlayerId) continue;
        const lastSeen = coerceTimestampMs(value.lastSeen);
        if (now - lastSeen > MULTI_STALE_MS) continue;
        next.set(key, value);
      }
    }
    mpPlayers = next;
    // Sync remote trails with latest positions.
    for (const [id, data] of mpPlayers.entries()) {
      const x = getRemoteRenderX(data);
      const y = data.y || 0;
      const trail = mpTrails.get(id) || [];
      trail.push({ x, y, life: 0.8 });
      mpTrails.set(id, trail);
    }
    for (const id of mpTrails.keys()) {
      if (!mpPlayers.has(id)) mpTrails.delete(id);
    }
    const count = mpPlayers.size + 1;
    if (mpRoomId && mpRoomId !== MULTI_PUBLIC_ROOM_ID) {
      const isOwner = mpOwnerId === getMultiplayerId();
      mpStatus.textContent = isOwner
        ? `Room ${mpRoomId}: owner (${count} player${count !== 1 ? "s" : ""})`
        : `Room ${mpRoomId}: ${count} player${count !== 1 ? "s" : ""}`;
    } else {
      mpStatus.textContent = `Multiplayer: ${count} player${count !== 1 ? "s" : ""}`;
    }
  });

  onDisconnect(mpPlayerRef).remove();
}

function stopMultiplayer() {
  const currentRoomId = mpRoomId;
  mpEnabled = false;
  mpStatus.textContent = "Multiplayer: Off";
  mpPlayers.clear();
  mpTrails.clear();
  mpPlayerRef = null;
  mpRoomRef = null;
  mpRoomId = null;
  mpOwnerId = null;
  mpSendCooldown = 0;
  if (mpPlayersUnsub) {
    mpPlayersUnsub();
    mpPlayersUnsub = null;
  }
  if (mpRoomUnsub) {
    mpRoomUnsub();
    mpRoomUnsub = null;
  }
  if (mpPlayerId) {
    const roomId = currentRoomId || MULTI_PUBLIC_ROOM_ID;
    void dbRemove(dbRef(rtdb, `rooms/${roomId}/players/${mpPlayerId}`));
  }
  world.sharedSeed = null;
  world.sharedDifficulty = null;
  world.sharedStartMs = null;
  world.publicStartOverrideMs = null;
  world.joinTimeSec = 0;
  world.spawnIndex = 0;
  world.awaitingRaceStart = false;
  sharedSpawnCache = [];
  applyDifficultySettings();
  difficultySelect.value = getSelectedDifficultyId();
  currentRunCountsForProgress = true;
  state = "idle";
  score = 0;
}

function queueSave() {
  if (!enableCloudSave || !uid || !db) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void savePlayerData();
  }, 600);
}

function getItem(items, id) {
  return items.find((item) => item.id === id);
}

function getShopContext(type) {
  if (type === "sprite") {
    return {
      items: visibleItems(SPRITES),
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
      items: visibleItems(TRAILS),
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
    items: visibleItems(COLORS),
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
  if (item.devOnly) return owned ? `${item.name} (dev)` : `${item.name} (dev-only)`;
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
  ensureDevItemsUnlocked();
  const visibleSprites = visibleItems(SPRITES);
  const visibleTrails = visibleItems(TRAILS);
  const visibleColors = visibleItems(COLORS);
  if (!visibleSprites.some((item) => item.id === profile.equippedSprite)) profile.equippedSprite = "dart";
  if (!visibleTrails.some((item) => item.id === profile.equippedTrail)) profile.equippedTrail = "solid";
  if (!visibleColors.some((item) => item.id === profile.equippedColor)) profile.equippedColor = "amber";
  populateSelect(spriteSelect, visibleSprites, profile.ownedSprites);
  populateSelect(trailSelect, visibleTrails, profile.ownedTrails);
  populateSelect(colorSelect, visibleColors, profile.ownedColors);
  if (!profile.ownedSprites.includes(spriteSelect.value)) spriteSelect.value = profile.equippedSprite;
  if (!profile.ownedTrails.includes(trailSelect.value)) trailSelect.value = profile.equippedTrail;
  if (!profile.ownedColors.includes(colorSelect.value)) colorSelect.value = profile.equippedColor;
  updateActionButton("sprite");
  updateActionButton("trail");
  updateActionButton("color");
  updateShopPreview();
}

function shopAction(type) {
  const { items, select, owned, applyEquip } = getShopContext(type);
  const item = getItem(items, select.value);

  if (!item) return;
  if (item.devOnly && !isDevAccount()) return;

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
  queueSave();
}

spriteSelect.addEventListener("change", () => {
  updateActionButton("sprite");
  updateShopPreview();
});
trailSelect.addEventListener("change", () => {
  updateActionButton("trail");
  updateShopPreview();
});
colorSelect.addEventListener("change", () => {
  updateActionButton("color");
  updateShopPreview();
});
spriteActionBtn.addEventListener("click", () => shopAction("sprite"));
trailActionBtn.addEventListener("click", () => shopAction("trail"));
colorActionBtn.addEventListener("click", () => shopAction("color"));

editorToggleBtn.addEventListener("click", () => {
  setEditorEnabled(!editorEnabled);
});

editorPanelToggleBtn.addEventListener("click", () => {
  const isHidden = editorPanel.classList.contains("hidden");
  setEditorPanelVisible(isHidden);
});

editorAddBtn.addEventListener("click", () => {
  if (!editorEnabled) return;
  editorArmed = !editorArmed;
  editorAddBtn.textContent = editorArmed ? "Click Canvas..." : "Place On Click";
});

editorExportBtn.addEventListener("click", exportEditorLevel);
editorImportBtn.addEventListener("click", importEditorLevel);
editorClearBtn.addEventListener("click", () => {
  editorLevel = [];
  editorMsg.textContent = "Cleared editor level.";
});

editorPlayBtn.addEventListener("click", () => {
  if (!editorEnabled) setEditorEnabled(true);
  startGame();
});

roomCreateBtn.addEventListener("click", () => {
  void createRoom();
});

roomJoinBtn.addEventListener("click", () => {
  void joinRoom();
});

roomCodeInput.addEventListener("input", () => {
  roomCodeInput.value = normalizeRoomCode(roomCodeInput.value);
});

roomStartBtn.addEventListener("click", () => {
  if (!mpRoomRef || !mpOwnerId) return;
  if (mpOwnerId !== getMultiplayerId()) {
    roomStatus.textContent = "Only the room owner can start.";
    return;
  }
  void resetRoomSeed(mpRoomRef);
});

roomLeaveBtn.addEventListener("click", () => {
  leaveRoom();
});

fullscreenBtn.addEventListener("click", () => {
  void toggleFullscreen();
});

document.addEventListener("fullscreenchange", () => {
  const isGameFullscreen = document.fullscreenElement === gameWrap;
  gameWrap.classList.toggle("is-fullscreen", isGameFullscreen);
  fullscreenBtn.textContent = isGameFullscreen ? "Exit Full Screen" : "Full Screen";
});

function hardReset() {
  state = "idle";
  score = 0;
  localClears = 0;
  localDistance = 0;
  applyDifficultySettings();
  world.obstacles = [];
  world.pickups = [];
  world.spawnTimer = 0;
  world.center = H * 0.5;
  world.time = 0;
  world.spawnIndex = 0;
  trailPoints.length = 0;
  player.y = H * 0.5;
  player.vy = 0;
  hold = false;
  currentRunCountsForProgress = true;
  showOverlay("Press Space To Start", "Avoid randomized hazards and earn points to buy styles.");
}

function startGame() {
  state = "running";
  score = 0;
  localClears = 0;
  currentRunCountsForProgress = !isCustomMapRun();
  const isPublicLive =
    mpEnabled &&
    mpRoomId === MULTI_PUBLIC_ROOM_ID &&
    world.sharedStartMs &&
    !world.publicStartOverrideMs;
  if (!isPublicLive) {
    localDistance = 0;
    world.obstacles.length = 0;
    world.pickups.length = 0;
    world.spawnTimer = 0;
    resetWorldMotion();
    world.center = H * 0.5;
    world.time = 0;
    world.spawnIndex = 0;
    if (mpEnabled) {
      world.obstacles.length = 0;
      world.pickups.length = 0;
      world.spawnIndex = 0;
    }
  }
  trailPoints.length = 0;
  player.y = H * 0.5;
  player.vy = 0;
  if (editorEnabled && editorLevel.length > 0) {
    world.obstacles = editorLevel.map((o) => ({ ...o, scored: false }));
  }
  hideOverlay();
}

function prepareRaceStart() {
  state = "idle";
  score = 0;
  localClears = 0;
  localDistance = 0;
  world.obstacles = [];
  world.pickups = [];
  world.spawnTimer = 0;
  world.center = H * 0.5;
  world.time = 0;
  world.spawnIndex = 0;
  resetWorldMotion();
  world.raceActiveId = 0;
  world.joinTimeSec = 0;
  trailPoints.length = 0;
  player.y = H * 0.5;
  player.vy = 0;
  showOverlay("Race Starting", `Race starts in ${RACE_COUNTDOWN_SEC}...`);
}

function computeSharedDistance(elapsedSec) {
  return computeSharedDistanceWithSettings(elapsedSec, getDifficultySettings());
}

function resetPlayerToCenter(message) {
  player.y = H * 0.5;
  player.vy = 0;
  hold = false;
  if (message) showOverlay("Waiting", message);
}

function applyRunResult(runScore) {
  if (!currentRunCountsForProgress) {
    profile.lastScore = runScore;
    profile.totalRuns += 1;
    profile.updatedAt = Date.now();
    persistLocalProfile();
    return;
  }
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
  updateLeaderboard();
}

function updateLeaderboard() {
  if (!uid || !db) return;
  void setDoc(
    doc(db, "leaderboard", uid),
    {
      name: sanitizePlayerName(auth?.currentUser?.displayName || auth?.currentUser?.email || "Player"),
      bestScore: profile.bestScore,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function lose() {
  state = "dead";
  const rounded = Math.floor(score);
  applyRunResult(rounded);
  if (currentRunCountsForProgress) {
    shopMsg.textContent = `Run ended: +${rounded} points.`;
    queueSave();
  } else {
    shopMsg.textContent = "Custom map run ended. No points were awarded.";
  }
  resetWorldMotion();
  if (mpEnabled && mpRoomId === MULTI_PUBLIC_ROOM_ID) {
    const now = Date.now() + rtdbOffsetMs;
    world.publicStartOverrideMs = now;
    world.sharedStartMs = world.sharedStartMs || now;
    world.joinTimeSec = 0;
    world.obstacles = [];
    world.pickups = [];
    world.spawnIndex = 0;
    world.spawnTimer = 0;
    world.center = H * 0.5;
    world.time = 0;
    localDistance = 0;
  }
  if (mpEnabled && mpRoomId && mpRoomId !== MULTI_PUBLIC_ROOM_ID) {
    showOverlay("Crashed", `Score ${rounded}. Wait for the room owner to start the next race.`);
    return;
  }
  if (mpEnabled && mpRoomId === MULTI_PUBLIC_ROOM_ID) {
    showOverlay("Crashed", `Score ${rounded}. Press Space or tap to re-enter the race.`);
    return;
  }
  showOverlay("Crashed", `Score ${rounded}. Press Space or click to restart.`);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeSeededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function randWith(rng, min, max) {
  return min + rng() * (max - min);
}

function buildSpawnPattern(rng, previousCenter) {
  const settings = getDifficultySettings();
  const gapScale = settings.gapScale;
  const center = clamp(previousCenter + randWith(rng, -settings.centerJitter, settings.centerJitter), 90, H - 90);
  const roll = rng();
  let obstacle;
  if (roll < 0.38) {
    obstacle = {
      kind: "gate",
      w: randWith(rng, 52, 74),
      center,
      gap: randWith(rng, 125, 170) * gapScale,
      scored: false,
    };
  } else if (roll < 0.68) {
    obstacle = {
      kind: "movingGate",
      w: randWith(rng, 54, 78),
      baseCenter: center,
      amp: randWith(rng, 22, 65),
      freq: randWith(rng, 1.2, 2.5),
      phase: randWith(rng, 0, Math.PI * 2),
      gap: randWith(rng, 120, 165) * gapScale,
      scored: false,
    };
  } else if (roll < 0.86) {
    obstacle = {
      kind: "pulseGate",
      w: randWith(rng, 56, 82),
      center,
      baseGap: randWith(rng, 130, 180) * gapScale,
      pulse: randWith(rng, 12, 35),
      freq: randWith(rng, 1.8, 3.2),
      phase: randWith(rng, 0, Math.PI * 2),
      scored: false,
    };
  } else if (roll < 0.94) {
    const centerA = center;
    const centerB = clamp(centerA + randWith(rng, -120, 120), 90, H - 90);
    obstacle = {
      kind: "corridor",
      w: randWith(rng, 140, 220),
      centerA,
      centerB,
      gap: randWith(rng, 115, 150) * gapScale,
      split: randWith(rng, 0.45, 0.55),
      scored: false,
    };
  } else {
    obstacle = {
      kind: "spinner",
      radius: randWith(rng, 10, 14),
      armLen: randWith(rng, 40, 58),
      angle: randWith(rng, 0, Math.PI * 2),
      baseAngle: randWith(rng, 0, Math.PI * 2),
      spin: (rng() < 0.5 ? -1 : 1) * randWith(rng, 2.1, 3.4),
      baseY: randWith(rng, 90, H - 90),
      swayAmp: randWith(rng, 18, 48),
      swayFreq: randWith(rng, 1.1, 2.2),
      phase: randWith(rng, 0, Math.PI * 2),
      scored: false,
    };
  }

  const pickup =
    rng() < settings.pickupBias
      ? {
          y: clamp(center + randWith(rng, -60, 60), 36, H - 36),
          r: 9,
          value: Math.floor(randWith(rng, 12, 32)),
        }
      : null;

  return {
    centerAfter: center,
    obstacle,
    pickup,
  };
}

function spawnObstacle(rng = Math.random) {
  const generated = buildSpawnPattern(rng, world.center);
  world.center = generated.centerAfter;
  if (generated.obstacle) {
    world.obstacles.push({
      ...generated.obstacle,
      x: OBSTACLE_SPAWN_X,
    });
  }
  if (generated.pickup) {
    world.pickups.push({
      ...generated.pickup,
      x: PICKUP_SPAWN_X,
    });
  }
}

function spawnSharedObstacle(index) {
  if (!world.sharedSeed) return;
  while (sharedSpawnCache.length <= index) {
    const spawnIndex = sharedSpawnCache.length;
    const previousCenter = spawnIndex === 0 ? H * 0.5 : sharedSpawnCache[spawnIndex - 1].centerAfter;
    const rng = makeSeededRng((world.sharedSeed ^ ((spawnIndex + 1) * 0x9e3779b9)) >>> 0);
    const generated = buildSpawnPattern(rng, previousCenter);
    const spawnT = spawnIndex * world.spawnEvery;
    sharedSpawnCache.push({
      centerAfter: generated.centerAfter,
      obstacle: generated.obstacle
        ? {
            ...generated.obstacle,
            x: OBSTACLE_SPAWN_X,
            spawnX: OBSTACLE_SPAWN_X,
            spawnT,
          }
        : null,
      pickup: generated.pickup
        ? {
            ...generated.pickup,
            x: PICKUP_SPAWN_X,
            spawnX: PICKUP_SPAWN_X,
            spawnT,
          }
        : null,
    });
  }

  const cached = sharedSpawnCache[index];
  if (cached?.obstacle) world.obstacles.push({ ...cached.obstacle, scored: false });
  if (cached?.pickup) world.pickups.push({ ...cached.pickup });
}

function gateState(obstacle, timeSec) {
  if (obstacle.kind === "gate") {
    return { center: obstacle.center, gap: obstacle.gap };
  }

  if (obstacle.kind === "movingGate") {
    return {
      center: clamp(
        obstacle.baseCenter + Math.sin(timeSec * obstacle.freq + obstacle.phase) * obstacle.amp,
        70,
        H - 70
      ),
      gap: obstacle.gap,
    };
  }

  return {
    center: obstacle.center,
    gap: clamp(
      obstacle.baseGap + Math.sin(timeSec * obstacle.freq + obstacle.phase) * obstacle.pulse,
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

function corridorGapAt(obstacle, xPos) {
  const splitX = obstacle.x + obstacle.w * (obstacle.split ?? 0.5);
  const center = xPos < splitX ? obstacle.centerA : obstacle.centerB;
  return { center, gap: obstacle.gap };
}

function update(dt) {
  if (mpEnabled && mpPlayerRef) {
    mpSendCooldown -= dt * 1000;
    if (mpSendCooldown <= 0) {
      mpSendCooldown = MULTI_PING_MS;
      let dist = localDistance;
      const effectiveStart =
        mpRoomId === MULTI_PUBLIC_ROOM_ID && world.publicStartOverrideMs
          ? world.publicStartOverrideMs
          : world.sharedStartMs;
      if (mpEnabled && effectiveStart) {
        const now = Date.now() + rtdbOffsetMs;
        const elapsed = Math.max(0, (now - effectiveStart) / 1000);
        dist = computeSharedDistance(elapsed);
      }
      void dbUpdate(mpPlayerRef, {
        x: player.x,
        y: player.y,
        vy: player.vy,
        score: Math.floor(score),
        clears: localClears,
        dist: Math.floor(dist),
        sprite: profile.equippedSprite,
        trail: profile.equippedTrail,
        color: profile.equippedColor,
        name: sanitizePlayerName(auth?.currentUser?.displayName || auth?.currentUser?.email || "Player"),
        lastSeen: rtdbServerTimestamp(),
      });
    }
  }

  if (mpEnabled && world.awaitingRaceStart) {
    if (mpRoomId === MULTI_PUBLIC_ROOM_ID) {
      world.awaitingRaceStart = false;
    }
    const baseStart = world.raceStartLocalMs || world.sharedStartMs;
    if (!baseStart) return;
    const now = Date.now() + rtdbOffsetMs;
    const elapsed = (now - baseStart) / 1000;
    const remaining = Math.max(0, RACE_COUNTDOWN_SEC - elapsed);
    if (remaining > 0) {
      const seconds = Math.ceil(remaining);
      showOverlay("Race Starting", `Race starts in ${seconds}...`);
      mpStatus.textContent = `Multiplayer: Race in ${seconds}`;
      return;
    }
    world.awaitingRaceStart = false;
    if (world.raceId) world.raceActiveId = world.raceId;
    state = "idle"; // ensure startGame() transitions cleanly from any prior state
    hideOverlay();
    startGame();
  }

  if (state !== "running") {
    if (mpEnabled && !world.sharedStartMs) {
      resetPlayerToCenter();
    }
    if (state === "dead") {
      resetWorldMotion();
    }
    return;
  }

  let timeSec = world.time + dt;
  const settings = getDifficultySettings();
  const effectiveStart =
    mpRoomId === MULTI_PUBLIC_ROOM_ID && world.publicStartOverrideMs
      ? world.publicStartOverrideMs
      : world.sharedStartMs;
  if (mpEnabled && effectiveStart) {
    const now = Date.now() + rtdbOffsetMs;
    timeSec = Math.max(0, (now - effectiveStart) / 1000);
    world.speedScale = 1 + settings.speedGrowth * timeSec;
    world.scroll = settings.baseScroll * world.speedScale;
    world.time = timeSec;
    localDistance = computeSharedDistance(timeSec);
  } else {
    world.time = timeSec;
    world.speedScale += dt * settings.speedGrowth;
    world.scroll = settings.baseScroll * world.speedScale;
    localDistance += world.scroll * dt;
  }

  player.vy = hold ? -world.scroll : world.scroll;
  player.y += player.vy * dt;

  // Move existing trail points with the world so the trail follows behind the player.
  for (const p of trailPoints) p.x -= world.scroll * dt;
  trailPoints.push({ x: player.x, y: player.y, life: 2.4 });
  for (const p of trailPoints) p.life -= dt;
  while (
    trailPoints.length > 140 ||
    (trailPoints[0] && (trailPoints[0].life <= 0 || trailPoints[0].x < -30))
  ) {
    trailPoints.shift();
  }

  world.spawnTimer += dt;
  if (editorEnabled && editorLevel.length > 0) {
    // Editor mode uses a fixed set of obstacles.
  } else if (mpEnabled) {
    if (!world.sharedSeed || !effectiveStart) {
      // Wait for shared seed/time to avoid mixed obstacle sets.
      return;
    }
    const now = Date.now() + rtdbOffsetMs;
    const elapsed = (now - effectiveStart) / 1000;
    const targetIndex = Math.floor(elapsed / world.spawnEvery);
    const distNow = computeSharedDistance(elapsed);
    while (world.spawnIndex < targetIndex) {
      spawnSharedObstacle(world.spawnIndex);
      const lastObstacle = world.obstacles[world.obstacles.length - 1];
      if (lastObstacle && lastObstacle.spawnT !== undefined) {
        const distThen = computeSharedDistance(lastObstacle.spawnT);
        lastObstacle.x = (lastObstacle.spawnX || OBSTACLE_SPAWN_X) - (distNow - distThen);
        if (obstacleRightEdge(lastObstacle) < player.x - player.r) {
          lastObstacle.scored = true;
        }
      }
      world.spawnIndex += 1;
    }
  } else if (world.spawnTimer >= world.spawnEvery) {
    world.spawnTimer = 0;
    spawnObstacle();
  }

  for (const obstacle of world.obstacles) {
    if (mpEnabled && effectiveStart && obstacle.spawnT !== undefined) {
      const distNow = computeSharedDistance(world.time);
      const distThen = computeSharedDistance(obstacle.spawnT);
      obstacle.x = (obstacle.spawnX || OBSTACLE_SPAWN_X) - (distNow - distThen);
    } else {
      obstacle.x -= world.scroll * dt;
    }
    if (obstacle.kind === "spinner") {
      if (mpEnabled && effectiveStart) {
        const base = obstacle.baseAngle || 0;
        obstacle.angle = base + world.time * obstacle.spin;
      } else {
        obstacle.angle += obstacle.spin * dt;
      }
    }
  }

  for (const pickup of world.pickups) {
    if (mpEnabled && effectiveStart && pickup.spawnT !== undefined) {
      const distNow = computeSharedDistance(world.time);
      const distThen = computeSharedDistance(pickup.spawnT);
      pickup.x = (pickup.spawnX || PICKUP_SPAWN_X) - (distNow - distThen);
    } else {
      pickup.x -= world.scroll * dt;
    }
  }

  if (mpEnabled) {
    for (const trail of mpTrails.values()) {
      for (const p of trail) {
        p.x -= world.scroll * dt;
        p.life -= dt;
      }
      while (trail.length > 60 || (trail[0] && (trail[0].life <= 0 || trail[0].x < -30))) {
        trail.shift();
      }
    }
  }

  for (const obstacle of world.obstacles) {
    if (
      mpEnabled &&
      world.sharedStartMs &&
      obstacle.spawnT !== undefined &&
      obstacle.spawnT < world.joinTimeSec
    ) {
      obstacle.scored = true;
      continue;
    }
    if (!obstacle.scored && obstacleRightEdge(obstacle) < player.x - player.r) {
      obstacle.scored = true;
      const clearPoints = getDifficultySettings().clearPoints;
      score += clearPoints;
      localClears += 1;
      if (currentRunCountsForProgress) {
        shopMsg.textContent = `Obstacle cleared +${clearPoints} score`;
      }
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

    let stateNow;
    if (obstacle.kind === "corridor") {
      stateNow = corridorGapAt(obstacle, player.x);
    } else {
      stateNow = gateState(obstacle, world.time);
    }
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
      if (currentRunCountsForProgress) {
        shopMsg.textContent = `Coin +${pickup.value} score`;
      }
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
  const color = getItem(COLORS, profile.equippedColor) || COLORS[0];

  drawTrailById(trail, color, trailPoints);
}

function drawTrailById(id, color, points) {
  switch (id) {
    case "solid": {
      drawTrailPolyline(points, color.trail, 2.8);
      return;
    }
    case "dashed": {
      drawTrailPolyline(points, color.trail, 2.4, [10, 8]);
      return;
    }
    case "neon": {
      drawTrailPolyline(points, color.glow, 8);
      drawTrailPolyline(points, color.trail, 2.6);
      return;
    }
    case "rainbow": {
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const hue = (i * 16 + world.time * 220) % 360;
        ctx.strokeStyle = `hsla(${hue}, 90%, 62%, ${Math.max(0.15, b.life)})`;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      return;
    }
    case "pulse": {
      const pulse = 2.2 + Math.sin(world.time * 8) * 1.2;
      drawTrailPolyline(points, color.glow, pulse + 5);
      drawTrailPolyline(points, color.trail, pulse);
      return;
    }
    case "spark": {
      drawTrailPolyline(points, color.trail, 2.2);
      drawTrailSparks(points, color.trail, 5, 1.6);
      return;
    }
    case "comet": {
      drawTrailPolyline(points, color.trail, 3.2);
      drawTrailSparks(points, color.glow, 8, 2.1);
      return;
    }
    case "glow": {
      drawTrailPolyline(points, color.glow, 10);
      drawTrailPolyline(points, color.trail, 1.8);
      return;
    }
    case "trace": {
      drawTrailPolyline(points, color.trail, 1.6);
      return;
    }
    case "drift": {
      const drift = 6 + Math.sin(world.time * 4) * 3;
      drawTrailPolyline(points, color.trail, 2.4, [drift, 10]);
      return;
    }
    case "flash": {
      const flash = 1.8 + Math.abs(Math.sin(world.time * 12)) * 2.2;
      drawTrailPolyline(points, color.glow, flash + 6);
      drawTrailPolyline(points, color.trail, flash);
      return;
    }
    case "arc-line": {
      drawTrailWave(points, color.trail, 2.4, 6);
      return;
    }
    case "signal": {
      drawTrailPolyline(points, color.trail, 2, [4, 6, 12, 6]);
      return;
    }
    case "ember": {
      drawTrailPolyline(points, color.trail, 2.2);
      drawTrailSparks(points, color.accent, 4, 2.2);
      return;
    }
    case "glass": {
      ctx.save();
      ctx.globalAlpha = 0.6;
      drawTrailPolyline(points, color.trail, 3.6);
      ctx.restore();
      drawTrailPolyline(points, "#ffffff", 1.2);
      return;
    }
    case "aura": {
      drawTrailPolyline(points, color.glow, 12);
      drawTrailPolyline(points, color.trail, 2.2);
      return;
    }
    case "flare": {
      const flare = 3 + Math.sin(world.time * 6) * 1.8;
      drawTrailPolyline(points, color.trail, flare);
      drawTrailSparks(points, color.accent, 3, 2.6);
      return;
    }
    case "strobe": {
      drawTrailPolyline(points, color.trail, 2.2);
      if (Math.floor(world.time * 6) % 2 === 0) {
        drawTrailPolyline(points, "#ffffff", 1);
      }
      return;
    }
    case "spectrum": {
      drawTrailRainbowMulti(points, 3);
      return;
    }
    case "celestial": {
      drawTrailRainbowMulti(points, 6);
      drawTrailSparks(points, "#ffffff", 6, 2.1);
      return;
    }
    case "dev-signal": {
      drawTrailPolyline(points, "#ffffff", 1.6, [3, 4]);
      drawTrailPolyline(points, color.glow, 9);
      drawTrailSparks(points, color.accent, 4, 2.3);
      return;
    }
    default: {
      drawTrailPolyline(points, color.trail, 2.8);
    }
  }
}

function drawTrailPolyline(points, strokeStyle, width, dash = null) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  if (dash) ctx.setLineDash(dash);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = width;
  ctx.stroke();
  if (dash) ctx.setLineDash([]);
}

function drawTrailSparks(points, color, step, radius) {
  ctx.fillStyle = color;
  for (let i = 0; i < points.length; i += step) {
    const p = points[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTrailWave(points, strokeStyle, width, amp) {
  if (points.length < 2) return;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const offset = Math.sin((i + world.time * 12) * 0.35) * amp;
    if (i === 0) ctx.moveTo(p.x, p.y + offset);
    else ctx.lineTo(p.x, p.y + offset);
  }
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawTrailRainbowMulti(points, width) {
  if (points.length < 2) return;
  const bands = [
    "rgba(255, 95, 86, 0.8)",
    "rgba(255, 204, 86, 0.8)",
    "rgba(114, 255, 135, 0.8)",
    "rgba(98, 168, 255, 0.8)",
  ];
  for (let b = 0; b < bands.length; b++) {
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const offset = (b - 1.5) * 2.2;
      if (i === 0) ctx.moveTo(p.x, p.y + offset);
      else ctx.lineTo(p.x, p.y + offset);
    }
    ctx.strokeStyle = bands[b];
    ctx.lineWidth = width;
    ctx.stroke();
  }
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

  if (obstacle.kind === "corridor") {
    const splitX = obstacle.x + obstacle.w * (obstacle.split ?? 0.5);
    const left = { center: obstacle.centerA, gap: obstacle.gap };
    const right = { center: obstacle.centerB, gap: obstacle.gap };
    drawGateSegment(obstacle.x, splitX - obstacle.x, left, "#1a1f2e", "#66d9ff");
    drawGateSegment(splitX, obstacle.x + obstacle.w - splitX, right, "#231a2f", "#ffb86b");
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, H);
    ctx.stroke();
    return;
  }

  const current = gateState(obstacle, world.time);
  const topH = current.center - current.gap * 0.5;
  const botY = current.center + current.gap * 0.5;

  if (obstacle.kind === "gate") {
    ctx.fillStyle = "#0d2234";
  } else if (obstacle.kind === "movingGate") {
    ctx.fillStyle = "#16314a";
  } else {
    ctx.fillStyle = "#251c2b";
  }
  ctx.fillRect(obstacle.x, 0, obstacle.w, topH);
  ctx.fillRect(obstacle.x, botY, obstacle.w, H - botY);

  if (obstacle.kind === "pulseGate") {
    ctx.fillStyle = "#ff9f62";
  } else if (obstacle.kind === "movingGate") {
    ctx.fillStyle = "#7cf6ff";
  } else {
    ctx.fillStyle = "#73f2ff";
  }
  ctx.fillRect(obstacle.x + obstacle.w - 6, topH - 3, 6, 3);
  ctx.fillRect(obstacle.x + obstacle.w - 6, botY, 6, 3);

  if (obstacle.kind === "pulseGate") {
    ctx.strokeStyle = "rgba(255,160,98,0.6)";
    for (let y = 10; y < topH; y += 16) {
      ctx.beginPath();
      ctx.moveTo(obstacle.x + 6, y);
      ctx.lineTo(obstacle.x + obstacle.w - 10, y + 6);
      ctx.stroke();
    }
    for (let y = botY + 10; y < H; y += 16) {
      ctx.beginPath();
      ctx.moveTo(obstacle.x + 6, y);
      ctx.lineTo(obstacle.x + obstacle.w - 10, y + 6);
      ctx.stroke();
    }
  } else if (obstacle.kind === "movingGate") {
    ctx.strokeStyle = "rgba(124,246,255,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(obstacle.x + 4, topH - 6);
    ctx.lineTo(obstacle.x + obstacle.w - 4, topH - 6);
    ctx.moveTo(obstacle.x + 4, botY + 6);
    ctx.lineTo(obstacle.x + obstacle.w - 4, botY + 6);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawGateSegment(x, w, state, bodyColor, edgeColor) {
  const topH = state.center - state.gap * 0.5;
  const botY = state.center + state.gap * 0.5;
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x, 0, w, topH);
  ctx.fillRect(x, botY, w, H - botY);
  ctx.fillStyle = edgeColor;
  ctx.fillRect(x + w - 6, topH - 3, 6, 3);
  ctx.fillRect(x + w - 6, botY, 6, 3);
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
  const color = getItem(COLORS, profile.equippedColor) || COLORS[0];

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(angle);

  drawSpriteById(sprite, color);

  ctx.restore();
}

function drawEditorMarkers() {
  if (!editorEnabled || editorLevel.length === 0) return;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "11px Segoe UI, Tahoma, sans-serif";
  for (const ob of editorLevel) {
    const x = ob.x;
    const y = ob.kind === "spinner" ? ob.baseY : ob.center || ob.baseCenter || ob.centerA || H * 0.5;
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y + 6);
    ctx.stroke();
    ctx.fillText(ob.kind, x + 8, y - 8);
    if (ob.kind === "corridor") {
      const y2 = ob.centerB || y;
      ctx.beginPath();
      ctx.arc(x + (ob.w || 120) * 0.5, y2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawOtherPlayers() {
  if (!mpEnabled || mpPlayers.size === 0) return;
  for (const [id, data] of mpPlayers.entries()) {
    const color = getItem(COLORS, data.color) || COLORS[0];
    const spriteId = data.sprite || "dart";
    const angle = data.vy < 0 ? -Math.PI * 0.25 : Math.PI * 0.25;
    const relX = getRemoteRenderX(data);
    const trailId = data.trail || "solid";
    const remoteTrail = mpTrails.get(id) || [];
    if (remoteTrail.length > 1) {
      drawTrailById(trailId, color, remoteTrail);
    }
    ctx.save();
    ctx.translate(relX, data.y || 0);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.55;
    drawSpriteById(spriteId, color);
    ctx.globalAlpha = 1;
    ctx.restore();

    const name = sanitizePlayerName(data.name);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "12px Segoe UI, Tahoma, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(name, relX, (data.y || 0) - 16);
    ctx.textAlign = "left"; // reset so other draws are not affected
  }
}

function getRemoteRenderX(data) {
  if (mpRoomId === MULTI_PUBLIC_ROOM_ID) {
    return clamp(Number(data?.x ?? player.x), -80, W + 80);
  }
  const remoteDist = Number(data?.dist || 0);
  const delta = remoteDist - localDistance;
  return clamp(player.x + delta, -80, W + 80);
}

function drawSpriteById(id, color) {
  switch (id) {
    case "dart": {
      // Simple dart.
      ctx.fillStyle = color.primary;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-8, -7);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-8, 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = color.accent;
      ctx.beginPath();
      ctx.arc(-6, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "nova": {
      // Starburst orb.
      ctx.fillStyle = color.primary;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
      ctx.moveTo(0, -10);
      ctx.lineTo(0, 10);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(2, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "blade": {
      // Thin blade.
      ctx.fillStyle = color.primary;
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-2, -9);
      ctx.lineTo(-10, -3);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-10, 3);
      ctx.lineTo(-2, 9);
      ctx.closePath();
      ctx.fill();
      return;
    }
    case "void": {
      // Hollow square with core.
      ctx.fillStyle = color.primary;
      ctx.fillRect(-9, -9, 18, 18);
      ctx.fillStyle = color.accent;
      ctx.fillRect(-4, -4, 8, 8);
      return;
    }
    case "chevron": {
      // Chevron arrow.
      ctx.strokeStyle = color.primary;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(-5, -9);
      ctx.lineTo(-1, 0);
      ctx.lineTo(-5, 9);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = color.accent;
      ctx.beginPath();
      ctx.arc(-3.5, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "stingray": {
      // Wide glider.
      ctx.fillStyle = color.primary;
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(2, -8);
      ctx.lineTo(-9, -4);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-9, 4);
      ctx.lineTo(2, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = color.accent;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(8, 0);
      ctx.lineTo(-4, 4);
      ctx.stroke();
      return;
    }
    case "halo": {
      // Ringed orb.
      ctx.strokeStyle = color.primary;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = color.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = color.accent;
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "razor": {
      // Aggressive saw blade.
      ctx.fillStyle = color.primary;
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(6, -10);
      ctx.lineTo(-8, -6);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-8, 6);
      ctx.lineTo(6, 10);
      ctx.closePath();
      ctx.fill();
      return;
    }
    case "mono": {
      // Monolith.
      ctx.fillStyle = color.primary;
      ctx.beginPath();
      ctx.rect(-6, -10, 12, 20);
      ctx.fill();
      ctx.fillStyle = color.accent;
      ctx.beginPath();
      ctx.rect(-3, -3, 6, 6);
      ctx.fill();
      return;
    }
    case "viper": {
      // Twin-fang nose.
      ctx.fillStyle = color.primary;
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-5, -9);
      ctx.lineTo(-1, -2);
      ctx.lineTo(-5, 9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = color.accent;
      ctx.beginPath();
      ctx.arc(4, 0, 2.3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "arc": {
      // Curved arc blade.
      ctx.strokeStyle = color.primary;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-1, 0, 11, -0.7, 0.7);
      ctx.stroke();
      ctx.fillStyle = color.accent;
      ctx.beginPath();
      ctx.arc(4, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "scythe": {
      // Hooked scythe.
      ctx.strokeStyle = color.primary;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.quadraticCurveTo(-1, -11, -9, -2);
      ctx.quadraticCurveTo(-4, 3, 10, 0);
      ctx.stroke();
      ctx.fillStyle = color.accent;
      ctx.beginPath();
      ctx.arc(-6, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "ion": {
      // Ion lance.
      ctx.fillStyle = color.primary;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-4, -6);
      ctx.lineTo(-1, 0);
      ctx.lineTo(-4, 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = color.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(11, 0);
      ctx.stroke();
      return;
    }
    case "prism": {
      // Triangular prism.
      ctx.strokeStyle = color.primary;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-4, -9);
      ctx.lineTo(-9, 0);
      ctx.lineTo(-4, 9);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = color.accent;
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "falcon": {
      // Falcon-like wings.
      ctx.fillStyle = color.primary;
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(2, -6);
      ctx.lineTo(-10, -10);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-10, 10);
      ctx.lineTo(2, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = color.accent;
      ctx.beginPath();
      ctx.arc(7, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "ghost": {
      // Ghost wisp.
      ctx.strokeStyle = color.primary;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.fillStyle = color.accent;
      ctx.beginPath();
      ctx.arc(2, -2, 2.6, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "sting": {
      // Stinger with barb.
      ctx.fillStyle = color.primary;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(3, -10);
      ctx.lineTo(-10, -3);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-10, 3);
      ctx.lineTo(3, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = color.accent;
      ctx.beginPath();
      ctx.arc(1, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "flux": {
      // Zigzag flux.
      ctx.fillStyle = color.primary;
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-2, -8);
      ctx.lineTo(-8, -2);
      ctx.lineTo(-2, 2);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = color.accent;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(8, 0);
      ctx.lineTo(-6, 6);
      ctx.stroke();
      return;
    }
    case "wraith": {
      // Cloaked cross.
      ctx.fillStyle = color.primary;
      ctx.beginPath();
      ctx.rect(-8, -10, 16, 20);
      ctx.fill();
      ctx.strokeStyle = color.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, -7);
      ctx.lineTo(6, 7);
      ctx.moveTo(-6, 7);
      ctx.lineTo(6, -7);
      ctx.stroke();
      return;
    }
    case "oracle": {
      // Crown + eye.
      ctx.strokeStyle = color.primary;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(2, -9);
      ctx.lineTo(-8, -5);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 5);
      ctx.lineTo(2, 9);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = color.accent;
      ctx.beginPath();
      ctx.arc(1, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "dev-core": {
      ctx.strokeStyle = color.primary;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      ctx.stroke();
      ctx.fillStyle = color.accent;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    default: {
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
  }
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
  drawEditorMarkers();
  drawOtherPlayers();
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
  enableMusicFromGesture();
  if (editorEnabled && editorArmed) return;
  // In private rooms, only the race start countdown triggers startGame — not the player pressing.
  if (mpEnabled && mpRoomId && mpRoomId !== MULTI_PUBLIC_ROOM_ID) {
    hold = true;
    return;
  }
  // In public rooms after dying, pressing restarts as a free-fly spectator from current position.
  if (mpEnabled && mpRoomId === MULTI_PUBLIC_ROOM_ID && state === "dead") {
    hold = true;
    world.publicStartOverrideMs = Date.now() + rtdbOffsetMs;
    world.joinTimeSec = 0;
    world.obstacles = [];
    world.pickups = [];
    world.spawnIndex = 0;
    world.spawnTimer = 0;
    world.center = H * 0.5;
    world.time = 0;
    localDistance = 0;
    localClears = 0;
    score = 0;
    trailPoints.length = 0;
    player.y = H * 0.5;
    player.vy = 0;
    currentRunCountsForProgress = true;
    state = "running";
    hideOverlay();
    return;
  }
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
canvas.addEventListener("pointerdown", (e) => {
  // Editor placement takes priority when armed.
  if (editorEnabled && editorArmed) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const kind = editorKind.value;
    editorLevel.push(editorObstacleFromClick(kind, x, y));
    editorMsg.textContent = `Placed ${kind} (${editorLevel.length}).`;
    editorArmed = false;
    editorAddBtn.textContent = "Place On Click";
    return;
  }
  onPress();
});
overlay.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  onPress();
});
window.addEventListener("pointerup", onRelease);
window.addEventListener("pointercancel", onRelease);
window.addEventListener("blur", onRelease);
mobileFlyBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  onPress();
});
mobileFlyBtn.addEventListener("pointerup", onRelease);
mobileFlyBtn.addEventListener("pointerleave", onRelease);
mobileFlyBtn.addEventListener("pointercancel", onRelease);
window.addEventListener("beforeunload", () => {
  stopPresence();
  if (profile.updatedAt) {
    void savePlayerData();
  }
});

selectedDifficultyId = normalizeDifficultyId(selectedDifficultyId);
difficultySelect.value = selectedDifficultyId;
refreshShopUi();
updateOnlineCount();
startPresence();
setEditorPanelVisible(false);
if (versionText) versionText.textContent = `v${SITE_VERSION}`;
updateAdCopy();
setInterval(rotateAdCopy, 12000);
if (musicEnabled) {
  musicToggleBtn.textContent = "Music: On";
}
hardReset();
requestAnimationFrame(render);
