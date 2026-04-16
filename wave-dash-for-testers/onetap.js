// onetap.js (module)
import { getAuth, signInWithCredential, GoogleAuthProvider } 
from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const auth = getAuth();

// 🔥 REQUIRED: make global
window.handleCredentialResponse = async (response) => {
  console.log("One Tap triggered");

  const credential = GoogleAuthProvider.credential(response.credential);

  try {
    const result = await signInWithCredential(auth, credential);
    console.log("Signed in:", result.user);
  } catch (err) {
    console.error("Sign-in error:", err);
  }
};

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

window.addEventListener("load", () => {
  const auth = getAuth();
  const authModal = document.getElementById("authModal");
  const openAuthBtn = document.getElementById("openAuthBtn");
  const googleLoginBtn = document.getElementById("googleLoginBtn");
  const fallback = document.getElementById("oneTapFallback");
  const fallbackBtn = document.getElementById("oneTapFallbackBtn");
  const debugEl = document.getElementById("oneTapDebug");

  let initialized = false;
  let fallbackTimer = null;

  function canUseOneTap() {
    return Boolean(window.google?.accounts?.id && typeof window.handleCredentialResponse === "function");
  }

  function isAuthModalOpen() {
    return Boolean(authModal && !authModal.classList.contains("hidden"));
  }

  function setDebugState(message, visible = true) {
    if (!debugEl) return;
    debugEl.textContent = `Sign-in debug: ${message}`;
    debugEl.classList.toggle("hidden", !visible);
  }

  function ensureInitialized() {
    if (initialized) return;
    if (!canUseOneTap()) return;
    google.accounts.id.initialize({
      client_id: "92140525618-gffm531n2kucvu82s3g4vanobdgp1cqa.apps.googleusercontent.com",
      callback: window.handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true,
    });
    initialized = true;
  }

  function hideFallback() {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    fallback?.classList.add("hidden");
  }

  function showFallbackSoon() {
    hideFallback();
    fallbackTimer = setTimeout(() => {
      if (auth.currentUser || isAuthModalOpen()) return;
      fallback?.classList.remove("hidden");
      setDebugState("fallback shown");
    }, 1400);
  }

  function syncSignInPrompts() {
    if (auth.currentUser) {
      setDebugState("signed in");
      hideFallback();
      if (canUseOneTap()) google.accounts.id.cancel();
      return;
    }

    if (isAuthModalOpen()) {
      setDebugState("auth modal open");
      hideFallback();
      if (canUseOneTap()) google.accounts.id.cancel();
      return;
    }

    ensureInitialized();
    if (canUseOneTap()) {
      google.accounts.id.prompt();
      setDebugState("one tap requested");
    } else {
      setDebugState("one tap unavailable");
    }
    showFallbackSoon();
  }

  fallbackBtn?.addEventListener("click", () => {
    setDebugState("fallback button clicked");
    hideFallback();
    if (authModal?.classList.contains("hidden")) {
      openAuthBtn?.click();
    }
    googleLoginBtn?.click();
  });

  onAuthStateChanged(auth, () => {
    syncSignInPrompts();
  });

  if (authModal) {
    const observer = new MutationObserver(() => {
      syncSignInPrompts();
    });
    observer.observe(authModal, { attributes: true, attributeFilter: ["class"] });
  }

  syncSignInPrompts();
});
