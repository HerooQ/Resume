/* Core-competency tree: trunk + roots, one main branch per group, one twig per competency. */
(() => {
  const groups = window.SITE.competencies;
  const host = document.getElementById("competencyTree");
  if (!host) return;

  const NS = "http://www.w3.org/2000/svg";
  const W = 1200, H = 820, CX = 600, BASE = 700, FORK = 540, CY = 520, RX = 330, RY = 270;
  const rad = (d) => (d * Math.PI) / 180;
  const f = (n) => n.toFixed(1);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Angle for every tip: spread across the upper arc with a gap between groups.
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const GAP = 0.7, ARC = [-172, -8];
  const slot = (ARC[1] - ARC[0]) / (total + GAP * (groups.length - 1) - 1);
  let cursor = 0, tipIndex = 0;
  const laid = groups.map((g) => {
    const tips = g.items.map((label) => {
      const a = ARC[0] + cursor * slot; cursor += 1;
      const r = tipIndex++ % 2 ? 0.88 : 1;
      return { label, a, x: CX + Math.cos(rad(a)) * RX * r, y: CY + Math.sin(rad(a)) * RY * r };
    });
    cursor += GAP;
    const am = tips.reduce((n, t) => n + t.a, 0) / tips.length;
    return { name: g.group, tips, a: am, x: CX + Math.cos(rad(am)) * RX * 0.5, y: CY + Math.sin(rad(am)) * RY * 0.5 };
  });

  let d = 0; // running delay so growth ripples outward
  const out = [];
  const path = (dAttr, cls, delay, extra = "") => out.push(`<path class="${cls}" d="${dAttr}" pathLength="1" style="--dl:${delay.toFixed(2)}s" ${extra}/>`);

  // Roots: circuit-board style, orthogonal runs with 45° bends.
  const roots = [];
  for (let k = -3; k <= 3; k++) {
    const dir = Math.sign(k), n = Math.abs(k);
    const x0 = CX + k * 9, down = 26 + n * 7, diag = 26 + n * 12, run = 50 + n * 48;
    let x = x0, y = BASE;
    let p = `M${f(x)} ${f(y)}`;
    y += down; p += ` L${f(x)} ${f(y)}`;
    if (dir) { x += dir * diag; y += diag; p += ` L${f(x)} ${f(y)}`; x += dir * run; p += ` L${f(x)} ${f(y)}`; }
    roots.push({ p, x, y });
  }
  roots.forEach((r, i) => { path(r.p, "root", 0.1 + i * 0.05); out.push(`<circle class="node root-node" cx="${f(r.x)}" cy="${f(r.y)}" r="3.5" style="--dl:${(1.3 + i * 0.05).toFixed(2)}s"/>`); });
  out.push(`<ellipse class="ground" cx="${CX}" cy="${BASE + 40}" rx="${RX + 40}" ry="22"/>`);
  out.push(`<ellipse class="ground g2" cx="${CX}" cy="${BASE + 40}" rx="${RX - 60}" ry="12"/>`);

  // Trunk: a bundle of fibres rather than one stroke.
  [-12, -6, -2, 3, 8, 13].forEach((o, i) => {
    path(`M${CX + o * 1.5} ${BASE + 4} C${CX + o} ${BASE - 60}, ${CX + o * 0.6} ${FORK + 50}, ${CX + o * 0.25} ${FORK}`, i === 2 || i === 4 ? "trunk bold" : "trunk", 0.3 + i * 0.03);
  });

  // Main branches + twigs.
  d = 0.9;
  laid.forEach((g, gi) => {
    const bx = g.x, by = g.y;
    path(`M${CX} ${FORK} C${f(CX + (bx - CX) * 0.1)} ${f(FORK - (FORK - by) * 0.55)}, ${f(bx - (bx - CX) * 0.2)} ${f(by + (FORK - by) * 0.3)}, ${f(bx)} ${f(by)}`, "branch main", d + gi * 0.12);
    // purely decorative side twigs off the main branch
    [-1, 1].forEach((s, si) => {
      const t = 0.5 + si * 0.12, px = CX + (bx - CX) * t, py = FORK - (FORK - by) * t, len = 34 + si * 8;
      const ex = px + s * len * 0.8, ey = py - len * 0.5;
      path(`M${f(px)} ${f(py)} L${f(ex)} ${f(ey)}`, "twig", d + 0.5 + gi * 0.12);
      out.push(`<circle class="node small" cx="${f(ex)}" cy="${f(ey)}" r="2.4" style="--dl:${(d + 1.1 + gi * 0.12).toFixed(2)}s"/>`);
    });
    out.push(`<circle class="node hub" cx="${f(bx)}" cy="${f(by)}" r="6" style="--dl:${(d + 0.9 + gi * 0.12).toFixed(2)}s"/>`);

    g.tips.forEach((t, ti) => {
      const dx = t.x - bx, dy = t.y - by, nx = -dy * 0.12, ny = dx * 0.12;
      const del = d + 0.9 + gi * 0.12 + ti * 0.06;
      path(`M${f(bx)} ${f(by)} C${f(bx + dx * 0.35 + nx)} ${f(by + dy * 0.2 + ny)}, ${f(bx + dx * 0.7 - nx)} ${f(by + dy * 0.75 - ny)}, ${f(t.x)} ${f(t.y)}`, "branch tip-branch", del);
      // little forks near the tip for that circuit-sprig look
      [-1, 1].forEach((s) => {
        const px = bx + dx * 0.72, py = by + dy * 0.72, ang = Math.atan2(dy, dx) + s * 0.55, L = 20 + ((ti + gi) % 3) * 6;
        const ex = px + Math.cos(ang) * L, ey = py + Math.sin(ang) * L;
        path(`M${f(px)} ${f(py)} L${f(ex)} ${f(ey)}`, "twig", del + 0.3);
        out.push(`<circle class="node small" cx="${f(ex)}" cy="${f(ey)}" r="1.8" style="--dl:${(del + 0.7).toFixed(2)}s"/>`);
      });
      const left = Math.cos(rad(t.a)) < 0, deg = left ? t.a + 180 : t.a;
      out.push(`<g class="tip" style="--dl:${(del + 0.8).toFixed(2)}s" transform="translate(${f(t.x)} ${f(t.y)})">
        <circle class="node tip-dot" r="5"/><circle class="tip-ring" r="5"/>
        <text class="tip-label" transform="rotate(${f(deg)})" x="${left ? -15 : 15}" y="4.5" text-anchor="${left ? "end" : "start"}">${esc(t.label)}</text></g>`);
    });
    // Group name sits just under the hub, over a halo so branches don't cut through it.
    out.push(`<text class="group-label" x="${f(bx)}" y="${f(by + 26)}" text-anchor="middle" style="--dl:${(d + 1.2 + gi * 0.12).toFixed(2)}s">${esc(g.name)}</text>`);
  });

  const svg = `<svg class="tree-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tree of core competencies: ${esc(groups.map((g) => g.name + " — " + g.items.join(", ")).join(". "))}">${out.join("")}</svg>`;

  // Compact fallback: a vertical trunk with branches hanging off it.
  const list = `<ul class="tree-list">${groups.map((g) => `<li><b>${esc(g.name)}</b><ul>${g.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></li>`).join("")}</ul>`;

  host.innerHTML = svg + list;

  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { host.classList.add("grown"); o.disconnect(); } }, { threshold: 0.25 }).observe(host);
})();
