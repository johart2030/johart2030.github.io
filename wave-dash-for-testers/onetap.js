import { 
  getAuth, 
  signInWithCredential, 
  GoogleAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// ✅ ONLY ONE auth instance
const auth = getAuth();

// ==============================
// 🔥 GLOBAL CALLBACK (REQUIRED)
// ==============================
window.handleCredentialResponse = async (response) => {
  console.log("One Tap triggered");

  try {
    const credential = GoogleAuthProvider.credential(response.credential);
    const result = await signInWithCredential(auth, credential);
    console.log("Signed in:", result.user);
  } catch (err) {
    console.error("Sign-in error:", err);
  }
};

// ==============================
// UI ELEMENTS
// ==============================
const authModal = document.getElementById("authModal");
const openAuthBtn = document.getElementById("openAuthBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const fallback = document.getElementById("oneTapFallback");
const fallbackBtn = document.getElementById("oneTapFallbackBtn");
const debugEl = document.getElementById("oneTapDebug");

// ==============================
// STATE
// ==============================
let initialized = false;
let fallbackTimer = null;

// ==============================
// HELPERS
// ==============================
function setDebug(msg) {
  if (!debugEl) return;
  debugEl.textContent = "Sign-in debug: " + msg;
  debugEl.classList.remove("hidden");
}

function canUseOneTap() {
  return Boolean(window.google?.accounts?.id && window.handleCredentialResponse);
}

function isModalOpen() {
  return authModal && !authModal.classList.contains("hidden");
}

// ==============================
// INIT ONE TAP
// ==============================
function initOneTap() {
  if (initialized) return;
  if (!canUseOneTap()) return;

  google.accounts.id.initialize({
    client_id: "92140525618-gffm531n2kucvu82s3g4vanobdgp1cqa.apps.googleusercontent.com",
    callback: window.handleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: true,
  });

  initialized = true;
}

// ==============================
// PROMPT LOGIC
// ==============================
function runOneTap() {
  if (auth.currentUser || isModalOpen()) {
    setDebug("blocked (signed in or modal open)");
    return;
  }

  initOneTap();

  if (canUseOneTap()) {
    google.accounts.id.prompt();
    setDebug("one tap requested");
  } else {
    setDebug("one tap unavailable");
  }

  clearTimeout(fallbackTimer);
  fallbackTimer = setTimeout(() => {
    if (!auth.currentUser) {
      fallback?.classList.remove("hidden");
      setDebug("fallback shown");
    }
  }, 1400);
}

// ==============================
// FALLBACK BUTTON
// ==============================
fallbackBtn?.addEventListener("click", () => {
  fallback?.classList.add("hidden");
  googleLoginBtn?.click();
});

// ==============================
// AUTH LISTENER
// ==============================
onAuthStateChanged(auth, () => {
  runOneTap();
});

// ==============================
// MODAL WATCHER
// ==============================
if (authModal) {
  new MutationObserver(runOneTap)
    .observe(authModal, { attributes: true, attributeFilter: ["class"] });
}

// ==============================
// START
// ==============================
runOneTap();