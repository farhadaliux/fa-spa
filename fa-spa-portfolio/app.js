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

async function bootstrap(){
  // Load content models
  works = (await fetch("data/works.json").then(r=>r.json())).works;
  research = (await fetch("data/research.json").then(r=>r.json())).research;

  // Init router
  window.addEventListener("hashchange", onRoute);
  onRoute();

  // Header behaviors
  setupHeader();
  setupContact();

  // Footer meta
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("lastUpdated").textContent = new Date(document.lastModified).toLocaleDateString();
}
document.addEventListener("DOMContentLoaded", bootstrap);

function setupHeader(){
  const menuBtn = document.getElementById("menuBtn");
  const drawer = document.getElementById("mobileNav");
  const drawerClose = document.getElementById("drawerClose");

  const drawerLinks = drawer.querySelectorAll('a[data-link]');
drawerLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (drawer.open) drawer.close();
    // return focus to the trigger for accessibility
    btnOpen?.focus({ preventScroll: true });
  });
});

  menuBtn?.addEventListener("click", ()=>{
    drawer.showModal();
    menuBtn.setAttribute("aria-expanded","true");
  });
  drawerClose?.addEventListener("click", ()=>{
    drawer.close();
    menuBtn.setAttribute("aria-expanded","false");
    menuBtn.focus();
  });
  drawer.addEventListener("click", (e)=>{
    if (e.target === drawer) { drawer.close(); menuBtn.setAttribute("aria-expanded","false"); menuBtn.focus(); }
  });
}

function setupContact(){
  const modal = document.getElementById("contactModal");
  const openers = [document.getElementById("contactOpen"), document.getElementById("contactOpenMobile"), document.getElementById("contactOpenFooter")];
  const closer = document.getElementById("contactClose");

  openers.forEach(btn=> btn && btn.addEventListener("click", ()=> modal.showModal()));
  closer?.addEventListener("click", ()=> modal.close());
  modal?.addEventListener("click", (e)=>{ if (e.target === modal) modal.close(); });
}

/* ---------- Router ---------- */
function onRoute(){
  const path = (location.hash || "#/").slice(1);
  // Ensure mobile drawer is closed after route changes (defensive)
const mobileNav = document.getElementById('mobileNav');
if (mobileNav?.open) mobileNav.close();

  const navLinks = document.querySelectorAll('.nav-list a');
  navLinks.forEach(a=> a.removeAttribute("aria-current"));

  // match /work/:slug or /research/:slug
  const parts = path.split("/").filter(Boolean);
  const main = document.getElementById("main");

  if (parts.length === 0){
    renderHome(main);
    setActive("#/");
  } else if (parts[0] === "work" && parts[1]){
    renderWorkDetail(main, parts[1]);
    setActive("#/work");
  } else if (parts[0] === "work"){
    renderWorkIndex(main);
    setActive("#/work");
  } else if (parts[0] === "research" && parts[1]){
    renderResearchDetail(main, parts[1]);
    setActive("#/research");
  } else if (parts[0] === "research"){
    renderResearchIndex(main);
    setActive("#/research");
  } else if (parts[0] === "about"){
    renderAbout(main);
    setActive("#/about");
  } else {
    renderNotFound(main);
  }

  // --- Breadcrumbs helper (drop-in) ---
window.Breadcrumbs = {
  el: null,
  mount(){
    this.el = document.getElementById('breadcrumbs');
  },
  render(items){
    if (!this.el) this.mount();
    if (!this.el) return;

    if (!items || !items.length){ this.el.innerHTML = ''; return; }

    this.el.innerHTML = items.map((it,i)=>{
      const last = i === items.length-1;
      if (last) return `<span aria-current="page">${escapeHtml(it.label)}</span>`;
      return `<a href="${it.href}">${escapeHtml(it.label)}</a><span class="sep">/</span>`;
    }).join(' ');
  }
};
function escapeHtml(s=''){return s.replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));}


// --- Password Gate (client-side) ---
// Change this salt in production:
const PASSWORD_SALT = 'change-me';

async function sha256(text){
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function hashPin(pin){ return sha256(`${pin}|${PASSWORD_SALT}`); }

// Remember unlock for the current tab
function isUnlocked(slug){ return sessionStorage.getItem('work:'+slug) === '1'; }
function setUnlocked(slug){ sessionStorage.setItem('work:'+slug, '1'); }

// Use on the case detail page container
async function enforceGate({container, slug, pinHash, hint}){
  if (isUnlocked(slug)) return; // already unlocked this session

  // Render a simple inline gate
  container.innerHTML = `
    <section class="section">
      <h1 class="title">🔒 This case is protected</h1>
      <p class="sub">Enter the access PIN to continue.</p>
      <form id="gateForm" class="gate">
        <label for="pin">Access PIN</label>
        <input id="pin" name="pin" type="password" autocomplete="off" required />
        <button class="btn" type="submit">Unlock</button>
        ${hint ? `<p class="meta">Hint: ${escapeHtml(hint)}</p>` : ''}
        <p class="meta">Or <a href="mailto:farhadali.ux@gmail.com?subject=Request%20access">request access by email</a>.</p>
      </form>
    </section>
  `;

  const form = container.querySelector('#gateForm');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const pin = container.querySelector('#pin').value.trim();
    const ok = (await hashPin(pin)) === pinHash;
    if (ok){
      setUnlocked(slug);
      // Re-render your normal case content here:
      if (typeof renderUnlockedCase === 'function') renderUnlockedCase(container, slug);
      else location.reload();
    } else {
      alert('Incorrect PIN');
    }
  });
}


  // focus main for skip link
  main.focus({ preventScroll: true });
}

function setActive(href){
  const link = document.querySelector(`.nav-list a[href="${href}"]`);
  if (link) link.setAttribute("aria-current","page");
}

/* ---------- Renderers ---------- */
function renderHome(container){
  container.innerHTML = `
    <section class="hero">
      <div>
        <h1 class="title">UX Researcher & Product Designer</h1>
        <p class="sub">I combine research, IA, and accessible design to ship simple, trustworthy experiences.</p>
      </div>
      <div aria-hidden="true" class="center">
        <img src="img/placeholders/portrait.svg" alt="" />
      </div>
    </section>

    <section class="section">
      <h2>Featured Work</h2>
      <div class="grid cols-2">
        ${works.slice(0,4).map(workCard).join("")}
      </div>
    </section>
    
    <section class="section">
      <h2>Latest Research</h2>
      <div class="grid">
        ${research.slice(0,3).map(r => `
          <article class="card" role="article">
            <div class="body">
              <h3><a href="#/research/${r.slug}">${r.title}</a></h3>
              <p class="meta">${r.venue} • ${r.year}</p>
              <p>${r.abstract||""}</p>
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
  [c1,c2].forEach(el => el && el.addEventListener("click", ()=> modal.showModal()));
}
function cardMini(title, i){
  const icon = ["🔎","🛡️","♿"][i%3];
  return `
    <article class="card">
      <div class="body">
        <h3>${icon} ${title}</h3>
        <p class="meta">Deep links to relevant case studies</p>
      </div>
    </article>
  `;
}

function workCard(w){
  const locked   = !!w.passwordProtected;
  const ctaLabel = locked ? "Enter Password" : "View Case Study";
  const href     = `#/work/${w.slug}`;
  const tags     = (w.tags || []).slice(0,6);

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
        ${tags.map(t=>`<span class="tag">${t}</span>`).join("")}
      </div>` : ``}

      <a class="cover-link" href="${href}" aria-label="Open ${w.title}"></a>
    </article>
  `;
}




function renderWorkIndex(container){
  
  container.innerHTML = `
    <section class="section">
      <h1 class="title">Work</h1>
      <p class="sub">Selected projects across research, IA, accessibility, and e‑commerce trust.</p>
      <div class="spacer-16"></div>
      <div class="filters" role="group" aria-label="Filter projects">
        ${["All","Research","IA","E‑commerce","Accessibility","Content Strategy"].map((f,i)=>`<button class="chip" role="button" aria-pressed="${i===0?'true':'false'}" data-filter="${f}">${f}</button>`).join("")}
      </div>
      <div class="grid cols-2" id="workGrid">
        ${works.map(workCard).join("")}
      </div>
    </section>
  `;
  // filtering
  const chips = container.querySelectorAll(".chip");
  const grid = container.querySelector("#workGrid");
  chips.forEach(chip=> chip.addEventListener("click", ()=>{
    chips.forEach(c=> c.setAttribute("aria-pressed","false"));
    chip.setAttribute("aria-pressed","true");
    const f = chip.dataset.filter;
    const filtered = f==="All" ? works : works.filter(w=> (w.tags||[]).join("|").toLowerCase().includes(f.toLowerCase().replace("‑","-")));
    grid.innerHTML = filtered.map(workCard).join("");
  }));
}

function renderWorkDetail(container, slug){
  const w = works.find(x=> x.slug === slug);
  if (!w){ renderNotFound(container); return; }

  Breadcrumbs.render([
  {label:'Home', href:'#/'},
  {label:'Work', href:'#/work'},
  {label:w.title}
]);


  container.innerHTML = `
    <article class="detail">
      <header>
        <h1>${w.title}</h1>
        <div class="kv">
          <div><strong>Role:</strong> ${w.role||""}</div>
          <div><strong>Timeline:</strong> ${w.timeline||""}</div>
          <div><strong>Context:</strong> ${w.context||""}</div>
          <div><strong>Scope:</strong> ${w.scope||""}</div>
        </div>
      </header>

      <section class="section"><h2>Problem & Context</h2><p>${w.problem||""}</p></section>
      <section class="section"><h2>Goals & Hypotheses</h2><ul>${(w.goals||[]).map(g=>`<li>${g}</li>`).join("")}</ul></section>
      <section class="section"><h2>Methods</h2><p>${(w.methods||[]).join(" • ")}</p></section>

      <section class="section"><h2>Process Highlights</h2>
        <ul>${(w.process?.highlights||[]).map(h=>`<li>${h}</li>`).join("")}</ul>
        ${(w.process?.beforeAfter||[]).map(pair=>`<div class="grid cols-2"><img src="${pair.before}" alt="${pair.alt||''} before"><img src="${pair.after}" alt="${pair.alt||''} after"></div>`).join("")}
        <h3>Decisions</h3>
        <ul>${(w.process?.decisions||[]).map(d=>`<li>${d}</li>`).join("")}</ul>
      </section>

      <section class="section"><h2>Results</h2>
        <p><strong>Quant:</strong> ${w.results?.quant||""}</p>
        <p><strong>Qual:</strong> ${w.results?.qual||""}</p>
      </section>

      <section class="section"><h2>Challenges & Trade‑offs</h2><p>${w.challenges||""}</p></section>
      <section class="section"><h2>Credits / Ethics</h2><p>${w.credits||""}</p></section>

      <section class="section"><h2>Related</h2>
        <div class="grid cols-2">${(w.related||[]).map(sl=>{
          const r = works.find(x=> x.slug===sl);
          return r ? workCard(r) : "";
        }).join("")}</div>
      </section>
    </article>
  `;
}

function renderResearchIndex(container){
  container.innerHTML = `
    <section class="section">
      <h1 class="title">Research</h1>
      <p class="sub">Papers, talks, and applied research.</p>
      <div class="grid">
        ${research.map(r=>`
          <article class="card">
            <div class="body">
              <h3><a href="#/research/${r.slug}">${r.title}</a></h3>
              <p class="meta">${r.venue} • ${r.year}</p>
              <p>${r.abstract||""}</p>
              ${r.pdf ? `<p><a href="${r.pdf}" download>Download PDF</a></p>` : ""}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderResearchDetail(container, slug){
  const r = research.find(x=> x.slug===slug);
  if (!r){ renderNotFound(container); return; }

  Breadcrumbs.render([
  {label:'Home', href:'#/'},
  {label:'Research', href:'#/research'},
  {label:r.title}
]);


  container.innerHTML = `
    <article class="detail">
      <header>
        <h1>${r.title}</h1>
        <div class="kv">
          <div><strong>Authors:</strong> ${r.authors||""}</div>
          <div><strong>Venue:</strong> ${r.venue||""}</div>
          <div><strong>Year:</strong> ${r.year||""}</div>
        </div>
      </header>
      ${r.abstract ? `<section class="section"><h2>Abstract</h2><p>${r.abstract}</p></section>` : ""}
      ${r.findings ? `<section class="section"><h2>Findings / Contributions</h2><ul>${r.findings.map(f=>`<li>${f}</li>`).join("")}</ul></section>` : ""}
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

function renderAbout(container){
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

function renderNotFound(container){
  container.innerHTML = `<section class="section"><h1>Not found</h1><p>That page doesn’t exist. Try <a href="#/">Home</a>.</p></section>`;
}