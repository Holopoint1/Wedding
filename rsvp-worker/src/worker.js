/* =========================================================
   Alfie & Lorna — RSVP backend + hidden admin dashboard
   ---------------------------------------------------------
   POST /rsvp        public: the wedding site sends replies here (CORS open)
   GET  /  or /admin login-gated dashboard: who's accepted / declined / awaiting
   GET  /export.csv  login-gated CSV download of all replies

   Replies are stored in one KV record ("rsvps") keyed by normalised name.
   ========================================================= */

const KV_KEY = "rsvps";

// The invited guest list (kept in step with the site's guests.js).
const GUEST_LIST = [
  { name: "Lorna Beattie", invite: "day" },
  { name: "Alfie Dobson", invite: "day" },
  { name: "Helen Dobson", invite: "day" },
  { name: "John Dobson", invite: "day" },
  { name: "Harry Dobson", invite: "day" },
  { name: "Hazel Dobson", invite: "day" },
  { name: "Mim Adams", invite: "day" },
  { name: "El Carr", invite: "day" },
  { name: "Heather Walker", invite: "day" },
  { name: "Alistair Walker", invite: "day" },
  { name: "Emily Walker", invite: "day" },
  { name: "Phillip Walker", invite: "day" },
  { name: "Natalie Walker", invite: "day" },
  { name: "Tyler Lowe", invite: "day" },
  { name: "Michele Dobson", invite: "day" },
  { name: "Mark Jenkins", invite: "day" },
  { name: "Laura Jenkins", invite: "day" },
  { name: "Carolyn Dawson", invite: "day" },
  { name: "Tony Dawson", invite: "day" },
  { name: "Jonathan Dawson", invite: "day" },
  { name: "Jessica Stewart", invite: "day" },
  { name: "Lucy Dawson", invite: "day" },
  { name: "Gill Adams", invite: "day" },
  { name: "Mike Inglis", invite: "day" },
  { name: "Murray Beattie", invite: "day" },
  { name: "Anne Beattie", invite: "day" },
  { name: "Susan Slater", invite: "day" },
  { name: "May Lithgow", invite: "day" },
  { name: "Fiona Mackenzie", invite: "day" },
  { name: "Euan Mackenzie", invite: "day" },
  { name: "Cora Mackenzie", invite: "day" },
  { name: "Callan Mackenzie", invite: "day" },
  { name: "Mike Beattie", invite: "day" },
  { name: "Helen Beattie", invite: "day" },
  { name: "Caitlin Beattie", invite: "day" },
  { name: "Helen Beattie", invite: "day" },
  { name: "Sal Ducker", invite: "day" },
  { name: "Brian Beattie", invite: "day" },
  { name: "Heidi Beattie", invite: "day" },
  { name: "Yasemin Kolsuz", invite: "day" },
  { name: "Liam Richardson", invite: "day" },
  { name: "Molly Holmes", invite: "day" },
  { name: "Ellie Bull", invite: "day" },
  { name: "Amar Puarr", invite: "day" },
  { name: "Charlie Vidamour", invite: "day" },
  { name: "Ben Casey-Fletcher", invite: "day" },
  { name: "Jess Perry", invite: "day" },
  { name: "Elliot Cifton-Thompson", invite: "day" },
  { name: "Emily Wright", invite: "day" },
  { name: "Elliot Gee", invite: "day" },
  { name: "Maura Brown", invite: "day" },
  { name: "Mathilde Gadal", invite: "day" },
  { name: "Anna Hull", invite: "day" },
  { name: "Chris Whitehead", invite: "day" },
  { name: "Shannon Horrocks", invite: "day" },
  { name: "Steph Turner", invite: "day" },
  { name: "Ellen Shields", invite: "day" },
  { name: "Suzie Knight", invite: "day" },
  { name: "Elliot Baxendale", invite: "day" },
  { name: "Alex Green", invite: "day" },
  { name: "Emma Stepanova", invite: "day" },
  { name: "Catherine McKinlay", invite: "evening" },
  { name: "Alice Creasy", invite: "evening" },
  { name: "Emma Smart", invite: "evening" },
  { name: "Laura Strachan", invite: "evening" },
  { name: "Ewan Laidlaw", invite: "evening" },
  { name: "Rob Drummond", invite: "evening" },
  { name: "Grace Mackie", invite: "evening" },
  { name: "Heather Kerr", invite: "evening" },
  { name: "Hannah Bewley", invite: "evening" },
  { name: "Jen Smith", invite: "evening" },
  { name: "Kirsty Hulme", invite: "evening" },
];

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

async function readAll(env) {
  try { return JSON.parse((await env.RSVPS.get(KV_KEY)) || "{}"); }
  catch { return {}; }
}

function requireAuth(request, env) {
  const user = env.ADMIN_USER || "admin";
  const pass = env.ADMIN_PASSWORD || "";
  const header = request.headers.get("Authorization") || "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try { decoded = atob(header.slice(6)); } catch { decoded = ""; }
    const i = decoded.indexOf(":");
    const u = decoded.slice(0, i), p = decoded.slice(i + 1);
    if (u === user && p === pass) return null; // authorised
  }
  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Alfie & Lorna RSVPs", charset="UTF-8"' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    // ---- Public: receive an RSVP from the wedding site ----
    if (path === "/rsvp" && request.method === "POST") {
      let data = {};
      try { data = await request.json(); } catch { data = {}; }
      const name = data.name || "";
      const key = norm(name);
      const guest = GUEST_LIST.find((g) => norm(g.name) === key);
      if (key && guest) {
        const all = await readAll(env);
        if (data.reset === true) {
          // testing: clear just this one person's reply
          delete all[key];
        } else {
          all[key] = {
            name: guest.name,
            invite: guest.invite,
            attending: data.attending === "yes" ? "yes" : "no",
            dietary: (data.dietary || "").toString().slice(0, 1000),
            notes: (data.notes || "").toString().slice(0, 5000),
            submittedAt: new Date().toISOString(),
          };
        }
        await env.RSVPS.put(KV_KEY, JSON.stringify(all));
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    // ---- Admin (login required) ----
    if (path === "/export.csv") {
      const unauth = requireAuth(request, env);
      if (unauth) return unauth;
      const all = await readAll(env);
      const rows = [["Name", "Invite", "Status", "Dietary", "Notes", "Replied at"]];
      for (const g of GUEST_LIST) {
        const r = all[norm(g.name)];
        rows.push([
          g.name, g.invite,
          r ? (r.attending === "yes" ? "Accepted" : "Declined") : "Awaiting",
          r ? r.dietary : "", r ? r.notes : "", r ? r.submittedAt : "",
        ]);
      }
      const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\r\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="alfie-lorna-rsvps.csv"',
        },
      });
    }

    // ---- Reset a reply (login required) — used by the dashboard buttons ----
    if (path === "/reset" && request.method === "POST") {
      const unauth = requireAuth(request, env);
      if (unauth) return unauth;
      let name = "", pw = "";
      try {
        const form = await request.formData();
        name = (form.get("name") || "").toString();
        pw = (form.get("pw") || "").toString();
      } catch { name = ""; }
      const all = await readAll(env);
      if (name === "__all__") {
        // full wipe needs the separate reset password
        if (pw && pw === (env.RESET_PASSWORD || "")) await env.RSVPS.put(KV_KEY, "{}");
      } else if (name) {
        delete all[norm(name)];
        await env.RSVPS.put(KV_KEY, JSON.stringify(all));
      }
      return new Response(null, { status: 303, headers: { Location: "/" } });
    }

    if (path === "/" || path === "/admin") {
      const unauth = requireAuth(request, env);
      if (unauth) return unauth;
      const all = await readAll(env);
      return new Response(dashboard(all), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    return new Response("Not found", { status: 404 });
  },
};

function dashboard(all) {
  let accepted = 0, declined = 0, awaiting = 0, dayAcc = 0, eveAcc = 0;
  const rows = GUEST_LIST.map((g) => {
    const r = all[norm(g.name)];
    let status = "awaiting", label = "Awaiting reply";
    if (r) {
      if (r.attending === "yes") { status = "yes"; label = "Accepted"; accepted++; if (g.invite === "day") dayAcc++; else eveAcc++; }
      else { status = "no"; label = "Declined"; declined++; }
    } else { awaiting++; }
    const when = r && r.submittedAt ? new Date(r.submittedAt).toLocaleString("en-GB", { timeZone: "Europe/London" }) : "";
    const resetCell = r
      ? `<form method="post" action="/reset" class="rform" onsubmit="return confirm('Reset ${esc(g.name).replace(/'/g, "\\'")}\\'s reply?')"><input type="hidden" name="name" value="${esc(g.name)}"><button class="rbtn">Reset</button></form>`
      : "";
    return `<tr class="s-${status}">
      <td class="nm" data-label="Name">${esc(g.name)}</td>
      <td class="inv" data-label="Invite">${esc(g.invite)}</td>
      <td data-label="Status"><span class="pill p-${status}">${label}</span></td>
      <td data-label="Dietary">${esc(r ? r.dietary : "")}</td>
      <td data-label="Notes">${esc(r ? r.notes : "")}</td>
      <td class="when" data-label="Replied">${esc(when)}</td>
      <td class="act" data-label="">${resetCell}</td>
    </tr>`;
  }).join("");

  const total = GUEST_LIST.length;
  return `<!doctype html><html lang="en-GB"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>RSVPs · Alfie &amp; Lorna</title>
<style>
  :root { --ink:#2f3a2a; --muted:#6b7360; --line:#e6e0d2; --paper:#fffdf8; --bg:#f6efe4;
          --yes:#2f8f4e; --no:#c0503f; --wait:#b08a2e; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:var(--ink); background:var(--bg); }
  header { padding:1.4rem 1.5rem 0.6rem; }
  h1 { margin:0; font-size:1.35rem; }
  .sub { color:var(--muted); font-size:.9rem; margin:.2rem 0 0; }
  .wrap { padding:1rem 1.5rem 3rem; }
  .cards { display:flex; flex-wrap:wrap; gap:.8rem; margin:.6rem 0 1.2rem; }
  .card { background:var(--paper); border:1px solid var(--line); border-radius:12px; padding:.8rem 1.1rem; min-width:120px; }
  .card b { display:block; font-size:1.7rem; line-height:1.1; }
  .card span { color:var(--muted); font-size:.8rem; text-transform:uppercase; letter-spacing:.06em; }
  .card.acc b{color:var(--yes);} .card.dec b{color:var(--no);} .card.wait b{color:var(--wait);}
  .bar { display:flex; gap:.8rem; align-items:center; flex-wrap:wrap; margin-bottom:1rem; }
  .bar a { color:#3a5; text-decoration:none; font-size:.9rem; border:1px solid var(--line); background:var(--paper); padding:.45rem .8rem; border-radius:8px; }
  input.filter { padding:.5rem .7rem; border:1px solid var(--line); border-radius:8px; font-size:.9rem; min-width:220px; }
  table { width:100%; border-collapse:collapse; background:var(--paper); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  th,td { text-align:left; padding:.6rem .8rem; border-bottom:1px solid var(--line); font-size:.92rem; vertical-align:top; }
  th { background:#efe7d8; position:sticky; top:0; font-size:.72rem; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
  tr:last-child td { border-bottom:none; }
  td.inv { text-transform:capitalize; color:var(--muted); }
  td.when { color:var(--muted); white-space:nowrap; font-size:.82rem; }
  .pill { display:inline-block; padding:.15rem .55rem; border-radius:20px; font-size:.78rem; font-weight:600; }
  .p-yes { background:#e2f3e7; color:var(--yes); } .p-no { background:#f7e3df; color:var(--no); } .p-awaiting { background:#f4ecd6; color:var(--wait); }
  tr.s-yes { background:#f6fbf7; } tr.s-no { background:#fcf6f4; }
  .rform { margin:0; }
  td.act { white-space:nowrap; }
  .rbtn { font: inherit; font-size:.76rem; padding:.32rem .62rem; border:1px solid var(--line); background:var(--paper); border-radius:6px; color:var(--muted); cursor:pointer; }
  .rbtn:hover { color:var(--no); border-color:var(--no); }
  .rbtn.danger { color:var(--no); border-color:#e6c3bc; }

  /* ---- Mobile: turn the table into stacked cards, no sideways scroll ---- */
  @media (max-width: 640px) {
    header { padding:1.1rem 1rem .3rem; }
    h1 { font-size:1.2rem; }
    .wrap { padding:.8rem 1rem 3rem; }
    .cards { gap:.5rem; }
    .card { flex:1 1 30%; min-width:0; padding:.55rem .7rem; text-align:center; }
    .card b { font-size:1.35rem; }
    .card span { font-size:.66rem; }
    .bar { gap:.5rem; }
    input.filter { min-width:0; width:100%; flex:1 1 100%; }
    .bar a { flex:1 1 auto; text-align:center; }
    #resetAllForm { flex:1 1 100%; }
    #resetAllForm .rbtn { width:100%; }

    table, tbody, tr, td { display:block; width:100%; }
    thead { display:none; }
    table { border:none; background:transparent; border-radius:0; }
    tr { background:var(--paper); border:1px solid var(--line); border-radius:12px; margin-bottom:.7rem; padding:.35rem 0 .5rem; }
    tr.s-yes { background:#f6fbf7; } tr.s-no { background:#fcf6f4; }
    tr:last-child td { border-bottom:none; }
    td { border:none; display:flex; gap:.7rem; align-items:baseline; padding:.24rem 1rem; font-size:.95rem; white-space:normal; }
    td::before { content:attr(data-label); flex:0 0 5em; color:var(--muted); font-size:.66rem; text-transform:uppercase; letter-spacing:.04em; }
    td:empty { display:none; }
    td.nm { display:block; font-weight:700; font-size:1.08rem; padding:.5rem 1rem .15rem; }
    td.nm::before { display:none; }
    td.when { color:var(--muted); font-size:.85rem; }
    td.act { justify-content:flex-end; padding-top:.4rem; }
    td.act::before { display:none; }
  }
</style></head><body>
<header>
  <h1>Alfie &amp; Lorna — RSVPs</h1>
  <p class="sub">Live replies from alflorna.com · ${accepted} of ${total} accepted</p>
</header>
<div class="wrap">
  <div class="cards">
    <div class="card acc"><b>${accepted}</b><span>Accepted</span></div>
    <div class="card dec"><b>${declined}</b><span>Declined</span></div>
    <div class="card wait"><b>${awaiting}</b><span>Awaiting</span></div>
    <div class="card"><b>${dayAcc}</b><span>Day · accepted</span></div>
    <div class="card"><b>${eveAcc}</b><span>Evening · accepted</span></div>
  </div>
  <div class="bar">
    <input class="filter" id="filter" placeholder="Search a name…" oninput="filt()">
    <a href="/export.csv">Download CSV</a>
    <a href="/" onclick="location.reload();return false;">Refresh</a>
    <form method="post" action="/reset" id="resetAllForm" style="margin:0">
      <input type="hidden" name="name" value="__all__">
      <input type="hidden" name="pw" id="resetAllPw">
      <button type="button" class="rbtn danger" onclick="var p=prompt('Enter the reset-all password to wipe EVERY reply:');if(p){document.getElementById('resetAllPw').value=p;document.getElementById('resetAllForm').submit();}">Reset all replies</button>
    </form>
  </div>
  <table id="tbl">
    <thead><tr><th>Name</th><th>Invite</th><th>Status</th><th>Dietary</th><th>Notes</th><th>Replied</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>
<script>
  function filt(){ var q=document.getElementById('filter').value.toLowerCase();
    document.querySelectorAll('#tbl tbody tr').forEach(function(r){
      r.style.display = r.cells[0].textContent.toLowerCase().indexOf(q)>-1 ? '' : 'none';
    });
  }
</script>
</body></html>`;
}
