import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const firebaseConfig = {
  apiKey: "AIzaSyDYjkqk_bzhsOe2SE-0yuuYB8TPe5S0qms",
  authDomain: "snippr-49f81.firebaseapp.com",
  projectId: "snippr-49f81",
  storageBucket: "snippr-49f81.firebasestorage.app",
  messagingSenderId: "40834161122",
  appId: "1:40834161122:web:e3ef23b0aaa92dedf1c1bb",
  measurementId: "G-2YW9TDK6PG"
};

const supabaseUrl = "https://gykkkbnbkrykolfbszil.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5a2trYm5ia3J5a29sZmJzemlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDA0NjQsImV4cCI6MjA5MjYxNjQ2NH0.YXpEuwkbApJCD9gcBRKy_a5-5yUFi09kpH3lVohi94c";

const page = document.body.dataset.page || "home";
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const state = {
  user: null,
  posts: [],
  likes: [],
  comments: [],
  albums: [],
  albumPhotos: [],
  search: "",
  activeTag: "All",
  selectedFile: null,
  albumsEnabled: true
};

const categoryMatchers = [
  { label: "Nature", keywords: ["nature", "forest", "mountain", "flower", "sunset", "beach", "ocean", "lake"] },
  { label: "Street", keywords: ["street", "city", "urban", "night", "building", "downtown"] },
  { label: "Travel", keywords: ["travel", "trip", "journey", "vacation", "flight", "passport"] },
  { label: "People", keywords: ["portrait", "people", "person", "friend", "family", "selfie"] },
  { label: "Architecture", keywords: ["architecture", "interior", "design", "home", "house", "tower"] },
  { label: "Abstract", keywords: ["abstract", "texture", "color", "shadow", "shape", "minimal"] }
];

const userLabel = document.getElementById("userLabel");
const userAvatar = document.getElementById("userAvatar");
const authAction = document.getElementById("authAction");
const heroAuthAction = document.getElementById("heroAuthAction");
const uploadButton = document.getElementById("uploadButton");
const createAlbumButton = document.getElementById("createAlbumButton");
const addToAlbumButton = document.getElementById("addToAlbumButton");
const fileInput = document.getElementById("file");
const fileName = document.getElementById("fileName");
const pickFileButton = document.getElementById("pickFileButton");
const dropzone = document.getElementById("dropzone");
const captionInput = document.getElementById("caption");
const searchInput = document.getElementById("searchInput");
const albumTitleInput = document.getElementById("albumTitle");
const albumDescriptionInput = document.getElementById("albumDescription");
const albumPhotoSelect = document.getElementById("albumPhotoSelect");
const albumSelect = document.getElementById("albumSelect");
const tagFilters = document.getElementById("tagFilters");
const galleryMounts = [...document.querySelectorAll("[data-feed]")];
const albumsList = document.getElementById("albumsList");
const albumsBrowse = document.getElementById("albumsBrowse");
const statusMounts = [...document.querySelectorAll("[data-status]")];
const modal = document.getElementById("photoModal");
const modalImage = document.getElementById("modalImage");
const modalRawNotice = document.getElementById("modalRawNotice");
const modalDownloadLink = document.getElementById("modalDownloadLink");
const modalTitle = document.getElementById("photoModalTitle");
const modalMeta = document.getElementById("modalMeta");
const modalStats = document.getElementById("modalStats");
const modalComments = document.getElementById("modalComments");

window.googleLogin = async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    setStatus(error.message, true);
  }
};

window.logout = async () => {
  try {
    await signOut(auth);
    if (page === "dashboard") {
      window.location.href = "index.html";
    }
  } catch (error) {
    setStatus(error.message, true);
  }
};

window.uploadPost = async () => {
  if (!state.user) {
    setStatus("You need to sign in before posting.", true);
    if (page !== "home") {
      window.location.href = "index.html";
    }
    return;
  }

  const file = state.selectedFile || fileInput?.files?.[0];
  const caption = captionInput?.value.trim() || "";

  if (!file) {
    setStatus("Drop in an image or choose one before posting.", true);
    return;
  }

  setStatus("Uploading your photo...");

  const safeName = file.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
  const fileNameValue = `${state.user.uid}_${Date.now()}_${safeName}`;
  const fileType = getFileType(file);

  const { error: uploadError } = await supabase.storage.from("images").upload(fileNameValue, file);
  if (uploadError) {
    setStatus(uploadError.message, true);
    return;
  }

  const { data: publicUrlData } = supabase.storage.from("images").getPublicUrl(fileNameValue);
  const { error: insertError } = await supabase.from("posts").insert([
    {
      user_id: state.user.uid,
      image_url: publicUrlData.publicUrl,
      preview_url: isDisplayableFileType(fileType) ? publicUrlData.publicUrl : null,
      storage_path: fileNameValue,
      file_name: file.name,
      file_type: fileType,
      caption
    }
  ]);

  if (insertError) {
    setStatus(insertError.message, true);
    return;
  }

  resetSelectedFile();
  if (captionInput) {
    captionInput.value = "";
  }

  setStatus("Photo posted to Snippr.");
  await loadAppData();
};

window.likePost = async (postId) => {
  if (!state.user) {
    setStatus("Sign in to like photos.", true);
    return;
  }

  const alreadyLiked = state.likes.some((entry) => entry.post_id === postId && entry.user_id === state.user.uid);
  if (alreadyLiked) {
    setStatus("You already liked this photo.");
    return;
  }

  const { error } = await supabase.from("likes").insert([
    {
      post_id: postId,
      user_id: state.user.uid
    }
  ]);

  if (error) {
    const lowerMessage = error.message.toLowerCase();
    if (lowerMessage.includes("duplicate") || lowerMessage.includes("unique")) {
      setStatus("You already liked this photo.");
      return;
    }

    setStatus(error.message, true);
    return;
  }

  await loadAppData();
};

window.commentPost = async (postId) => {
  if (!state.user) {
    setStatus("Sign in to comment on photos.", true);
    return;
  }

  const text = window.prompt("Add a comment to this photo:");
  if (!text || !text.trim()) {
    return;
  }

  const { error } = await supabase.from("comments").insert([
    {
      post_id: postId,
      user_id: state.user.uid,
      text: text.trim()
    }
  ]);

  if (error) {
    setStatus(error.message, true);
    return;
  }

  await loadAppData();
};

window.createAlbum = async () => {
  if (!state.user) {
    setStatus("Sign in to create a public album.", true);
    return;
  }

  if (!state.albumsEnabled) {
    setStatus("Albums need the database tables in supabase-schema.sql.", true);
    return;
  }

  const title = albumTitleInput?.value.trim() || "";
  const description = albumDescriptionInput?.value.trim() || "";

  if (!title) {
    setStatus("Add an album title first.", true);
    return;
  }

  const { error } = await supabase.from("albums").insert([
    {
      user_id: state.user.uid,
      title,
      description,
      is_public: true
    }
  ]);

  if (error) {
    setStatus(error.message, true);
    return;
  }

  if (albumTitleInput) {
    albumTitleInput.value = "";
  }
  if (albumDescriptionInput) {
    albumDescriptionInput.value = "";
  }

  setStatus("Public album created.");
  await loadAppData();
};

window.addPhotoToAlbum = async () => {
  if (!state.user) {
    setStatus("Sign in to manage albums.", true);
    return;
  }

  if (!state.albumsEnabled) {
    setStatus("Albums need the database tables in supabase-schema.sql.", true);
    return;
  }

  const albumId = Number(albumSelect?.value || 0);
  const postId = Number(albumPhotoSelect?.value || 0);

  if (!albumId || !postId) {
    setStatus("Choose both a photo and an album.", true);
    return;
  }

  const alreadyInAlbum = state.albumPhotos.some((entry) => entry.album_id === albumId && entry.post_id === postId);
  if (alreadyInAlbum) {
    setStatus("That photo is already in this album.");
    return;
  }

  const { error } = await supabase.from("album_photos").insert([
    {
      album_id: albumId,
      post_id: postId
    }
  ]);

  if (error) {
    const lowerMessage = error.message.toLowerCase();
    if (lowerMessage.includes("duplicate") || lowerMessage.includes("unique")) {
      setStatus("That photo is already in this album.");
      return;
    }

    setStatus(error.message, true);
    return;
  }

  setStatus("Photo added to album.");
  await loadAppData();
};

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderGalleries();
    renderAlbums();
  });
}

if (pickFileButton && fileInput) {
  pickFileButton.addEventListener("click", () => fileInput.click());
}

if (fileInput) {
  fileInput.addEventListener("change", () => {
    const [file] = fileInput.files || [];
    setSelectedFile(file || null);
  });
}

if (dropzone) {
  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("dragging");
    });
  });

  ["dragleave", "dragend", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (eventName !== "drop") {
        dropzone.classList.remove("dragging");
      }
    });
  });

  dropzone.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer?.files || [];
    dropzone.classList.remove("dragging");
    setSelectedFile(file || null);
  });
}

if (modal) {
  document.querySelectorAll("[data-close-modal]").forEach((element) => {
    element.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  syncUserChrome();
  syncAuthButtons();
  syncActionState();

  if (page === "dashboard" && !user) {
    setStatus("Please sign in to access the dashboard.", true);
    window.location.href = "index.html";
    return;
  }

  await loadAppData();
});

async function loadAppData() {
  setStatus("Refreshing Snippr...");

  const [postsResponse, likesResponse, commentsResponse] = await Promise.all([
    supabase.from("posts").select("*").order("id", { ascending: false }),
    supabase.from("likes").select("post_id,user_id"),
    supabase.from("comments").select("post_id,user_id,text")
  ]);

  if (postsResponse.error || likesResponse.error || commentsResponse.error) {
    const error = postsResponse.error || likesResponse.error || commentsResponse.error;
    setStatus(error.message, true);
    return;
  }

  state.posts = postsResponse.data ?? [];
  state.likes = likesResponse.data ?? [];
  state.comments = commentsResponse.data ?? [];

  await loadAlbumsData();

  renderFilters();
  renderGalleries();
  renderAlbums();
  syncAlbumSelectors();
  syncStats();
  syncActionState();
  setStatus(state.posts.length || state.albums.length ? "Snippr updated." : "No photos or albums yet.");
}

async function loadAlbumsData() {
  const [albumsResponse, albumPhotosResponse] = await Promise.all([
    supabase.from("albums").select("*").order("id", { ascending: false }),
    supabase.from("album_photos").select("album_id,post_id")
  ]);

  if (albumsResponse.error || albumPhotosResponse.error) {
    state.albums = [];
    state.albumPhotos = [];
    state.albumsEnabled = false;
    return;
  }

  state.albums = albumsResponse.data ?? [];
  state.albumPhotos = albumPhotosResponse.data ?? [];
  state.albumsEnabled = true;
}

function syncUserChrome() {
  if (!userLabel || !userAvatar) {
    return;
  }

  if (!state.user) {
    userLabel.textContent = "Guest";
    userAvatar.hidden = true;
    userAvatar.removeAttribute("src");
    return;
  }

  userLabel.textContent = state.user.displayName || state.user.email || "Snippr creator";

  if (state.user.photoURL) {
    userAvatar.src = state.user.photoURL;
    userAvatar.alt = state.user.displayName || "Your profile photo";
    userAvatar.hidden = false;
  } else {
    userAvatar.hidden = true;
    userAvatar.removeAttribute("src");
  }
}

function syncAuthButtons() {
  if (authAction) {
    authAction.textContent = state.user ? "Log out" : "Sign in";
    authAction.setAttribute("onclick", state.user ? "logout()" : "googleLogin()");
  }

  if (heroAuthAction) {
    heroAuthAction.textContent = state.user ? "Open dashboard" : "Continue with Google";
    heroAuthAction.setAttribute("onclick", state.user ? "window.location.href='dashboard.html'" : "googleLogin()");
  }
}

function syncActionState() {
  if (uploadButton) {
    uploadButton.disabled = !state.user;
  }
  if (createAlbumButton) {
    createAlbumButton.disabled = !state.user || !state.albumsEnabled;
  }
  if (addToAlbumButton) {
    addToAlbumButton.disabled = !state.user || !state.albumsEnabled;
  }
}

function setSelectedFile(file) {
  state.selectedFile = file;

  if (fileInput && file) {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
  }

  if (fileName) {
    fileName.textContent = file ? `${file.name} (${formatFileSize(file.size)})` : "No file selected";
  }
}

function resetSelectedFile() {
  state.selectedFile = null;
  if (fileInput) {
    fileInput.value = "";
  }
  if (fileName) {
    fileName.textContent = "No file selected";
  }
}

function renderFilters() {
  if (!tagFilters) {
    return;
  }

  const availableTags = ["All", ...collectTags()];
  if (!availableTags.includes(state.activeTag)) {
    state.activeTag = "All";
  }

  tagFilters.innerHTML = "";

  availableTags.forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tag-button${tag === state.activeTag ? " active" : ""}`;
    button.textContent = tag;
    button.addEventListener("click", () => {
      state.activeTag = tag;
      renderFilters();
      renderGalleries();
    });
    tagFilters.appendChild(button);
  });
}

function renderGalleries() {
  galleryMounts.forEach((mount) => {
    const mode = mount.dataset.feed || "all";
    const posts = getVisiblePosts(mode);
    mount.innerHTML = "";

    const emptyId = mode === "mine" ? "dashboardEmpty" : "feedEmpty";
    const emptyState = document.getElementById(emptyId);
    if (emptyState) {
      emptyState.classList.toggle("hidden", posts.length !== 0);
    }

    posts.forEach((post) => {
      mount.appendChild(buildPhotoCard(post));
    });
  });
}

function renderAlbums() {
  if (albumsList) {
    const myAlbums = state.albums.filter((album) => album.user_id === state.user?.uid);
    const albumsEmpty = document.getElementById("albumsEmpty");
    if (albumsEmpty) {
      albumsEmpty.classList.toggle("hidden", myAlbums.length !== 0);
    }

    albumsList.innerHTML = "";
    myAlbums.forEach((album) => albumsList.appendChild(buildAlbumCard(album)));
  }

  if (albumsBrowse) {
    const visibleAlbums = state.albums.filter((album) => album.is_public !== false);
    const filteredAlbums = visibleAlbums.filter((album) => {
      if (!state.search) {
        return true;
      }

      const haystack = `${album.title || ""} ${album.description || ""} ${getCreatorName(album.user_id)}`.toLowerCase();
      return haystack.includes(state.search);
    });

    const albumsBrowseEmpty = document.getElementById("albumsBrowseEmpty");
    if (albumsBrowseEmpty) {
      albumsBrowseEmpty.classList.toggle("hidden", filteredAlbums.length !== 0);
    }

    albumsBrowse.innerHTML = "";
    filteredAlbums.forEach((album) => albumsBrowse.appendChild(buildAlbumCard(album)));
  }
}

function syncAlbumSelectors() {
  if (!albumPhotoSelect || !albumSelect) {
    return;
  }

  const ownPosts = state.posts.filter((post) => post.user_id === state.user?.uid);
  const ownAlbums = state.albums.filter((album) => album.user_id === state.user?.uid);

  fillSelect(albumPhotoSelect, ownPosts, (post) => ({
    value: String(post.id),
    label: post.caption || `Photo #${post.id}`
  }), "Select a photo");

  fillSelect(albumSelect, ownAlbums, (album) => ({
    value: String(album.id),
    label: album.title || `Album #${album.id}`
  }), "Select an album");
}

function buildPhotoCard(post) {
  const likes = getLikeCount(post.id);
  const comments = getCommentCount(post.id);
  const previewUrl = getPreviewUrl(post);
  const previewMarkup = previewUrl
    ? `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(post.caption || "Snippr upload")}">`
    : `
      <div class="raw-preview">
        <strong>RAW / NEF</strong>
        <p>${escapeHtml(post.caption || "Uploaded RAW photo")}</p>
        <span>Open full view to access the original file.</span>
      </div>
    `;
  const card = document.createElement("article");
  card.className = "photo-card";
  card.innerHTML = `
    <button class="photo-frame" type="button" data-action="preview">
      ${previewMarkup}
    </button>
    <div class="photo-body">
      <p class="photo-title">${escapeHtml(post.caption || "Untitled frame")}</p>
      <p class="tile-meta">by ${escapeHtml(getCreatorName(post.user_id))}</p>
      <p class="tile-stats">${likes} likes | ${comments} comments</p>
      <div class="tile-actions">
        <button class="icon-button" type="button" data-action="preview">View full</button>
        <button class="icon-button secondary" type="button" data-action="like">Like</button>
        <button class="icon-button secondary" type="button" data-action="comment">Comment</button>
      </div>
    </div>
  `;

  card.querySelectorAll('[data-action="preview"]').forEach((button) => {
    button.addEventListener("click", () => openModal(post));
  });
  card.querySelector('[data-action="like"]').addEventListener("click", () => window.likePost(post.id));
  card.querySelector('[data-action="comment"]').addEventListener("click", () => window.commentPost(post.id));

  return card;
}

function buildAlbumCard(album) {
  const card = document.createElement("article");
  card.className = "album-card";

  const albumPosts = getAlbumPosts(album.id);
  const preview = albumPosts.slice(0, 4)
    .map((post) => `
      <button class="album-thumb" type="button" data-post-id="${post.id}">
        ${getPreviewUrl(post)
          ? `<img src="${escapeHtml(getPreviewUrl(post))}" alt="${escapeHtml(post.caption || album.title || "Album photo")}">`
          : `<div class="raw-preview compact-raw-preview"><strong>RAW</strong><span>Open</span></div>`}
      </button>
    `)
    .join("");

  card.innerHTML = `
    <div class="album-cover ${albumPosts.length ? "" : "empty-cover"}">
      ${preview || '<div class="album-placeholder">No photos yet</div>'}
    </div>
    <div class="album-body">
      <p class="photo-title">${escapeHtml(album.title || "Untitled album")}</p>
      <p class="tile-meta">by ${escapeHtml(getCreatorName(album.user_id))}</p>
      <p class="tile-stats">${albumPosts.length} photos${album.description ? ` | ${escapeHtml(album.description)}` : ""}</p>
    </div>
  `;

  card.querySelectorAll("[data-post-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const postId = Number(button.dataset.postId);
      const post = state.posts.find((entry) => entry.id === postId);
      if (post) {
        openModal(post);
      }
    });
  });

  return card;
}

function getVisiblePosts(mode) {
  return state.posts.filter((post) => {
    if (mode === "mine" && post.user_id !== state.user?.uid) {
      return false;
    }

    const caption = (post.caption || "").toLowerCase();
    const creator = getCreatorName(post.user_id).toLowerCase();
    const matchesSearch =
      !state.search ||
      caption.includes(state.search) ||
      creator.includes(state.search) ||
      String(post.user_id).toLowerCase().includes(state.search);

    const tags = getPostTags(post);
    const matchesTag = state.activeTag === "All" || tags.includes(state.activeTag);
    return matchesSearch && matchesTag;
  });
}

function getAlbumPosts(albumId) {
  const postIds = state.albumPhotos.filter((entry) => entry.album_id === albumId).map((entry) => entry.post_id);
  return postIds
    .map((postId) => state.posts.find((post) => post.id === postId))
    .filter(Boolean);
}

function getPostTags(post) {
  const caption = (post.caption || "").toLowerCase();
  const tags = categoryMatchers
    .filter((category) => category.keywords.some((keyword) => caption.includes(keyword)))
    .map((category) => category.label);

  return tags.length ? tags : ["Featured"];
}

function collectTags() {
  const tags = new Set();
  state.posts.forEach((post) => {
    getPostTags(post).forEach((tag) => tags.add(tag));
  });
  return [...tags].sort((a, b) => a.localeCompare(b));
}

function syncStats() {
  const statPosts = document.getElementById("statPosts");
  const statCreators = document.getElementById("statCreators");
  const statLikes = document.getElementById("statLikes");
  const statComments = document.getElementById("statComments");
  const statAlbums = document.getElementById("statAlbums");
  const statPhotosInAlbums = document.getElementById("statPhotosInAlbums");

  if (page === "dashboard") {
    const ownPosts = state.posts.filter((post) => post.user_id === state.user?.uid);
    const ownPostIds = new Set(ownPosts.map((post) => post.id));
    if (statPosts) {
      statPosts.textContent = String(ownPosts.length);
    }
    if (statLikes) {
      statLikes.textContent = String(state.likes.filter((entry) => ownPostIds.has(entry.post_id)).length);
    }
    if (statComments) {
      statComments.textContent = String(state.comments.filter((entry) => ownPostIds.has(entry.post_id)).length);
    }
    return;
  }

  if (page === "albums") {
    if (statAlbums) {
      statAlbums.textContent = String(state.albums.filter((album) => album.is_public !== false).length);
    }
    if (statPhotosInAlbums) {
      statPhotosInAlbums.textContent = String(state.albumPhotos.length);
    }
  }

  if (statPosts) {
    statPosts.textContent = String(state.posts.length);
  }
  if (statCreators) {
    statCreators.textContent = String(new Set([
      ...state.posts.map((post) => post.user_id),
      ...state.albums.map((album) => album.user_id)
    ]).size);
  }
  if (statComments) {
    statComments.textContent = String(state.comments.length);
  }
}

function getCreatorName(userId) {
  if (state.user?.uid === userId) {
    return state.user.displayName || "You";
  }
  return `@${String(userId).slice(0, 8)}`;
}

function getLikeCount(postId) {
  return state.likes.filter((entry) => entry.post_id === postId).length;
}

function getCommentCount(postId) {
  return state.comments.filter((entry) => entry.post_id === postId).length;
}

function openModal(post) {
  if (!modal || !modalImage || !modalTitle || !modalMeta || !modalStats) {
    return;
  }

  const previewUrl = getPreviewUrl(post);
  const displayable = Boolean(previewUrl);
  modalImage.src = displayable ? previewUrl : "";
  modalImage.alt = post.caption || "Snippr upload";
  modalImage.classList.toggle("hidden", !displayable);
  if (modalRawNotice) {
    modalRawNotice.classList.toggle("hidden", displayable);
  }
  if (modalDownloadLink) {
    modalDownloadLink.href = post.image_url;
  }
  modalTitle.textContent = post.caption || "Untitled frame";
  modalMeta.textContent = `by ${getCreatorName(post.user_id)}`;
  modalStats.textContent = `${getLikeCount(post.id)} likes | ${getCommentCount(post.id)} comments`;
  renderModalComments(post.id);
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  if (!modal) {
    return;
  }

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function renderModalComments(postId) {
  if (!modalComments) {
    return;
  }

  const comments = state.comments.filter((entry) => entry.post_id === postId);

  if (!comments.length) {
    modalComments.innerHTML = '<p class="modal-comment-empty">No comments yet.</p>';
    return;
  }

  modalComments.innerHTML = comments
    .map((entry) => `
      <article class="modal-comment">
        <strong>${escapeHtml(getCreatorName(entry.user_id))}</strong>
        <p>${escapeHtml(entry.text || "")}</p>
      </article>
    `)
    .join("");
}

function fillSelect(select, items, mapper, placeholder) {
  select.innerHTML = "";

  const firstOption = document.createElement("option");
  firstOption.value = "";
  firstOption.textContent = placeholder;
  select.appendChild(firstOption);

  items.forEach((item) => {
    const mapped = mapper(item);
    const option = document.createElement("option");
    option.value = mapped.value;
    option.textContent = mapped.label;
    select.appendChild(option);
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isDisplayableImage(url) {
  const lowerUrl = String(url).toLowerCase().split("?")[0];
  return !lowerUrl.endsWith(".nef");
}

function getPreviewUrl(post) {
  if (post.preview_url) {
    return post.preview_url;
  }

  const fileType = String(post.file_type || "").toLowerCase();
  if (fileType && !isDisplayableFileType(fileType)) {
    return null;
  }

  return isDisplayableImage(post.image_url) ? post.image_url : null;
}

function getFileType(file) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (extension) {
    return extension;
  }

  return String(file.type || "unknown").toLowerCase();
}

function isDisplayableFileType(fileType) {
  return fileType !== "nef";
}

function setStatus(message, isError = false) {
  statusMounts.forEach((mount) => {
    mount.textContent = message;
    mount.style.color = isError ? "#c81e58" : "#5b6475";
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
