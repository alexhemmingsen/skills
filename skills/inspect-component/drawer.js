// Inspect drawer: a framework-free drawer of select controls on the left of the page, and the tiny store a wrapper reads.
// Copy this file next to the wrapper. It imports nothing and touches only its own shadow root.
//
//   const inspect = createInspect({ id: 'order-card', controls: [{ key, label, options: [{ id, label }], initial?, noOriginal? }] });
//   inspect.mount() / inspect.unmount()   reference-counted: one drawer however many instances render
//   The height is adjustable too: drag the bottom edge (double-click it for full height).
//   Fold it out of the way with the button in its corner or Alt+I (toggles drawer and icon). Drag the grip at the top center to dock it on the other side (or press the left and right arrow keys on it); drag its inner edge (or press the arrow keys on it) to resize. Both are remembered.
//   inspect.get(key)                      the selected option id, '' for the page's own value
//   inspect.setOriginal(key, label)       shows "Original: <label>" in the first option
//   inspect.subscribe(fn) / inspect.version   for useSyncExternalStore and friends
//
// The store lives on window, so hot reloads of the wrapper keep the selected values.
export function createInspect({ id, title = 'Inspect component', subtitle = 'Adjust the state of the component below', controls = [] }) {
  const all = (window.__ahemInspect = window.__ahemInspect || {});
  const s = (all[id] = all[id] || { values: {}, originals: {}, subs: new Set(), version: 0, refs: 0, host: null, folded: false });
  s.controls = controls; s.title = title; s.subtitle = subtitle;
  controls.forEach((c) => { if (!(c.key in s.values)) s.values[c.key] = c.initial || ''; });
  if (!s.layout) { let saved = {}; try { saved = JSON.parse(localStorage.getItem('ahem-inspect:' + id) || '{}'); } catch (e) {} s.side = saved.side === 'right' ? 'right' : 'left'; s.width = saved.width || 376; s.height = saved.height || null; s.layout = true; }
  const saveLayout = () => { try { localStorage.setItem('ahem-inspect:' + id, JSON.stringify({ side: s.side, width: s.width, height: s.height })); } catch (e) {} };
  const clampW = (w) => Math.max(280, Math.min(w, 640, window.innerWidth - 32));
  const clampH = (h) => Math.max(160, Math.min(h, window.innerHeight - 32));
  const notify = () => { s.version++; s.subs.forEach((fn) => fn()); };
  const api = {
    get: (key) => s.values[key] || '',
    setOriginal: (key, label) => { if (s.originals[key] !== label) { s.originals[key] = label; draw(); } },
    subscribe: (fn) => { s.subs.add(fn); return () => s.subs.delete(fn); },
    get version() { return s.version; },
    mount() { if (s.refs++ === 0) build(); draw(); },
    unmount() { if (--s.refs <= 0) { s.refs = 0; document.removeEventListener('keydown', onKey); if (s.host) s.host.remove(); s.host = null; } },
  };
  api.getVersion = () => s.version; // stable getSnapshot for useSyncExternalStore
  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .card { position: fixed; top: 16px; bottom: 16px; max-width: calc(100vw - 32px); border-radius: 16px; background: #fff; color: #000; font: 12px/normal Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: .018px; color-scheme: light; box-shadow: 0 0 0 1px rgba(23,23,23,.08), 0 16px 28px rgba(23,23,23,.08), 0 2px 16px rgba(3,7,18,.08); }
    .body { display: flex; flex-direction: column; gap: 16px; height: 100%; padding: 48px 16px 0; overflow: hidden; border-radius: 16px; } /* the header stays; only .fields scrolls */
    .fields { display: flex; flex-direction: column; flex: 1; gap: 16px; min-height: 0; margin: 0 -16px; padding: 0 16px 24px; overflow: auto; }
    .handle { position: absolute; top: 16px; left: 50%; width: 16px; height: 16px; margin-left: -8px; display: grid; place-items: center; color: #000; cursor: grab; touch-action: none; user-select: none; } /* 16px from the top; the header starts 16px below it */
    .handle::before { content: ''; position: absolute; inset: -8px; } /* a larger hit area, no hover state */
    .handle:active { cursor: grabbing; }
    .handle:focus-visible { outline: 2px solid #000; outline-offset: 2px; border-radius: 2px; }
    .handle svg { width: 16px; height: 16px; }
    .grip { position: absolute; top: 0; bottom: 0; width: 10px; cursor: col-resize; touch-action: none; }
    .grip.l { left: -5px; } .grip.r { right: -5px; }
    .vgrip { position: absolute; left: 0; right: 0; bottom: -8px; height: 16px; cursor: row-resize; touch-action: none; }
    .vgrip::after { content: ''; position: absolute; left: 50%; top: 50%; width: 32px; height: 3px; margin: -1.5px 0 0 -16px; border-radius: 2px; background: rgba(0,0,0,.24); opacity: 0; transition: opacity 120ms; }
    .vgrip:hover::after, .vgrip:focus-visible::after { opacity: 1; }
    .vgrip:focus-visible { outline: none; }
    .grip::after { content: ''; position: absolute; top: 50%; left: 50%; width: 3px; height: 32px; margin: -16px 0 0 -1.5px; border-radius: 2px; background: rgba(0,0,0,.24); opacity: 0; transition: opacity 120ms; }
    .grip:hover::after, .grip:focus-visible::after { opacity: 1; }
    .grip:focus-visible { outline: none; }
    .head { flex: none; display: flex; flex-direction: column; gap: 4px; padding-left: 8px; padding-right: 32px; }
    .title { font-size: 16px; font-weight: 500; letter-spacing: .024px; }
    .sub { font-size: 13px; letter-spacing: .0195px; }
    .field { display: flex; flex-direction: column; gap: 8px; }
    .label { padding-left: 8px; color: rgba(0,0,0,.5); }
    /* The three states from the design. Stroke: a 1px inside gradient, .08 at the top to .16 at the bottom. Hover lays a black 4% fill over the white. Focus puts the gradient over a solid blue stroke and adds a 2px ring at 25%. */
    select { --chev: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath d='M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z'/%3E%3C/svg%3E"); --white: linear-gradient(#fff, #fff); --stroke: linear-gradient(to bottom, rgba(0,0,0,.08), rgba(0,0,0,.16)); width: 100%; height: 26px; padding: 0 32px 0 8px; border: 1px solid transparent; border-radius: 8px; background: var(--chev) no-repeat right 10px center / 12px padding-box, var(--white) padding-box, var(--stroke) border-box; color: #000; font: inherit; letter-spacing: inherit; appearance: none; -webkit-appearance: none; cursor: default; outline: none; }
    select:hover { background: var(--chev) no-repeat right 10px center / 12px padding-box, linear-gradient(rgba(0,0,0,.04), rgba(0,0,0,.04)) padding-box, var(--white) padding-box, var(--stroke) border-box; }
    select:focus { background: var(--chev) no-repeat right 10px center / 12px padding-box, var(--white) padding-box, var(--stroke) border-box, linear-gradient(#3b82f6, #3b82f6) border-box; box-shadow: 0 0 0 2px rgba(59,130,246,.25); }
    button:focus-visible { outline: 2px solid #000; outline-offset: 2px; }
    button { display: grid; place-items: center; padding: 0; border: 0; background: none; color: #000; cursor: default; }
    .fold { position: absolute; top: 44px; right: 16px; width: 24px; height: 24px; border-radius: 8px; }
    .fold:hover { background: rgba(0,0,0,.08); }
    .fold svg { width: 16px; height: 16px; }
    .pill { position: fixed; top: 16px; width: 32px; height: 32px; border-radius: 10px; background: #fff; box-shadow: 0 0 0 1px rgba(23,23,23,.08), 0 8px 16px rgba(23,23,23,.1); }
    svg { display: block; width: 16px; height: 16px; }
    .card, .pill { transition: opacity 150ms cubic-bezier(.23,1,.32,1), transform 150ms cubic-bezier(.23,1,.32,1); }
    @starting-style { .card, .pill { opacity: 0; transform: translateX(-8px); } }
    @media (prefers-reduced-motion: reduce) { .card, .pill { transition: none; } }`;
  const ICON = { fold: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M3.5 3.5L12.5 12.5" stroke-linecap="round"/><path d="M3.5 12.5L12.5 3.5" stroke-linecap="round"/></svg>',
    grip: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M2.5 4H3.5C4.05228 4 4.5 4.44772 4.5 5V6C4.5 6.55228 4.05228 7 3.5 7H2.5C1.94772 7 1.5 6.55228 1.5 6V5C1.5 4.44772 1.94772 4 2.5 4Z" stroke-linecap="round"/><path d="M2.5 9H3.5C4.05228 9 4.5 9.44772 4.5 10V11C4.5 11.5523 4.05228 12 3.5 12H2.5C1.94772 12 1.5 11.5523 1.5 11V10C1.5 9.44772 1.94772 9 2.5 9Z" stroke-linecap="round"/><path d="M7.5 4H8.5C9.05228 4 9.5 4.44772 9.5 5V6C9.5 6.55228 9.05228 7 8.5 7H7.5C6.94772 7 6.5 6.55228 6.5 6V5C6.5 4.44772 6.94772 4 7.5 4Z" stroke-linecap="round"/><path d="M7.5 9H8.5C9.05228 9 9.5 9.44772 9.5 10V11C9.5 11.5523 9.05228 12 8.5 12H7.5C6.94772 12 6.5 11.5523 6.5 11V10C6.5 9.44772 6.94772 9 7.5 9Z" stroke-linecap="round"/><path d="M12.5 4H13.5C14.0523 4 14.5 4.44772 14.5 5V6C14.5 6.55228 14.0523 7 13.5 7H12.5C11.9477 7 11.5 6.55228 11.5 6V5C11.5 4.44772 11.9477 4 12.5 4Z" stroke-linecap="round"/><path d="M12.5 9H13.5C14.0523 9 14.5 9.44772 14.5 10V11C14.5 11.5523 14.0523 12 13.5 12H12.5C11.9477 12 11.5 11.5523 11.5 11V10C11.5 9.44772 11.9477 9 12.5 9Z" stroke-linecap="round"/></svg>', open: '<svg viewBox="0 0 16 16" fill="none"><path d="M6 10C6 11.1046 5.10457 12 4 12C2.89543 12 2 11.1046 2 10C2 8.89543 2.89543 8 4 8C5.10457 8 6 8.89543 6 10ZM3.00072 10C3.00072 10.5519 3.44811 10.9993 4 10.9993C4.55189 10.9993 4.99928 10.5519 4.99928 10C4.99928 9.44811 4.55189 9.00072 4 9.00072C3.44811 9.00072 3.00072 9.44811 3.00072 10Z" fill="currentColor"/><path d="M14 6C14 7.10457 13.1046 8 12 8C10.8954 8 10 7.10457 10 6C10 4.89543 10.8954 4 12 4C13.1046 4 14 4.89543 14 6ZM11.0007 6C11.0007 6.55189 11.4481 6.99928 12 6.99928C12.5519 6.99928 12.9993 6.55189 12.9993 6C12.9993 5.44811 12.5519 5.00072 12 5.00072C11.4481 5.00072 11.0007 5.44811 11.0007 6Z" fill="currentColor"/><path d="M4 11.5V14.5" stroke-linecap="round" stroke="currentColor"/><path d="M4 8.5V1.5" stroke-linecap="round" stroke="currentColor"/><path d="M12 7.5V14.5" stroke-linecap="round" stroke="currentColor"/><path d="M12 4.5V1.5" stroke-linecap="round" stroke="currentColor"/></svg>' };
  function onKey(e) { if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyI') { e.preventDefault(); s.folded = !s.folded; draw(); } }
  function build() {
    document.addEventListener('keydown', onKey);
    s.host = document.createElement('div'); s.host.setAttribute('data-ahem-inspect', id);
    s.host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none';
    s.host.attachShadow({ mode: 'open' }); document.body.append(s.host);
  }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function draw() {
    if (!s.host) return;
    const root = s.host.shadowRoot; root.replaceChildren(); const st = el('style'); st.textContent = CSS; root.append(st);
    const layer = el('div'); layer.style.pointerEvents = 'auto'; // only the drawer takes clicks; the page stays usable around it
    if (s.folded) { const b = el('button', 'pill'); b.setAttribute('aria-label', 'Open inspector'); b.title = 'Open inspector (Alt+I)'; b.style[s.side] = '16px'; b.innerHTML = ICON.open; b.onclick = () => { s.folded = false; draw(); }; layer.append(b); root.append(layer); return; }
    const card = el('div', 'card'); card.style[s.side] = '16px'; card.style.width = clampW(s.width) + 'px';
    const body = el('div', 'body'); card.append(body);
    const head = el('div', 'head'); head.append(el('div', 'title', s.title), el('div', 'sub', s.subtitle)); body.append(head);
    // Drag the grip at the top center to the other half of the window and the drawer docks there.
    const handle = el('div', 'handle'); handle.tabIndex = 0; handle.setAttribute('role', 'button'); handle.setAttribute('aria-label', 'Move inspector'); handle.title = 'Drag to move'; handle.innerHTML = ICON.grip; card.append(handle);
    handle.onkeydown = (e) => { const side = { ArrowLeft: 'left', ArrowRight: 'right' }[e.key]; if (!side) return; e.preventDefault(); s.side = side; saveLayout(); draw(); };
    handle.onpointerdown = (e) => {
      handle.setPointerCapture(e.pointerId); card.style.transition = 'none'; const x0 = e.clientX;
      handle.onpointermove = (ev) => { card.style.transform = `translateX(${ev.clientX - x0}px)`; };
      handle.onpointerup = () => { handle.onpointermove = handle.onpointerup = null; const r = card.getBoundingClientRect(); s.side = r.left + r.width / 2 < window.innerWidth / 2 ? 'left' : 'right'; saveLayout(); draw(); };
    };
    // Drag the inner edge, or use the arrow keys on it, to set the width.
    const grip = el('div', 'grip ' + (s.side === 'left' ? 'r' : 'l')); grip.tabIndex = 0; grip.setAttribute('role', 'separator'); grip.setAttribute('aria-orientation', 'vertical'); grip.setAttribute('aria-label', 'Resize inspector'); grip.title = 'Drag to resize';
    grip.onpointerdown = (e) => {
      grip.setPointerCapture(e.pointerId); card.style.transition = 'none';
      grip.onpointermove = (ev) => { s.width = clampW(s.side === 'left' ? ev.clientX - 16 : window.innerWidth - 16 - ev.clientX); card.style.width = s.width + 'px'; };
      grip.onpointerup = () => { grip.onpointermove = grip.onpointerup = null; card.style.transition = ''; saveLayout(); };
    };
    grip.onkeydown = (e) => { const d = { ArrowLeft: -16, ArrowRight: 16 }[e.key]; if (!d) return; e.preventDefault(); s.width = clampW(s.width + (s.side === 'left' ? d : -d)); card.style.width = s.width + 'px'; saveLayout(); };
    card.append(grip);
    // Drag the bottom edge to set the height; double-click it to go back to full height.
    const vgrip = el('div', 'vgrip'); vgrip.tabIndex = 0; vgrip.setAttribute('role', 'separator'); vgrip.setAttribute('aria-orientation', 'horizontal'); vgrip.setAttribute('aria-label', 'Resize inspector height'); vgrip.title = 'Drag to resize, double-click for full height';
    const setH = (h) => { s.height = h; card.style.bottom = 'auto'; card.style.height = h + 'px'; };
    if (s.height) setH(clampH(s.height));
    vgrip.onpointerdown = (e) => {
      vgrip.setPointerCapture(e.pointerId); card.style.transition = 'none';
      vgrip.onpointermove = (ev) => setH(clampH(ev.clientY - 16));
      vgrip.onpointerup = () => { vgrip.onpointermove = vgrip.onpointerup = null; card.style.transition = ''; saveLayout(); };
    };
    vgrip.ondblclick = () => { s.height = null; card.style.height = ''; card.style.bottom = '16px'; saveLayout(); };
    vgrip.onkeydown = (e) => { const d = { ArrowUp: -16, ArrowDown: 16 }[e.key]; if (!d) return; e.preventDefault(); setH(clampH((s.height || window.innerHeight - 32) + d)); saveLayout(); };
    card.append(vgrip);
    const fold = el('button', 'fold'); fold.setAttribute('aria-label', 'Fold inspector'); fold.title = 'Hide (Alt+I)'; fold.innerHTML = ICON.fold; fold.onclick = () => { s.folded = true; draw(); }; card.append(fold);
    const fields = el('div', 'fields'); body.append(fields);
    s.controls.forEach((c) => {
      const f = el('div', 'field'); f.append(el('div', 'label', c.label));
      const sel = el('select'); sel.setAttribute('aria-label', c.label);
      const opts = c.noOriginal ? [] : [{ id: '', label: s.originals[c.key] ? 'Original: ' + s.originals[c.key] : 'Original' }];
      opts.concat(c.options).forEach((o) => { const opt = el('option', '', o.label); opt.value = o.id; opt.selected = (s.values[c.key] || '') === o.id; sel.append(opt); });
      sel.onchange = () => { s.values[c.key] = sel.value; notify(); };
      f.append(sel); fields.append(f);
    });
    layer.append(card); root.append(layer);
  }
  if (s.host) draw(); // a hot-reloaded wrapper may bring new controls
  return api;
}
