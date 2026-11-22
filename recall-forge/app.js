import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-analytics.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDoc,
  setDoc,
  query as fsq,
  where,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyBsO9y0GOOMBl9QN4XhtypeWUNTtzvnSM8",
  authDomain: "recallforge-82632.firebaseapp.com",
  projectId: "recallforge-82632",
  storageBucket: "recallforge-82632.firebasestorage.app",
  messagingSenderId: "806577642894",
  appId: "1:806577642894:web:12f35d560bbce2055818df",
  measurementId: "G-77N32GHC9X",
});

try {
  getAnalytics(app);
} catch (e) {}
const auth = getAuth(app),
  db = makeDb();

const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const toks = (t) => t.split(/\s+/).filter(Boolean);
const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
const shuf = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const toast = (m) => {
  const t = $("#toast");
  t.textContent = m;
  t.className = "on";
  clearTimeout(toast.h);
  toast.h = setTimeout(() => (t.className = ""), 2200);
};

let user,
  items = [],
  unsub,
  tab = "practice",
  authMode = "in",
  query = "",
  folder = "",
  groups = [],
  gshared = [],
  gun,
  sun,
  pageTransition = false,
  navigationTimer;
const GRADED = ["first", "blanks", "scramble", "multiple", "type"],
  KEY = "rf_guest";
const gLoad = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

const gSave = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    toast("Can't save on this device: browser storage is blocked");
  }
};

const col = (...p) => collection(db, "users", user.uid, "memorizations");

// storage layer: Firestore when signed in, localStorage as guest
const dbAdd = async (o) => {
  if (user) return wr(addDoc(col(), o));
  items.push({ id: "g" + Date.now().toString(36), ...o });
  gSave();
  render();
};

const dbUpd = async (id, u) => {
  if (user) return wr(updateDoc(doc(db, "users", user.uid, "memorizations", id), u));
  Object.assign(
    items.find((i) => i.id === id),
    u,
  );
  gSave();
  render();
};

const dbDel = async (id) => {
  if (user) return wr(deleteDoc(doc(db, "users", user.uid, "memorizations", id)));
  items = items.filter((i) => i.id !== id);
  gSave();
  render();
};

const STAGES = [
  [
    "Familiarize",
    "Get comfortable with the words.",
    "var(--blue)",
    [
      ["reveal", "✋", "Tap to Reveal"],
      ["listen", "🎧", "Listen"],
    ],
  ],
  [
    "Solidify",
    "Pull the words from memory with help.",
    "var(--cyan)",
    [
      ["first", "⌨", "First Letter"],
      ["blanks", "☰", "Blanks"],
      ["scramble", "⇄", "Scramble"],
      ["multiple", "◉", "Multiple Choice"],
    ],
  ],
  ["Evaluate", "Prove you know it.", "var(--green)", [["type", "T", "Type It"]]],
];

const LV = (p) => Math.min(6, 1 + Math.floor(p / 50));
const mastery = (i) => {
  const v = GRADED.map((k) => i.scores?.[k]).filter((x) => x != null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
};

const dayKey = () => new Date().toISOString().slice(0, 10);
const streak = () => {
  const d = new Set(items.flatMap((i) => i.days || []));
  let n = 0,
    t = new Date();
  if (!d.has(t.toISOString().slice(0, 10))) t = new Date(t - 864e5);
  while (d.has(t.toISOString().slice(0, 10))) {
    n++;
    t = new Date(t - 864e5);
  }
  return n;
};

const nextTxt = (i) => {
  const d = Math.ceil((i.nextReview - Date.now()) / 864e5);
  return d <= 0 ? "Due now" : `Review in ${d} day${d > 1 ? "s" : ""}`;
};

const route = () =>
  location.hash.startsWith("#/m/") ? location.hash.slice(4) : null;

const linesOf = (t) => {
  let L = t
    .split(/\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (L.length === 1)
    L = t
      .split(/(?<=[.!?])\s+/)
      .map((x) => x.trim())
      .filter(Boolean);
  return L;
};

const ftext = (it) => {
  const L = linesOf(it.text);
  return it.focus?.length
    ? it.focus
        .filter((i) => i < L.length)
        .map((i) => L[i])
        .join("\n")
    : it.text;
};

const fsum = (it) => {
  if (!it.focus?.length) return "Whole text";
  const a = [...it.focus].sort((x, y) => x - y),
    r = [];
  let st = a[0],
    p = st;
  for (let i = 1; i <= a.length; i++) {
    if (a[i] === p + 1) {
      p = a[i];
      continue;
    }
    r.push(st === p ? "" + (st + 1) : st + 1 + "–" + (p + 1));
    st = p = a[i];
  }
  return "Lines " + r.join(", ");
};

const vsc = (v) =>
  /natural|neural|online|premium|enhanced|google/i.test(v.name) ? 1 : 0;
try {
  speechSynthesis.getVoices();
} catch {}
function wsh() {
  sun && sun();
  sun = null;
  const h = location.hash;
  gshared = (user && sc[h.slice(4)]) || [];
  if (user && h.startsWith("#/g/"))
    sun = onSnapshot(
      collection(db, "groups", h.slice(4), "shared"),
      (s) => {
        gshared = s.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.at - a.at);
        sc[h.slice(4)] = gshared;
        saveCache();
        render();
      },
      () => {},
    );
}

function landing() {
  const demo = "What we repeat with attention, we remember for life.".split(" ");
  const st = STAGES.map(
    ([n, d, c, ms]) =>
      `<section class="stage" style="--c:${c}"><h2>${n}</h2><p>${d}</p><div class="hint">${ms.map((m) => m[2]).join(" · ")}</div></section>`,
  ).join("");
  const F = [
    "Unlimited memorizations",
    "Access your memorizations offline on this device",
    "Personal folders",
    "Upload text files",
    "Spaced repetition that adapts to your scores",
    "Focus on any lines or chunks",
    "Natural voices with speed control",
    "Create and join study groups",
    "Cloud sync when you sign in",
  ];
  return `<main class="wrap lp"><section class="hero2"><h1>Learn it by heart.<br>Keep it for good.</h1><p>Paste a poem, speech or script, practice it in three stages, and let spaced reviews bring it back right before you forget.</p><div class="row" style="margin:0"><button class="btn big" onclick="location.hash='#/app'">${items.length ? "Open your memorizations" : "Start memorizing"}</button>${user ? "" : `<button class="btn ghost big" onclick="A.auth()">Sign in</button>`}</div><p class="hint" style="margin-top:14px">Free, with no account needed.</p></section>
  <section class="demo"><div class="rv" id="demo">${demo.map((w) => `<span class="rw">${w}</span> `).join("")}</div><p class="hint">Try it: press Space or tap the text to reveal the next word.</p></section>
  <h2 class="sec">Three stages, one habit</h2>${st}
  <h2 class="sec">Everything included, all free</h2><div class="fg">${F.map((f) => `<div><b>✓</b>${f}</div>`).join("")}</div>
  <div class="foot2"><span>RecallForge</span><a href="#/app">Open the app</a></div></main>`;
}

function initDemo() {
  const ws = [...document.querySelectorAll("#demo .rw")];
  let n = 0;
  const up = () =>
      ws.forEach((w, i) => {
        w.classList.toggle("on", i < n);
        w.classList.toggle("cur", i === n - 1);
      }),
    st = (d) => {
      n = Math.max(0, Math.min(ws.length, n + d));
      up();
    };
  A.key = (e) => {
    if (
      $(".ov") ||
      (location.hash && location.hash !== "#/") ||
      e.target.closest?.("input,textarea,button,select")
    )
      return;
    if (e.code === "Space" || e.key === "ArrowRight") {
      e.preventDefault();
      st(1);
    } else if (e.key === "Backspace" || e.key === "ArrowLeft") {
      e.preventDefault();
      st(-1);
    }
  };
  $("#demo").onclick = () => st(1);
  const t = setInterval(() => {
    if (!$("#demo") || n >= 4) {
      clearInterval(t);
      return;
    }
    st(1);
  }, 550);
}

function groupsView() {
  if (!user)
    return `<main class="wrap"><div class="empty" style="margin-top:30px"><h2>Study with others</h2><p>Groups live in your account, so sign in to create or join one.</p><button class="btn" onclick="A.auth()">Sign in</button></div></main>`;
  const mine = groups.filter((g) => g.owner === user.uid).length;
  return `<main class="wrap"><header class="ph"><div><h1>Groups</h1><p>${mine}/6 created. Join as many as you like.</p></div><div class="row" style="margin:0"><button class="btn ghost" onclick="A.join()">Join with code</button><button class="btn" onclick="A.mkgroup()">Create group</button></div></header><div class="list">${groups.length ? groups.map((g) => `<div class="item" style="grid-template-columns:1fr" onclick="location.hash='#/g/${g.id}'"><div><h3>${esc(g.name)}</h3><p class="sn">${g.members.length} member${g.members.length > 1 ? "s" : ""} · code ${g.id}</p></div></div>`).join("") : `<div class="empty"><p>No groups yet.</p></div>`}</div></main>`;
}

function groupView(id) {
  const g = groups.find((x) => x.id === id),
    back = `<button class="back" onclick="location.hash='#/groups'">← Groups</button>`;
  if (!g)
    return `<main class="wrap">${back}<p class="hint" style="margin-top:16px">Loading…</p></main>`;
  return `<main class="wrap">${back}<div class="dh"><div><h1>${esc(g.name)}</h1><p class="hint" style="margin-top:6px">Invite code <b>${g.id}</b> · ${g.members.length} member${g.members.length > 1 ? "s" : ""}</p></div><button class="btn sm" onclick="A.share('${id}')">Share a memorization</button></div><div class="list">${gshared.length ? gshared.map((x) => `<div class="item" style="grid-template-columns:1fr auto"><div style="min-width:0"><h3>${esc(x.title)}</h3><p class="sn">${esc(x.text.replace(/\s+/g, " "))}</p><span class="meta">Shared by ${esc(x.byName || "a member")}</span></div><button class="btn ghost sm" onclick="A.take('${x.id}')">Add to mine</button></div>`).join("") : `<div class="empty"><p>Nothing shared yet.</p></div>`}</div></main>`;
}

// ---- offline support ----
// Firestore keeps its own offline cache; we also mirror everything to localStorage.
function makeDb() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return getFirestore(app);
  }
}

const CK = "rf_cache_";
let sc = {};

function saveCache() {
  if (!user) return;
  try {
    localStorage.setItem(CK + user.uid, JSON.stringify({ items, groups, shared: sc }));
  } catch {}
}

function loadCache(uid) {
  try {
    return JSON.parse(localStorage.getItem(CK + uid)) || {};
  } catch {
    return {};
  }
}

// offline writes are queued by Firestore and sync later, so don't wait on the server
const wr = (p) => {
  if (navigator.onLine) return p;
  p.catch(() => {});
  return Promise.resolve();
};

const offBar = () => $("#off").classList.toggle("on", !navigator.onLine);
addEventListener("offline", offBar);
addEventListener("online", () => {
  offBar();
  toast("Back online");
});
offBar();

try {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http"))
    navigator.serviceWorker.register("sw.js").catch(() => {});
} catch {}

// show saved guest data immediately (no waiting on Firebase) unless a signed-in session is likely
try {
  if (!localStorage.getItem("rf_auth")) {
    user = null;
    items = gLoad();
    render();
  }
} catch {
  user = null;
  items = gLoad();
  render();
}

onAuthStateChanged(auth, async (u) => {
  user = u || null;
  unsub && unsub();
  unsub = null;
  gun && gun();
  gun = null;
  groups = [];
  try {
    u ? localStorage.setItem("rf_auth", "1") : localStorage.removeItem("rf_auth");
  } catch {}
  if (u) {
    A.close();
    const cached = loadCache(u.uid);
    if (cached.items) {
      items = cached.items;
      groups = cached.groups || [];
      sc = cached.shared || {};
      render();
    }
    const g = gLoad();
    if (g.length) {
      try {
        for (const x of g) {
          const { id, ...r } = x;
          await addDoc(col(), r);
        }
        localStorage.removeItem(KEY);
        toast("Guest progress moved to your account");
      } catch (e) {}
    }
    unsub = onSnapshot(
      col(),
      (s) => {
        if (s.metadata.fromCache && s.empty && !s.metadata.hasPendingWrites && items.length) return;
        items = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        saveCache();
        render();
      },
      (e) => toast("Database error: " + e.code),
    );
    gun = onSnapshot(
      fsq(collection(db, "groups"), where("members", "array-contains", u.uid)),
      (s) => {
        if (s.metadata.fromCache && s.empty && groups.length) return;
        groups = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        saveCache();
        render();
      },
      () => {},
    );
    wsh();
  } else {
    items = gLoad();
    render();
  }
});

addEventListener("hashchange", () => {
  tab = "practice";
  wsh();
  const page = $("#app > main");
  clearTimeout(navigationTimer);
  if (!page || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    render();
    return;
  }
  pageTransition = true;
  page.classList.add("page-exit");
  navigationTimer = setTimeout(render, 140);
});

addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $(".ov")) A.close();
  else A.key?.(e);
});

function render() {
  if (user === undefined) return;
  const cap = Date.now() + 180 * 864e5;
  items.forEach((i) => {
    if (i.nextReview > cap) i.nextReview = cap;
  });
  const id = route(),
    it = items.find((i) => i.id === id);
  const h = location.hash;
  let page;
  if (h.startsWith("#/g")) {
    page = h === "#/groups" || !user ? groupsView() : groupView(h.slice(4));
  } else if (h === "#/archive") {
    page = archiveView();
  } else if (id && it) {
    page = detail(it);
  } else if (h === "#/app" || h.startsWith("#/m/")) {
    page = home();
  } else {
    page = landing();
  }

  $("#app").innerHTML = nav() + page;
  if (id && it) {
    const archiveAction = it.archivedAt
      ? `<button class="btn ghost sm" onclick="A.restore('${it.id}')">Restore</button>`
      : `<button class="btn ghost sm" onclick="A.archive('${it.id}')">Archive</button>`;
    $("#app .dh .row")?.insertAdjacentHTML("afterbegin", archiveAction);
    if (it.archivedAt) {
      const back = $("#app .back");
      if (back) {
        back.textContent = "← Archive";
        back.onclick = () => (location.hash = "#/archive");
      }
    }
  }
  if (pageTransition) {
    $("#app > main")?.classList.add("page-enter");
    pageTransition = false;
  }
  $("#demo") && initDemo();
}

function nav() {
  const points = items.reduce((total, item) => total + (item.points || 0), 0);
  const archiveCount = items.filter((item) => item.archivedAt).length;
  const archiveLabel = archiveCount ? `Archive · ${archiveCount}` : "Archive";

  return `<nav>
    <div class="logo" onclick="location.hash = ''"><i></i>Recall<b>Forge</b></div>
    <button class="btn ghost sm" onclick="location.hash = '#/app'">Memorizations</button>
    <button class="btn ghost sm" onclick="location.hash = '#/archive'">${archiveLabel}</button>
    <button class="btn ghost sm" onclick="location.hash = '#/groups'">Groups</button>
    <div class="sp"></div>
    <span class="note">${points} pts · ${streak()} day streak</span>
    ${user ? `<span class="av" title="${esc(user.email || user.displayName || '')}">${esc((user.displayName || user.email || '?')[0].toUpperCase())}</span><button class="btn ghost sm" onclick="A.out()">Sign out</button>` : `<span class="note">Guest · saved on this device</span><button class="btn sm" onclick="A.auth()">Sign in to sync</button>`}
  </nav>`;
}

function home() {
  const active = items.filter((i) => !i.archivedAt),
    due = active.filter((i) => i.nextReview <= Date.now()).length,
    fl = [...new Set(active.map((i) => i.folder).filter(Boolean))];
  return `<main class="wrap"><header class="ph"><div><h1>Your memorizations</h1><p>${active.length ? (due ? due + " due for review today." : "You're all caught up.") : "Nothing here yet."}</p></div><button class="btn" onclick="A.add()">New memorization</button></header>
  ${
    active.length
? `${fl.length ? `<div class="row" style="margin:0 0 12px"><button class="btn ${folder ? "ghost " : ""}sm" onclick="A.fold('')">All</button>${fl.map((f) => `<button class="btn ${folder === f ? "" : "ghost "}sm" data-f="${esc(f)}" onclick="A.fold(this.dataset.f)">${esc(f)}</button>`).join("")}</div>` : ""}<input placeholder="Search by title" oninput="A.q(this.value)" value="${esc(query)}" aria-label="Search"><div class="list">${[
    ...active,
  ]
    .filter((i) => !folder || (i.folder || "") === folder)
    .sort((a, b) => a.nextReview - b.nextReview)
    .map(
      (i) =>
        `<div class="item" data-t="${esc(i.title.toLowerCase())}" onclick="location.hash='#/m/${i.id}'"><div style="min-width:0"><h3>${esc(i.title)}</h3><p class="sn">${esc(i.text.replace(/\s+/g, " "))}</p></div><div><div class="bar"><i style="width:${mastery(i)}%"></i></div><span class="meta">${i.folder ? esc(i.folder) + " · " : ""}${mastery(i)}% mastery · ${nextTxt(i)}</span></div></div>`,
    )
    .join("")}</div>`
: `<div class="empty"><h2>${items.length ? "Your active list is clear" : "Start with something you want to know by heart"}</h2><p>${items.length ? "Your archived memorizations are still safe." : "No account needed. Your progress stays on this device until you sign in."}</p><div class="row" style="justify-content:center"><button class="btn" onclick="A.add()">Add your own</button>${items.length ? `<button class="btn ghost" onclick="location.hash='#/archive'">Open archive</button>` : `<button class="btn ghost" onclick="A.sample()">Try a sample</button>`}</div></div>`
  }</main>`;
}

function archiveView() {
  const archived = items
    .filter((i) => i.archivedAt)
    .sort((a, b) => b.archivedAt - a.archivedAt);
  return `<main class="wrap"><button class="back" onclick="location.hash='#/app'">← Memorizations</button><header class="ph"><div><h1>Archive</h1><p>${archived.length ? `${archived.length} archived memorization${archived.length === 1 ? "" : "s"}` : "Archived items stay here until you restore or delete them."}</p></div></header><div class="list">${archived.length ? archived.map((i) => `<article class="item archive-item"><div style="min-width:0"><button class="archive-title" onclick="location.hash='#/m/${i.id}'">${esc(i.title)}</button><p class="sn">${esc(i.text.replace(/\s+/g, " "))}</p><span class="meta">Archived ${new Date(i.archivedAt).toLocaleDateString()}${i.folder ? ` · ${esc(i.folder)}` : ""}</span></div><div class="archive-actions"><button class="btn ghost sm" onclick="A.restore('${i.id}')">Restore</button><button class="btn ghost sm" onclick="A.del('${i.id}')">Delete</button></div></article>`).join("") : `<div class="empty"><h2>Nothing archived</h2><p>Use Archive on a memorization to move it here. You can restore it at any time.</p><button class="btn" onclick="location.hash='#/app'">Back to memorizations</button></div>`}</div></main>`;
}

function detail(i) {
  const m = mastery(i),
    p = i.points || 0;
  const body =
    tab === "practice"
      ? `<div class="focus"><span>Focus on</span><b>${fsum(i)}</b><button class="btn ghost sm" onclick="A.focus('${i.id}')">Choose lines</button></div>` +
        STAGES.map(
          ([n, d, c, ms]) =>
            `<section class="stage" style="--c:${c}"><h2>${n}</h2><p>${d}</p><div class="modes">${ms.map(([id, ic, lb]) => `<button class="mode" onclick="A.play('${i.id}','${id}')"><i>${ic}</i><b>${lb}</b><small>${GRADED.includes(id) ? (i.scores?.[id] ?? 0) + "%" : "Practice"}</small></button>`).join("")}</div></section>`,
        ).join("")
      : tab === "stats"
        ? `<div class="prose"><h2>Overview</h2><p style="color:var(--mu);margin:0 0 12px">${toks(i.text).length} words · ${(i.days || []).length} days practiced · ${nextTxt(i)}</p>${GRADED.map((k) => `<div style="margin:14px 0"><div style="display:flex;justify-content:space-between"><b>${{ first: "First Letter", blanks: "Blanks", scramble: "Scramble", multiple: "Multiple Choice", type: "Type It" }[k]}</b><span>${i.scores?.[k] ?? 0}%</span></div><div class="bar"><i style="width:${i.scores?.[k] ?? 0}%"></i></div></div>`).join("")}</div>`
        : `<div class="prose"><h2>How to play</h2><p><b>Tap to Reveal:</b> press <b>Space</b> (or tap) to bring in the next word. Backspace takes one away.</p><p><b>Listen:</b> hear the text read aloud, pause, repeat, and choose a voice.</p><p><b>Solidify:</b> type first letters, fill blanks, rebuild the order, or rebuild the passage one word at a time with multiple choice. Scores raise mastery.</p><p><b>Evaluate:</b> type it all from memory. Score 85% or more and your next review moves further out; less, and it returns tomorrow.</p></div>`;
  return `<main class="wrap"><button class="back" onclick="location.hash='#/app'">← All memorizations</button><div class="dh"><h1>${esc(i.title)}</h1><div class="row" style="margin:0"><button class="btn ghost sm" onclick="A.add('${i.id}')">Edit</button><button class="btn ghost sm" onclick="A.del('${i.id}')">Delete</button></div></div>
  <div class="stats"><div class="stat"><b>${m}%</b><span>Mastery</span><div class="bar"><i style="width:${m}%"></i></div></div><div class="stat"><b>${p}</b><span>Points</span></div><div class="stat"><b>${LV(p)}<small style="font-size:15px;color:var(--mu)"> / 6</small></b><span>Level</span></div></div>
  <div class="tabs">${[
    ["practice", "Practice"],
    ["stats", "Overview & Stats"],
    ["how", "How to Play"],
  ]
    .map(
([k, l]) =>
  `<button class="${tab === k ? "on" : ""}" onclick="A.tab('${k}')">${l}</button>`,
    )
    .join("")}</div>${body}</main>`;
}

const fail = (e) => {
  const x = $("#err");
  const m = (e.code || "error").replace("auth/", "").replace(/-/g, " ");
  x ? (x.textContent = m[0].toUpperCase() + m.slice(1)) : toast(m);
};

function authHtml() {
  const up = authMode === "up";
  return `<div class="auth"><button class="btn wh" onclick="A.google()">Continue with Google</button><p class="hint" style="text-align:center;margin-top:14px">or use email</p>${up ? `<input id="nm" placeholder="Name" autocomplete="name">` : ""}<input id="em" type="email" placeholder="Email" autocomplete="email"><input id="pw" type="password" placeholder="Password (6+ characters)" autocomplete="${up ? "new-password" : "current-password"}" onkeydown="event.key==='Enter'&&A.email()"><div class="err" id="err"></div><button class="btn" onclick="A.email()">${up ? "Create account" : "Sign in"}</button><div class="lnk"><a href="#" onclick="A.mode();return false">${up ? "Have an account? Sign in" : "New here? Create account"}</a>${up ? "" : `<a href="#" onclick="A.reset();return false">Forgot password?</a>`}</div></div>`;
}

// ---- practice engine ----
function stage(title, html, wide = false) {
  A.close();
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="ov"><div class="dlg ${wide ? "wide" : ""}"><div class="dh2"><h2>${title}</h2><button class="btn ghost sm" onclick="A.close()">Close</button></div><div id="st">${html}</div></div></div>`,
  );
}

async function done(it, mode, score) {
  A.close();
  const g = GRADED.includes(mode),
    gain = g ? Math.max(1, Math.round(score / 5)) : 5;
  const u = {
    points: (it.points || 0) + gain,
    days: [...new Set([...(it.days || []), dayKey()])].slice(-365),
  };
  if (g) {
    const o = it.scores?.[mode];
    u.scores = {
      ...(it.scores || {}),
      [mode]: o == null ? score : Math.round(o * 0.4 + score * 0.6),
    };
    u.interval =
      score >= 95
        ? Math.max(1, Math.round((it.interval || 1) * 2.5))
        : score >= 85
          ? Math.max(1, Math.round((it.interval || 1) * 2))
          : score >= 60
            ? Math.max(1, it.interval || 1)
            : 1;
    u.interval = Math.min(180, u.interval);
    u.nextReview = Date.now() + u.interval * 864e5;
  }
  try {
    await dbUpd(it.id, u);
    toast(g ? `${score}% · +${gain} points` : `+${gain} points`);
  } catch (e) {
    toast("Could not save: " + e.code);
  }
}

const fin = (f) =>
  `<div class="row"><button class="btn gr" onclick="${f}">Finish</button></div>`;
const MODEFN = {
  reveal(it) {
    const lines = it.text.split(/\n/);
    stage(
      "Tap to Reveal",
      `<div class="pg"><i id="pg"></i></div><div class="rv" id="rv">${lines
        .map((l) =>
          l.trim()
            ? `<div>${toks(l)
                .map((w) => `<span class="rw">${esc(w)}</span> `)
                .join("")}</div>`
            : `<div style="height:.8em"></div>`,
        )
        .join(
          "",
        )}</div><div class="row" style="justify-content:space-between"><p class="hint"><b id="ct">0</b> words · <b>Space</b> reveals · <b>Backspace</b> hides · Esc closes</p>${""}<button class="btn gr" onclick="A.fin()">Finish</button></div>`,
    );
    const ws = [...document.querySelectorAll(".rw")];
    let n = 0;
    const upd = () => {
      ws.forEach((w, i) => {
        w.classList.toggle("on", i < n);
        w.classList.toggle("cur", i === n - 1);
      });
      $("#pg").style.width = (100 * n) / ws.length + "%";
      $("#ct").textContent = n + " / " + ws.length;
      if (n) ws[n - 1].scrollIntoView({ block: "center", behavior: "smooth" });
    };
    const step = (d) => {
      n = Math.max(0, Math.min(ws.length, n + d));
      upd();
    };
    A.key = (e) => {
      if (e.code === "Space" || e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "Backspace" || e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      }
    };
    $("#rv").onclick = () => step(1);
    upd();
    A.fin = () => done(it, "reveal", 100);
  },

  listen(it) {
    const chunks = it.text
      .split(/(?<=[.!?…])\s+|\n+/u)
      .map((x) => x.trim())
      .filter(Boolean);
    let idx = 0,
      playing = false,
      voices = [];
    const langHint = /[¿¡ñáéíóúü]/i.test(it.text)
      ? "es"
      : /[àâçèéêëîïôûùüÿœæ]/i.test(it.text)
        ? "fr"
        : "";
    const voiceOptions = () =>
      `<option value="">Automatic voice${langHint ? ` (${langHint.toUpperCase()})` : ""}</option>${voices.map((v, i) => `<option value="${i}">${esc(v.name)} · ${esc(v.lang)}</option>`).join("")}`;
    stage(
      "Listen",
      `<div class="listen-text" id="lt" aria-live="polite">${chunks.map((x, i) => `<button class="listen-chunk" data-chunk="${i}" aria-label="Play sentence ${i + 1}">${esc(x)} </button>`).join("")}</div><p class="hint" id="ls" style="margin:10px 0">Ready · ${chunks.length} section${chunks.length === 1 ? "" : "s"}</p><div class="listen-controls"><select id="vo" aria-label="Voice">${voiceOptions()}</select><label class="listen-setting">Speed <input id="rt" type="range" min=".65" max="1.35" step=".05" value="1" aria-label="Speaking speed"><span id="rvl">1×</span></label><label class="listen-setting"><input id="lp" type="checkbox"> Repeat</label></div><div class="row" style="justify-content:space-between"><div class="listen-controls"><button class="btn ghost sm" id="lprev" aria-label="Previous section">← Previous</button><button class="btn" id="lplay">▶ Play</button><button class="btn ghost sm" id="lnext" aria-label="Next section">Next →</button><button class="btn ghost sm" id="lstop">Stop</button></div><button class="btn gr" onclick="A.fin()">Finish</button></div>`,
    );
    const paint = () => {
      document.querySelectorAll(".listen-chunk").forEach((b, i) => {
        b.classList.toggle("active", i === idx);
        if (i === idx) b.setAttribute("aria-current", "true");
        else b.removeAttribute("aria-current");
      });
      const status = $("#ls");
      if (status)
        status.textContent = `Section ${Math.min(idx + 1, chunks.length)} of ${chunks.length}${playing ? " · Playing" : ""}`;
    };
    const pickVoice = () => {
      const selected = $("#vo")?.value;
      if (selected !== "") return voices[+selected] || null;
      const prefer = langHint || (navigator.language || "").slice(0, 2);
      return voices.find((v) => v.lang.toLowerCase().startsWith(prefer.toLowerCase())) || null;
    };
    const speak = () => {
      if (!playing || idx >= chunks.length) return;
      const u = new SpeechSynthesisUtterance(chunks[idx]);
      u.voice = pickVoice();
      u.lang = u.voice?.lang || (langHint ? `${langHint}-${langHint.toUpperCase()}` : navigator.language);
      u.rate = +$("#rt").value;
      paint();
      u.onend = () => {
        if (!playing) return;
        if (idx < chunks.length - 1) {
          idx++;
          speak();
        } else if ($("#lp").checked) {
          idx = 0;
          speak();
        } else {
          playing = false;
          $("#lplay").textContent = "▶ Play";
          paint();
        }
      };
      u.onerror = () => {
        playing = false;
        $("#lplay").textContent = "▶ Play";
        const status = $("#ls");
        if (status) status.textContent = "This browser could not play the selected voice.";
      };
      speechSynthesis.speak(u);
    };
    const start = () => {
      speechSynthesis.cancel();
      playing = true;
      $("#lplay").textContent = "Ⅱ Pause";
      paint();
      speak();
    };
    $("#lplay").onclick = () => {
      if (playing) {
        if (speechSynthesis.paused) {
          speechSynthesis.resume();
          $("#lplay").textContent = "Ⅱ Pause";
        } else {
          speechSynthesis.pause();
          $("#lplay").textContent = "▶ Resume";
        }
      } else start();
    };
    $("#lstop").onclick = () => {
      playing = false;
      speechSynthesis.cancel();
      $("#lplay").textContent = "▶ Play";
      paint();
    };
    $("#lprev").onclick = () => {
      idx = Math.max(0, idx - 1);
      if (playing) start();
      else paint();
    };
    $("#lnext").onclick = () => {
      idx = Math.min(chunks.length - 1, idx + 1);
      if (playing) start();
      else paint();
    };
    $("#lt").onclick = (e) => {
      const b = e.target.closest("[data-chunk]");
      if (!b) return;
      idx = +b.dataset.chunk;
      start();
    };
    $("#rt").oninput = (e) => {
      $("#rvl").textContent = `${parseFloat(e.target.value).toFixed(2).replace(/0$/, "")}×`;
    };
    voices = speechSynthesis.getVoices().sort((a, b) => vsc(b) - vsc(a));
    $("#vo").innerHTML = voiceOptions();
    speechSynthesis.onvoiceschanged = () => {
      const select = $("#vo");
      if (!select) return;
      voices = speechSynthesis.getVoices().sort((a, b) => vsc(b) - vsc(a));
      const value = select.value;
      select.innerHTML = voiceOptions();
      select.value = value;
    };
    paint();
    A.say = start;
    A.fin = () => done(it, "listen", 100);
  },

  first(it) {
    const w = toks(it.text);
    let idx = 0,
      bad = 0;
    stage(
      "First Letter",
      `<p class="hint">Type the first letter of each next word.</p><div class="txt" id="ft"></div><input id="fi" maxlength="2" autocomplete="off" placeholder="Type a letter" style="margin-top:14px">`,
    );
    const draw = () => {
      $("#ft").innerHTML = w
        .map((x, i) =>
          i < idx
            ? `<span>${esc(x)}</span> `
            : `<span style="color:#4a535d">${i === idx ? "▮" : "•"}</span> `,
        )
        .join("");
      if (idx >= w.length) {
        const n = w.length,
          s = Math.round((100 * n) / (n + bad));
        A.fin = () => done(it, "first", s);
        $("#fi").outerHTML =
          `<p><b>${s}%</b> · ${bad} miss${bad == 1 ? "" : "es"}</p>` +
          fin("A.fin()");
      }
    };
    while (idx < w.length && !norm(w[idx])) idx++;
    draw();
    $("#fi").focus();
    $("#fi").oninput = (e) => {
      const k = norm(e.target.value.slice(-1));
      e.target.value = "";
      if (!k || idx >= w.length) return;
      if (k === norm(w[idx])[0]) {
        idx++;
        while (idx < w.length && !norm(w[idx])) idx++;
      } else {
        bad++;
        $("#fi").classList.add("shake");
        setTimeout(() => $("#fi")?.classList.remove("shake"), 250);
      }
      draw();
    };
  },

  blanks(it) {
    const w = toks(it.text),
      hide = new Set(
        w
          .map((x, i) => (norm(x).length > 3 && Math.random() < 0.3 ? i : -1))
          .filter((i) => i >= 0),
      );
    if (!hide.size)
      w.forEach((x, i) => {
        if (norm(x)) hide.add(i);
      });
    stage(
      "Blanks",
      `<div class="txt">${w.map((x, i) => (hide.has(i) ? `<input class="blk" data-i="${i}" autocomplete="off"> ` : esc(x) + " ")).join("")}</div><div class="row"><button class="btn" id="ck">Check</button></div>`,
    );
    $("#ck").onclick = () => {
      const ins = [...document.querySelectorAll(".blk")];
      let c = 0;
      ins.forEach((n) => {
        const r = norm(w[n.dataset.i]) === norm(n.value);
        c += r;
        n.classList.add(r ? "ok" : "no");
        if (!r) n.value = w[n.dataset.i];
      });
      const s = Math.round((100 * c) / ins.length);
      A.fin = () => done(it, "blanks", s);
      $("#ck").outerHTML =
        `<b>${s}%</b><button class="btn gr" onclick="A.fin()">Finish</button>`;
    };
  },

  scramble(it) {
    const w = toks(it.text),
      sz = Math.max(5, Math.ceil(w.length / 10)),
      ch = [];
    for (let i = 0; i < w.length; i += sz) ch.push(w.slice(i, i + sz).join(" "));
    let nx = 0,
      bad = 0;
    stage(
      "Scramble",
      `<p class="hint">Tap the chunks in the right order.</p><div class="txt" id="sd"></div><div id="sp" style="margin-top:12px"></div>`,
    );
    $("#sp").innerHTML = shuf(ch.map((c, i) => [c, i]))
      .map(([c, i]) => `<button class="ch" data-i="${i}">${esc(c)}</button>`)
      .join("");
    $("#sp").onclick = (e) => {
      const b = e.target.closest(".ch");
      if (!b) return;
      if (+b.dataset.i === nx) {
        nx++;
        $("#sd").innerHTML += esc(b.textContent) + " ";
        b.remove();
        if (nx === ch.length) {
          const s = Math.round((100 * nx) / (nx + bad));
          A.fin = () => done(it, "scramble", s);
          $("#sp").innerHTML = `<b>${s}%</b>` + fin("A.fin()");
        }
      } else {
        bad++;
        b.classList.add("shake");
        setTimeout(() => b.classList.remove("shake"), 250);
      }
    };
  },

  multiple(it) {
    const entries = [];
    linesOf(it.text).forEach((line, li) => {
      toks(line).forEach((raw, wi) => {
        if (!norm(raw)) return;
        entries.push({
          li,
          wi,
          word: raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""),
          suffix: (raw.match(/[^\p{L}\p{N}]+$/u) || [""])[0],
        });
      });
    });
    if (!entries.length) return toast("Add some words to practice multiple choice");

    const pool = [...new Set(entries.map((entry) => entry.word))];
    let pos = 0,
      correct = 0,
      answered = false,
      choices = 2;

    const draw = () => {
      if (pos >= entries.length) {
        const score = Math.round((100 * correct) / Math.max(1, entries.length));
        A.fin = () => done(it, "multiple", score);
        $("#st").innerHTML = `<div class="mc" style="display:block;min-height:0"><div class="mc-side"><div class="mc-head"><span>Round complete</span><span class="mc-count">${correct} of ${entries.length}</span></div><h2 style="margin:auto;text-align:center;font-size:32px">${score}%</h2><p class="hint" style="text-align:center">${score >= 85 ? "Great recall. This set is ready for a longer review interval." : "Keep practicing. Your next review will come around soon."}</p><div class="row"><button class="btn gr" onclick="A.fin()">Finish</button></div></div></div>`;
        return;
      }

      const q = entries[pos];
      const wrong = shuf(pool.filter((word) => norm(word) !== norm(q.word))).slice(0, choices - 1);
      const fallbacks = ["always", "before", "because", "quickly", "another", "without", "between", "remember", "bright", "together", "around", "through"];
      for (const word of shuf(fallbacks)) {
        if (wrong.length === choices - 1) break;
        if (norm(word) !== norm(q.word) && !wrong.some((x) => norm(x) === norm(word))) wrong.push(word);
      }
      const options = shuf([q.word, ...wrong]);
      const built = entries
        .slice(0, pos)
        .map((entry, i, all) => `${i && all[i - 1].li === entry.li ? " " : i ? "\n" : ""}${entry.word}${entry.suffix}`)
        .join("");
      const prompt = `${esc(built).replace(/\n/g, "<br>")} <span class="mc-target">_____</span>${esc(q.suffix)}`;
      $("#st").innerHTML = `<div class="mc"><section class="mc-prompt"><div class="pg"><i style="width:${(100 * pos) / entries.length}%"></i></div><p class="hint">Rebuild the passage one word at a time</p><div class="mc-sentence">${prompt}</div><p class="hint">${pos} words rebuilt</p></section><section class="mc-side"><div class="mc-head"><span>Multiple Choice</span><span class="mc-count">${pos + 1} of ${entries.length}</span></div><div class="mc-options">${options.map((word, i) => `<button class="mc-option" data-choice="${i}"><span class="mc-key">${i + 1}</span><span>${esc(word)}</span></button>`).join("")}</div><div class="mc-feedback" id="mcf">Click an answer to continue · use keys 1–4</div><div class="row"><button class="btn ghost" id="mcskip">Skip</button></div></section></div>`;

      const choose = (index) => {
        if (answered || index < 0 || index >= options.length) return;
        answered = true;
        const isRight = norm(options[index]) === norm(q.word);
        if (isRight) correct++;
        document.querySelectorAll(".mc-option").forEach((button, i) => {
          button.disabled = true;
          if (norm(options[i]) === norm(q.word)) button.classList.add("correct");
          else if (i === index) button.classList.add("wrong");
        });
        $("#mcskip").disabled = true;
        $("#mcf").textContent = isRight ? "Correct!" : `The answer is ${q.word}`;
        const activeStage = $("#st");
        setTimeout(() => {
          if ($("#st") !== activeStage) return;
          pos++;
          answered = false;
          draw();
        }, 650);
      };

      document.querySelectorAll(".mc-option").forEach((button, i) => (button.onclick = () => choose(i)));
      $("#mcskip").onclick = () => {
        if (answered) return;
        pos++;
        draw();
      };
    };

    stage(
      "Multiple Choice",
      `<div class="mc" style="display:block;min-height:0"><section class="mc-side"><div class="mc-head"><span>Game mode</span></div><div class="mc-options" style="flex:none">${[[2, "Easy"], [3, "Medium"], [4, "Hard"]].map(([count, label]) => `<button class="mc-option ${choices === count ? "selected" : ""}" data-level="${count}"><span>${label}</span><span class="hint">${count} choices</span></button>`).join("")}</div><p class="hint">Rebuild the passage one word at a time by choosing the correct word.</p><div class="row"><button class="btn" id="mcstart">Start →</button></div></section></div>`,
      true,
    );
    document.querySelectorAll("[data-level]").forEach((button) =>
      button.addEventListener("click", () => {
        choices = +button.dataset.level;
        document.querySelectorAll("[data-level]").forEach((option) => option.classList.toggle("selected", option === button));
      }),
    );
    $("#mcstart").onclick = () => draw();
    A.key = (e) => {
      if (e.key >= "1" && e.key <= "4") document.querySelectorAll(".mc-option")[+e.key - 1]?.click();
    };
  },

  type(it) {
    stage(
      "Type It",
      `<p class="hint">Write the whole text from memory.</p><textarea id="ta" rows="9" style="margin-top:8px"></textarea><div class="row"><button class="btn" id="ck">Check</button></div>`,
    );
    $("#ck").onclick = () => {
      const a = toks(it.text).map(norm),
        b = toks($("#ta").value).map(norm),
        dp = Array.from({ length: a.length + 1 }, () =>
          new Array(b.length + 1).fill(0),
        );
      for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++)
          dp[i][j] =
            a[i - 1] === b[j - 1]
              ? dp[i - 1][j - 1] + 1
              : Math.max(dp[i - 1][j], dp[i][j - 1]);
      const s = Math.round((100 * dp[a.length][b.length]) / Math.max(1, a.length));
      A.fin = () => done(it, "type", s);
      $("#st").insertAdjacentHTML(
        "beforeend",
        `<p><b>${s}%</b> of words matched in order.</p><div class="txt" style="font-size:17px;color:var(--mu)">${esc(it.text)}</div>` +
          fin("A.fin()"),
      );
      $("#ck").remove();
    };
  },
};

// ---- actions ----
const A = (window.A = {
  auth() {
    stage(authMode === "up" ? "Create your account" : "Sign in", authHtml());
  },

  mode() {
    authMode = authMode === "in" ? "up" : "in";
    A.auth();
  },

  async google() {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      fail(e);
    }
  },

  async email() {
    const em = $("#em").value.trim(),
      pw = $("#pw").value;
    try {
      if (authMode === "up") {
        const c = await createUserWithEmailAndPassword(auth, em, pw);
        const n = $("#nm").value.trim();
        if (n) await updateProfile(c.user, { displayName: n });
      } else await signInWithEmailAndPassword(auth, em, pw);
    } catch (e) {
      fail(e);
    }
  },

  async reset() {
    const em = $("#em").value.trim();
    if (!em) return fail({ code: "Enter your email first" });
    try {
      await sendPasswordResetEmail(auth, em);
      toast("Password reset email sent");
    } catch (e) {
      fail(e);
    }
  },

  out() {
    signOut(auth);
  },

  tab(t) {
    tab = t;
    render();
  },

  q(v) {
    query = v;
    document
      .querySelectorAll(".item")
      .forEach(
        (c) =>
          (c.style.display = c.dataset.t.includes(v.toLowerCase()) ? "" : "none"),
      );
  },

  close() {
    A.key = null;
    try {
      speechSynthesis.cancel();
    } catch {}
    $(".ov")?.remove();
  },

  add(id) {
    const it = items.find((i) => i.id === id);
    stage(
      it ? "Edit memorization" : "New memorization",
      `<input id="nt" placeholder="Title" value="${it ? esc(it.title) : ""}"><input id="nf" list="fd" placeholder="Folder (optional)" value="${it ? esc(it.folder || "") : ""}" style="margin-top:10px"><datalist id="fd">${[...new Set(items.map((x) => x.folder).filter(Boolean))].map((f) => `<option value="${esc(f)}">`).join("")}</datalist><textarea id="nx" rows="10" placeholder="Paste or type the text you want to memorize, or upload a text file" style="margin-top:10px">${it ? esc(it.text) : ""}</textarea><div class="row"><button class="btn" onclick="A.save('${id || ""}')">Save</button><label class="btn ghost" style="cursor:pointer">Upload text file<input type="file" accept=".txt,.md,.text,.srt,.csv" hidden onchange="A.up(this)"></label></div>`,
    );
    $("#nt").focus();
  },

  async save(id) {
    const title = $("#nt").value.trim(),
      text = $("#nx").value.trim(),
      folder = $("#nf").value.trim();
    if (!title || !text) return toast("Add a title and some text");
    try {
      if (id) await dbUpd(id, { title, text, folder, focus: [] });
      else
        await dbAdd({
          title,
          text,
          folder,
          focus: [],
          points: 0,
          scores: {},
          days: [],
          interval: 1,
          nextReview: Date.now(),
          createdAt: Date.now(),
        });
      A.close();
      toast("Saved");
    } catch (e) {
      toast("Could not save: " + e.code);
    }
  },

  async sample() {
    await dbAdd({
      title: "Gettysburg Address (opening)",
      text: "Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.\n\nNow we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure.",
      points: 0,
      scores: {},
      days: [],
      interval: 1,
      nextReview: Date.now(),
      createdAt: Date.now(),
    });
  },

  fold(f) {
    folder = f;
    render();
  },

  up(el) {
    const f = el.files[0];
    if (!f) return;
    f.text().then((t) => {
      $("#nx").value = t;
      if (!$("#nt").value) $("#nt").value = f.name.replace(/\.[^.]+$/, "");
    });
  },

  focus(id) {
    const it = items.find((i) => i.id === id),
      L = linesOf(it.text),
      f = new Set(it.focus || []),
      ch = [];
    for (let i = 0; i < L.length; i += 4) ch.push([i, Math.min(L.length, i + 4)]);
    stage(
      "Focus on lines",
      `<p class="hint">Tick the lines to practice, or jump to a chunk of four. No ticks means the whole text.</p><div class="row" style="margin:10px 0">${ch.length > 1 ? ch.map(([a, b]) => `<button class="btn ghost sm" onclick="A.chunk(${a},${b})">Lines ${a + 1}–${b}</button>`).join("") : ""}</div><div id="fl">${L.map((l, i) => `<label class="ln"><input type="checkbox" value="${i}" ${f.has(i) ? "checked" : ""}><em>${i + 1}</em><span>${esc(l)}</span></label>`).join("")}</div><div class="row"><button class="btn" onclick="A.fsave('${id}')">Save focus</button><button class="btn ghost" onclick="A.chunk(0,0)">Whole text</button></div>`,
    );
  },

  chunk(a, b) {
    document
      .querySelectorAll("#fl input")
      .forEach((c, i) => (c.checked = i >= a && i < b));
  },

  async fsave(id) {
    const v = [...document.querySelectorAll("#fl input:checked")].map(
      (c) => +c.value,
    );
    try {
      await dbUpd(id, {
        focus: v.length === document.querySelectorAll("#fl input").length ? [] : v,
      });
      A.close();
      toast(v.length ? "Focus saved" : "Practicing the whole text");
    } catch (e) {
      toast(e.code);
    }
  },

  mkgroup() {
    stage(
      "Create group",
      `<input id="gn" placeholder="Group name"><div class="row"><button class="btn" onclick="A.mk()">Create</button></div>`,
    );
  },

  async mk() {
    if (!navigator.onLine) return toast("Go online to create groups");
    const name = $("#gn").value.trim();
    if (!name) return;
    if (groups.filter((g) => g.owner === user.uid).length >= 6)
      return toast("You can create up to 6 groups");
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    try {
      await setDoc(doc(db, "groups", code), {
        name,
        owner: user.uid,
        members: [user.uid],
        createdAt: Date.now(),
      });
      A.close();
      location.hash = "#/g/" + code;
    } catch (e) {
      toast("Could not create: " + e.code);
    }
  },

  join() {
    stage(
      "Join a group",
      `<input id="gc" placeholder="Invite code" style="text-transform:uppercase"><div class="row"><button class="btn" onclick="A.jn()">Join</button></div>`,
    );
  },

  async jn() {
    if (!navigator.onLine) return toast("Go online to join groups");
    const c = $("#gc").value.trim().toUpperCase();
    if (!c) return;
    try {
      const r = doc(db, "groups", c);
      if (!(await getDoc(r)).exists()) return toast("No group with that code");
      await updateDoc(r, { members: arrayUnion(user.uid) });
      A.close();
      location.hash = "#/g/" + c;
    } catch (e) {
      toast("Could not join: " + e.code);
    }
  },

  share(g) {
    stage(
      "Share a memorization",
      items.length
        ? items
            .map(
              (i) =>
                `<button class="ch" onclick="A.doshare('${g}','${i.id}')">${esc(i.title)}</button>`,
            )
            .join("")
        : `<p class="hint">Add a memorization first.</p>`,
    );
  },

  async doshare(g, id) {
    if (!navigator.onLine) return toast("Go online to share");
    const it = items.find((i) => i.id === id);
    try {
      await addDoc(collection(db, "groups", g, "shared"), {
        title: it.title,
        text: it.text,
        by: user.uid,
        byName: user.displayName || user.email || "member",
        at: Date.now(),
      });
      A.close();
      toast("Shared");
    } catch (e) {
      toast("Could not share: " + e.code);
    }
  },

  take(sid) {
    const x = gshared.find((y) => y.id === sid);
    dbAdd({
      title: x.title,
      text: x.text,
      folder: "",
      focus: [],
      points: 0,
      scores: {},
      days: [],
      interval: 1,
      nextReview: Date.now(),
      createdAt: Date.now(),
    });
    toast("Added to your list");
  },

  async archive(id) {
    try {
      await dbUpd(id, { archivedAt: Date.now() });
      toast("Memorization archived");
      location.hash = "#/archive";
    } catch (e) {
      toast("Could not archive: " + (e.code || "try again"));
    }
  },

  async restore(id) {
    try {
      await dbUpd(id, { archivedAt: null });
      toast("Memorization restored");
      location.hash = "#/app";
    } catch (e) {
      toast("Could not restore: " + (e.code || "try again"));
    }
  },

  async del(id) {
    if (confirm("Delete this memorization?")) {
      try {
        await dbDel(id);
        location.hash = "#/app";
      } catch (e) {
        toast(e.code);
      }
    }
  },

  play(id, m) {
    const o = items.find((i) => i.id === id);
    MODEFN[m]({ ...o, text: ftext(o) });
  },
});

