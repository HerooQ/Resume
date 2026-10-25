/* Projects "darkroom": cards drop in as a pile, then deal into a grid as you scroll.
   Click one to open it in a loupe that morphs out of the card. */
(() => {
  const S = window.SITE;
  const host = document.getElementById("darkroomHost");
  if (!host) return;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = "cubic-bezier(.22,1,.36,1)";
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* piecewise interpolation, like a scroll-linked keyframe track */
  const track = (p, xs, ys) => {
    if (p <= xs[0]) return ys[0];
    for (let k = 0; k < xs.length - 1; k++) {
      if (p <= xs[k + 1]) return xs[k + 1] === xs[k] ? ys[k + 1] : ys[k] + (ys[k + 1] - ys[k]) * easeInOut((p - xs[k]) / (xs[k + 1] - xs[k]));
    }
    return ys[ys.length - 1];
  };

  const frames = S.projects.map((p) => ({ ...p }));
  const greens = [["#166534", "#bef264"], ["#0f766e", "#6ee7b7"], ["#3f6212", "#a3e635"], ["#14532d", "#d4a373"]];

  const pencil = '<svg class="print__pencil" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M 9 34 C 11 9, 86 1, 95 33 C 102 62, 84 96, 47 97 C 15 98, -1 76, 4 49 C 7 31, 24 13, 41 10" pathLength="1"/></svg>';

  const printEl = (f, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "print";
    b.dataset.frame = i;
    b.setAttribute("aria-label", `${f.title}, ${f.tagline}. Open details`);
    b.innerHTML = `<span class="print__mount"><span class="print__frame" style="--a:${f.accent[0]};--b:${f.accent[1]}">
        <span class="print__glyph" aria-hidden="true">${esc(f.title[0])}</span>
        <span class="print__cat">${esc(f.category)}</span>
        <span class="print__title">${esc(f.title)}</span>
        <span class="print__latent" aria-hidden="true"></span></span>${f.featured ? pencil : ""}</span>
      <span class="print__edge" aria-hidden="true"><span>${pad(i + 1)}</span><span>${esc(f.year)}</span></span>`;
    b.addEventListener("click", () => openLoupe(i, b));
    return b;
  };

  /* darkroom (scroll-driven) */
  let cleanup = null;
  function build() {
    if (cleanup) cleanup();
    cleanup = null;
    const compact = innerWidth <= 760 || reduced;
    const N = frames.length;

    if (compact) {
      host.innerHTML = '<div class="contact-sheet"></div>';
      frames.forEach((f, i) => { const p = printEl(f, i); p.classList.add("is-marked"); host.firstChild.appendChild(p); });
      return;
    }

    host.innerHTML = `<div class="darkroom" style="height:${200 + N * 12}vh"><div class="darkroom__view">
      <span class="darkroom__safelight" aria-hidden="true"></span>
      <div class="darkroom__waiting"><p class="darkroom__waiting-title">Keep on scrolling, we've got you</p>
        <p class="darkroom__waiting-note">The projects are on their way out of the build server</p><span class="darkroom__cue" aria-hidden="true"></span></div>
      <p class="darkroom__status"></p></div></div>`;
    const stage = host.firstChild, view = $(".darkroom__view"), status = $(".darkroom__status"), waiting = $(".darkroom__waiting"), light = $(".darkroom__safelight");
    function $(s) { return stage.querySelector(s); }
    const prints = frames.map((f, i) => { const p = printEl(f, i); p.classList.add("print--loose"); view.appendChild(p); return p; });

    // timings (progress 0..1 through the sticky stage)
    const drop = { start: 0.06, stagger: 0.2 / N, length: 0.1 };
    const deal = { start: 0.4, stagger: 0.3 / N, length: 0.14 };
    const develop = 0.08, pileScale = 0.8, TOP = 28, BOTTOM = 150, GAP = 22, LABEL = 26, COLS = Math.min(5, N);
    const arrived = drop.start + drop.length * 0.6;
    const doneAt = deal.start + (N - 1) * deal.stagger + deal.length + develop;

    let L = null;
    const measure = () => {
      const w0 = view.clientWidth, h0 = view.clientHeight, rows = Math.ceil(N / COLS);
      const byW = (w0 - GAP * (COLS - 1)) / COLS;
      const byH = ((h0 - TOP - BOTTOM - GAP * (rows - 1)) / rows - LABEL) * 1.5;
      const w = Math.floor(Math.max(120, Math.min(byW, byH))), h = w / 1.5;
      const px = w + GAP, py = h + LABEL + GAP, centre = (TOP - BOTTOM) / 2;
      L = { w, h, fall: -(h0 / 2 + h * 2), spots: frames.map((_, i) => {
        const c = i % COLS, r = Math.floor(i / COLS);
        return { gx: (c - (COLS - 1) / 2) * px, gy: (r - (rows - 1) / 2) * py + centre,
          px: (((i * 31) % 21) - 10) * 5, py: (((i * 17) % 13) - 6) * 4 + centre, rot: ((i * 47) % 29) - 14 };
      }) };
      prints.forEach((p) => { p.style.width = w + "px"; p.style.marginLeft = -w / 2 + "px"; p.style.marginTop = -(h + LABEL + 8) / 2 + "px"; p.style.setProperty("--w", w + "px"); });
      last = -1;
    };

    let raw = 0, sp = 0, last = -1, visible = false, raf = 0, developed = false;
    const frame = () => {
      raf = 0;
      const r = stage.getBoundingClientRect();
      raw = clamp(-r.top / Math.max(1, r.height - view.clientHeight));
      sp += (raw - sp) * 0.14;
      if (Math.abs(raw - sp) < 0.0004) sp = raw;
      if (sp !== last) { last = sp; paint(sp); }
      if (visible) raf = requestAnimationFrame(frame);
    };
    const paint = (p) => {
      prints.forEach((el, i) => {
        const s = L.spots[i], d0 = drop.start + i * drop.stagger, d1 = d0 + drop.length, s0 = deal.start + i * deal.stagger, s1 = s0 + deal.length;
        const x = track(p, [s0, s1], [s.px, s.gx]);
        const y = track(p, [d0, d1, s0, s1], [L.fall, s.py, s.py, s.gy]);
        const rot = track(p, [d0, d1, s0, s1], [s.rot * 2.5, s.rot, s.rot, 0]);
        const sc = track(p, [s0, s1], [pileScale, 1]);
        el.style.transform = `translate3d(${x}px,${y}px,0) rotate(${rot}deg) scale(${sc})`;
        el.style.opacity = clamp((p - d0) / 0.015);
        el.style.zIndex = i + 1;
        el.firstElementChild.firstElementChild.style.setProperty("--latent", track(p, [s0, s1 + develop], [1, 0]));
      });
      light.style.opacity = track(p, [0.04, 0.3, doneAt - 0.08, doneAt], [0, 1, 1, 0]);
      const w = clamp(p / arrived);
      waiting.style.opacity = 1 - w; waiting.style.transform = `translateY(${-24 * w}px)`;
      status.style.opacity = clamp((p - arrived) / 0.04);
      const done = p >= doneAt;
      if (done !== developed) { developed = done; stage.classList.toggle("is-developed", done); }
      status.innerHTML = done ? "Deployed. Pick a project for a closer look" : `Compiling <span class="darkroom__percent">${Math.round(clamp((p - deal.start) / (doneAt - deal.start)) * 100)}%</span>`;
    };

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }, { rootMargin: "200px" });
    io.observe(stage);
    const ro = new ResizeObserver(() => { measure(); if (!raf) raf = requestAnimationFrame(frame); });
    ro.observe(view);
    measure(); sp = raw = 0; frame();
    cleanup = () => { io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf); };
  }

  /* loupe (lightbox) */
  let loupe = null;
  const icon = (d) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const stageRect = () => {
    const w = Math.min(innerWidth * 0.86, 1100, innerHeight * 0.68 * 1.5), h = w / 1.5;
    return { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2 - 36, width: w, height: h };
  };
  const fromRect = (r, t) => `translate(${r.left - t.left}px,${r.top - t.top}px) scale(${r.width / t.width})`;
  const frameRect = (i) => document.querySelector(`[data-frame="${i}"] .print__frame`)?.getBoundingClientRect();

  const artHTML = (f) => `<div class="loupe__art" style="--a:${f.accent[0]};--b:${f.accent[1]}">
      <span class="loupe__glyph" aria-hidden="true">${esc(f.title[0])}</span>
      <div class="loupe__content"><span class="loupe__chip">${esc(f.category)} · ${esc(f.year)}</span><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p>
      <ul class="stack">${f.stack.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div></div>`;
  const metaHTML = (f) => `<p class="loupe__title">${esc(f.title)}</p><p class="loupe__place">${esc(f.tagline)}${f.links ? " · " : ""}${f.links?.repo ? `<a href="${esc(f.links.repo)}" target="_blank" rel="noopener">Code ↗</a> ` : ""}${f.links?.live ? `<a href="${esc(f.links.live)}" target="_blank" rel="noopener">Live ↗</a>` : ""}</p>`;

  function openLoupe(index, el) {
    if (loupe) return;
    const from = el.querySelector(".print__frame").getBoundingClientRect();
    const t = stageRect();
    const root = document.createElement("div");
    root.className = "loupe"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", frames[index].title);
    root.innerHTML = `<div class="loupe__backdrop"></div>
      <div class="loupe__frame" style="left:${t.left}px;top:${t.top}px;width:${t.width}px;height:${t.height}px">${artHTML(frames[index])}</div>
      <div class="loupe__bar" style="left:${t.left}px;top:${t.top + t.height + 18}px;width:${t.width}px">
        <p class="loupe__count"></p><div class="loupe__meta"></div>
        <div class="loupe__actions">
          <button type="button" class="loupe__button" data-act="prev" aria-label="Previous project">${icon("M15 18l-6-6 6-6")}</button>
          <button type="button" class="loupe__button" data-act="next" aria-label="Next project">${icon("M9 18l6-6-6-6")}</button>
          <button type="button" class="loupe__button" data-act="close" aria-label="Close">${icon("M18 6L6 18M6 6l12 12")}</button></div></div>`;
    document.body.appendChild(root);
    document.documentElement.classList.add("no-scroll");
    const fr = root.querySelector(".loupe__frame"), bar = root.querySelector(".loupe__bar"), back = root.querySelector(".loupe__backdrop");
    loupe = { root, fr, bar, index, from, previous: document.activeElement, closing: false };
    syncBar();
    root.querySelector('[data-act="close"]').focus({ preventScroll: true });

    const anim = (e, kf, o) => reduced ? null : e.animate(kf, { duration: 600, easing: easeOut, fill: "both", ...o });
    fr.style.transformOrigin = "0 0";
    anim(back, [{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
    anim(fr, [{ transform: fromRect(from, t) }, { transform: "none" }], { duration: 750 });
    anim(bar, [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { delay: 350, duration: 500 });
    root.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "close" || e.target === root || e.target === back) closeLoupe();
      else if (act === "prev") step(-1); else if (act === "next") step(1);
    });
  }
  function syncBar() {
    const { root, index } = loupe;
    root.querySelector(".loupe__count").innerHTML = `${pad(index + 1)}<span> / ${pad(frames.length)}</span>`;
    root.querySelector(".loupe__meta").innerHTML = metaHTML(frames[index]);
    root.querySelector('[data-act="prev"]').disabled = index === 0;
    root.querySelector('[data-act="next"]').disabled = index === frames.length - 1;
    root.setAttribute("aria-label", frames[index].title);
  }
  function step(dir) {
    const n = clamp(loupe.index + dir, 0, frames.length - 1, 1);
    if (n === loupe.index || loupe.closing) return;
    loupe.index = n;
    const old = loupe.fr.querySelector(".loupe__art"), next = document.createElement("div");
    next.innerHTML = artHTML(frames[n]);
    const art = next.firstElementChild; loupe.fr.appendChild(art);
    if (!reduced) {
      art.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: easeOut });
      old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: easeOut, fill: "forwards" }).onfinish = () => old.remove();
    } else old.remove();
    syncBar();
  }
  function closeLoupe() {
    if (!loupe || loupe.closing) return;
    loupe.closing = true;
    const { root, fr, bar, index, from, previous } = loupe, t = stageRect();
    const to = frameRect(index) || from;
    const done = () => { root.remove(); document.documentElement.classList.remove("no-scroll"); previous?.focus?.({ preventScroll: true }); loupe = null; };
    if (reduced) return done();
    root.querySelector(".loupe__backdrop").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: easeOut, fill: "forwards" });
    bar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" });
    fr.animate([{ transform: "none" }, { transform: fromRect(to, t) }], { duration: 650, easing: easeOut, fill: "forwards" }).onfinish = done;
  }
  addEventListener("keydown", (e) => {
    if (!loupe) return;
    if (e.key === "Escape") closeLoupe(); else if (e.key === "ArrowLeft") step(-1); else if (e.key === "ArrowRight") step(1); else return;
    e.preventDefault(); e.stopPropagation();
  }, true);

  /* go  */
  build();
  let w0 = innerWidth;
  addEventListener("resize", () => { if ((w0 <= 760) !== (innerWidth <= 760)) { w0 = innerWidth; build(); } });

  // Public, non-fork GitHub repos join the pile automatically.
  fetch(`https://api.github.com/users/${S.githubUser}/repos?per_page=100&sort=pushed`)
    .then((r) => (r.ok ? r.json() : []))
    .then((repos) => {
      const mine = repos.filter((r) => !r.fork);
      if (!mine.length) return;
      mine.forEach((r, i) => frames.push({
        title: r.name, tagline: "GitHub repository", category: "GitHub", year: String(new Date(r.created_at).getFullYear()),
        description: r.description || "A public repository on GitHub.", stack: [r.language, ...(r.topics || [])].filter(Boolean).slice(0, 5).length ? [r.language, ...(r.topics || [])].filter(Boolean).slice(0, 5) : ["Open source"],
        accent: greens[i % greens.length], links: { repo: r.html_url, ...(r.homepage ? { live: r.homepage } : {}) }
      }));
      if (!loupe) build();
    })
    .catch(() => {});
})();
