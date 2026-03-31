// onetap.js (module)

// 🔥 Firebase imports
import { getAuth, signInWithCredential, GoogleAuthProvider } 
from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// 🔥 This connects One Tap → Firebase
window.handleCredentialResponse = (response) => {
  const auth = getAuth();
  const credential = GoogleAuthProvider.credential(response.credential);

  signInWithCredential(auth, credential)
    .then((userCredential) => {
      console.log("Signed in:", userCredential.user);
    })
    .catch(console.error);
};

// 🔥 One Tap init
window.addEventListener("load", () => {
  google.accounts.id.initialize({
    client_id: "420407589339-p35s2lamqvskogre5behff2shqf88mdv.apps.googleusercontent.com",
    callback: handleCredentialResponse,
    auto_select: true
  });

  google.accounts.id.prompt();
});