/* =========================================================
   Alfie & Lorna — interactions, animations, RSVP
   ========================================================= */

// Saturday 15 May 2027, 14:00 BST (UTC+1) — ceremony start at Fruin Farm
const WEDDING_DATE = new Date("2027-05-15T14:00:00+01:00");
const WEDDING_MS = WEDDING_DATE.getTime();
const RSVP_KEY = "alfie-lorna-rsvp";
const REMOTE_ENDPOINT = ""; // Formspree / Netlify / Apps Script URL when ready

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

/* ---------- Mobile nav toggle ---------- */
const navToggle = document.getElementById("nav-toggle");
const navMenu   = document.getElementById("nav-menu");
if (navToggle) {
  navToggle.addEventListener("click", () => {
    const open = navMenu.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  });
  navMenu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    navMenu.classList.remove("is-open");
    navToggle.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }));
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
    const data = Object.fromEntries(new FormData(rsvpForm).entries());
    data.submittedAt = new Date().toISOString();

    const all = readRsvps();
    const key = (data["rsvp-name"] || "guest").toLowerCase().trim();
    all[key] = data;
    localStorage.setItem(RSVP_KEY, JSON.stringify(all));

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
      ? "Thank you — we can't wait to see you in May."
      : "Thank you for letting us know. You'll be missed.";
    rsvpStatus.hidden = false;
    rsvpStatus.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function readRsvps() {
  try { return JSON.parse(localStorage.getItem(RSVP_KEY) || "{}"); }
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
