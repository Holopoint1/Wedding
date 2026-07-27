/* =========================================================
   Alfie & Lorna — interactions, animations, RSVP
   ========================================================= */

// Saturday 15 May 2027, 13:30 BST (UTC+1) — ceremony start at Fruin Farm
const WEDDING_DATE = new Date("2027-05-15T13:30:00+01:00");
const WEDDING_MS = WEDDING_DATE.getTime();
const RSVP_KEY = "alfie-lorna-rsvp";
const AUTH_KEY = "alfie-lorna-auth";
const REMOTE_ENDPOINT = ""; // Formspree / Netlify / Apps Script URL when ready

/* ---------- Guest login gate ----------
   Guests are defined in guests.js (GUEST_LIST). Each logs in with
   their name + personal password. The session is remembered on the
   device until they tap "Switch guest". */
const gate       = document.getElementById("gate");
const gateForm   = document.getElementById("gate-form");
const gateName   = document.getElementById("gate-name");
const gatePass   = document.getElementById("gate-pass");
const gateError  = document.getElementById("gate-error");

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

/* Storage that can never throw — some browsers block localStorage /
   sessionStorage entirely (cookie blocking, private modes). The site
   must still work; it just won't remember the login between visits. */
const store = {
  get:  (k) => { try { return localStorage.getItem(k); }    catch { return null; } },
  set:  (k, v) => { try { localStorage.setItem(k, v); }     catch {} },
  del:  (k) => { try { localStorage.removeItem(k); }        catch {} },
  sget: (k) => { try { return sessionStorage.getItem(k); }  catch { return null; } },
  sset: (k, v) => { try { sessionStorage.setItem(k, v); }   catch {} },
  sdel: (k) => { try { sessionStorage.removeItem(k); }      catch {} },
};

/* ---------- Name type-ahead ----------
   As the guest types, matching names from the list drop down under
   the field — tap or arrow+Enter to pick one. */
const ALL_NAMES = (typeof GUEST_LIST !== "undefined")
  ? [...new Set(GUEST_LIST.map(g => g.name))].sort()
  : [];

(function initTypeahead() {
  const input = gateName;
  const list  = document.getElementById("gate-suggest");
  if (!input || !list) return;

  let matches = [];
  let active = -1; // highlighted row, -1 = none

  const hide = () => { list.hidden = true; list.innerHTML = ""; active = -1; };

  function pick(name) {
    input.value = name;
    hide();
    const pass = document.getElementById("gate-pass");
    if (pass) pass.focus();
  }

  function render() {
    const q = norm(input.value);
    if (!q) { hide(); return; }
    matches = ALL_NAMES.filter(n => norm(n).includes(q)).slice(0, 8);
    // Nothing to add if the only match is exactly what's typed already
    if (!matches.length || (matches.length === 1 && norm(matches[0]) === q)) { hide(); return; }
    active = -1;
    list.innerHTML = "";
    matches.forEach((name, i) => {
      const li = document.createElement("li");
      li.textContent = name;
      li.setAttribute("role", "option");
      // mousedown fires before the input's blur, so taps always register
      li.addEventListener("mousedown", (e) => { e.preventDefault(); pick(name); });
      list.appendChild(li);
    });
    list.hidden = false;
  }

  function highlight(i) {
    active = i;
    [...list.children].forEach((li, j) => li.classList.toggle("is-active", j === i));
  }

  input.addEventListener("input", render);
  input.addEventListener("focus", render);
  input.addEventListener("blur", () => setTimeout(hide, 150));
  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    if (e.key === "ArrowDown") { e.preventDefault(); highlight(Math.min(active + 1, matches.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlight(Math.max(active - 1, 0)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(matches[active]); }
    else if (e.key === "Escape") { hide(); }
  });
})();

function findGuest(name, password) {
  if (typeof GUEST_LIST === "undefined") return null;
  // Password disambiguates guests who share a name.
  return GUEST_LIST.find(g => norm(g.name) === norm(name) && norm(g.password) === norm(password)) || null;
}

function currentGuest() {
  try {
    const saved = JSON.parse(store.get(AUTH_KEY) || "null");
    return saved ? findGuest(saved.name, saved.password) : null;
  } catch { return null; }
}

function setLocked(locked) {
  if (gate) gate.hidden = !locked;
  document.body.classList.toggle("is-locked", locked);
}

function applyGuest(guest) {
  const nameEl   = document.getElementById("rsvp-guest-name");
  const inviteEl = document.getElementById("rsvp-guest-invite");
  if (nameEl) nameEl.textContent = guest.name;
  if (inviteEl) {
    inviteEl.textContent = guest.invite === "evening"
      ? "You're invited to the evening celebration. Join us from 6:00 pm for the cake, first dance and ceilidh."
      : "You're invited to the whole day. Join us from 1:00 pm for the ceremony.";
  }
}

function applyPreview() {
  const nameEl   = document.getElementById("rsvp-guest-name");
  const inviteEl = document.getElementById("rsvp-guest-invite");
  if (nameEl) nameEl.textContent = "Preview mode";
  if (inviteEl) inviteEl.textContent = "You're browsing without signing in. Sign in with your invitation details to send an RSVP.";
}

function enterPreview() {
  store.sset("alfie-lorna-preview", "1");
  setLocked(false);
  const guest = currentGuest();
  if (guest) applyGuest(guest); else applyPreview();
}

(function initGate() {
  if (!gate) return;
  const guest = currentGuest();
  const wantsPreview = store.sget("alfie-lorna-preview") || /[?#]preview/.test(window.location.href);
  if (guest) { setLocked(false); applyGuest(guest); }
  else if (wantsPreview) { setLocked(false); applyPreview(); }
  else setLocked(true);

  const previewBtn = document.getElementById("gate-preview");
  if (previewBtn) previewBtn.addEventListener("click", enterPreview);

  gateForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const guest = findGuest(gateName.value, gatePass.value);
    if (!guest) {
      const nameKnown = typeof GUEST_LIST !== "undefined" && GUEST_LIST.some(g => norm(g.name) === norm(gateName.value));
      gateError.textContent = nameKnown
        ? "That password doesn't match. It's on your invitation, so do check the spelling."
        : "We can't find that name on the guest list. Try it exactly as it appears on your invitation.";
      gateError.hidden = false;
      return;
    }
    gateError.hidden = true;
    store.set(AUTH_KEY, JSON.stringify({ name: guest.name, password: guest.password }));
    setLocked(false);
    applyGuest(guest);
  });

  const switchLink = document.getElementById("rsvp-switch");
  if (switchLink) {
    switchLink.addEventListener("click", (e) => {
      e.preventDefault();
      store.del(AUTH_KEY);
      store.sdel("alfie-lorna-preview");
      gateForm.reset();
      gateError.hidden = true;
      setLocked(true);
      window.scrollTo({ top: 0 });
    });
  }
})();

/* ---------- Intro fade ---------- */
window.addEventListener("load", () => {
  const intro = document.getElementById("intro");
  if (!intro) return;
  setTimeout(() => intro.classList.add("is-done"), 3500);
});

/* ---------- Sticky nav style on scroll ---------- */
const nav = document.getElementById("topnav");
const onScroll = () => {
  if (window.scrollY > 60) nav.classList.add("scrolled");
  else nav.classList.remove("scrolled");
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Mobile nav: open / close, tap-off, Esc, scroll ---------- */
const navToggle   = document.getElementById("nav-toggle");
const navMenu     = document.getElementById("nav-menu");
const navBackdrop = document.getElementById("nav-backdrop");

if (navToggle && navMenu) {
  const isOpen = () => navMenu.classList.contains("is-open");
  const setNav = (open) => {
    navMenu.classList.toggle("is-open", open);
    navToggle.classList.toggle("is-open", open);
    if (navBackdrop) navBackdrop.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  const closeNav = () => setNav(false);

  navToggle.addEventListener("click", (e) => {
    e.stopPropagation();          // don't let the outside-click handler see this
    setNav(!isOpen());
  });

  // Choosing a link closes the menu
  navMenu.querySelectorAll("a").forEach(a => a.addEventListener("click", closeNav));

  // Tapping the scrim — or anywhere outside the menu — closes it
  if (navBackdrop) navBackdrop.addEventListener("click", closeNav);
  document.addEventListener("click", (e) => {
    if (isOpen() && !navMenu.contains(e.target) && !navToggle.contains(e.target)) closeNav();
  });

  // Escape key, or scrolling the page, also closes it
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeNav(); });
  window.addEventListener("scroll", () => { if (isOpen()) closeNav(); }, { passive: true });
}

/* ---------- Rail collapse toggle ---------- */
const rail = document.getElementById("rail");
const railToggle = document.getElementById("rail-toggle");
if (rail && railToggle) {
  railToggle.addEventListener("click", () => {
    const collapsed = rail.classList.toggle("is-collapsed");
    document.body.classList.toggle("rail-collapsed", collapsed);
    railToggle.setAttribute("aria-expanded", String(!collapsed));
  });
}

/* ---------- Scroll reveal ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("is-visible");
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

document.querySelectorAll(".reveal").forEach(el => io.observe(el));

/* Stagger nested reveals inside grids */
document.querySelectorAll(".timeline, .schedule, .venue-grid, .travel-grid, .stay-grid, .things-grid, .gallery, .faq, .dress-grid").forEach(group => {
  const items = group.querySelectorAll(".reveal");
  items.forEach((el, i) => { el.style.transitionDelay = `${i * 80}ms`; });
});

/* ---------- Countdown ---------- */
const CD_DAY  = 86_400_000;
const CD_HOUR =  3_600_000;
const CD_MIN  =     60_000;
const CD_SEC  =      1_000;

const cdEls = {
  days:    document.querySelectorAll('[data-cd="days"]'),
  hours:   document.querySelectorAll('[data-cd="hours"]'),
  minutes: document.querySelectorAll('[data-cd="minutes"]'),
  seconds: document.querySelectorAll('[data-cd="seconds"]'),
};

function paint(key, val) {
  // Days never gets leading-zero padded — we want "10", not "010"-looking glyphs.
  const text = key === "days" ? String(val) : String(val).padStart(2, "0");
  cdEls[key].forEach(el => { if (el.textContent !== text) el.textContent = text; });
}

function updateCountdown() {
  const diff = Math.max(0, WEDDING_MS - Date.now());
  // All four units use floor on the raw ms diff so they sum to the actual time left.
  const days    = Math.floor(diff / CD_DAY);
  const hours   = Math.floor((diff % CD_DAY)  / CD_HOUR);
  const minutes = Math.floor((diff % CD_HOUR) / CD_MIN);
  const seconds = Math.floor((diff % CD_MIN)  / CD_SEC);
  paint("days", days);
  paint("hours", hours);
  paint("minutes", minutes);
  paint("seconds", seconds);
}

// Tick aligned to the next whole second so it never drifts and never skips.
function scheduleTick() {
  updateCountdown();
  const delay = CD_SEC - (Date.now() % CD_SEC);
  setTimeout(scheduleTick, delay);
}
scheduleTick();
// Re-sync on tab focus (setTimeout chains throttle when the tab is hidden).
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updateCountdown();
});

/* ---------- Parallax wildlife ---------- */
const heroFox  = document.querySelector(".wl-fox");
const branchTL = document.querySelector(".branch-tl");
const branchBR = document.querySelector(".branch-br");
const onParallax = () => {
  const y = window.scrollY;
  if (y > window.innerHeight) return; // only while hero in view
  if (heroFox)  heroFox.style.transform  = `translateY(${y * 0.15}px)`;
  if (branchTL) branchTL.style.transform = `translate(${-y * 0.05}px, ${y * 0.08}px)`;
  if (branchBR) branchBR.style.transform = `scale(-1, 1) translate(${y * 0.05}px, ${-y * 0.08}px)`;
};
window.addEventListener("scroll", onParallax, { passive: true });

/* ---------- RSVP form ---------- */
const rsvpForm   = document.getElementById("rsvp-form");
const rsvpStatus = document.getElementById("rsvp-status");

if (rsvpForm) {
  rsvpForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Only guests on the list (i.e. logged in) can RSVP.
    const guest = currentGuest();
    if (!guest) {
      rsvpStatus.textContent = "Please sign in with your invitation details to RSVP.";
      rsvpStatus.hidden = false;
      store.sdel("alfie-lorna-preview");
      setLocked(true);
      return;
    }

    const data = Object.fromEntries(new FormData(rsvpForm).entries());
    data.name = guest.name;
    data.invite = guest.invite;
    data.submittedAt = new Date().toISOString();

    const all = readRsvps();
    // Password in the key keeps two guests with the same name separate.
    const key = `${norm(guest.name)}|${guest.password}`;
    all[key] = data;
    store.set(RSVP_KEY, JSON.stringify(all));

    if (REMOTE_ENDPOINT) {
      try {
        await fetch(REMOTE_ENDPOINT, {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn("RSVP remote send failed — saved locally only.", err);
      }
    }

    rsvpStatus.textContent = data.attending === "yes"
      ? "Thank you, we can't wait to see you in May."
      : "Thank you for letting us know. You'll be missed.";
    rsvpStatus.hidden = false;
    rsvpStatus.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function readRsvps() {
  try { return JSON.parse(store.get(RSVP_KEY) || "{}"); }
  catch { return {}; }
}

window.alfieLornaExport = function () {
  const blob = new Blob([JSON.stringify(readRsvps(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alfie-lorna-rsvps-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ---------- Venue map zoom buttons ---------- */
(function initMapZoom() {
  const frame = document.getElementById("venue-map-frame");
  const zin  = document.getElementById("map-zoom-in");
  const zout = document.getElementById("map-zoom-out");
  if (!frame || !zin || !zout) return;
  let zoom = 13;
  function setZoom(z) {
    zoom = Math.max(6, Math.min(18, z));
    frame.src = `https://www.google.com/maps?q=Glen+Fruin+Helensburgh+G84+9EE&z=${zoom}&output=embed`;
  }
  zin.addEventListener("click", () => setZoom(zoom + 1));
  zout.addEventListener("click", () => setZoom(zoom - 1));
})();

/* ---------- Info dropdown in the nav ---------- */
(function initNavDropdown() {
  const btn  = document.getElementById("nav-drop-btn");
  const menu = document.getElementById("nav-drop-menu");
  if (!btn || !menu) return;
  const li = btn.closest("li");
  const setOpen = (o) => {
    li.classList.toggle("open", o);
    menu.hidden = !o;
    btn.setAttribute("aria-expanded", String(o));
  };
  btn.addEventListener("click", (e) => { e.stopPropagation(); setOpen(menu.hidden); });
  document.addEventListener("click", (e) => { if (!li.contains(e.target)) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
})();

/* ---------- Gallery: render photos + lightbox ---------- */
(function initGallery() {
  const grid = document.getElementById("gallery-grid");
  if (!grid || typeof GALLERY_PHOTOS === "undefined") return;

  const empty = document.getElementById("gallery-empty");
  if (!GALLERY_PHOTOS.length) { if (empty) empty.hidden = false; return; }

  GALLERY_PHOTOS.forEach((photo, i) => {
    const fig = document.createElement("figure");
    fig.className = "gal-item reveal";
    fig.style.setProperty("--i", i + 1);

    const img = document.createElement("img");
    img.src = photo.src;
    img.alt = photo.caption || "Alfie and Lorna";
    img.loading = "lazy";
    // Portrait shots span two rows so nothing is squashed or cropped oddly.
    img.addEventListener("load", () => {
      if (img.naturalHeight > img.naturalWidth * 1.15) fig.classList.add("is-tall");
    });
    fig.appendChild(img);

    if (photo.caption) {
      const cap = document.createElement("figcaption");
      cap.textContent = photo.caption;
      fig.appendChild(cap);
    }
    fig.addEventListener("click", () => openLightbox(i));
    grid.appendChild(fig);
  });

  // Reveal the freshly-built items (the observer already ran on page load)
  grid.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i, 8) * 70}ms`;
    requestAnimationFrame(() => el.classList.add("is-visible"));
  });

  const box     = document.getElementById("lightbox");
  const lbImg   = document.getElementById("lb-img");
  const lbCap   = document.getElementById("lb-caption");
  let current = 0;

  function openLightbox(i) {
    current = i;
    show();
    box.hidden = false;
    document.body.classList.add("lb-open");
  }
  function show() {
    const p = GALLERY_PHOTOS[current];
    lbImg.src = p.src;
    lbImg.alt = p.caption || "Alfie and Lorna";
    lbCap.textContent = p.caption || "";
  }
  const step = (n) => { current = (current + n + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length; show(); };
  const close = () => { box.hidden = true; document.body.classList.remove("lb-open"); };

  document.getElementById("lb-close").addEventListener("click", close);
  document.getElementById("lb-prev").addEventListener("click", (e) => { e.stopPropagation(); step(-1); });
  document.getElementById("lb-next").addEventListener("click", (e) => { e.stopPropagation(); step(1); });
  box.addEventListener("click", (e) => { if (e.target === box || e.target === lbImg) close(); });
  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });
})();
