/* =========================================================
   Alfie & Lorna — interactions, animations, RSVP
   ========================================================= */

// Saturday 15 May 2027, 13:30 BST (UTC+1) — ceremony start at Fruin Farm
const WEDDING_DATE = new Date("2027-05-15T13:30:00+01:00");
const WEDDING_MS = WEDDING_DATE.getTime();
const RSVP_KEY = "alfie-lorna-rsvp";
const AUTH_KEY = "alfie-lorna-auth";
const REMOTE_ENDPOINT = "https://alflorna-rsvp.ad5046.workers.dev/rsvp"; // RSVPs go to our Cloudflare Worker + admin dashboard

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
  // The password is the only way in — no preview bypass.
  setLocked(!isUnlocked());

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

/* ---------- Story timeline light ----------
   A canvas engine drawn over the story SVG. Two lights leave the photos,
   travel down the join lines and MEET on the main trail; they merge into one
   slightly larger light that drifts slowly all the way to the "Us" photo,
   shedding small sparks that fall down the page. On arrival the photo border
   lights up low-key in the same warm colour. Loops. No SVG blur filter, so the
   photo stays sharp. */
(function initStoryLight() {
  const svg = document.querySelector(".story-svg");
  if (!svg) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const SVGNS = "http://www.w3.org/2000/svg";
  const mkPath = (d) => {
    const p = document.createElementNS(SVGNS, "path");
    p.setAttribute("d", d); p.setAttribute("fill", "none"); p.setAttribute("stroke", "none");
    svg.appendChild(p); // attached + invisible so getPointAtLength is reliable
    return p;
  };
  const pJoinA = mkPath("M80 166 C84 196 104 224 110 252");
  const pJoinL = mkPath("M235 166 C222 200 154 216 118 250");
  const pMain = mkPath("M118 246 C112 258 110 263 110 270 C140 262 170 262 200 270 C250 281 450 259 500 270 C550 281 750 259 800 270 C818 274 834 272 845 270 A55 55 0 0 1 900 325 V415 A55 55 0 0 1 845 470 C834 472 818 476 800 470 C750 459 550 481 500 470 C450 459 250 481 200 470 C182 466 166 468 155 470 A55 55 0 0 0 100 525 V615 A55 55 0 0 0 155 670 C175 664 185 665 200 670 C250 680 450 660 500 670 C550 680 760 662 810 670 C832 673 856 671 880 670 C948 670 956 738 880 762 C790 790 600 782 528 760");
  const lenA = pJoinA.getTotalLength(), lenL = pJoinL.getTotalLength(), lenM = pMain.getTotalLength();
  const IMG = { cx: 500, cy: 898, r: 145 };

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

  // Phase timings (ms) — slow
  const P1 = 3500;    // two lights travel to the meeting point
  const P2 = 19000;   // merged light drifts the whole trail (slow)
  const ARR = 2800;   // arrival border glow
  const GAP = 2600;   // pause before looping
  const CYCLE = P1 + P2 + ARR + GAP;

  const parts = [];
  let raf = null, active = false, t0 = null;

  const drawLight = (x, y, glow, coreAlpha) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, glow);
    g.addColorStop(0, "rgba(255,255,255," + (0.9 * coreAlpha) + ")");
    g.addColorStop(0.3, "rgba(255,231,154," + (0.5 * coreAlpha) + ")");
    g.addColorStop(1, "rgba(255,215,120,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, glow, 0, Math.PI * 2); ctx.fill();
  };

  const emit = (x, y, rate) => {
    if (Math.random() < rate) {
      parts.push({
        x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 0.5, vy: 0.25 + Math.random() * 0.8,
        g: 0.03, size: 0.9 + Math.random() * 1.5, life: 1,
        decay: 0.005 + Math.random() * 0.007,
      });
    }
  };

  const step = (ts) => {
    if (t0 == null) t0 = ts;
    let t = (ts - t0) % CYCLE;
    const r = svg.getBoundingClientRect();
    const s = r.width / 1000;               // uniform scale of the SVG
    const SX = (x) => r.left + x * s, SY = (y) => r.top + y * s;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    if (t < P1) {
      // two lights heading to the meeting point
      const u = t / P1;
      const a = pJoinA.getPointAtLength(u * lenA);
      const l = pJoinL.getPointAtLength(u * lenL);
      const ax = SX(a.x), ay = SY(a.y), lx = SX(l.x), ly = SY(l.y);
      drawLight(ax, ay, 13, 1); drawLight(lx, ly, 13, 1);
      if (active) { emit(ax, ay, 0.28); emit(lx, ly, 0.28); }
    } else if (t < P1 + P2) {
      // merged, slightly larger light drifting the whole trail
      const u = (t - P1) / P2;
      const grow = Math.min(u / 0.05, 1);   // grows in over the first bit
      const glow = 15 + 5 * grow;
      const m = pMain.getPointAtLength(u * lenM);
      const mx = SX(m.x), my = SY(m.y);
      drawLight(mx, my, glow, 1);
      if (active) emit(mx, my, 0.5);         // a few more sparks
    } else if (t < P1 + P2 + ARR) {
      // arrival: low-key border glow around the "Us" photo
      const at = (t - P1 - P2) / ARR;
      const a = Math.sin(Math.min(at, 1) * Math.PI); // 0→1→0
      const cx = SX(IMG.cx), cy = SY(IMG.cy), rr = IMG.r * s;
      ctx.strokeStyle = "#ffe6a0";
      ctx.lineWidth = 3;
      ctx.globalAlpha = a * 0.30;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 11;
      ctx.globalAlpha = a * 0.12;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // update + draw falling sparks
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
      if (e.isIntersecting && !active) { active = true; t0 = null; if (!raf) raf = requestAnimationFrame(step); }
      else if (!e.isIntersecting) { active = false; }
    });
  }, { threshold: 0 });
  io.observe(svg);

  // ----- Click controls: names restart the spark; a date resumes from there -----
  const seek = (targetT) => {
    t0 = performance.now() - targetT;
    active = true;
    if (!raf) raf = requestAnimationFrame(step);
  };
  const nearestFrac = (px, py) => {
    let best = 0, bestD = Infinity;
    const N = 260;
    for (let i = 0; i <= N; i++) {
      const q = pMain.getPointAtLength((i / N) * lenM);
      const d = (q.x - px) ** 2 + (q.y - py) ** 2;
      if (d < bestD) { bestD = d; best = i / N; }
    }
    return best;
  };
  const nodes = [...svg.querySelectorAll(".tl-node")];
  nodes.forEach((node, i) => {
    const rect = node.querySelector("rect");
    const dot = node.querySelector('circle[r="7"]');
    if (rect && dot) {
      // a date node → resume the spark from this point on the trail
      const frac = nearestFrac(+dot.getAttribute("cx"), +dot.getAttribute("cy"));
      node.style.cursor = "pointer";
      node.addEventListener("click", () => seek(P1 + frac * P2));
    } else if (i < 2) {
      // Alfie / Lorna photo → restart the whole animation
      node.style.cursor = "pointer";
      node.addEventListener("click", () => seek(0));
    }
  });
})();

/* ---------- Story timeline light (mobile vertical) ----------
   Same look and speed as desktop but following the mobile layout: two lights
   leave the photos, meet where the snake starts, then one light travels the
   snake down to the "Us" photo, shedding sparks; the border lights up on
   arrival. Runs only while the mobile timeline is on screen. */
(function initStoryLightMobile() {
  const list = document.querySelector(".sv-list");
  const wrap = document.querySelector(".sv-listwrap");
  const snakePath = document.querySelector(".sv-snake path");
  if (!list || !wrap || !snakePath) return;

  // Draw the snaking dashed line THROUGH every dot (dots alternate 42%/58%).
  const svg = snakePath.parentNode;
  let svW = 0, svH = 0;
  let dotFracs = []; // path fraction of each milestone dot (for click-to-resume)
  const buildSnake = () => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    svW = w; svH = h;
    const lis = list.querySelectorAll("li");
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const pts = [[w / 2, 0]];
    lis.forEach((li, i) => {
      pts.push([((i % 2 === 0) ? 0.42 : 0.58) * w, li.offsetTop + 0.5 * rootFont + 7.5]);
    });
    pts.push([w / 2, h]);
    let d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
    for (let i = 1; i < pts.length; i++) {
      const my = ((pts[i - 1][1] + pts[i][1]) / 2).toFixed(1);
      d += " C" + pts[i - 1][0].toFixed(1) + " " + my + " " + pts[i][0].toFixed(1) + " " + my +
           " " + pts[i][0].toFixed(1) + " " + pts[i][1].toFixed(1);
    }
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    snakePath.setAttribute("d", d);
    // fraction of the path nearest each dot (skip the start/end helper points)
    const total = snakePath.getTotalLength();
    dotFracs = pts.slice(1, pts.length - 1).map(([px, py]) => {
      let best = 0, bestD = Infinity;
      const N = 160;
      for (let i = 0; i <= N; i++) {
        const q = snakePath.getPointAtLength((i / N) * total);
        const dd = (q.x - px) ** 2 + (q.y - py) ** 2;
        if (dd < bestD) { bestD = dd; best = i / N; }
      }
      return best;
    });
  };
  buildSnake();
  window.addEventListener("resize", buildSnake);
  window.addEventListener("load", buildSnake);

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

  const P1 = 3500, P2 = 19000, ARR = 2800, GAP = 2600, CYCLE = P1 + P2 + ARR + GAP;
  const parts = [];
  let raf = null, active = false, t0 = null;

  const drawLight = (x, y, glow, ca) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, glow);
    g.addColorStop(0, "rgba(255,255,255," + (0.9 * ca) + ")");
    g.addColorStop(0.3, "rgba(255,231,154," + (0.5 * ca) + ")");
    g.addColorStop(1, "rgba(255,215,120,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, glow, 0, Math.PI * 2); ctx.fill();
  };
  const emit = (x, y, rate) => {
    if (Math.random() < rate) parts.push({
      x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 0.5, vy: 0.25 + Math.random() * 0.8,
      g: 0.03, size: 0.9 + Math.random() * 1.5, life: 1, decay: 0.005 + Math.random() * 0.007,
    });
  };

  const step = (ts) => {
    if (t0 == null) t0 = ts;
    const t = (ts - t0) % CYCLE;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    if (t < P1) {
      // ride along the two branch lines down to their meeting point
      const branchSvg = document.querySelector(".sv-branches");
      const branchPaths = branchSvg ? branchSvg.querySelectorAll("path") : [];
      if (branchPaths.length >= 2) {
        const br = branchSvg.getBoundingClientRect();
        const u = t / P1;
        branchPaths.forEach((bp) => {
          const p = bp.getPointAtLength(u * bp.getTotalLength());
          const x = br.left + (p.x / 100) * br.width;
          const y = br.top + (p.y / 60) * br.height;
          drawLight(x, y, 13, 1); if (active) emit(x, y, 0.28);
        });
      }
    } else if (t < P1 + P2) {
      // travel the snake, mapping its path coords onto the list-wrap on screen
      const wr = wrap.getBoundingClientRect();
      if (wr.width > 0 && svW > 0) {
        const u = (t - P1) / P2;
        const glow = 15 + 5 * Math.min(u / 0.05, 1);
        const p = snakePath.getPointAtLength(u * snakePath.getTotalLength());
        const x = wr.left + p.x * (wr.width / svW);
        const y = wr.top + p.y * (wr.height / svH);
        drawLight(x, y, glow, 1); if (active) emit(x, y, 0.5);
      }
    } else if (t < P1 + P2 + ARR) {
      const a = Math.sin(Math.min((t - P1 - P2) / ARR, 1) * Math.PI);
      const us = document.querySelector(".sv-us .sv-photo-us");
      if (us) {
        const ur = us.getBoundingClientRect();
        const cx = ur.left + ur.width / 2, cy = ur.top + ur.height / 2, rr = ur.width / 2 + 3;
        ctx.strokeStyle = "#ffe6a0";
        ctx.lineWidth = 3; ctx.globalAlpha = a * 0.30;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 11; ctx.globalAlpha = a * 0.12;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
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
      if (e.isIntersecting && !active) { active = true; t0 = null; buildSnake(); if (!raf) raf = requestAnimationFrame(step); }
      else if (!e.isIntersecting) { active = false; }
    });
  }, { threshold: 0 });
  io.observe(list);

  // ----- Click controls: names restart; a date resumes the spark from there -----
  const seek = (targetT) => {
    t0 = performance.now() - targetT;
    active = true;
    if (!raf) raf = requestAnimationFrame(step);
  };
  document.querySelectorAll(".sv-photos .sv-figure").forEach((fig) => {
    fig.style.cursor = "pointer";
    fig.addEventListener("click", () => seek(0));
  });
  list.querySelectorAll(".sv-date").forEach((d, i) => {
    d.style.cursor = "pointer";
    d.addEventListener("click", () => {
      const f = (dotFracs[i] != null) ? dotFracs[i] : (i / Math.max(dotFracs.length, 1));
      seek(P1 + f * P2);
    });
  });
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

/* ---------- Names flame sweep on first load (home only) ---------- */
window.addEventListener("load", () => {
  const names = document.querySelector("body.home .couple-names");
  if (!names) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  setTimeout(() => {
    names.classList.add("flame");
    setTimeout(() => names.classList.remove("flame"), 3600);
  }, 3900); // after the intro overlay has faded
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
    document.body.classList.toggle("nav-open", open); // lock scroll so a tap can't scroll-close it
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
