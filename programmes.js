// Programmes tab. Reuses helpers from app.js (parseDate, todayStart, daysBetween,
// fmtDate, el, safeUrl, fact, updateQuery). Status is computed in the browser from dates,
// exactly like case competitions, so labels stay right even if a nightly run fails.

const PROGRAMMES_URL = "data/programmes.json";

const pState = { items: [] };

const pEls = {
  grid: document.getElementById("p-grid"),
  empty: document.getElementById("p-empty"),
  count: document.getElementById("p-count"),
  search: document.getElementById("p-search"),
  status: document.getElementById("p-status"),
  cost: document.getElementById("p-cost"),
  domain: document.getElementById("p-domain"),
  type: document.getElementById("p-type"),
  audience: document.getElementById("p-audience"),
  region: document.getElementById("p-region"),
  sort: document.getElementById("p-sort"),
  reset: document.getElementById("p-reset"),
};

const TYPE_LABEL = {
  pre_mba: "Pre-MBA programme",
  insight_event: "Webinar / insight event",
  virtual_experience: "Virtual job simulation",
  learning: "Learning / certification",
  mentorship: "Mentorship",
  leadership: "Leadership programme",
  internship: "Internship",
};
const DOMAIN_LABEL = { product: "Product management", hr: "HR" };
const COST_LABEL = { free: "Free", paid: "Charged", not_specified: "Cost not stated" };
const FORMAT_LABEL = { online: "Online", in_person: "In person", hybrid: "Online + in person", not_specified: "Not specified" };
const REGION_LABEL = { India: "India", International: "International", Global: "Online (global)" };
const AUDIENCE_LABEL = { mba: "MBA students only", open: "Open to all" };

function domainLabel(d) {
  return DOMAIN_LABEL[d] || d.charAt(0).toUpperCase() + d.slice(1);
}

// closed: deadline passed. upcoming: not open yet, or next dates not announced. open: otherwise.
function computeProgrammeStatus(p, today = todayStart()) {
  const deadline = parseDate(p.deadline);
  const opens = parseDate(p.registration_open);
  if (p.date_status === "expected" && !deadline) return "upcoming";
  if (deadline && deadline < today) return "closed";
  if (opens && opens > today) return "upcoming";
  return "open";
}

function programmeNote(p, status, today) {
  const deadline = parseDate(p.deadline);
  if (p.date_status === "expected" && !deadline) return `Dates not announced yet. Expected: ${p.expected_window}`;
  if (status === "closed") return `Closed on ${fmtDate(p.deadline)}`;
  if (status === "upcoming") return `Opens ${fmtDate(p.registration_open)}, deadline ${fmtDate(p.deadline)}`;
  if (!deadline) {
    const start = parseDate(p.start_date);
    if (start && start >= today) return `Open now. Next listed session: ${fmtDate(p.start_date)}`;
    return "Open now. Self-paced or rolling sign-up, no deadline listed";
  }
  const left = daysBetween(today, deadline);
  const when = left === 0 ? "today" : left === 1 ? "tomorrow" : `in ${left} days`;
  return `Deadline ${fmtDate(p.deadline)} (${when})`;
}

function renderProgramme(p, today) {
  const status = p.status;
  const card = el("article", `card is-${status}`);

  const top = el("div", "card-top");
  const titleWrap = el("div");
  titleWrap.append(el("h2", null, p.title), el("p", "host", p.host_name));
  top.append(titleWrap, el("span", `badge badge-${status}`, status));

  const tags = el("div", "tags");
  [domainLabel(p.domain), TYPE_LABEL[p.programme_type] || p.programme_type].forEach((t) => tags.append(el("span", "tag", t)));
  tags.append(el("span", `tag tag-cost-${p.cost}`, COST_LABEL[p.cost] || p.cost));
  [AUDIENCE_LABEL[p.audience], REGION_LABEL[p.region] || p.region].forEach((t) => t && tags.append(el("span", "tag", t)));

  const facts = el("dl", "facts");
  fact(facts, "Cost", p.fee || COST_LABEL[p.cost] || "Not specified");
  fact(facts, "Who can apply", p.eligibility || "Not specified");
  fact(facts, "Format", FORMAT_LABEL[p.format] || "Not specified");
  fact(facts, "Duration", p.duration || "Not specified");

  const note = el("p", "deadline-note", programmeNote(p, status, today));

  const href = safeUrl(p.apply_url);
  const expected = p.date_status === "expected" && !p.deadline;
  const rolling = p.date_status === "rolling" && !p.deadline;
  const label = status === "closed" ? "Applications closed" : expected ? "Official page (dates awaited)" : rolling ? "Start now" : "Apply now";
  const apply = el("a", "apply", label);
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

function programmeMatches(p) {
  const q = pEls.search.value.trim().toLowerCase();
  if (q && !`${p.title} ${p.host_name}`.toLowerCase().includes(q)) return false;
  if (pEls.status.value && p.status !== pEls.status.value) return false;
  if (pEls.cost.value && p.cost !== pEls.cost.value) return false;
  if (pEls.domain.value && p.domain !== pEls.domain.value) return false;
  if (pEls.type.value && p.programme_type !== pEls.type.value) return false;
  if (pEls.audience.value && p.audience !== pEls.audience.value) return false;
  if (pEls.region.value && p.region !== pEls.region.value) return false;
  return true;
}

function sortProgrammes(items) {
  const mode = pEls.sort.value;
  return items.sort((a, b) => {
    if (statusRank[a.status] !== statusRank[b.status]) return statusRank[a.status] - statusRank[b.status];
    if (mode === "recent") return (b.last_verified || "").localeCompare(a.last_verified || "");
    // Dated entries first (soonest deadline; closed = most recently closed). Always-open ones go after.
    const da = a.deadline || "9999-12-31", db = b.deadline || "9999-12-31";
    return a.status === "closed" ? db.localeCompare(da) : da.localeCompare(db);
  });
}

function renderProgrammes() {
  const today = todayStart();
  const visible = sortProgrammes(pState.items.filter(programmeMatches));
  pEls.grid.replaceChildren(...visible.map((p) => renderProgramme(p, today)));
  pEls.empty.hidden = visible.length > 0;
  pEls.count.textContent = `${visible.length} of ${pState.items.length} programmes`;
  syncProgrammeUrl();
}

// Programme filters use a "p_" prefix in the URL so they never clash with the competitions tab.
const P_PARAMS = { p_q: "search", p_status: "status", p_cost: "cost", p_domain: "domain", p_type: "type", p_audience: "audience", p_region: "region", p_sort: "sort" };

function syncProgrammeUrl() {
  const entries = [];
  for (const [key, id] of Object.entries(P_PARAMS)) {
    const v = pEls[id].value;
    if (v && !(key === "p_sort" && v === "deadline")) entries.push([key, v]);
  }
  updateQuery(Object.keys(P_PARAMS), entries);
}

function loadProgrammeFiltersFromUrl() {
  const p = new URLSearchParams(location.search);
  for (const [key, id] of Object.entries(P_PARAMS)) {
    const v = p.get(key);
    if (v == null) continue;
    const input = pEls[id];
    if (input.tagName === "SELECT" && ![...input.options].some((o) => o.value === v)) continue;
    input.value = v;
  }
}

function fillSelect(select, values, labelFor) {
  [...new Set(values)].sort().forEach((v) => {
    const o = el("option", null, labelFor(v));
    o.value = v;
    select.append(o);
  });
}

async function initProgrammes() {
  try {
    const res = await fetch(PROGRAMMES_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const today = todayStart();
    // Entries flagged needs_review stay hidden until a human approves them.
    pState.items = (data.programmes || [])
      .filter((p) => !p.needs_review)
      .map((p) => ({ ...p, status: computeProgrammeStatus(p, today) }));
  } catch (err) {
    pEls.count.textContent = "Could not load programmes. Please try again later.";
    console.error(err);
    return;
  }

  fillSelect(pEls.domain, pState.items.map((p) => p.domain), domainLabel);
  fillSelect(pEls.type, pState.items.map((p) => p.programme_type), (t) => TYPE_LABEL[t] || t);
  loadProgrammeFiltersFromUrl();

  ["input", "change"].forEach((evt) =>
    [pEls.search, pEls.status, pEls.cost, pEls.domain, pEls.type, pEls.audience, pEls.region, pEls.sort].forEach((n) =>
      n.addEventListener(evt, renderProgrammes)
    )
  );
  pEls.reset.addEventListener("click", () => {
    [pEls.search, pEls.status, pEls.cost, pEls.domain, pEls.type, pEls.audience, pEls.region].forEach((n) => (n.value = ""));
    pEls.sort.value = "deadline";
    renderProgrammes();
  });

  renderProgrammes();
}

initProgrammes();
