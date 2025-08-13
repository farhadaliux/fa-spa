/* SPA Router & Renderers (Vanilla JS) */
const routes = {
  "/": renderHome,
  "/work": renderWorkIndex,
  "/work/:slug": renderWorkDetail,
  "/research": renderResearchIndex,
  "/research/:slug": renderResearchDetail,
  "/about": renderAbout
};

let works = [];
let research = [];

async function bootstrap() {

  startLoadingBar();
  try {
    works = (await fetch("data/works.json").then(r => r.json())).works;
    research = (await fetch("data/research.json").then(r => r.json())).research;
    // Init router
    window.addEventListener("hashchange", onRoute);
    onRoute();

    // Header behaviors
    setupHeader();
    setupContact();

    // Footer meta
    document.getElementById("year").textContent = new Date().getFullYear();
    document.getElementById("lastUpdated").textContent = new Date(document.lastModified).toLocaleDateString();
  } finally {
    setTimeout(finishLoadingBar, 50);
  }
}



document.addEventListener("DOMContentLoaded", bootstrap);

function setupHeader() {
  const menuBtn = document.getElementById("menuBtn");
  const drawer = document.getElementById("mobileNav");
  const drawerClose = document.getElementById("drawerClose");

  // Hard page scroll lock (iOS/Android safe)
  function lockScroll() {
    const y = window.scrollY || window.pageYOffset || 0;
    document.body.dataset.scrollY = y;
    document.body.style.top = `-${y}px`;
    document.body.classList.add('no-scroll-fixed');
  }
  function unlockScroll() {
    const y = parseInt(document.body.dataset.scrollY || '0', 10);
    document.body.classList.remove('no-scroll-fixed');
    document.body.style.top = '';
    window.scrollTo(0, y);
    delete document.body.dataset.scrollY;
  }

  const openDrawer = () => {
    if (!drawer.open) {
      drawer.showModal();                            // <dialog> API
      menuBtn?.setAttribute("aria-expanded", "true");
      lockScroll();
    }
  };
  const closeDrawer = () => {
    if (drawer.open) drawer.close();                 // triggers "close"
  };

  menuBtn?.addEventListener("click", openDrawer);
  drawerClose?.addEventListener("click", closeDrawer);

  // Close when a link/button inside the drawer is clicked
  drawer.addEventListener("click", (e) => {
    const el = e.target.closest("[data-nav-close]");
    if (el) closeDrawer();
  });

  // DO NOT close on backdrop click (prevents bottom-gap tap from closing)
  // (remove any previous handler that closed when e.target === drawer)

  drawer.addEventListener("close", () => {
    menuBtn?.setAttribute("aria-expanded", "false");
    unlockScroll();
  });

  // Also close on route change and on resize to desktop
  window.addEventListener("hashchange", closeDrawer);
  const mq = window.matchMedia("(min-width: 1025px)");
  const onMQ = e => { if (e.matches) closeDrawer(); };
  mq.addEventListener ? mq.addEventListener("change", onMQ) : mq.addListener(onMQ);
}

function setupContact() {
  const modal = document.getElementById("contactModal");
  const openers = [document.getElementById("contactOpen"), document.getElementById("contactOpenMobile"), document.getElementById("contactOpenFooter")];
  const closer = document.getElementById("contactClose");

  openers.forEach(btn => btn && btn.addEventListener("click", () => modal.showModal()));
  closer?.addEventListener("click", () => modal.close());
  modal?.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
}

// ---- Breadcrumbs (top-level, no conflicts) ----
function escapeHtml(s = '') {
  return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function renderBreadcrumbsFor(path) {
  const el = document.getElementById('breadcrumbs');
  if (!el) return;

  const parts = (path || '').split('/').filter(Boolean);
  let items = null;

  if (parts[0] === 'work' && parts.length === 1) {
    items = [{ label: 'Home', href: '#/' }, { label: 'Work' }];
  } else if (parts[0] === 'work' && parts[1]) {
    const w = (window.works || []).find(x => x.slug === parts[1]);
    items = [{ label: 'Home', href: '#/' }, { label: 'Work', href: '#/work' }, { label: w?.title || parts[1] }];
  } else if (parts[0] === 'research' && parts.length === 1) {
    items = [{ label: 'Home', href: '#/' }, { label: 'Research' }];
  } else if (parts[0] === 'research' && parts[1]) {
    const r = (window.research || []).find(x => x.slug === parts[1]);
    items = [{ label: 'Home', href: '#/' }, { label: 'Research', href: '#/research' }, { label: r?.title || parts[1] }];
  } else if (parts[0] === 'about') {
    items = [{ label: 'Home', href: '#/' }, { label: 'About' }];
  }

  if (!items) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }

  el.style.display = '';
  el.innerHTML = items.map((it, i) => {
    const last = i === items.length - 1;
    return last
      ? `<span aria-current="page">${escapeHtml(it.label)}</span>`
      : `<a href="${it.href}">${escapeHtml(it.label)}</a><span class="sep">></span>`;
  }).join(' ');
}

// --- Compatibility: keep old Breadcrumbs.render(...) calls working ---
if (!window.Breadcrumbs) {
  window.Breadcrumbs = {
    render(items) {
      const el = document.getElementById('breadcrumbs');
      if (!el) return;
      if (!items || !items.length) {
        el.style.display = 'none';
        el.innerHTML = '';
        return;
      }
      el.style.display = '';
      el.innerHTML = items.map((it, i) => {
        const last = i === items.length - 1;
        return last
          ? `<span aria-current="page">${escapeHtml(it.label)}</span>`
          : `<a href="${it.href}">${escapeHtml(it.label)}</a><span class="sep">></span>`;
      }).join(' ');
    }
  };
}



// --- Top loading bar (adaptive YouTube-style) ---
let __loaderTimer = null;
let __loaderProgress = 0;
let __loaderStart = 0;
const MIN_VISIBLE_MS = 650;  // keep bar visible at least ~0.65s
const STEP_MS = 80;          // how often we bump progress
const MAX_BEFORE_FINISH = 90; // creep up to 90% while “loading”

function __setBar(pct) {
  const bar = document.getElementById('loading-bar');
  if (!bar) return;
  bar.style.opacity = '1';
  bar.style.width = pct + '%';
}

function startLoadingBar() {
  clearInterval(__loaderTimer);
  __loaderStart = performance.now();
  __loaderProgress = 0;
  __setBar(0);

  // Smooth-ish ramp toward 90% with easing
  __loaderTimer = setInterval(() => {
    // ease: smaller increments as we get closer to 90
    const remaining = MAX_BEFORE_FINISH - __loaderProgress;        // e.g., 90 - 35 = 55
    const step = Math.max(1, Math.ceil(remaining * 0.12));          // 12% of remaining, min 1
    __loaderProgress = Math.min(MAX_BEFORE_FINISH, __loaderProgress + step);
    __setBar(__loaderProgress);
    if (__loaderProgress >= MAX_BEFORE_FINISH) {
      clearInterval(__loaderTimer);
    }
  }, STEP_MS);

  // quick kick so users notice
  requestAnimationFrame(() => __setBar(12));
}

function finishLoadingBar() {
  const elapsed = performance.now() - __loaderStart;
  const wait = Math.max(0, MIN_VISIBLE_MS - elapsed); // enforce minimum visible duration

  clearInterval(__loaderTimer);

  setTimeout(() => {
    // finish to 100, then fade out and reset
    __setBar(100);
    setTimeout(() => {
      const bar = document.getElementById('loading-bar');
      if (!bar) return;
      bar.style.opacity = '0';
      setTimeout(() => { bar.style.width = '0%'; }, 180);
    }, 180);
  }, wait);
}
/* ===== Maintenance Mode (global switch via data/maintenance.json) ===== */

// Admin bypass (so you can view the site during maintenance)
// Visit with ?bypass=1 to enable in your browser, ?bypass=0 to clear
(function setupBypassFromURL() {
  const u = String(location.href);
  if (/[?&#]bypass=1\b/i.test(u)) localStorage.setItem('maintBypass', '1');
  if (/[?&#]bypass=0\b/i.test(u)) localStorage.removeItem('maintBypass');
})();
function maintBypass() { return localStorage.getItem('maintBypass') === '1'; }

// Fetch maintenance config (cache-busted to avoid CDN caching)
async function getMaintenanceConfig() {
  try {
    const res = await fetch(`data/maintenance.json?ts=${Date.now()}`, { cache: 'no-store' });
    return await res.json();
  } catch (e) {
    // If the file is missing or JSON fails, assume not in maintenance
    return { enabled: false };
  }
}

function renderMaintenanceScreen(config = {}) {
  // NEW: set CSS var for the background image (if provided)
  if (config.bgImage) {
    document.documentElement.style.setProperty('--maint-bg', `url('${config.bgImage}')`);
  } else {
    document.documentElement.style.setProperty('--maint-bg', 'none');
  }

  document.body.classList.add('maintenance');
  const main = document.getElementById('main');
  const msg = config.message || "We're making improvements.";
  const when = config.availableAt ? new Date(config.availableAt) : null;

  main.innerHTML = `
    <section class="maintenance-screen">
      <div class="maintenance-card">
            <a href="#/" class="logo" aria-label="Farhad Ali — Home">
        <img src="img/placeholders/favicon.svg" class="logo-mark" alt="" aria-hidden="true">
        <span class="logo-text">Farhad&nbsp;Ali</span>
      </a>
          <h1>New case studies incoming...!</h1>
        <p class="sub">${escapeHtml(msg)}</p>
        ${when ? `<p class="mono">Expected back online: ${when.toLocaleString()}</p>` : ``}
        <div class="maintenance-actions">
        ${config.contact?.whatsapp ? `<a class="btn ghost" href="${config.contact.whatsapp}" target="_blank" rel="noopener">WhatsApp me</a>` : ``}
          ${config.contact?.email ? `<a class="btn ghost" href="mailto:${config.contact.email}">Email me</a>` : ``}
          
        </div>

      </div>
    </section>
  `;
}

// Quick check used in bootstrap + navigation
async function enforceMaintenance() {
  const cfg = await getMaintenanceConfig();
  const active = !!cfg.enabled && !maintBypass();
  if (active) {
    renderMaintenanceScreen(cfg);
    document.documentElement.classList.remove('pre-maint');   // ⟵ NEW: stop the temporary hide
    return true; // blocked
  } else {
    document.body.classList.remove('maintenance');
    document.documentElement.classList.remove('pre-maint');   // ⟵ NEW: show chrome instantly
    document.documentElement.style.removeProperty('--maint-bg');
    return false; // continue normal site
  }
}


/* ---------- Router ---------- */
/* ---------- Router ---------- */
function onRoute() {
  startLoadingBar();

  const path = (location.hash || "#/").slice(1);

  // Maintenance: block routing if ON (and not bypassed)
  enforceMaintenance().then(active => {
    if (active) { finishLoadingBar(); return; }

    // Show/hide + fill breadcrumbs for allowed pages
    renderBreadcrumbsFor(path);

    // Ensure mobile drawer is closed after route changes (defensive)
    const mobileNav = document.getElementById('mobileNav');
    if (mobileNav?.open) mobileNav.close();

    // clear active state
    document.querySelectorAll('.nav-list a').forEach(a => a.removeAttribute("aria-current"));

    // match /work/:slug or /research/:slug
    const parts = path.split("/").filter(Boolean);
    const main = document.getElementById("main");

    if (parts.length === 0) {
      renderHome(main);
      setActive("#/");
    } else if (parts[0] === "work" && parts[1]) {
      renderWorkDetail(main, parts[1]);
      setActive("#/work");
    } else if (parts[0] === "work") {
      renderWorkIndex(main);
      setActive("#/work");
    } else if (parts[0] === "research" && parts[1]) {
      renderResearchDetail(main, parts[1]);
      setActive("#/research");
    } else if (parts[0] === "research") {
      renderResearchIndex(main);
      setActive("#/research");
    } else if (parts[0] === "about") {
      renderAbout(main);
      setActive("#/about");
    } else {
      renderNotFound(main);
    }

    // focus main for skip link
    main.focus({ preventScroll: true });

    setTimeout(finishLoadingBar, 0);
  });
}


function setActive() {
  const currentPath = window.location.hash || '#/';
  document.querySelectorAll('.nav-list a, .drawer-links a').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}


/* ---------- Renderers ---------- */
function renderHome(container) {
  container.innerHTML = `
    <section class="hero">
      <div>
        <h1 class="title">I’m Farhad, a Product Designer. I enjoy creating research-led, human-centered digital experiences.</h1>
        <p class="sub">Currently Lead Product Designer at <a class="senifone">Senifone</a></p>
      </div>
      <div aria-hidden="true" class="center">
        <img src="img/placeholders/portrait.png" alt="" />
      </div>
    </section>

    <section class="section">
      <h2>Featured Work</h2>
      <div class="grid cols-2">
        ${works.slice(0, 4).map(workCard).join("")}
      </div>
    </section>
    
    <section class="section">
      <h2>Latest Research</h2>
      <div class="grid">
        ${research.slice(0, 3).map(r => `
          <article class="card" role="article">
            <div class="body">
              <h3><a href="#/research/${r.slug}">${r.title}</a></h3>
              <p class="meta">${r.venue} • ${r.year}</p>
              <p>${r.abstract || ""}</p>
              <p><a href="#/research/${r.slug}">Read more</a></p>
            </div>
          </article>
        `).join("")}
      </div>
    </section>


    <section class="section center">
      <div>
        <h2>Need a researcher who designs?</h2>
        <div class="cta-row">
          <a class="btn" href="#/work">See projects</a>
          <button class="btn ghost" id="ctaContact2">Contact Me</button>
        </div>
      </div>
    </section>
  `;
  // wire up contact CTAs
  const c1 = document.getElementById("ctaContact");
  const c2 = document.getElementById("ctaContact2");
  const modal = document.getElementById("contactModal");
  [c1, c2].forEach(el => el && el.addEventListener("click", () => modal.showModal()));
}
function cardMini(title, i) {
  const icon = ["🔎", "🛡️", "♿"][i % 3];
  return `
    <article class="card">
      <div class="body">
        <h3>${icon} ${title}</h3>
        <p class="meta">Deep links to relevant case studies</p>
      </div>
    </article>
  `;
}

function workCard(w) {
  const locked = !!w.passwordProtected;
  const ctaLabel = locked ? "Enter Password" : "View Case Study";
  const href = `#/work/${w.slug}`;
  const tags = (w.tags || []).slice(0, 6);

  return `
    <article class="work-hero" style="--img:url('${w.heroImage}')">
      <div class="content">
        ${locked ? `<div class="eyebrow">🔒 Protected</div>` : ``}
        <h3 class="title"><a href="${href}" style="color:inherit; text-decoration:none;">${w.title}</a></h3>
        ${w.subtitle ? `<p class="sub">${w.subtitle}</p>` : ``}
        <a class="cta" href="${href}" aria-label="${ctaLabel} for ${w.title}">
          ${ctaLabel} <span aria-hidden="true">→</span>
        </a>
      </div>

      ${tags.length ? `<div class="tags">
        ${tags.map(t => `<span class="tag">${t}</span>`).join("")}
      </div>` : ``}

      <a class="cover-link" href="${href}" aria-label="Open ${w.title}"></a>
    </article>
  `;
}




function renderWorkIndex(container) {

  container.innerHTML = `
    <section class="section">
      <h1 class="title">Work</h1>
      <p class="sub">Selected projects across research, IA, accessibility, and e‑commerce trust.</p>
      <div class="spacer-16"></div>
      <div class="filters" role="group" aria-label="Filter projects">
        ${["All", "Research", "IA", "E‑commerce", "Accessibility", "Content Strategy"].map((f, i) => `<button class="chip" role="button" aria-pressed="${i === 0 ? 'true' : 'false'}" data-filter="${f}">${f}</button>`).join("")}
      </div>
      <div class="grid cols-2" id="workGrid">
        ${works.map(workCard).join("")}
      </div>
    </section>
  `;
  // filtering
  const chips = container.querySelectorAll(".chip");
  const grid = container.querySelector("#workGrid");
  chips.forEach(chip => chip.addEventListener("click", () => {
    chips.forEach(c => c.setAttribute("aria-pressed", "false"));
    chip.setAttribute("aria-pressed", "true");
    const f = chip.dataset.filter;
    const filtered = f === "All" ? works : works.filter(w => (w.tags || []).join("|").toLowerCase().includes(f.toLowerCase().replace("‑", "-")));
    grid.innerHTML = filtered.map(workCard).join("");
  }));
}

function renderWorkDetail(container, slug) {
  const w = works.find(x => x.slug === slug);
  if (!w) { renderNotFound(container); return; }
  container.innerHTML = `
    <article class="detail">
      <header>
        <h1>${w.title}</h1>
        <div class="kv">
          <div><strong>Role:</strong> ${w.role || ""}</div>
          <div><strong>Timeline:</strong> ${w.timeline || ""}</div>
          <div><strong>Context:</strong> ${w.context || ""}</div>
          <div><strong>Scope:</strong> ${w.scope || ""}</div>
        </div>
      </header>

      <section class="section"><h2>Problem & Context</h2><p>${w.problem || ""}</p></section>
      <section class="section"><h2>Goals & Hypotheses</h2><ul>${(w.goals || []).map(g => `<li>${g}</li>`).join("")}</ul></section>
      <section class="section"><h2>Methods</h2><p>${(w.methods || []).join(" • ")}</p></section>

      <section class="section"><h2>Process Highlights</h2>
        <ul>${(w.process?.highlights || []).map(h => `<li>${h}</li>`).join("")}</ul>
        ${(w.process?.beforeAfter || []).map(pair => `<div class="grid cols-2"><img src="${pair.before}" alt="${pair.alt || ''} before"><img src="${pair.after}" alt="${pair.alt || ''} after"></div>`).join("")}
        <h3>Decisions</h3>
        <ul>${(w.process?.decisions || []).map(d => `<li>${d}</li>`).join("")}</ul>
      </section>

      <section class="section"><h2>Results</h2>
        <p><strong>Quant:</strong> ${w.results?.quant || ""}</p>
        <p><strong>Qual:</strong> ${w.results?.qual || ""}</p>
      </section>

      <section class="section"><h2>Challenges & Trade‑offs</h2><p>${w.challenges || ""}</p></section>
      <section class="section"><h2>Credits / Ethics</h2><p>${w.credits || ""}</p></section>

      <section class="section"><h2>Related</h2>
        <div class="grid cols-2">${(w.related || []).map(sl => {
    const r = works.find(x => x.slug === sl);
    return r ? workCard(r) : "";
  }).join("")}</div>
      </section>
    </article>
  `;
}

function renderResearchIndex(container) {
  container.innerHTML = `
    <section class="section">
      <h1 class="title">Research</h1>
      <p class="sub">Papers, talks, and applied research.</p>
      <div class="grid">
        ${research.map(r => `
          <article class="card">
            <div class="body">
              <h3><a href="#/research/${r.slug}">${r.title}</a></h3>
              <p class="meta">${r.venue} • ${r.year}</p>
              <p>${r.abstract || ""}</p>
              ${r.pdf ? `<p><a href="${r.pdf}" download>Download PDF</a></p>` : ""}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderResearchDetail(container, slug) {
  const r = research.find(x => x.slug === slug);
  if (!r) { renderNotFound(container); return; }


  container.innerHTML = `
    <article class="detail">
      <header>
        <h1>${r.title}</h1>
        <div class="kv">
          <div><strong>Authors:</strong> ${r.authors || ""}</div>
          <div><strong>Venue:</strong> ${r.venue || ""}</div>
          <div><strong>Year:</strong> ${r.year || ""}</div>
        </div>
      </header>
      ${r.abstract ? `<section class="section"><h2>Abstract</h2><p>${r.abstract}</p></section>` : ""}
      ${r.findings ? `<section class="section"><h2>Findings / Contributions</h2><ul>${r.findings.map(f => `<li>${f}</li>`).join("")}</ul></section>` : ""}
      <section class="section">
        <h2>Artifacts</h2>
        <ul>
          ${r.pdf ? `<li><a href="${r.pdf}" download>PDF</a></li>` : ""}
          ${r.slides ? `<li><a href="${r.slides}" download>Slides</a></li>` : ""}
        </ul>
      </section>
    </article>
  `;
}

function renderAbout(container) {
  container.innerHTML = `
    <section class="section">
      <h1 class="title">About</h1>
      <div class="grid cols-2">
        <div>
          <p>I’m Farhad Ali — a UX researcher & product designer from Bangladesh. I care about clear information architecture, accessible interfaces, and trust in digital services.</p>
          <p>Skills & Tools: Interviews, usability testing, heuristic evals, IA/Taxonomy, Figma, WCAG 2.1 AA, e‑commerce trust.</p>
          <p><a href="files/placeholders/resume.pdf" download>Download resume (PDF)</a></p>
        </div>
        <div class="center" aria-hidden="true"><img src="img/placeholders/portrait.svg" alt=""></div>
      </div>
    </section>
  `;
}

function renderNotFound(container) {
  container.innerHTML = `<section class="section"><h1>Not found</h1><p>That page doesn’t exist. Try <a href="#/">Home</a>.</p></section>`;
}