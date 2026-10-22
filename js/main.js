(() => {
  const S = window.SITE;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  try { const t = localStorage.getItem("theme"); if (t) root.dataset.theme = t; } catch {}
  const setTheme = (t) => { root.dataset.theme = t; try { localStorage.setItem("theme", t); } catch {} };
  const toggleTheme = () => setTheme(root.dataset.theme === "dark" ? "light" : "dark");
  $("#themeBtn").addEventListener("click", toggleTheme);

  /* ---------- Toast ---------- */
  const toast = $("#toast");
  let toastT;
  const say = (msg) => { toast.textContent = msg; toast.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove("show"), 2200); };

  /* ---------- Render: projects ---------- */
  const cats = ["All", ...new Set(S.projects.map((p) => p.category))];
  $("#filters").innerHTML = cats.map((c, i) => `<button class="filter${i ? "" : " active"}" data-cat="${esc(c)}" role="tab">${esc(c)}</button>`).join("");
  $("#projectGrid").innerHTML = S.projects.map((p, i) => {
    const links = p.links ? `<div class="proj-links">${p.links.live ? `<a href="${esc(p.links.live)}" target="_blank" rel="noopener">Live ↗</a>` : ""}${p.links.repo ? `<a href="${esc(p.links.repo)}" target="_blank" rel="noopener">Code ↗</a>` : ""}</div>` : "";
    return `<article class="project reveal${p.featured ? " featured" : ""}" data-cat="${esc(p.category)}" style="--d:${(i % 3) * .08}s">
      <div class="proj-art" style="--a:${p.accent[0]};--b:${p.accent[1]}" data-glyph="${esc(p.title[0])}">
        <span class="proj-cat">${esc(p.category)}</span>${p.featured ? '<span class="proj-star">★ FEATURED</span>' : ""}
      </div>
      <div class="proj-body">
        <div class="proj-meta"><span>${esc(p.tagline)}</span><span>${esc(p.year)}</span></div>
        <h3>${esc(p.title)}</h3><p>${esc(p.description)}</p>
        <ul class="stack">${p.stack.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>${links}
      </div></article>`;
  }).join("");

  $("#filters").addEventListener("click", (e) => {
    const b = e.target.closest(".filter"); if (!b) return;
    $$(".filter").forEach((f) => f.classList.toggle("active", f === b));
    $$(".project").forEach((p) => p.classList.toggle("hide", b.dataset.cat !== "All" && p.dataset.cat !== b.dataset.cat));
  });

  /* ---------- Render: experience, skills, certs ---------- */
  $("#timeline").innerHTML = S.experience.map((j) => `<article class="job reveal">
    <span class="job-date">${esc(j.date)}</span><h3>${esc(j.role)}</h3>
    <p class="company"><b>${esc(j.company)}</b> · ${esc(j.place)}</p>
    <ul>${j.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
    <div class="tags">${j.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div></article>`).join("");

  const allSkills = [...new Set(S.skills.flatMap((s) => s.items))];
  $("#marquee").innerHTML = [...allSkills, ...allSkills].map((s) => `<span>${esc(s)}</span>`).join("");
  $("#bento").innerHTML = S.skills.map((s, i) => `<div class="card reveal" style="--span:${s.span};--d:${(i % 4) * .07}s">
    <h3><span class="ico">${esc(s.icon)}</span>${esc(s.name)}</h3>
    <ul class="pills">${s.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("");
  $("#competencies").innerHTML = S.competencies.map((c) => `<span>${esc(c)}</span>`).join("");
  $("#certs").innerHTML = S.certifications.map((c) => `<div class="cert"><i>✓</i><span>${esc(c)}</span></div>`).join("");
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Reveal on scroll + counters ---------- */
  const countUp = (el) => {
    const end = +el.dataset.count, suf = el.dataset.suffix || "", t0 = performance.now(), dur = 1400;
    if (reduced) { el.textContent = end + suf; return; }
    const tick = (t) => { const k = Math.min((t - t0) / dur, 1); el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))) + suf; if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    $$("[data-count]", e.target).forEach(countUp);
    io.unobserve(e.target);
  }), { threshold: .12 });
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------- Typed roles ---------- */
  const typed = $("#typed");
  if (reduced) typed.textContent = S.roles[0];
  else {
    let r = 0, c = 0, del = false;
    const step = () => {
      const w = S.roles[r];
      typed.textContent = w.slice(0, del ? --c : ++c);
      let wait = del ? 28 : 55;
      if (!del && c === w.length) { del = true; wait = 1600; }
      else if (del && c === 0) { del = false; r = (r + 1) % S.roles.length; wait = 350; }
      setTimeout(step, wait);
    };
    step();
  }

  /* ---------- Nav: scroll state, progress, active link, mobile ---------- */
  const nav = $("#nav"), bar = $("#progress"), links = $$("#navLinks a");
  const sections = links.map((a) => $(a.getAttribute("href")));
  const onScroll = () => {
    const h = document.documentElement;
    bar.style.transform = `scaleX(${scrollY / (h.scrollHeight - innerHeight || 1)})`;
    nav.classList.toggle("scrolled", scrollY > 20);
    const y = scrollY + innerHeight * .35;
    let cur = null; sections.forEach((s) => { if (s && s.offsetTop <= y) cur = s.id; });
    links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + cur));
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  const burger = $("#burger");
  const closeMenu = () => { $("#navLinks").classList.remove("open"); burger.setAttribute("aria-expanded", "false"); };
  burger.addEventListener("click", () => { const o = $("#navLinks").classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
  links.forEach((a) => a.addEventListener("click", closeMenu));

  /* ---------- Cursor glow ---------- */
  const glow = $("#cursorGlow");
  let gx = 0, gy = 0, tx = 0, ty = 0;
  addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; glow.classList.add("on"); }, { passive: true });
  (function loop() { gx += (tx - gx) * .12; gy += (ty - gy) * .12; glow.style.transform = `translate(${gx}px,${gy}px)`; requestAnimationFrame(loop); })();

  /* ---------- Card spotlight + 3D tilt + magnetic buttons ---------- */
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest(".project, .bento .card");
    if (card) { const r = card.getBoundingClientRect(); card.style.setProperty("--mx", e.clientX - r.left + "px"); card.style.setProperty("--my", e.clientY - r.top + "px"); }
  }, { passive: true });
  if (!reduced && matchMedia("(hover: hover)").matches) {
    const tilt = (el, max) => {
      el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = `perspective(900px) rotateX(${-y * max}deg) rotateY(${x * max}deg) translateZ(0)`; });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    };
    $$(".project").forEach((p) => tilt(p, 6)); $$(".tilt").forEach((p) => tilt(p, 10));
    $$(".magnetic").forEach((b) => {
      b.addEventListener("pointermove", (e) => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px, ${(e.clientY - r.top - r.height / 2) * .35}px)`; });
      b.addEventListener("pointerleave", () => { b.style.transform = ""; });
    });
  }

  /* ---------- Hero particle network ---------- */
  const cv = $("#network"), ctx = cv.getContext("2d");
  let W, H, pts = [], mouse = { x: -999, y: -999 }, running = true;
  const color = () => getComputedStyle(root).getPropertyValue("--accent").trim() || "#00e5b0";
  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(110, Math.floor((W * H) / 14000));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35 }));
  };
  addEventListener("resize", size); size();
  cv.parentElement.addEventListener("pointermove", (e) => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  cv.parentElement.addEventListener("pointerleave", () => { mouse.x = mouse.y = -999; });
  new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) draw(); }).observe(cv);
  function draw() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    const col = color();
    ctx.fillStyle = col;
    for (const p of pts) {
      if (!reduced) { p.x += p.vx; p.y += p.vy; }
      if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 140 && d > 0) { p.x += (dx / d) * 1.6; p.y += (dy / d) * 1.6; }
      ctx.globalAlpha = .7; ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, 6.283); ctx.fill();
    }
    ctx.strokeStyle = col;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (d < 130) { ctx.globalAlpha = (1 - d / 130) * .3; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
    }
    for (const p of pts) { const d = Math.hypot(p.x - mouse.x, p.y - mouse.y); if (d < 170) { ctx.globalAlpha = (1 - d / 170) * .6; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); } }
    if (!reduced) requestAnimationFrame(draw);
  }
  draw();

  /* ---------- GitHub repos (live) ---------- */
  const langColors = { JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", PHP: "#4F5D95", Java: "#b07219", Kotlin: "#A97BFF", "C#": "#178600", HTML: "#e34c26", CSS: "#563d7c" };
  const repoGrid = $("#repoGrid");
  fetch(`https://api.github.com/users/${S.githubUser}/repos?per_page=100&sort=pushed`)
    .then((r) => { if (!r.ok) throw 0; return r.json(); })
    .then((repos) => {
      const list = repos.filter((r) => !r.fork).sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at)).slice(0, 6);
      if (!list.length) { repoGrid.innerHTML = '<p class="muted">No public repositories yet — check back soon.</p>'; return; }
      repoGrid.innerHTML = list.map((r) => `<a class="repo" href="${esc(r.html_url)}" target="_blank" rel="noopener">
        <b>${esc(r.name)}</b><p>${esc(r.description || "No description provided.")}</p>
        <div class="meta">${r.language ? `<span><i class="lang-dot" style="background:${langColors[r.language] || "var(--accent-2)"}"></i>${esc(r.language)}</span>` : ""}<span>★ ${r.stargazers_count}</span><span>⑂ ${r.forks_count}</span></div></a>`).join("");
    })
    .catch(() => { repoGrid.innerHTML = `<p class="muted">Couldn't load repositories right now. <a href="https://github.com/${esc(S.githubUser)}" target="_blank" rel="noopener" style="color:var(--accent)">View them on GitHub →</a></p>`; });

  /* ---------- Contact: copy email ---------- */
  const copyEmail = () => (navigator.clipboard ? navigator.clipboard.writeText(S.email) : Promise.reject()).then(() => say("Email copied ✓"), () => say(S.email));
  $("#copyEmail").addEventListener("click", copyEmail);

  /* ---------- Command palette ---------- */
  const pal = $("#palette"), inp = $("#paletteInput"), list = $("#paletteList");
  const go = (id) => () => { const el = $(id); el && el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }); };
  const cmds = [
    ...[["About", "#about"], ["Projects", "#projects"], ["Experience", "#experience"], ["Skills", "#skills"], ["Education", "#education"], ["Contact", "#contact"]].map(([n, id]) => ({ n: "Go to " + n, k: "section", run: go(id) })),
    ...S.projects.map((p) => ({ n: p.title, k: "project", run: go("#projects") })),
    { n: "Toggle light / dark theme", k: "action", run: toggleTheme },
    { n: "Copy email address", k: "action", run: copyEmail },
    { n: "Download résumé", k: "action", run: () => { const a = document.createElement("a"); a.href = "assets/Qhawe-Moyo-CV.pdf"; a.download = ""; a.click(); } },
    { n: "Open GitHub", k: "link", run: () => open("https://github.com/" + S.githubUser, "_blank", "noopener") },
    { n: "Open LinkedIn", k: "link", run: () => open("https://www.linkedin.com/in/qhawe", "_blank", "noopener") }
  ];
  let shown = [], sel = 0;
  const paint = () => {
    const q = inp.value.trim().toLowerCase();
    shown = cmds.filter((c) => c.n.toLowerCase().includes(q) || c.k.includes(q));
    sel = Math.min(sel, Math.max(shown.length - 1, 0));
    list.innerHTML = shown.length ? shown.map((c, i) => `<li class="${i === sel ? "sel" : ""}" data-i="${i}">${esc(c.n)}<small>${c.k}</small></li>`).join("") : '<li class="muted">No matches</li>';
    const s = $(".sel", list); s && s.scrollIntoView({ block: "nearest" });
  };
  const openPal = () => { pal.hidden = false; inp.value = ""; sel = 0; paint(); inp.focus(); };
  const closePal = () => { pal.hidden = true; };
  const runSel = (i = sel) => { const c = shown[i]; if (c) { closePal(); c.run(); } };
  $("#paletteBtn").addEventListener("click", openPal);
  pal.addEventListener("mousedown", (e) => { if (e.target === pal) closePal(); });
  list.addEventListener("click", (e) => { const li = e.target.closest("li[data-i]"); li && runSel(+li.dataset.i); });
  inp.addEventListener("input", () => { sel = 0; paint(); });
  inp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % shown.length; paint(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + shown.length) % shown.length; paint(); }
    else if (e.key === "Enter") runSel();
  });
  addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.hidden ? openPal() : closePal(); }
    else if (e.key === "Escape" && !pal.hidden) closePal();
  });
})();
