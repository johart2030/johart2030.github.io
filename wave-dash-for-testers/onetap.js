// onetap.js (module)

import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

window.addEventListener("load", () => {
  if (!window.google?.accounts?.id || typeof window.handleCredentialResponse !== "function") return;

  const auth = getAuth();
  if (auth.currentUser) {
    google.accounts.id.cancel();
    return;
  }

  google.accounts.id.initialize({
    client_id: "92140525618-gffm531n2kucvu82s3g4vanobdgp1cqa.apps.googleusercontent.com",
    callback: window.handleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: true,
  });

  google.accounts.id.prompt();
});
