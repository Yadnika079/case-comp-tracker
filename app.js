// Status is computed in the browser from dates, so labels stay correct
// even if a nightly agent run fails.

const DATA_URL = "data/competitions.json";

const state = { items: [] };

const els = {
  grid: document.getElementById("grid"),
  empty: document.getElementById("empty"),
  count: document.getElementById("count"),
  updated: document.getElementById("updated"),
  search: document.getElementById("search"),
  status: document.getElementById("f-status"),
  level: document.getElementById("f-level"),
  domain: document.getElementById("f-domain"),
  host: document.getElementById("f-host"),
  region: document.getElementById("f-region"),
  sort: document.getElementById("f-sort"),
  reset: document.getElementById("reset"),
};

// Parse YYYY-MM-DD as a local-date midnight (avoids UTC off-by-one).
function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayStart() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

// closed: deadline passed. upcoming: registration not yet open. open: otherwise.
function computeStatus(c, today = todayStart()) {
  const deadline = parseDate(c.deadline);
  const opens = parseDate(c.registration_open);
  if (c.date_status === "expected" && !deadline) return "upcoming";
  if (deadline && deadline < today) return "closed";
  if (opens && opens > today) return "upcoming";
  return "open";
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function fmtDate(s) {
  const d = parseDate(s);
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "TBA";
}

function teamSize(c) {
  const { team_size_min: a, team_size_max: b } = c;
  if (a == null && b == null) return "Not specified";
  if (a === b) return a === 1 ? "Solo" : `${a} members`;
  if (a == null) return `Up to ${b} members`;
  if (b == null) return `${a}+ members`;
  return `${a}-${b} members`;
}

function deadlineNote(c, status, today) {
  const deadline = parseDate(c.deadline);
  if (c.date_status === "expected" && !deadline) return `Dates not announced yet. Expected: ${c.expected_window}`;
  if (status === "closed") return `Closed on ${fmtDate(c.deadline)}`;
  if (status === "upcoming") {
    return `Opens ${fmtDate(c.registration_open)}, deadline ${fmtDate(c.deadline)}`;
  }
  const left = daysBetween(today, deadline);
  const when = left === 0 ? "today" : left === 1 ? "tomorrow" : `in ${left} days`;
  return `Deadline ${fmtDate(c.deadline)} (${when})`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Only allow http(s) links so a bad data row can never inject a javascript: URL.
function safeUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function fact(dl, label, value) {
  dl.append(el("dt", null, label), el("dd", null, value));
}

function renderCard(c, today) {
  const status = c.status;
  const card = el("article", `card is-${status}`);

  const top = el("div", "card-top");
  const titleWrap = el("div");
  titleWrap.append(el("h2", null, c.title), el("p", "host", c.host_name));
  top.append(titleWrap, el("span", `badge badge-${status}`, status));

  const tags = el("div", "tags");
  [c.domain, c.level, c.host_type === "college" ? "College host" : "Company host", c.region || "India"].forEach((t) =>
    tags.append(el("span", "tag", t))
  );

  const facts = el("dl", "facts");
  fact(facts, "PPO/PPI", c.ppo_ppi || "Not specified");
  fact(facts, "Cash prize", c.cash_prize || "Not specified");
  fact(facts, "Team size", teamSize(c));
  fact(facts, "Hosted by", `${c.host_name} (${c.host_type})`);

  const note = el("p", "deadline-note", deadlineNote(c, status, today));

  const href = safeUrl(c.apply_url);
  const expected = c.date_status === "expected" && !c.deadline;
  const apply = el("a", "apply", status === "closed" ? "Registration closed" : expected ? "Official page (dates awaited)" : "Apply now");
  if (href && status !== "closed") {
    apply.href = href;
    apply.target = "_blank";
    apply.rel = "noopener noreferrer";
  } else {
    apply.classList.add("disabled");
    apply.setAttribute("aria-disabled", "true");
  }

  card.append(top, tags, facts, note, apply);
  return card;
}

function matches(c) {
  const q = els.search.value.trim().toLowerCase();
  if (q && !(`${c.title} ${c.host_name}`.toLowerCase().includes(q))) return false;
  if (els.status.value && c.status !== els.status.value) return false;
  if (els.level.value) {
    // "UG+PG" competitions show under both UG and PG.
    if (c.level !== els.level.value && c.level !== "UG+PG") return false;
  }
  if (els.domain.value && c.domain !== els.domain.value) return false;
  if (els.host.value && c.host_type !== els.host.value) return false;
  if (els.region.value && (c.region || "India") !== els.region.value) return false;
  return true;
}

const statusRank = { open: 0, upcoming: 1, closed: 2 };

function sortItems(items) {
  const mode = els.sort.value;
  return items.sort((a, b) => {
    if (statusRank[a.status] !== statusRank[b.status]) return statusRank[a.status] - statusRank[b.status];
    if (mode === "recent") return (b.last_verified || "").localeCompare(a.last_verified || "");
    // Open/upcoming: soonest deadline first. Closed: most recently closed first.
    // Entries with no confirmed deadline go after dated ones.
    const da = a.deadline || "9999-12-31", db = b.deadline || "9999-12-31";
    return a.status === "closed" ? db.localeCompare(da) : da.localeCompare(db);
  });
}

function render() {
  const today = todayStart();
  const visible = sortItems(state.items.filter(matches));
  els.grid.replaceChildren(...visible.map((c) => renderCard(c, today)));
  els.empty.hidden = visible.length > 0;
  els.count.textContent = `${visible.length} of ${state.items.length} competitions`;
  syncUrl();
}

// Keep filters in the URL so views can be shared and survive refresh.
const PARAMS = { q: "search", status: "status", level: "level", domain: "domain", host: "host", region: "region", sort: "sort" };

function syncUrl() {
  const p = new URLSearchParams();
  for (const [key, id] of Object.entries(PARAMS)) {
    const v = els[id].value;
    if (v && !(key === "sort" && v === "deadline")) p.set(key, v);
  }
  const qs = p.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function loadFromUrl() {
  const p = new URLSearchParams(location.search);
  for (const [key, id] of Object.entries(PARAMS)) {
    const v = p.get(key);
    if (v == null) continue;
    const input = els[id];
    // For selects, only accept values that actually exist.
    if (input.tagName === "SELECT" && ![...input.options].some((o) => o.value === v)) continue;
    input.value = v;
  }
}

function fillDomains() {
  const domains = [...new Set(state.items.map((c) => c.domain))].sort();
  domains.forEach((d) => {
    const o = el("option", null, d.charAt(0).toUpperCase() + d.slice(1));
    o.value = d;
    els.domain.append(o);
  });
}

async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const today = todayStart();
    // Entries flagged needs_review stay hidden until a human approves them.
    state.items = (data.competitions || [])
      .filter((c) => !c.needs_review)
      .map((c) => ({ ...c, status: computeStatus(c, today) }));
    if (data.updated_at) els.updated.textContent = `Data last updated ${fmtDate(data.updated_at)}`;
  } catch (err) {
    els.count.textContent = "Could not load competitions. Please try again later.";
    console.error(err);
    return;
  }

  fillDomains();
  loadFromUrl();

  ["input", "change"].forEach((evt) =>
    [els.search, els.status, els.level, els.domain, els.host, els.region, els.sort].forEach((n) => n.addEventListener(evt, render))
  );
  els.reset.addEventListener("click", () => {
    [els.search, els.status, els.level, els.domain, els.host, els.region].forEach((n) => (n.value = ""));
    els.sort.value = "deadline";
    render();
  });

  render();
}

init();
