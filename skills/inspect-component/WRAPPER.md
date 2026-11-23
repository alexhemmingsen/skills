# The wrapper

Read in Phase 3 of [SKILL.md](SKILL.md). `drawer.js` is plain JavaScript and works in any page; only the wrapper depends on the project's framework. Whatever the framework, the wrapper does three jobs:

1. **Apply**: read each control with `inspect.get(key)` and apply the selected option's `patch` to what the page passes (props, or the element in plain HTML).
2. **Re-render**: when a control moves, render again. `inspect.subscribe(fn)` calls you back on every change, and `inspect.getVersion()` returns a number that goes up with each one.
3. **Mount**: `inspect.mount()` when the wrapper appears and `inspect.unmount()` when it goes (reference-counted: one drawer however many instances render).

The wrapper lives in `ahem-inspect-<component>/` beside a copy of [drawer.js](drawer.js). The component stays in its real context: the page's layout, data, providers and theme.

## React

The page renders `Inspected` where it rendered the real component.

```tsx
// ahem-inspect
import { useEffect, useSyncExternalStore } from 'react';
import { createInspect } from './drawer';
import { OrderCard } from '../path/to/OrderCard'; // the real component, untouched

// One control per entry. Each option patches the props the page passes. Labels are product language ("Order state"), values are what the type allows.
const CONTROLS = [
  {
    key: 'status', label: 'Order state',
    read: (p) => p.order.status,                       // optional: the page's own value, shown as "Original: ..."
    options: [
      { id: 'placed', label: 'Placed', patch: (p) => ({ ...p, order: { ...p.order, status: 'placed' } }) },
      { id: 'in_progress', label: 'In progress', patch: (p) => ({ ...p, order: { ...p.order, status: 'in_progress' } }) },
    ],
  },
  { key: 'actions', label: 'Actions', initial: 'stubbed', noOriginal: true,
    options: [{ id: 'stubbed', label: 'Stubbed' }, { id: 'live', label: 'Live' }] },
];

const inspect = createInspect({
  id: 'order-card',
  controls: CONTROLS.map(({ key, label, initial, noOriginal, options }) => ({ key, label, initial, noOriginal, options: options.map(({ id, label }) => ({ id, label })) })),
});

export function Inspected(props: React.ComponentProps<typeof OrderCard>) {
  useSyncExternalStore(inspect.subscribe, inspect.getVersion);
  useEffect(() => { inspect.mount(); return () => inspect.unmount(); }, []);
  CONTROLS.forEach((c) => c.read && inspect.setOriginal(c.key, String(c.read(props))));
  let p: any = props;
  for (const c of CONTROLS) { const o = c.options.find((o) => o.id === inspect.get(c.key)); if (o && 'patch' in o) p = (o as any).patch(p); }
  if (inspect.get('actions') !== 'live') p = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, typeof v === 'function' && /^on[A-Z]/.test(k) ? () => {} : v]));
  return <OrderCard {...p} />;
}
```

Notes:
- The first option of every control, "Original", is the page's own value, so the page looks as it did until a control moves. `actions` has no original: it starts stubbed.
- Patch at the prop or data field the control names: a nested field (`order.status`), a flag, a list (`[]`, one item), an optional field present or absent.
- Stubbing covers callback props (`onX`). A component that calls an API from inside its own hooks keeps doing so; tell the user when you see it.
- The wrapper uses `useSyncExternalStore`, so it needs React 18 or later. On older React, subscribe in an effect and keep a version counter in state.

## Other frameworks

The same wrapper shape, with the framework's own way of re-rendering on `subscribe` (job 2). The patches, the stubbing and the mount are unchanged.

| Framework | Re-render on change |
| --- | --- |
| Vue 3 | `const v = ref(0)`; in `onMounted`, `const off = inspect.subscribe(() => v.value++)`, and call `off` in `onUnmounted`. Read `v.value` in the render or in a `computed`. |
| Svelte | `const version = readable(0, (set) => inspect.subscribe(() => set(inspect.getVersion())))`; read `$version`. |
| Solid | `const [v, setV] = createSignal(0)`; in `onMount`, `onCleanup(inspect.subscribe(() => setV((n) => n + 1)))`. |
| Angular | `version = signal(0)`; in the constructor, `inspect.subscribe(() => this.version.update((n) => n + 1))`, cleaned up through `DestroyRef`. |

## Plain HTML

Static pages and server-rendered ones (Rails, Django, Blade, PHP) have no props and no components to wrap, so a control changes the element: a class, a `data-` attribute, some text, whether a child shows. The wiring is one script tag marked `ahem-inspect`, and removing it later means deleting that tag and the folder.

```html
<!-- ahem-inspect -->
<script type="module">
import { createInspect } from './ahem-inspect-order-card/drawer.js';

let current = document.querySelector('.order-card');   // the component's root element
const original = current.cloneNode(true);

const CONTROLS = [
  {
    key: 'status', label: 'Order state',
    read: (el) => el.dataset.status,                    // optional: the page's own value, shown as "Original: ..."
    options: [
      { id: 'placed', label: 'Placed', patch: (el) => { el.dataset.status = 'placed'; el.querySelector('.badge').textContent = 'Placed'; } },
      { id: 'in_progress', label: 'In progress', patch: (el) => { el.dataset.status = 'in_progress'; el.querySelector('.badge').textContent = 'In progress'; } },
    ],
  },
  { key: 'actions', label: 'Actions', initial: 'stubbed', noOriginal: true,
    options: [{ id: 'stubbed', label: 'Stubbed' }, { id: 'live', label: 'Live' }] },
];

const inspect = createInspect({
  id: 'order-card',
  controls: CONTROLS.map(({ key, label, initial, noOriginal, options }) => ({ key, label, initial, noOriginal, options: options.map(({ id, label }) => ({ id, label })) })),
});
CONTROLS.forEach((c) => c.read && inspect.setOriginal(c.key, c.read(original)));

// Each change rebuilds the element from the snapshot, applies the selected patches, and swaps it in.
function apply() {
  const next = original.cloneNode(true);
  for (const c of CONTROLS) { const o = c.options.find((o) => o.id === inspect.get(c.key)); if (o && o.patch) o.patch(next); }
  if (inspect.get('actions') !== 'live') {
    next.addEventListener('click', (e) => { if (e.target.closest('a[href], button, [type=submit]')) e.preventDefault(); });
    next.addEventListener('submit', (e) => e.preventDefault());
  }
  current.replaceWith(next); current = next;
}
inspect.subscribe(apply); inspect.mount(); apply();
</script>
```

Notes:
- Swapping the element drops listeners attached to the old one. That suits static markup; for a component that wires itself up with JavaScript, use its framework's wrapper.
- A page whose framework hydrates or re-renders over DOM edits (Next, Nuxt) uses that framework's wrapper too.

## Out of scope

Native projects (SwiftUI, Android) have no web page to put a drawer on. `/component-lab` covers them by redrawing the component in HTML.
