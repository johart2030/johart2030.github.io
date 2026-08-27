import {
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

import { auth } from "./firebase-config.js";

// ==============================
// ðŸ”¥ GLOBAL CALLBACK (MUST BE FIRST)
// ==============================
// ==============================
// STATE CONTROL
// ==============================
let initialized = false;
let promptRunning = false;
let retryScheduled = false;

// ==============================
// SAFE ONE TAP
// ==============================
function showOneTap() {
  // âŒ already signed in
  if (auth.currentUser) return;

  // âŒ google not ready â†’ schedule ONE retry
  if (!window.google?.accounts?.id) {
    if (!retryScheduled) {
      retryScheduled = true;
      setTimeout(() => {
        retryScheduled = false;
        showOneTap();
      }, 300);
    }
    return;
  }

  // âœ… initialize ONLY ONCE
  if (!initialized) {
    google.accounts.id.initialize({
      client_id: "92140525618-gffm531n2kucvu82s3g4vanobdgp1cqa.apps.googleusercontent.com",
      callback: window.handleCredentialResponse,
      auto_select: true
    });
    initialized = true;
  }

  // âŒ prevent FedCM spam
  if (promptRunning) return;

  promptRunning = true;

  google.accounts.id.prompt((notification) => {
    promptRunning = false;

    if (notification.isNotDisplayed()) {
      console.log("Not displayed:", notification.getNotDisplayedReason());
    }

    if (notification.isSkippedMoment()) {
      console.log("Skipped:", notification.getSkippedReason());
    }
  });
}

// ==============================
// AUTH TRIGGER (ONLY ENTRY POINT)
// ==============================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    showOneTap();
  }
});


