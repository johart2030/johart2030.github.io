// onetap.js (module)

window.addEventListener("load", () => {
  google.accounts.id.initialize({
    client_id: "92140525618-lq9bqc2doh8cs4m65tnam5hgbl9vk2s3.apps.googleusercontent.com",
    callback: window.handleCredentialResponse // 👈 FIX
  });

  google.accounts.id.prompt();
});