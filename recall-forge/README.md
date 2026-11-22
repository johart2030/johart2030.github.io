# RecallForge

RecallForge is a static web app. It has no build step or package installation, so it can be hosted directly with GitHub Pages.

## Publish with GitHub Pages

1. Push the contents of this folder to the repository's `main` branch.
2. Open **Settings → Pages** in GitHub.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. Wait for GitHub Pages to publish the site. Its address will look like `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

The app uses relative paths for its stylesheet, JavaScript, favicon, and service worker, so it works from a repository subpath. The service worker enables offline loading after the files have been visited once online.

## Firebase setup

The app connects to the RecallForge Firebase project for account sign-in and cloud sync. Before using those features on a published site, add `YOUR-USERNAME.github.io` to **Firebase Console → Authentication → Settings → Authorized domains**. Configure Firestore security rules for your users' data before sharing the site publicly.

Guest data is stored in the browser on the current device. Signed-in data uses Firebase and its local offline cache.

## Files

- `index.html` — page structure and relative asset links
- `styles.css` — app and landing-page styles
- `app.js` — app behavior and Firebase connection
- `favicon.svg` — RecallForge browser icon
- `sw.js` — offline asset caching
