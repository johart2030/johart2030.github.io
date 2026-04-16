// onetap.js (module)

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

window.addEventListener("load", () => {
  if (!window.google?.accounts?.id || typeof window.handleCredentialResponse !== "function") return;

  const auth = getAuth();
  const authModal = document.getElementById("authModal");
  let initialized = false;

  function isAuthModalOpen() {
    return Boolean(authModal && !authModal.classList.contains("hidden"));
  }

  function ensureInitialized() {
    if (initialized) return;
    google.accounts.id.initialize({
      client_id: "92140525618-gffm531n2kucvu82s3g4vanobdgp1cqa.apps.googleusercontent.com",
      callback: window.handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    initialized = true;
  }

  function syncOneTap() {
    ensureInitialized();
    if (auth.currentUser || isAuthModalOpen()) {
      google.accounts.id.cancel();
      return;
    }
    google.accounts.id.prompt();
  }

  onAuthStateChanged(auth, () => {
    syncOneTap();
  });

  if (authModal) {
    const observer = new MutationObserver(() => {
      syncOneTap();
    });
    observer.observe(authModal, { attributes: true, attributeFilter: ["class"] });
  }

  syncOneTap();
});
