import { api, apiResponse, queryString } from "./api.js";
import { icon } from "./icons.js";

const app = document.querySelector("#app");
const state = {
  renderId: 0,
  mobileOpen: false,
  searchOpen: false,
  searchTimer: null,
  toastTimer: null,
  adminModule: "clubs",
  adminUser: null
};

const navItems = [
  ["/klubovi", "Klubovi"],
  ["/mapa", "Mapa"],
  ["/baza-znanja", "Baza znanja"],
  ["/propisi", "Propisi"],
  ["/vijesti", "Vijesti"],
  ["/talenti", "Talenti"],
  ["/prilike", "Prilike"]
];

const routeInfo = {
  clubs: { base: "/klubovi", label: "Klubovi", endpoint: "/api/clubs", titleKey: "name", icon: "users" },
  knowledge: { base: "/baza-znanja", label: "Baza znanja", endpoint: "/api/knowledge", titleKey: "title", icon: "book" },
  documents: { base: "/propisi", label: "Propisi", endpoint: "/api/documents", titleKey: "title", icon: "file" },
  articles: { base: "/vijesti", label: "Vijesti", endpoint: "/api/news", titleKey: "title", icon: "news" },
  talents: { base: "/talenti", label: "Talenti", endpoint: "/api/talents", titleKey: "name", icon: "trophy" },
  opportunities: { base: "/prilike", label: "Prilike", endpoint: "/api/opportunities", titleKey: "title", icon: "calendar" }
};

const adminModules = {
  clubs: {
    label: "Klubovi", endpoint: "/api/clubs", icon: "users", title: "name",
    fields: [
      ["name", "Naziv", "text", true], ["sport", "Sport", "text", true], ["type", "Tip", "select", true, ["club", "school"]],
      ["city", "Grad", "text", true], ["municipality", "Opština", "text"], ["address", "Adresa", "text", true],
      ["lat", "Geografska širina", "number"], ["lng", "Geografska dužina", "number"], ["phone", "Telefon", "text"], ["email", "Kontakt e-mail", "email"],
      ["ageGroups", "Uzrasne grupe (zarezom)", "list"], ["programs", "Programi (zarezom)", "list"], ["tags", "Tagovi (zarezom)", "list"],
      ["verified", "Verifikovan", "select", false, ["true", "false"]]
    ]
  },
  knowledge: {
    label: "Baza znanja", endpoint: "/api/knowledge", icon: "book", title: "title",
    fields: [["title","Naslov","text",true],["category","Kategorija","text",true],["summary","Sažetak","textarea",true],["body","Tekst","textarea",true],["timelineYear","Godina timeline-a","number"],["tags","Tagovi (zarezom)","list"],["status","Status","select",true,["published","draft"]]]
  },
  documents: {
    label: "Dokumenti", endpoint: "/api/documents", icon: "file", title: "title",
    fields: [["title","Naslov","text",true],["category","Kategorija","text",true],["institution","Institucija","text"],["summary","Sažetak","textarea",true],["simplifiedText","Pojednostavljeni tekst","textarea",true],["sourceUrl","Izvorni URL","url"],["fileUrl","URL dokumenta","url"],["tags","Tagovi (zarezom)","list"],["status","Status","select",true,["published","draft"]]]
  },
  articles: {
    label: "Vijesti", endpoint: "/api/news", icon: "news", title: "title",
    fields: [["title","Naslov","text",true],["type","Tip","text",true],["category","Kategorija","text"],["summary","Sažetak","textarea",true],["body","Tekst vijesti","textarea",true],["coverImage","Naslovna slika (URL)","url"],["tags","Tagovi (zarezom)","list"],["status","Status","select",true,["published","draft"]]]
  },
  talents: {
    label: "Talenti", endpoint: "/api/talents", icon: "trophy", title: "name",
    fields: [["name","Ime i prezime","text",true],["sport","Sport","text",true],["club","Klub","text",true],["city","Grad","text"],["birthYear","Godina rođenja","number"],["position","Pozicija / disciplina","text"],["biography","Biografija","textarea",true],["achievements","Dostignuća (zarezom)","list"],["tags","Tagovi (zarezom)","list"],["status","Status","select",true,["published","draft"]]]
  },
  opportunities: {
    label: "Prilike", endpoint: "/api/opportunities", icon: "calendar", title: "title",
    fields: [["title","Naslov","text",true],["type","Tip","text",true],["sport","Sport","text"],["city","Grad","text"],["organizer","Organizator","text"],["startsAt","Početak","datetime-local"],["summary","Sažetak","textarea",true],["body","Opis","textarea",true],["tags","Tagovi (zarezom)","list"],["status","Status","select",true,["published","draft"]]]
  },
  messages: { label: "Poruke", endpoint: "/api/admin/messages", icon: "mail", title: "name", fields: [] }
};

function escapeHtml(value = "") {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function slugLabel(value = "") {
  return String(value).replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function truncate(value = "", length = 150) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length).trim()}…` : text;
}

function formatDate(value, long = false) {
  if (!value) return "Nije navedeno";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("bs-BA", long ? { day: "numeric", month: "long", year: "numeric" } : { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function initials(value = "SH") {
  return String(value).split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function currentPath() {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

function isActive(base) {
  return currentPath() === base || currentPath().startsWith(`${base}/`);
}

function header() {
  return `
    <header class="site-header" id="site-header">
      <div class="container nav">
        <a href="/" class="brand" data-link aria-label="SportHub RS početna">
          <span class="brand-mark">${icon("bolt", 22)}</span>
          <span>SportHub<small>RS</small></span>
        </a>
        <nav class="nav-links" aria-label="Glavna navigacija">
          ${navItems.map(([href, label]) => `<a href="${href}" data-link class="nav-link ${isActive(href) ? "active" : ""}">${label}</a>`).join("")}
        </nav>
        <div class="nav-actions">
          <span class="connection"><i class="connection-dot"></i> API live</span>
          <button class="icon-btn" data-search-open aria-label="Otvori pretragu">${icon("search", 19)}</button>
          <a class="icon-btn" href="/admin" data-link aria-label="Administracija">${icon("user", 19)}</a>
          <button class="icon-btn menu-btn" data-menu aria-label="Otvori meni">${icon(state.mobileOpen ? "close" : "menu", 21)}</button>
        </div>
      </div>
      <nav class="mobile-panel ${state.mobileOpen ? "open" : ""}" aria-label="Mobilna navigacija">
        ${navItems.map(([href, label]) => `<a href="${href}" data-link class="nav-link ${isActive(href) ? "active" : ""}">${label}</a>`).join("")}
        <a href="/kontakt" data-link class="nav-link ${isActive("/kontakt") ? "active" : ""}">Kontakt</a>
        <a href="/admin" data-link class="nav-link ${isActive("/admin") ? "active" : ""}">Administracija</a>
      </nav>
    </header>`;
}

function footer() {
  return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a href="/" class="brand" data-link><span class="brand-mark">${icon("bolt", 22)}</span><span>SportHub<small>RS</small></span></a>
            <p>Digitalno mješto gdje se susreću sport, znanje i nove prilike. Pronađi svoj klub, upoznaj sportske uzore i napravi sljedeći korak.</p>
          </div>
          <div class="footer-col"><h3>Istraži</h3><a href="/klubovi" data-link>Klubovi</a><a href="/mapa" data-link>Sportska mapa</a><a href="/talenti" data-link>Talenti</a></div>
          <div class="footer-col"><h3>Saznaj</h3><a href="/baza-znanja" data-link>Baza znanja</a><a href="/propisi" data-link>Propisi</a><a href="/vijesti" data-link>Vijesti</a></div>
          <div class="footer-col"><h3>Uključi se</h3><a href="/prilike" data-link>Prilike</a><a href="/kontakt" data-link>Kontakt</a><a href="/admin" data-link>Administracija</a></div>
        </div>
        <div class="footer-bottom">© ${new Date().getFullYear()} SportHub RS. Platforma za novu generaciju sporta.<span>Pokreni se. Poveži se. Napreduj.</span></div>
      </div>
    </footer>`;
}

function skeletonPage() {
  return `<section class="page-hero"><div class="container"><div class="skeleton" style="min-height:210px"></div></div></section><section class="section"><div class="container grid grid-3">${Array(6).fill('<div class="skeleton"></div>').join("")}</div></section>`;
}

function errorPage(error) {
  return `<div class="error-state"><div class="empty-icon">${icon("wifi", 30)}</div><h2>Veza je izgubila ritam</h2><p>${escapeHtml(error.message)}</p><button class="btn btn-primary" data-retry>${icon("bolt", 17)} Pokušaj ponovo</button></div>`;
}

function emptyState(title = "Nema rezultata", message = "Pokušaj promijeniti filtere ili pojam pretrage.") {
  return `<div class="empty"><div><div class="empty-icon">${icon("search", 28)}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p></div></div>`;
}

function pageHero(eyebrow, title, description, code = "01") {
  return `<section class="page-hero" data-code="${escapeHtml(code)}"><div class="container"><div class="breadcrumbs"><a href="/" data-link>Početna</a>${icon("chevron", 13)}<span>${escapeHtml(eyebrow)}</span></div><span class="eyebrow">${escapeHtml(eyebrow)}</span><h1 class="display">${title}</h1><p class="lede">${escapeHtml(description)}</p></div></section>`;
}

function tag(value, style = "") {
  return value ? `<span class="tag ${style}">${escapeHtml(slugLabel(value))}</span>` : "";
}

function newsCard(item, index = 0) {
  const colors = ["rgba(199,255,61,.22)", "rgba(85,244,211,.2)", "rgba(185,156,255,.2)", "rgba(255,206,102,.18)"];
  return `<article class="card news-card reveal" data-tilt>
    <div class="news-visual" style="--card-color:${colors[index % colors.length]}" data-code="${String(index + 1).padStart(2, "0")}"></div>
    <div class="card-body">${tag(item.type || item.category)}<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(truncate(item.summary, 135))}</p>
      <div class="card-foot"><div class="meta-row"><span>${icon("clock",14)} ${formatDate(item.publishedAt)}</span></div><a class="text-link" data-link href="/vijesti/${encodeURIComponent(item.slug || item.id)}">Pročitaj ${icon("arrow",17)}</a></div>
    </div></article>`;
}

function talentCard(item) {
  return `<article class="card talent-card reveal" data-tilt><div class="talent-head"><div class="avatar">${escapeHtml(initials(item.name))}</div><div>${tag(item.sport, "lime")}<h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.position || item.club || "Sportista")}</p></div></div>
    <div class="meta-row"><span>${icon("pin",14)} ${escapeHtml(item.city || "Republika Srpska")}</span><span>${icon("users",14)} ${escapeHtml(item.club || "Samostalno")}</span></div>
    ${(item.achievements || []).slice(0,2).map((achievement) => `<div class="achievement">${icon("check",15)}<span>${escapeHtml(achievement)}</span></div>`).join("")}
    <div class="card-foot"><span class="muted">${item.birthYear ? `Godište ${escapeHtml(item.birthYear)}` : "Sportski profil"}</span><a class="text-link" data-link href="/talenti/${encodeURIComponent(item.slug || item.id)}">Profil ${icon("arrow",17)}</a></div></article>`;
}

function clubCard(item) {
  return `<article class="card reveal" data-tilt><div class="card-body"><span class="card-number">${escapeHtml(initials(item.name))}</span>${tag(item.sport, "lime")} ${item.verified ? tag("Verifikovan") : ""}<h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(truncate(item.summary || `${slugLabel(item.type)} iz mjesta ${item.city}.`, 140))}</p>
    <div class="meta-row"><span>${icon("pin",14)} ${escapeHtml(item.city || item.municipality)}</span><span>${icon("users",14)} ${(item.ageGroups || []).slice(0,3).map(escapeHtml).join(" · ") || "Svi uzrasti"}</span></div>
    <div class="card-foot"><span class="muted">${escapeHtml(item.address || "")}</span><a class="text-link" data-link href="/klubovi/${encodeURIComponent(item.slug || item.id)}">Detalji ${icon("arrow",17)}</a></div></div></article>`;
}

function knowledgeCard(item) {
  return `<article class="card reveal" data-tilt><div class="card-body">${tag(item.category, "amber")}<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(truncate(item.summary, 155))}</p><div class="card-foot"><span class="muted">${item.timelineYear ? `${escapeHtml(item.timelineYear)}. godina` : "SportHub vodič"}</span><a class="text-link" data-link href="/baza-znanja/${encodeURIComponent(item.slug || item.id)}">Saznaj više ${icon("arrow",17)}</a></div></div></article>`;
}

function documentCard(item) {
  return `<article class="card reveal" data-tilt><div class="card-body">${tag(item.category)}<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(truncate(item.summary, 150))}</p><div class="meta-row"><span>${icon("file",14)} ${escapeHtml(item.institution || "Sportska institucija")}</span></div><div class="card-foot"><span class="muted">Jednostavno objašnjeno</span><a class="text-link" data-link href="/propisi/${encodeURIComponent(item.slug || item.id)}">Otvori ${icon("arrow",17)}</a></div></div></article>`;
}

function opportunityCard(item) {
  return `<article class="card reveal" data-tilt><div class="card-body">${tag(item.type, "lime")}<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(truncate(item.summary, 145))}</p><div class="meta-row"><span>${icon("calendar",14)} ${formatDate(item.startsAt, true)}</span><span>${icon("pin",14)} ${escapeHtml(item.city || "RS")}</span></div><div class="card-foot"><span class="muted">${escapeHtml(item.organizer || item.sport || "SportHub RS")}</span><a class="text-link" data-link href="/prilike/${encodeURIComponent(item.slug || item.id)}">Detalji ${icon("arrow",17)}</a></div></div></article>`;
}

async function homePage() {
  const [overview, opportunities] = await Promise.all([api("/api/meta/overview"), api("/api/opportunities?limit=3")]);
  const counts = overview.counts || {};
  const articles = overview.featured?.articles || [];
  const talents = overview.featured?.talents || [];
  const tickerItems = ["Fudbal", "Košarka", "Odbojka", "Atletika", "Boks", "Plivanje", "Nove prilike", "Tvoja igra"];
  return `
    <section class="hero"><div class="hero-slash"></div><div class="container hero-grid">
      <div class="hero-copy"><span class="eyebrow">Sport nema granice</span><h1 class="display">Pokreni <span>svoju</span><br><em>igru.</em></h1><p class="lede">Klubovi, znanje, sportske prilike i priče koje pokreću novu generaciju sportista Republike Srpske — sve na jednom mjestu.</p>
        <div class="hero-actions"><a class="btn btn-primary" href="/mapa" data-link>Pronađi klub ${icon("arrow",18)}</a><a class="btn btn-ghost" href="/prilike" data-link>${icon("calendar",18)} Istraži prilike</a></div>
        <div class="hero-meta"><span class="connection"><i class="connection-dot"></i> Platforma aktivna</span><i class="line"></i><span>Za sportiste, roditelje i klubove</span></div>
      </div>
      <div class="hero-visual" aria-hidden="true"><span class="hero-code">PERFORMANCE / COMMUNITY / FUTURE</span><div class="orbit"><span class="orbit-node">${icon("trophy",22)}</span><span class="orbit-node">${icon("map",22)}</span><span class="orbit-node">${icon("book",22)}</span></div><div class="ball-core">${icon("bolt",44)}</div><div class="hero-data-card card-a"><strong>${counts.clubs || 0}+</strong><span>aktivnih klubova</span></div><div class="hero-data-card card-b"><strong>${counts.opportunities || 0}</strong><span>otvorenih prilika</span></div></div>
    </div></section>
    <div class="ticker"><div class="ticker-track">${[...tickerItems,...tickerItems].map((item) => `<span class="ticker-item">${item}</span>`).join("")}</div></div>
    <section class="section"><div class="container"><div class="section-head reveal"><div><span class="eyebrow">Sport u brojkama</span><h2 class="section-title">Jedna platforma.<br>Sve što ti treba.</h2></div><p>Provjereni podaci i sadržaji koji olakšavaju prvi, ali i svaki sljedeći korak u sportu.</p></div>
      <div class="stats-grid reveal">${[
        ["users", counts.clubs, "Klubova"], ["book", counts.knowledge, "Tekstova"], ["file", counts.documents, "Dokumenata"], ["news", counts.articles, "Vijesti"], ["trophy", counts.talents, "Profila"], ["calendar", counts.opportunities, "Prilika"]
      ].map(([ic,count,label]) => `<div class="stat"><span class="stat-icon">${icon(ic,22)}</span><strong data-count="${Number(count || 0)}">0</strong><span>${label}</span></div>`).join("")}</div>
    </div></section>
    <section class="section section--line"><div class="container"><div class="section-head reveal"><div><span class="eyebrow">Aktuelno</span><h2 class="section-title">Priče iz<br>prvog reda.</h2></div><a class="text-link" href="/vijesti" data-link>Sve vijesti ${icon("arrow",18)}</a></div><div class="grid grid-3">${articles.map(newsCard).join("") || emptyState()}</div></div></section>
    <section class="section section--line"><div class="container"><div class="section-head reveal"><div><span class="eyebrow">Lica sporta</span><h2 class="section-title">Energija koja<br>inspiriše.</h2></div><a class="text-link" href="/talenti" data-link>Svi profili ${icon("arrow",18)}</a></div><div class="grid grid-3">${talents.map(talentCard).join("") || emptyState()}</div></div></section>
    <section class="section section--line"><div class="container"><div class="section-head reveal"><div><span class="eyebrow">Ne propusti</span><h2 class="section-title">Tvoja sljedeća<br>prilika.</h2></div><a class="text-link" href="/prilike" data-link>Sve prilike ${icon("arrow",18)}</a></div><div class="grid grid-3">${opportunities.map(opportunityCard).join("") || emptyState()}</div></div></section>
    ${contactCta()}`;
}

function contactCta() {
  return `<section class="section"><div class="container"><div class="contact-panel reveal"><div><span class="eyebrow">Budi dio mreže</span><h2>Imaš informaciju koja nedostaje?</h2><p>Pošalji nam podatke o klubu, sportskoj prilici ili predloži temu. Zajedno gradimo precizniju sportsku mapu.</p></div><div style="display:grid;place-items:center"><a class="btn btn-primary" href="/kontakt" data-link>Javi nam se ${icon("arrow",18)}</a></div></div></div></section>`;
}

function getFilters() {
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

function filterForm(config, values = {}) {
  const selects = config.selects || [];
  return `<form class="filters" data-filter-form style="--filter-cols:${selects.length}">
    <div class="input-wrap">${icon("search",18)}<input class="input" name="q" value="${escapeHtml(values.q)}" placeholder="${escapeHtml(config.placeholder || "Pretraži...")}" aria-label="Pretraga"></div>
    ${selects.map(([name,label,options]) => `<select class="select" name="${name}" aria-label="${label}"><option value="">${label}: sve</option>${options.map((option) => `<option value="${escapeHtml(option)}" ${values[name] === option ? "selected" : ""}>${escapeHtml(slugLabel(option))}</option>`).join("")}</select>`).join("")}
    <button class="btn btn-primary" type="submit">${icon("filter",17)} Primijeni</button>
  </form>`;
}

async function clubsPage() {
  const values = getFilters();
  const response = await apiResponse(`/api/clubs${queryString({ ...values, limit: 60 })}`);
  const clubs = response.data || [];
  const sports = [...new Set(clubs.map((item) => item.sport).filter(Boolean))].sort();
  const cities = [...new Set(clubs.map((item) => item.city).filter(Boolean))].sort();
  return `${pageHero("Klubovi i škole", "Nađi svoj<br><span class=\"lime\">teren.</span>", "Pretraži sportske klubove i škole prema gradu, sportu i programu. Tvoj sljedeći trening možda je bliže nego što misliš.", "01")}
    <section class="section"><div class="container">${filterForm({ placeholder: "Naziv kluba, grad ili program", selects: [["sport","Sport",sports],["city","Grad",cities],["type","Tip",["club","school"]]] }, values)}<div class="results-info"><span><strong>${response.meta?.total ?? clubs.length}</strong> klubova u mreži</span><a href="/mapa" data-link class="text-link">${icon("map",17)} Prikaži na mapi</a></div><div class="grid grid-3" data-results>${clubs.map(clubCard).join("") || emptyState()}</div></div></section>${contactCta()}`;
}

async function newsPage() {
  const values = getFilters();
  const response = await apiResponse(`/api/news${queryString({ ...values, limit: 60 })}`);
  const rows = response.data || [];
  const types = [...new Set(rows.map((item) => item.type).filter(Boolean))].sort();
  const categories = [...new Set(rows.map((item) => item.category).filter(Boolean))].sort();
  return `${pageHero("Vijesti i priče", "Sport iz<br><span class=\"lime\">prvog reda.</span>", "Rezultati su samo dio priče. Upoznaj klubove, ljude i ideje koje mijenjaju domaći sport.", "04")}
    <section class="section"><div class="container">${filterForm({ placeholder: "Pretraži vijesti i intervjue", selects: [["type","Tip",types],["category","Kategorija",categories]] }, values)}<div class="results-info"><span><strong>${response.meta?.total ?? rows.length}</strong> objavljenih priča</span></div><div class="grid grid-3">${rows.map(newsCard).join("") || emptyState()}</div></div></section>`;
}

async function talentsPage() {
  const values = getFilters();
  const response = await apiResponse(`/api/talents${queryString({ ...values, limit: 60 })}`);
  const rows = response.data || [];
  const sports = [...new Set(rows.map((item) => item.sport).filter(Boolean))].sort();
  const cities = [...new Set(rows.map((item) => item.city).filter(Boolean))].sort();
  return `${pageHero("Sportski profili", "Rođeni da<br><span class=\"lime\">pomjeraju granice.</span>", "Upoznaj sportiste čiji rad, disciplina i rezultati inspirišu sljedeću generaciju.", "05")}
    <section class="section"><div class="container">${filterForm({ placeholder: "Ime, klub ili disciplina", selects: [["sport","Sport",sports],["city","Grad",cities]] }, values)}<div class="results-info"><span><strong>${response.meta?.total ?? rows.length}</strong> sportskih profila</span></div><div class="grid grid-3">${rows.map(talentCard).join("") || emptyState()}</div></div></section>`;
}

async function opportunitiesPage() {
  const values = getFilters();
  const response = await apiResponse(`/api/opportunities${queryString({ ...values, limit: 60 })}`);
  const rows = response.data || [];
  const sports = [...new Set(rows.map((item) => item.sport).filter(Boolean))].sort();
  const types = [...new Set(rows.map((item) => item.type).filter(Boolean))].sort();
  const cities = [...new Set(rows.map((item) => item.city).filter(Boolean))].sort();
  return `${pageHero("Kalendar prilika", "Sljedeći korak<br><span class=\"lime\">počinje ovdje.</span>", "Treninzi, upisi, kampovi, stipendije i volonterske prilike za sve koji žele više od sporta.", "06")}
    <section class="section"><div class="container">${filterForm({ placeholder: "Pretraži otvorene prilike", selects: [["type","Tip",types],["sport","Sport",sports],["city","Grad",cities]] }, values)}<div class="results-info"><span><strong>${response.meta?.total ?? rows.length}</strong> dostupnih prilika</span></div><div class="grid grid-3">${rows.map(opportunityCard).join("") || emptyState()}</div></div></section>`;
}

async function knowledgePage() {
  const values = getFilters();
  const [response, timeline] = await Promise.all([apiResponse(`/api/knowledge${queryString({ ...values, limit: 60 })}`), api("/api/knowledge/timeline")]);
  const rows = response.data || [];
  const categories = [...new Set(rows.map((item) => item.category).filter(Boolean))].sort();
  return `${pageHero("Baza znanja", "Znanje mijenja<br><span class=\"lime\">tok igre.</span>", "Od istorijskih trenutaka do praktičnih savjeta — upoznaj sport iz novih uglova i razumij njegov put.", "02")}
    <section class="section"><div class="container">${filterForm({ placeholder: "Pretraži teme, sportove i istoriju", selects: [["category","Kategorija",categories]] }, values)}<div class="results-info"><span><strong>${response.meta?.total ?? rows.length}</strong> edukativnih tekstova</span></div><div class="grid grid-3">${rows.map(knowledgeCard).join("") || emptyState()}</div></div></section>
    <section class="section section--line"><div class="container"><div class="section-head reveal"><div><span class="eyebrow">Vremeplov</span><h2 class="section-title">Trenuci koji su<br>oblikovali sport.</h2></div><p>Kratka hronologija značajnih događaja i ljudi koji su ostavili trag.</p></div><div class="timeline">${timeline.map((item) => `<article class="timeline-item reveal"><span class="timeline-year">${escapeHtml(item.timelineYear)}</span><i class="timeline-dot"></i><h3><a href="/baza-znanja/${encodeURIComponent(item.slug || item.id)}" data-link>${escapeHtml(item.title)}</a></h3><p>${escapeHtml(item.summary)}</p></article>`).join("") || emptyState("Timeline se priprema", "Uskoro dodajemo ključne sportske trenutke.")}</div></div></section>`;
}

async function documentsPage() {
  const values = getFilters();
  const response = await apiResponse(`/api/documents${queryString({ ...values, limit: 60 })}`);
  const rows = response.data || [];
  const categories = [...new Set(rows.map((item) => item.category).filter(Boolean))].sort();
  const institutions = [...new Set(rows.map((item) => item.institution).filter(Boolean))].sort();
  return `${pageHero("Dokumenti i procedure", "Pravila bez<br><span class=\"lime\">komplikovanja.</span>", "Važne sportske procedure, pravilnici i dokumenti objašnjeni jasno — da uvijek znaš šta je sljedeće.", "03")}
    <section class="section"><div class="container">${filterForm({ placeholder: "Dokument, procedura ili institucija", selects: [["category","Kategorija",categories],["institution","Institucija",institutions]] }, values)}<div class="results-info"><span><strong>${response.meta?.total ?? rows.length}</strong> dokumenata i vodiča</span></div><div class="grid grid-3">${rows.map(documentCard).join("") || emptyState()}</div></div></section>`;
}

async function mapPage() {
  const clubs = await api("/api/clubs/map");
  const locations = clubs.filter((club) => Number.isFinite(Number(club.location?.lat)) && Number.isFinite(Number(club.location?.lng)));
  state.mapData = locations;
  const marker = (club) => {
    const x = Math.max(14, Math.min(686, 350 + (Number(club.location.lng) - 17.91193235) * 0.7193 * 180));
    const y = Math.max(18, Math.min(542, 280 - (Number(club.location.lat) - 43.91586275) * 180));
    return `<g class="map-marker" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" data-map-id="${escapeHtml(club.id)}" role="button" tabindex="0" aria-label="${escapeHtml(club.name)}"><circle class="marker-pulse" r="15"/><path class="marker-pin" d="M0 12S-10 2-10-6a10 10 0 1 1 20 0C10 2 0 12 0 12Z"/><circle class="marker-core" cy="-6" r="2.7"/></g>`;
  };
  return `${pageHero("Interaktivna mapa", "Sport je<br><span class=\"lime\">svuda oko nas.</span>", "Istraži klubove i škole sporta širom Republike Srpske. Odaberi marker i pronađi adresu, uzraste i kontakt.", "MAP")}
    <section class="section"><div class="container"><div class="filters map-filters"><div class="input-wrap">${icon("search",18)}<input class="input" data-map-search placeholder="Pretraži klub ili grad"></div><select class="select" data-map-sport><option value="">Svi sportovi</option>${[...new Set(locations.map(c=>c.sport).filter(Boolean))].sort().map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(slugLabel(s))}</option>`).join("")}</select><button class="btn btn-primary" data-nearby>${icon("pin",17)} U mojoj blizini</button></div>
      <div class="map-layout"><div class="map-canvas" data-map-canvas>
        <svg class="map-region" viewBox="0 0 700 560" aria-hidden="true"><path class="rs-boundary" d="M128.4,94.3L133.4,103.7L141.8,109.3L146.2,117.1L156.3,109.2L169.7,112.3L182,110.4L187,119.1L195.1,116.7L203.1,121.2L206.2,129.6L206.3,140L213.5,145.7L212.8,152.8L216.9,156.3L218.2,169.5L204.7,175.3L182.3,170.3L164.7,170.7L158.7,173.5L160.9,182.7L197.3,207.7L243,249.7L254.1,253.6L266.1,251.5L270.7,232.4L264.1,223.3L261,211.2L254.9,204.6L255.1,200.4L260.1,194.5L259.3,184.8L262.9,182.1L270.3,186.6L274.3,182.2L279,183L295.4,199.6L299.2,198.9L302.3,202.3L315.2,201.1L347.6,185.4L354.7,179.9L357.3,173.6L355.2,163.1L346.6,148.1L351.1,136.2L355,133.7L370.3,138.4L369.8,144.5L373.5,148.9L374.7,161.5L388.3,156.8L397.9,161.7L414.7,159.4L415.8,154.6L412.5,155L411.8,149.7L407.2,150L401.9,141.8L400.1,143.5L396.4,139.3L379.8,135L379.9,126.8L390.8,122.3L402.5,123.3L405.8,117.2L404.4,109.9L411.6,103.6L413.7,97.7L421.8,98.6L429.4,107.7L431.2,115.2L434,115.6L440.3,111L446.9,99.1L452,97.3L452,93.4L455.4,92.8L422.2,72.8L418.7,72.5L415.2,77.6L411,77.8L411.2,81.1L406.1,81.2L404.4,86.1L401.7,86L393.3,73.2L375.8,70L370.6,65.5L372.5,63.5L370.8,59.7L366,62.2L363,57.6L352.7,65.5L353.1,70.3L342.5,76.9L318.4,60.7L309.5,65.7L303.9,65.3L302.9,61.5L300.8,65.1L294.6,65.1L295.7,60.5L290.3,62L290.1,56.1L285.4,60.6L278.4,59.9L267.4,50.8L263.7,58.6L254.9,58.4L238.7,48.7L236.7,44.2L233.3,46.3L234.8,42.4L230.9,44.9L228.1,39.6L228.8,43.7L223.9,43.8L226,38.8L222.9,35.1L219.8,39.6L216.7,38.6L216.8,44.1L214.2,43.7L216.3,45.3L212.9,48L210.6,45.6L211.7,49.9L208.5,51.6L197.2,47.5L189.1,48.6L179.9,43.2L168.9,45.1L163.9,51.9L162.4,59.2L153.5,64.6L154.6,67.1L148.4,84.3L129.5,87.8L128.4,94.3ZM352.2,413.6L355.3,423.7L361.8,424.7L365.4,429.8L357.1,437.4L358,443.6L355.2,448.9L360.1,461.4L359.5,467.9L367.2,480.3L383.3,493L399,513.4L408.9,514L418.1,524.9L426.1,519L431.8,521.7L432.6,518.1L428.8,513.5L435.8,509.2L432,500.3L435.2,495.3L425.6,492.4L419.7,477.8L423,475.8L422,471.4L427.3,465.3L423.9,457.8L428.6,441.3L446.9,438.1L445.4,418.4L447.9,408.2L454.3,403.1L450.5,399L472.2,387L470.1,382.1L479.3,379.9L485.5,385.3L485,393L491,399.4L495.6,392.6L501.3,390.9L492.3,364.7L485.2,363.4L484.4,354.2L480.7,356.6L479.5,354.3L488.3,349.9L490.4,344.4L497.5,354.5L510.6,348.2L523.4,349.6L522.7,338.2L526.2,337.5L524,337.2L525,335.6L534.5,338.9L538.7,334.9L543.8,342.3L557,339.4L554.6,337.5L554,331.2L556.8,331.9L559.1,327.7L558.1,316.3L545.4,301.4L541.9,301.1L523.3,273L521.3,263L541.2,272L559,272.8L563.9,265L571.2,262.1L571.6,255.6L567.2,251.9L565.2,256.5L552,243.5L553.2,238.6L548.3,241.1L543.7,234.4L537.4,231.7L533,216L521.7,217.7L518,212.4L512.3,213.6L504.2,197.9L505.1,193.4L509.9,190.1L507.5,171.3L513,170.1L515.7,165.5L514.9,161.2L519.4,157.9L518.7,153.4L524.2,150.6L524.4,146.5L530.2,140.8L529.9,133.3L533.7,130.2L529.9,126.4L532.9,123.7L529,123.4L532,121.6L532,117L536.6,116.1L535.7,111.4L538.5,110.8L538.9,106.5L529.7,101.2L518.6,103.5L513.5,99L499.9,109.5L491.5,111L490.2,113.2L493.6,116.1L487.4,115.4L480.9,126.3L470.4,123.9L467.4,126.8L466.3,128.9L469.9,131.5L468.7,136.6L458,141.2L456.8,152L464.1,158.3L464.1,162.1L476.2,167.7L481.1,167L486.2,154.1L495,153.3L497.3,160.9L494.5,167.9L495.4,174.4L492.1,177.3L493.3,180.8L488.1,182.6L482.4,191.6L474.3,191.3L459,202.5L458.2,209.7L461.1,219.1L467.7,226.1L465.5,229.8L466.9,236.4L447.3,249.1L429.8,269.6L422,283.5L424,285.9L421,295.9L415.5,292.6L409,294.2L404.6,300.7L404.4,304.5L413.4,316L433.3,315.1L441.2,321.6L451.4,323.8L459.5,305.6L479.7,306.3L482,314.2L493,325.6L492.8,330L464.3,342.6L416.7,324.7L411.3,331.9L410.8,339L404.9,342.5L405.4,360.2L381.1,361.8L374.4,359.1L361.9,362.2L357.3,375.6L362.1,379.8L364.4,399.1L360.8,405.3L355,406.5L352.2,413.6ZM542,345.1L544.5,347.7L546.4,345.3L545.7,342.5L542,345.1Z"/></svg>
        <svg class="map-marker-layer" viewBox="0 0 700 560" aria-label="Lokacije sportskih klubova">${locations.map(marker).join("")}</svg><div class="map-legend">${icon("pin",13)} ${locations.length} lokacija sa koordinatama</div><div data-map-tooltip></div>
      </div><aside class="map-sidebar"><div class="map-side-head"><h2>Klubovi u mreži</h2><p>Odaberi klub za više informacija</p></div><div class="map-list" data-map-list>${locations.map((club) => `<button class="map-club" data-map-id="${escapeHtml(club.id)}"><strong>${escapeHtml(club.name)}</strong><span>${escapeHtml(slugLabel(club.sport))} · ${escapeHtml(club.city)}</span></button>`).join("")}</div></aside></div>
    </div></section>`;
}

function infoRows(item, type) {
  const rows = [];
  if (type === "clubs") rows.push(["Sport", slugLabel(item.sport)], ["Tip", item.type === "school" ? "Škola sporta" : "Sportski klub"], ["Grad", item.city], ["Adresa", item.address], ["Uzrasti", (item.ageGroups || []).join(", ")]);
  if (type === "talents") rows.push(["Sport", slugLabel(item.sport)], ["Klub", item.club], ["Grad", item.city], ["Godište", item.birthYear], ["Pozicija", item.position]);
  if (type === "articles") rows.push(["Tip", slugLabel(item.type)], ["Kategorija", slugLabel(item.category)], ["Autor", item.author], ["Objavljeno", formatDate(item.publishedAt, true)]);
  if (type === "knowledge") rows.push(["Kategorija", slugLabel(item.category)], ["Godina", item.timelineYear], ["Objavljeno", formatDate(item.publishedAt, true)]);
  if (type === "documents") rows.push(["Kategorija", slugLabel(item.category)], ["Institucija", item.institution], ["Objavljeno", formatDate(item.publishedAt, true)]);
  if (type === "opportunities") rows.push(["Tip", slugLabel(item.type)], ["Sport", slugLabel(item.sport)], ["Grad", item.city], ["Termin", formatDate(item.startsAt, true)], ["Organizator", item.organizer]);
  return rows.filter(([,value]) => value).map(([label,value]) => `<div class="info-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
}

async function detailPage(type, id) {
  const config = routeInfo[type];
  const item = await api(`${config.endpoint}/${encodeURIComponent(id)}`);
  const title = item[config.titleKey];
  const summary = item.summary || item.biography || `${config.label} na SportHub RS platformi.`;
  const body = item.body || item.biography || item.simplifiedText || summary;
  const paragraphs = String(body).split(/\n+/).filter(Boolean);
  const achievements = type === "talents" && item.achievements?.length ? `<h2>Najvažnija dostignuća</h2><div class="procedure">${item.achievements.map((entry) => `<div class="procedure-step">${escapeHtml(entry)}</div>`).join("")}</div>` : "";
  const procedure = type === "documents" && item.simplifiedText ? `<h2>Jednostavno objašnjeno</h2><div class="procedure">${String(item.simplifiedText).split(/\n|\.|;/).filter(part=>part.trim().length>5).map(part=>`<div class="procedure-step">${escapeHtml(part.trim())}</div>`).join("")}</div>` : "";
  const external = item.fileUrl || item.sourceUrl || item.contact?.website;
  return `${pageHero(config.label, escapeHtml(title), summary, type.slice(0,3).toUpperCase())}<section class="section"><div class="container"><div class="detail-layout"><article class="detail-content reveal">${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}${achievements}${procedure}</article><aside class="detail-aside reveal"><div class="info-box">${tag(item.sport || item.category || item.type, "lime")}<h3>Brzi pregled</h3><div class="info-list">${infoRows(item,type)}</div>${external ? `<a href="${escapeHtml(external)}" target="_blank" rel="noreferrer" class="btn btn-ghost" style="width:100%;margin-top:18px">Izvor / kontakt ${icon("external",16)}</a>` : ""}</div><a href="${config.base}" data-link class="text-link" style="margin-top:20px">${icon("back",17)} Nazad na ${config.label.toLowerCase()}</a></aside></div></div></section>`;
}

async function contactPage() {
  return `${pageHero("Kontakt", "Dobra ideja<br><span class=\"lime\">mijenja igru.</span>", "Dopuni podatke o klubu, predloži sportsku priču ili nam pošalji pitanje. Odgovaramo jasno i direktno.", "HI")}
    <section class="section"><div class="container"><div class="contact-panel"><div><span class="eyebrow">Otvorena linija</span><h2>Piši SportHub timu.</h2><p>Svaka tačna informacija čini platformu boljom za mlade sportiste i njihove roditelje.</p><div class="info-list"><div class="info-row"><span>Odgovor</span><strong>U najkraćem roku</strong></div><div class="info-row"><span>Teme</span><strong>Klubovi · Sadržaj · Saradnja</strong></div></div></div>
      <form class="stack" data-contact-form><div class="grid grid-2"><div class="field"><label for="contact-name">Ime i prezime</label><input class="input" id="contact-name" name="name" required></div><div class="field"><label for="contact-email">E-mail</label><input class="input" id="contact-email" name="email" type="email" required></div></div><div class="field"><label for="contact-topic">Tema</label><select class="select" id="contact-topic" name="topic"><option value="club-data">Podaci o klubu</option><option value="content">Prijedlog sadržaja</option><option value="partnership">Saradnja</option><option value="general">Ostalo</option></select></div><div class="field"><label for="contact-message">Poruka</label><textarea class="textarea" id="contact-message" name="message" required placeholder="Kako možemo pomoći?"></textarea></div><button class="btn btn-primary" type="submit">Pošalji poruku ${icon("arrow",18)}</button></form>
    </div></div></section>`;
}

function notFoundPage() {
  return `${pageHero("404", "Van<br><span class=\"lime\">terena.</span>", "Stranica koju tražiš ne poštoji ili je premještena.", "404")}<section class="section section--tight"><div class="container"><a class="btn btn-primary" href="/" data-link>${icon("back",18)} Nazad na početnu</a></div></section>`;
}

function parseRoute() {
  const path = currentPath();
  const details = [
    ["clubs", "/klubovi/"], ["knowledge", "/baza-znanja/"], ["documents", "/propisi/"], ["articles", "/vijesti/"], ["talents", "/talenti/"], ["opportunities", "/prilike/"]
  ];
  for (const [type,prefix] of details) if (path.startsWith(prefix)) return { page: "detail", type, id: decodeURIComponent(path.slice(prefix.length)) };
  return { page: { "/": "home", "/klubovi": "clubs", "/mapa": "map", "/baza-znanja": "knowledge", "/propisi": "documents", "/vijesti": "news", "/talenti": "talents", "/prilike": "opportunities", "/kontakt": "contact", "/admin": "admin" }[path] || "notFound" };
}

async function getPageContent(route) {
  if (route.page === "home") return homePage();
  if (route.page === "clubs") return clubsPage();
  if (route.page === "map") return mapPage();
  if (route.page === "knowledge") return knowledgePage();
  if (route.page === "documents") return documentsPage();
  if (route.page === "news") return newsPage();
  if (route.page === "talents") return talentsPage();
  if (route.page === "opportunities") return opportunitiesPage();
  if (route.page === "contact") return contactPage();
  if (route.page === "detail") return detailPage(route.type, route.id);
  if (route.page === "admin") return adminPage();
  return notFoundPage();
}

async function render({ scroll = true } = {}) {
  const renderId = ++state.renderId;
  const route = parseRoute();
  document.body.classList.remove("no-scroll");
  state.mobileOpen = false;
  app.innerHTML = `${header()}<main id="main" class="page-shell">${skeletonPage()}</main>${footer()}`;
  if (scroll) window.scrollTo({ top: 0, behavior: "instant" });
  bindGlobalEvents();
  try {
    const content = await getPageContent(route);
    if (renderId !== state.renderId) return;
    document.querySelector("#main").innerHTML = content;
    document.title = titleForRoute(route);
    bindPageEvents(route);
    enhanceMotion();
  } catch (error) {
    if (renderId !== state.renderId) return;
    document.querySelector("#main").innerHTML = errorPage(error);
    document.querySelector("[data-retry]")?.addEventListener("click", () => render({ scroll: false }));
  }
}

function titleForRoute(route) {
  const labels = { home: "Pokreni svoju igru", clubs: "Klubovi", map: "Sportska mapa", knowledge: "Baza znanja", documents: "Propisi", news: "Vijesti", talents: "Talenti", opportunities: "Sportske prilike", contact: "Kontakt", admin: "Administracija", notFound: "Stranica nije pronađena" };
  return `${route.page === "detail" ? routeInfo[route.type].label : labels[route.page]} — SportHub RS`;
}

function navigate(href) {
  const url = new URL(href, window.location.origin);
  history.pushState({}, "", `${url.pathname}${url.search}`);
  render();
}

function bindGlobalEvents() {
  document.querySelectorAll("[data-link]").forEach((link) => { link.dataset.bound = "1"; link.addEventListener("click", (event) => { if (!event.ctrlKey && !event.metaKey) { event.preventDefault(); navigate(link.getAttribute("href")); } }); });
  document.querySelector("[data-menu]")?.addEventListener("click", () => {
    state.mobileOpen = !state.mobileOpen;
    document.querySelector(".mobile-panel")?.classList.toggle("open", state.mobileOpen);
  });
  document.querySelector("[data-search-open]")?.addEventListener("click", openSearch);
  const headerEl = document.querySelector("#site-header");
  const updateHeader = () => headerEl?.classList.toggle("scrolled", window.scrollY > 20);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true, once: true });
}

function bindPageEvents(route) {
  document.querySelectorAll("[data-link]").forEach((link) => { if (!link.dataset.bound) { link.dataset.bound = "1"; link.addEventListener("click", (event) => { if (!event.ctrlKey && !event.metaKey) { event.preventDefault(); navigate(link.getAttribute("href")); } }); } });
  document.querySelector("[data-filter-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = queryString(Object.fromEntries(form.entries()));
    history.pushState({}, "", `${currentPath()}${query}`);
    render({ scroll: false });
  });
  document.querySelector("[data-contact-form]")?.addEventListener("submit", submitContact);
  if (route.page === "map") bindMapEvents();
  if (route.page === "admin") bindAdminEvents();
}

function enhanceMotion() {
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); } }), { threshold: .12 });
  document.querySelectorAll(".reveal").forEach((element, index) => { element.style.transitionDelay = `${Math.min(index % 6, 5) * 55}ms`; observer.observe(element); });
  document.querySelectorAll("[data-tilt]").forEach((card) => card.addEventListener("pointermove", (event) => { const rect = card.getBoundingClientRect(); card.style.setProperty("--mx", `${event.clientX - rect.left}px`); card.style.setProperty("--my", `${event.clientY - rect.top}px`); }));
  document.querySelectorAll("[data-count]").forEach((element) => animateCount(element));
}

function animateCount(element) {
  const target = Number(element.dataset.count || 0);
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min((now - start) / 1000, 1);
    element.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3)));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function submitContact(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  const values = Object.fromEntries(new FormData(form).entries());
  button.disabled = true;
  button.textContent = "Šaljem…";
  try {
    await api("/api/contact/messages", { method: "POST", body: JSON.stringify(values) });
    form.reset();
    toast("Poruka je uspješno poslata. Hvala ti!");
  } catch (error) { toast(error.message, true); }
  finally { button.disabled = false; button.innerHTML = `Pošalji poruku ${icon("arrow",18)}`; }
}

function bindMapEvents() {
  const clubs = [...document.querySelectorAll(".map-club")];
  const markers = [...document.querySelectorAll(".map-marker")];
  const tooltipHost = document.querySelector("[data-map-tooltip]");
  const allData = new Map((state.mapData || []).map((row) => [row.id, row]));
  const activate = (id) => {
    clubs.forEach((element) => element.classList.toggle("active", element.dataset.mapId === id));
    markers.forEach((element) => element.classList.toggle("active", element.dataset.mapId === id));
    const activeMarker = markers.find((element) => element.dataset.mapId === id);
    const club = allData.get(id);
    if (activeMarker && club) {
      const canvasRect = document.querySelector("[data-map-canvas]").getBoundingClientRect();
      const markerRect = activeMarker.getBoundingClientRect();
      const markerX = markerRect.left - canvasRect.left + markerRect.width / 2;
      const markerY = markerRect.top - canvasRect.top + markerRect.height / 2;
      const tooltipWidth = window.innerWidth <= 560 ? 190 : 250;
      const tooltipX = Math.max(8, Math.min(canvasRect.width - tooltipWidth - 22, markerX));
      tooltipHost.innerHTML = `<div class="map-tooltip" style="left:${tooltipX}px;top:${markerY}px">${tag(club.sport,"lime")}<h3>${escapeHtml(club.name)}</h3><p>${escapeHtml(club.address || club.city)} · ${(club.ageGroups || []).slice(0,3).map(escapeHtml).join(", ")}</p></div>`;
    }
  };
  [...clubs,...markers].forEach((element) => {
    element.addEventListener("click", () => activate(element.dataset.mapId));
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(element.dataset.mapId); }
    });
  });
  document.querySelector("[data-map-search]")?.addEventListener("input", (event) => {
    const query = event.target.value.toLowerCase();
    clubs.forEach((element) => { const show = element.textContent.toLowerCase().includes(query); element.hidden = !show; markers.find(marker=>marker.dataset.mapId===element.dataset.mapId).hidden = !show; });
  });
  document.querySelector("[data-map-sport]")?.addEventListener("change", (event) => {
    const sport = event.target.value;
    clubs.forEach((element) => { const data = allData.get(element.dataset.mapId); const show = !sport || data?.sport === sport; element.hidden = !show; markers.find(marker=>marker.dataset.mapId===element.dataset.mapId).hidden = !show; });
  });
  document.querySelector("[data-nearby]")?.addEventListener("click", () => {
    if (!navigator.geolocation) return toast("Lokacija nije dostupna u ovom pregledniku.", true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const nearby = await api(`/api/clubs/map?lat=${coords.latitude}&lng=${coords.longitude}&radiusKm=100`);
        const ids = new Set(nearby.map(item=>item.id));
        clubs.forEach((element) => element.hidden = !ids.has(element.dataset.mapId));
        markers.forEach((element) => element.hidden = !ids.has(element.dataset.mapId));
        toast(`Pronađeno ${nearby.length} klubova u krugu od 100 km.`);
      } catch (error) { toast(error.message,true); }
    }, () => toast("Nije odobren pristup lokaciji.", true));
  });
}

function openSearch() {
  state.searchOpen = true;
  document.body.classList.add("no-scroll");
  document.body.insertAdjacentHTML("beforeend", `<div class="overlay" data-search-overlay><div class="search-modal"><div class="search-top"><div class="input-wrap">${icon("search",20)}<input class="input" data-global-search placeholder="Pretraži klubove, vijesti, znanje, talente…" autocomplete="off"><span class="sr-only">Globalna pretraga</span></div><button class="icon-btn" data-search-close aria-label="Zatvori pretragu">${icon("close",21)}</button></div><div class="search-results" data-search-results><div class="empty" style="min-height:220px"><div><div class="empty-icon">${icon("spark",27)}</div><h3>Šta tražiš?</h3><p>Unesi najmanje dva slova za pretragu cijele platforme.</p></div></div></div></div></div>`);
  const input = document.querySelector("[data-global-search]");
  input.focus();
  input.addEventListener("input", () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => performSearch(input.value), 280);
  });
  document.querySelector("[data-search-close]").addEventListener("click", closeSearch);
  document.querySelector("[data-search-overlay]").addEventListener("click", (event) => { if (event.target === event.currentTarget) closeSearch(); });
}

function closeSearch() {
  state.searchOpen = false;
  document.body.classList.remove("no-scroll");
  document.querySelector("[data-search-overlay]")?.remove();
}

async function performSearch(query) {
  const host = document.querySelector("[data-search-results]");
  if (!host) return;
  if (query.trim().length < 2) { host.innerHTML = emptyState("Nastavi unos", "Potrebna su najmanje dva slova."); return; }
  host.innerHTML = `<div class="skeleton"></div>`;
  try {
    const result = await api(`/api/search?q=${encodeURIComponent(query.trim())}`);
    const groups = [["clubs","Klubovi"],["knowledge","Baza znanja"],["documents","Dokumenti"],["articles","Vijesti"],["talents","Talenti"]];
    const html = groups.filter(([key]) => result[key]?.length).map(([key,label]) => `<div class="search-group"><h3>${label}</h3>${result[key].slice(0,5).map((item) => `<a href="${routeInfo[key].base}/${encodeURIComponent(item.slug || item.id)}" data-search-link class="search-result"><strong>${escapeHtml(item.name || item.title)}</strong>${icon("arrow",16)}</a>`).join("")}</div>`).join("");
    host.innerHTML = html || emptyState("Bez rezultata", "Pokušaj sa drugim pojmom.");
    host.querySelectorAll("[data-search-link]").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); const href = link.getAttribute("href"); closeSearch(); navigate(href); }));
  } catch (error) { host.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`; }
}

function adminLogin() {
  return `<div class="login-shell"><form class="login-card" data-login-form><span class="brand-mark">${icon("bolt",22)}</span><h1>Kontrolni centar</h1><p>Prijavi se za uređivanje klubova, sadržaja, talenata i sportskih prilika.</p><div class="stack"><div class="field"><label for="login-user">Korisničko ime</label><input class="input" id="login-user" name="username" autocomplete="username" value="admin" required></div><div class="field"><label for="login-password">Lozinka</label><input class="input" id="login-password" name="password" type="password" autocomplete="current-password" required></div><button class="btn btn-primary" type="submit">Prijavi se ${icon("arrow",17)}</button></div><p class="muted" style="font-size:.7rem;margin:20px 0 0">Zaštićena administrativna zona · Bearer autentifikacija</p></form></div>`;
}

async function adminPage() {
  const token = localStorage.getItem("sporthub_token");
  if (!token) { state.adminUser = null; return adminLogin(); }
  try {
    state.adminUser = await api("/api/auth/me");
  } catch {
    localStorage.removeItem("sporthub_token");
    state.adminUser = null;
    return adminLogin();
  }

  const module = adminModules[state.adminModule] || adminModules.clubs;
  const response = await apiResponse(`${module.endpoint}${queryString({ limit: 100 })}`);
  const rows = response.data || [];
  const titleValue = (item) => item[module.title] || item.email || "Bez naziva";
  const tableRows = rows.map((item) => {
    const status = item.status || (item.verified ? "verified" : "unverified");
    return `<tr><td><strong>${escapeHtml(titleValue(item))}</strong><span class="muted">${escapeHtml(item.city || item.category || item.topic || item.sport || "")}</span></td><td>${tag(status, status === "published" || status === "verified" ? "lime" : "amber")}</td><td>${formatDate(item.updatedAt || item.createdAt)}</td><td><div class="table-actions">${state.adminModule === "messages" ? `<button class="btn btn-sm btn-ghost" data-message-read="${escapeHtml(item.id)}">${icon("check",14)} Obrađeno</button>` : `<button class="icon-btn" data-admin-edit="${escapeHtml(item.id || item.slug)}" aria-label="Uredi">${icon("edit",16)}</button><button class="icon-btn" data-admin-delete="${escapeHtml(item.id || item.slug)}" aria-label="Obriši">${icon("trash",16)}</button>`}</div></td></tr>`;
  }).join("");

  return `<div class="admin-layout"><aside class="admin-sidebar"><div class="admin-user"><strong>${escapeHtml(state.adminUser.name || state.adminUser.username)}</strong><span>${escapeHtml(state.adminUser.role)} · online</span></div><nav class="admin-nav">${Object.entries(adminModules).map(([key,value]) => `<button data-admin-module="${key}" class="${state.adminModule === key ? "active" : ""}">${icon(value.icon,17)} ${escapeHtml(value.label)}</button>`).join("")}</nav><button class="btn btn-ghost btn-sm" data-logout style="margin-top:24px;width:100%">${icon("logout",15)} Odjavi se</button></aside>
    <div class="admin-main"><div class="admin-top"><div><span class="eyebrow">Administracija</span><h1>${escapeHtml(module.label)}</h1><p>${rows.length} stavki dostupno za upravljanje</p></div>${state.adminModule !== "messages" ? `<button class="btn btn-primary" data-admin-create>${icon("plus",17)} <span>Dodaj novo</span></button>` : ""}</div>
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Naziv / podaci</th><th>Status</th><th>Ažurirano</th><th style="text-align:right">Akcije</th></tr></thead><tbody>${tableRows || `<tr><td colspan="4">${emptyState("Nema sadržaja", "Dodaj prvu stavku u ovu kolekciju.")}</td></tr>`}</tbody></table></div></div></div>`;
}

function bindAdminEvents() {
  document.querySelector("[data-login-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    const values = Object.fromEntries(new FormData(form).entries());
    button.disabled = true;
    button.textContent = "Prijavljujem…";
    try {
      const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify(values) });
      localStorage.setItem("sporthub_token", result.token);
      state.adminUser = result.user;
      toast(`Dobro došli, ${result.user.name || result.user.username}.`);
      render({ scroll: false });
    } catch (error) {
      toast(error.message === "Invalid username or password" ? "Pogrešno korisničko ime ili lozinka." : error.message, true);
      button.disabled = false;
      button.innerHTML = `Prijavi se ${icon("arrow",17)}`;
    }
  });
  document.querySelectorAll("[data-admin-module]").forEach((button) => button.addEventListener("click", () => { state.adminModule = button.dataset.adminModule; render({ scroll: false }); }));
  document.querySelector("[data-logout]")?.addEventListener("click", () => { localStorage.removeItem("sporthub_token"); state.adminUser = null; toast("Uspješno ste se odjavili."); render({ scroll: false }); });
  document.querySelector("[data-admin-create]")?.addEventListener("click", () => openAdminEditor());
  document.querySelectorAll("[data-admin-edit]").forEach((button) => button.addEventListener("click", () => openAdminEditor(button.dataset.adminEdit)));
  document.querySelectorAll("[data-admin-delete]").forEach((button) => button.addEventListener("click", () => deleteAdminItem(button.dataset.adminDelete)));
  document.querySelectorAll("[data-message-read]").forEach((button) => button.addEventListener("click", () => markMessageRead(button.dataset.messageRead)));
}

function adminFieldValue(item, key) {
  if (!item) return "";
  if (key === "lat" || key === "lng") return item.location?.[key] ?? "";
  if (key === "phone" || key === "email") return item.contact?.[key] ?? "";
  if (Array.isArray(item[key])) return item[key].join(", ");
  if (key === "verified") return String(item[key] ?? false);
  if (key === "startsAt" && item[key]) return new Date(item[key]).toISOString().slice(0,16);
  return item[key] ?? "";
}

function renderAdminField(field, item) {
  const [key,label,type,required,options] = field;
  const value = adminFieldValue(item,key);
  const wide = type === "textarea" || type === "list" ? "wide" : "";
  const requiredAttr = required ? "required" : "";
  if (type === "select") return `<div class="field ${wide}"><label for="field-${key}">${escapeHtml(label)}</label><select class="select" id="field-${key}" name="${key}" ${requiredAttr}>${options.map(option => `<option value="${escapeHtml(option)}" ${String(value) === String(option) ? "selected" : ""}>${escapeHtml(slugLabel(option))}</option>`).join("")}</select></div>`;
  if (type === "textarea") return `<div class="field wide"><label for="field-${key}">${escapeHtml(label)}</label><textarea class="textarea" id="field-${key}" name="${key}" ${requiredAttr}>${escapeHtml(value)}</textarea></div>`;
  return `<div class="field ${wide}"><label for="field-${key}">${escapeHtml(label)}</label><input class="input" id="field-${key}" name="${key}" type="${type === "list" ? "text" : type}" value="${escapeHtml(value)}" ${type === "number" ? 'step="any"' : ""} ${requiredAttr}></div>`;
}

async function openAdminEditor(id = null) {
  const module = adminModules[state.adminModule];
  let item = null;
  try {
    if (id) item = await api(`${module.endpoint}/${encodeURIComponent(id)}`);
  } catch (error) { toast(error.message,true); return; }
  document.body.classList.add("no-scroll");
  document.body.insertAdjacentHTML("beforeend", `<div class="overlay" data-admin-overlay><form class="modal-card" data-admin-form data-id="${escapeHtml(id || "")}"><div class="modal-head"><div><h2>${id ? "Uredi" : "Dodaj"} — ${escapeHtml(module.label)}</h2><p>Polja označena preglednikom su obavezna za čuvanje.</p></div><button type="button" class="icon-btn" data-modal-close>${icon("close",20)}</button></div><div class="form-grid">${module.fields.map(field => renderAdminField(field,item)).join("")}</div><div class="form-actions"><button type="button" class="btn btn-ghost" data-modal-close>Odustani</button><button type="submit" class="btn btn-primary">${icon("check",17)} Sačuvaj promjene</button></div></form></div>`);
  const close = () => { document.querySelector("[data-admin-overlay]")?.remove(); document.body.classList.remove("no-scroll"); };
  document.querySelectorAll("[data-modal-close]").forEach((button) => button.addEventListener("click", close));
  document.querySelector("[data-admin-overlay]").addEventListener("click", (event) => { if (event.target === event.currentTarget) close(); });
  document.querySelector("[data-admin-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type=submit]");
    const values = Object.fromEntries(new FormData(form).entries());
    const payload = buildAdminPayload(values, module, item);
    button.disabled = true;
    button.textContent = "Čuvam…";
    try {
      await api(id ? `${module.endpoint}/${encodeURIComponent(id)}` : module.endpoint, { method: id ? "PATCH" : "POST", body: JSON.stringify(payload) });
      close();
      toast(id ? "Promjene su sačuvane." : "Nova stavka je kreirana.");
      render({ scroll: false });
    } catch (error) { toast(error.message,true); button.disabled = false; button.innerHTML = `${icon("check",17)} Sačuvaj promjene`; }
  });
}

function buildAdminPayload(values, module, existing) {
  const payload = {};
  for (const [key,,type] of module.fields) {
    const raw = values[key];
    if (raw === "" && !["verified"].includes(key)) continue;
    if (type === "list") payload[key] = raw.split(",").map(value=>value.trim()).filter(Boolean);
    else if (type === "number") payload[key] = Number(raw);
    else if (key === "verified") payload[key] = raw === "true";
    else if (type === "datetime-local") payload[key] = new Date(raw).toISOString();
    else payload[key] = raw;
  }
  if (module === adminModules.clubs) {
    const lat = values.lat === "" ? existing?.location?.lat : Number(values.lat);
    const lng = values.lng === "" ? existing?.location?.lng : Number(values.lng);
    delete payload.lat; delete payload.lng;
    if (Number.isFinite(lat) && Number.isFinite(lng)) payload.location = { lat, lng };
    const phone = values.phone || existing?.contact?.phone;
    const email = values.email || existing?.contact?.email;
    delete payload.phone; delete payload.email;
    if (phone || email) payload.contact = { ...(existing?.contact || {}), ...(phone ? { phone } : {}), ...(email ? { email } : {}) };
  }
  if (!existing && [adminModules.knowledge,adminModules.documents,adminModules.articles,adminModules.talents,adminModules.opportunities].includes(module) && !payload.publishedAt) payload.publishedAt = new Date().toISOString();
  return payload;
}

async function deleteAdminItem(id) {
  const module = adminModules[state.adminModule];
  if (!window.confirm("Trajno obrisati ovu stavku? Ova radnja se ne može poništiti.")) return;
  try {
    await api(`${module.endpoint}/${encodeURIComponent(id)}`, { method: "DELETE" });
    toast("Stavka je obrisana.");
    render({ scroll: false });
  } catch (error) { toast(error.message,true); }
}

async function markMessageRead(id) {
  try {
    await api(`/api/admin/messages/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status: "resolved" }) });
    toast("Poruka je označena kao obrađena.");
    render({ scroll: false });
  } catch (error) { toast(error.message,true); }
}

function toast(message, isError = false) {
  document.querySelector(".toast")?.remove();
  clearTimeout(state.toastTimer);
  document.body.insertAdjacentHTML("beforeend", `<div class="toast ${isError ? "error" : ""}">${icon(isError ? "close" : "check",18)}<span>${escapeHtml(message)}</span></div>`);
  state.toastTimer = setTimeout(() => document.querySelector(".toast")?.remove(), 4200);
}

window.addEventListener("popstate", () => render());
window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); if (!state.searchOpen) openSearch(); }
  if (event.key === "Escape" && state.searchOpen) closeSearch();
});

render();
