// Inspect drawer: a framework-free drawer of select controls on the left of the page, and the tiny store a wrapper reads.
// Copy this file next to the wrapper. It imports nothing and touches only its own shadow root.
//
//   const inspect = createInspect({ id: 'order-card', controls: [{ key, label, options: [{ id, label }], initial?, noOriginal? }] });
//   inspect.mount() / inspect.unmount()   reference-counted: one drawer however many instances render
//   Fold it out of the way with the button in its corner or Alt+I (toggles drawer and icon).
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
    .card { position: fixed; top: 16px; left: 16px; bottom: 16px; width: 376px; max-width: calc(100vw - 32px); display: flex; flex-direction: column; gap: 16px; padding: 24px 16px; overflow: auto; border-radius: 16px; background: #fff; color: #000; font: 12px/normal Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: .018px; color-scheme: light; box-shadow: 0 0 0 1px rgba(23,23,23,.08), 0 16px 28px rgba(23,23,23,.08), 0 2px 16px rgba(3,7,18,.08); }
    .head { display: flex; flex-direction: column; gap: 4px; padding-left: 8px; padding-right: 32px; }
    .title { font-size: 16px; font-weight: 500; letter-spacing: .024px; }
    .sub { font-size: 13px; letter-spacing: .0195px; }
    .field { display: flex; flex-direction: column; gap: 8px; }
    .label { padding-left: 8px; color: rgba(0,0,0,.5); }
    select { width: 100%; padding: 4px 32px 4px 8px; border: 1px solid rgba(0,0,0,.08); border-radius: 8px; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='black' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2.5 4.5 6 8l3.5-3.5'/%3E%3C/svg%3E") no-repeat right 10px center / 12px; color: #000; font: inherit; letter-spacing: inherit; appearance: none; -webkit-appearance: none; cursor: pointer; }
    select:focus-visible, button:focus-visible { outline: 2px solid #000; outline-offset: 2px; }
    button { display: grid; place-items: center; border: 0; background: none; color: rgba(0,0,0,.68); cursor: pointer; }
    .fold { position: absolute; top: 20px; right: 16px; width: 24px; height: 24px; border-radius: 8px; }
    .pill { position: fixed; top: 16px; left: 16px; width: 32px; height: 32px; border-radius: 10px; background: #fff; box-shadow: 0 0 0 1px rgba(23,23,23,.08), 0 8px 16px rgba(23,23,23,.1); }
    svg { width: 14px; height: 14px; }
    .card, .pill { transition: opacity 150ms cubic-bezier(.23,1,.32,1), transform 150ms cubic-bezier(.23,1,.32,1); }
    @starting-style { .card, .pill { opacity: 0; transform: translateX(-8px); } }
    @media (prefers-reduced-motion: reduce) { .card, .pill { transition: none; } }`;
  const ICON = { fold: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2.5 6 6l3.5 3.5M5.5 2.5 2 6l3.5 3.5"/></svg>', open: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M1.5 3h2.2M6.3 3h4.2M1.5 9h4.2M8.3 9h2.2"/><circle cx="5" cy="3" r="1.3"/><circle cx="7" cy="9" r="1.3"/></svg>' };
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
    if (s.folded) { const b = el('button', 'pill'); b.setAttribute('aria-label', 'Open inspector'); b.title = 'Open inspector (Alt+I)'; b.innerHTML = ICON.open; b.onclick = () => { s.folded = false; draw(); }; layer.append(b); root.append(layer); return; }
    const card = el('div', 'card'); const head = el('div', 'head'); head.append(el('div', 'title', s.title), el('div', 'sub', s.subtitle)); card.append(head);
    const fold = el('button', 'fold'); fold.setAttribute('aria-label', 'Fold inspector'); fold.title = 'Hide (Alt+I)'; fold.innerHTML = ICON.fold; fold.onclick = () => { s.folded = true; draw(); }; card.append(fold);
    s.controls.forEach((c) => {
      const f = el('div', 'field'); f.append(el('div', 'label', c.label));
      const sel = el('select'); sel.setAttribute('aria-label', c.label);
      const opts = c.noOriginal ? [] : [{ id: '', label: s.originals[c.key] ? 'Original: ' + s.originals[c.key] : 'Original' }];
      opts.concat(c.options).forEach((o) => { const opt = el('option', '', o.label); opt.value = o.id; opt.selected = (s.values[c.key] || '') === o.id; sel.append(opt); });
      sel.onchange = () => { s.values[c.key] = sel.value; notify(); };
      f.append(sel); card.append(f);
    });
    layer.append(card); root.append(layer);
  }
  if (s.host) draw(); // a hot-reloaded wrapper may bring new controls
  return api;
}
