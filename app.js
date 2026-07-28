/* =========================================================
   Alfie & Lorna — interactions, animations, RSVP
   ========================================================= */

// Saturday 15 May 2027, 13:30 BST (UTC+1) — ceremony start at Fruin Farm
const WEDDING_DATE = new Date("2027-05-15T13:30:00+01:00");
const WEDDING_MS = WEDDING_DATE.getTime();
const RSVP_KEY = "alfie-lorna-rsvp";
const AUTH_KEY = "alfie-lorna-auth";
const REMOTE_ENDPOINT = ""; // Formspree / Netlify / Apps Script URL when ready

/* ---------- Site login gate ----------
   One shared password (SITE_PASSWORD in guests.js) unlocks the site.
   The session is remembered on the device until "Sign out" is used. */
const gate      = document.getElementById("gate");
const gateForm  = document.getElementById("gate-form");
const gatePass  = document.getElementById("gate-pass");
const gateError = document.getElementById("gate-error");

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

/* Storage that can never throw. Some browsers block localStorage and
   sessionStorage outright; the site must still work, it just won't
   remember the login between visits. */
const store = {
  get:  (k) => { try { return localStorage.getItem(k); }    catch { return null; } },
  set:  (k, v) => { try { localStorage.setItem(k, v); }     catch {} },
  del:  (k) => { try { localStorage.removeItem(k); }        catch {} },
  sget: (k) => { try { return sessionStorage.getItem(k); }  catch { return null; } },
  sset: (k, v) => { try { sessionStorage.setItem(k, v); }   catch {} },
  sdel: (k) => { try { sessionStorage.removeItem(k); }      catch {} },
};

const ALL_NAMES = (typeof GUEST_LIST !== "undefined")
  ? [...new Set(GUEST_LIST.map(g => g.name))].sort()
  : [];

function findGuest(name) {
  if (typeof GUEST_LIST === "undefined") return null;
  return GUEST_LIST.find(g => norm(g.name) === norm(name)) || null;
}

function isUnlocked() {
  return norm(store.get(AUTH_KEY)) === norm(typeof SITE_PASSWORD !== "undefined" ? SITE_PASSWORD : "");
}

function setLocked(locked) {
  if (gate) gate.hidden = !locked;
  document.body.classList.toggle("is-locked", locked);
}

(function initGate() {
  if (!gate) return;
  const wantsPreview = store.sget("alfie-lorna-preview") || /[?#]preview/.test(window.location.href);
  setLocked(!(isUnlocked() || wantsPreview));

  const previewBtn = document.getElementById("gate-preview");
  if (previewBtn) {
    previewBtn.addEventListener("click", () => {
      store.sset("alfie-lorna-preview", "1");
      setLocked(false);
    });
  }

  gateForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const given = norm(gatePass.value);
    const want  = norm(typeof SITE_PASSWORD !== "undefined" ? SITE_PASSWORD : "");
    if (!want || given !== want) {
      gateError.textContent = "That password doesn't match the one on your invitation. Do check the spelling.";
      gateError.hidden = false;
      return;
    }
    gateError.hidden = true;
    store.set(AUTH_KEY, gatePass.value.trim());
    setLocked(false);
  });
})();

/* ---------- RSVP name picker ----------
   Only people on the guest list can reply. Typing filters the list;
   choosing a name shows whether they are a day or evening guest. */
let rsvpGuest = null;

(function initRsvpName() {
  const input = document.getElementById("rsvp-name");
  const list  = document.getElementById("rsvp-suggest");
  const note  = document.getElementById("rsvp-guest-invite");
  if (!input || !list) return;

  let matches = [];
  let active = -1;
  const hide = () => { list.hidden = true; list.innerHTML = ""; active = -1; };

  function choose(name) {
    input.value = name;
    rsvpGuest = findGuest(name);
    hide();
    if (note && rsvpGuest) {
      note.textContent = rsvpGuest.invite === "evening"
        ? "You're invited to the evening celebration. Join us from 6:00 pm for the cake, first dance and ceilidh."
        : "You're invited to the whole day. Join us from 1:00 pm for the ceremony.";
      note.classList.add("is-found");
    }
  }

  function render() {
    const q = norm(input.value);
    rsvpGuest = findGuest(input.value);
    if (note && !rsvpGuest) {
      note.textContent = "Start typing your name and pick it from the suggestions so we know who's replying.";
      note.classList.remove("is-found");
    }
    // Don't reveal the guest list: let people type most of their name
    // before we suggest anything, and only surface names that genuinely
    // match what they've typed (from the start of a first name or surname),
    // so typing a first name recommends the full name (surname included).
    matches = ALL_NAMES.filter(n => {
      const full = norm(n);
      return full.startsWith(q) || full.split(" ").some(w => w.startsWith(q));
    }).slice(0, 6);
    // Wait until they've typed enough that only a few relevant names remain.
    const enoughTyped = q.length >= 4;
    const narrowedDown = matches.length > 0 && matches.length <= 4;
    if (!enoughTyped || !narrowedDown) { hide(); return; }
    if (matches.length === 1 && norm(matches[0]) === q) { hide(); return; }
    active = -1;
    list.innerHTML = "";
    matches.forEach(name => {
      const li = document.createElement("li");
      li.textContent = name;
      li.setAttribute("role", "option");
      li.addEventListener("mousedown", (e) => { e.preventDefault(); choose(name); });
      list.appendChild(li);
    });
    list.hidden = false;
  }

  const highlight = (i) => {
    active = i;
    [...list.children].forEach((li, j) => li.classList.toggle("is-active", j === i));
  };

  input.addEventListener("input", render);
  input.addEventListener("focus", render);
  input.addEventListener("blur", () => setTimeout(() => { hide(); render(); }, 150));
  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    if (e.key === "ArrowDown") { e.preventDefault(); highlight(Math.min(active + 1, matches.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlight(Math.max(active - 1, 0)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(matches[active]); }
    else if (e.key === "Escape") hide();
  });
})();

/* ---------- RSVP accept / decline ----------
   Decline just puts a red outline on the frame. Accept lights the frame
   green and launches a canvas comet that circles the frame once, shedding
   green sparks, with a light green spark shower over the page. */
let rsvpFxRun = 0;

function launchAcceptFireworks(frame) {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const myRun = ++rsvpFxRun;
  document.querySelectorAll(".rsvp-fx-canvas").forEach((c) => c.remove());

  const canvas = document.createElement("canvas");
  canvas.className = "rsvp-fx-canvas";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  const resize = () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const greens = ["#2fae57", "#5ed67e", "#a8f0b6", "#e2ffe9"];
  const particles = [];
  const addSpark = (x, y, o) => {
    o = o || {};
    particles.push({
      x, y,
      vx: o.vx != null ? o.vx : (Math.random() - 0.5) * 3,
      vy: o.vy != null ? o.vy : (Math.random() - 0.5) * 3,
      g: o.g != null ? o.g : 0.06,
      size: o.size != null ? o.size : 1.4 + Math.random() * 2,
      life: 1,
      decay: o.decay != null ? o.decay : 0.012 + Math.random() * 0.02,
      color: greens[(Math.random() * greens.length) | 0],
    });
  };

  // Rectangle perimeter geometry (viewport coords, matches the fixed canvas)
  const rect = frame.getBoundingClientRect();
  const L = rect.left, T = rect.top, Wd = rect.width, Hd = rect.height;
  const per = 2 * (Wd + Hd);
  const pointAt = (d) => {
    if (d < Wd) return [L + d, T];
    d -= Wd;
    if (d < Hd) return [L + Wd, T + d];
    d -= Hd;
    if (d < Wd) return [L + Wd - d, T + Hd];
    d -= Wd;
    return [L, T + Hd - d];
  };

  const cometDur = 2400;              // one lap around the border
  const rainUntil = cometDur + 1100;  // keep raining a little after the lap
  let start = null, emitAcc = 0, rainAcc = 0;

  const step = (ts) => {
    if (myRun !== rsvpFxRun) { window.removeEventListener("resize", resize); canvas.remove(); return; }
    if (start == null) start = ts;
    const t = ts - start;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    // Comet head + trail sparks
    const prog = t / cometDur;
    if (prog < 1) {
      const [cx, cy] = pointAt(prog * per);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 15);
      grd.addColorStop(0, "rgba(226,255,233,0.95)");
      grd.addColorStop(0.4, "rgba(94,214,126,0.6)");
      grd.addColorStop(1, "rgba(47,174,87,0)");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();
      emitAcc += 16;
      while (emitAcc > 18) {
        emitAcc -= 18;
        addSpark(cx, cy, {
          vx: (Math.random() - 0.5) * 3.8,
          vy: (Math.random() - 0.5) * 3.8 - 0.4,
          g: 0.08, size: 1.4 + Math.random() * 2.2, decay: 0.014 + Math.random() * 0.02,
        });
      }
    }

    // Page-wide falling sparks
    if (t < rainUntil) {
      rainAcc += 16;
      while (rainAcc > 42) {
        rainAcc -= 42;
        addSpark(Math.random() * W, -8, {
          vx: (Math.random() - 0.5) * 1.2, vy: 1 + Math.random() * 2,
          g: 0.05, size: 1.4 + Math.random() * 2.4, decay: 0.005 + Math.random() * 0.008,
        });
      }
    }

    // Update + draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.life <= 0 || p.y > H + 24) { particles.splice(i, 1); continue; }
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = p.life * 0.45;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    if (t > rainUntil && particles.length === 0) {
      window.removeEventListener("resize", resize);
      canvas.remove();
      return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- Story light: sheds a few small sparks that fall down the page ----------
   Reads the travelling SVG light's live screen position each frame and spawns
   small, low-key sparks that drift down and fade. Runs only while the timeline
   is on screen. */
(function initStoryLightSparks() {
  const svg = document.querySelector(".story-svg");
  const light = document.getElementById("tl-light");
  if (!svg || !light) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "story-spark-canvas";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  const resize = () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const parts = [];
  let raf = null, active = false, emitAcc = 0;
  const step = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    const r = light.getBoundingClientRect();
    const lx = r.left + r.width / 2, ly = r.top + r.height / 2;
    if (active && ly > -20 && ly < H + 20) {
      emitAcc += 1;
      if (emitAcc >= 9) { // low-key: only occasionally
        emitAcc = 0;
        parts.push({
          x: lx + (Math.random() - 0.5) * 6,
          y: ly + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 0.3 + Math.random() * 0.8,
          g: 0.03,
          size: 0.9 + Math.random() * 1.5,
          life: 1,
          decay: 0.005 + Math.random() * 0.007,
        });
      }
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.life <= 0 || p.y > H + 20) { parts.splice(i, 1); continue; }
      ctx.fillStyle = "#ffe9a8";
      ctx.globalAlpha = Math.max(p.life, 0) * 0.9;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = Math.max(p.life, 0) * 0.3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    if (active || parts.length) { raf = requestAnimationFrame(step); }
    else { raf = null; }
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      active = e.isIntersecting;
      if (active && !raf) raf = requestAnimationFrame(step);
    });
  }, { threshold: 0 });
  io.observe(svg);
})();

(function initRsvpFx() {
  const frame = document.querySelector(".rsvp-frame");
  if (!frame) return;
  const radios = document.querySelectorAll('input[name="attending"]');
  radios.forEach((r) => {
    r.addEventListener("change", () => {
      frame.classList.remove("is-accepted", "is-declined");
      void frame.offsetWidth; // reflow so the state restarts each time
      const accepted = r.value === "yes";
      frame.classList.add(accepted ? "is-accepted" : "is-declined");
      if (accepted) launchAcceptFireworks(frame);
    });
  });
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

    // Only people on the guest list can reply.
    const nameInput = document.getElementById("rsvp-name");
    const guest = rsvpGuest || findGuest(nameInput ? nameInput.value : "");
    if (!guest) {
      rsvpStatus.textContent = nameInput && nameInput.value.trim()
        ? "We can't find that name on our guest list. Please choose your name from the suggestions, or email us and we'll sort it out."
        : "Please choose your name from the list first so we know who's replying.";
      rsvpStatus.hidden = false;
      rsvpStatus.scrollIntoView({ behavior: "smooth", block: "center" });
      if (nameInput) nameInput.focus();
      return;
    }

    const data = Object.fromEntries(new FormData(rsvpForm).entries());
    data.name = guest.name;
    data.invite = guest.invite;
    data.submittedAt = new Date().toISOString();

    const all = readRsvps();
    const key = norm(guest.name);
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

  let savedScroll = 0;

  function openLightbox(i) {
    current = i;
    show();
    box.hidden = false;
    // Freeze the page without losing the reader's place. Setting overflow
    // hidden alone makes some mobile browsers jump back to the top, which
    // feels like being thrown somewhere else on the site.
    savedScroll = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = `-${savedScroll}px`;
    document.body.classList.add("lb-open");
  }
  function show() {
    const p = GALLERY_PHOTOS[current];
    lbImg.src = p.src;
    lbImg.alt = p.caption || "Alfie and Lorna";
    lbCap.textContent = p.caption || "";
  }
  const step = (n) => { current = (current + n + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length; show(); };
  const close = () => {
    box.hidden = true;
    document.body.classList.remove("lb-open");
    document.body.style.top = "";
    // Restore instantly; smooth scrolling here would look like a jump.
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, savedScroll);
    document.documentElement.style.scrollBehavior = prev;
  };

  document.getElementById("lb-close").addEventListener("click", close);
  document.getElementById("lb-prev").addEventListener("click", (e) => { e.stopPropagation(); step(-1); });
  document.getElementById("lb-next").addEventListener("click", (e) => { e.stopPropagation(); step(1); });
  box.addEventListener("click", (e) => { if (e.target === box) close(); });
  lbImg.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });
})();
