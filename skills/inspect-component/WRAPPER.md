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
      // one option patches every field the in-progress branches read, so the whole state shows
      { id: 'in_progress', label: 'In progress', patch: (p) => ({ ...p, order: { ...p.order, status: 'in_progress', startedAt: p.order.startedAt ?? new Date().toISOString() } }) },
    ],
  },
];

const inspect = createInspect({
  id: 'order-card',
  controls: CONTROLS.map(({ key, label, options }) => ({ key, label, options: options.map(({ id, label }) => ({ id, label })) })),
});

export function Inspected(props: React.ComponentProps<typeof OrderCard>) {
  useSyncExternalStore(inspect.subscribe, inspect.getVersion);
  useEffect(() => { inspect.mount(); return () => inspect.unmount(); }, []);
  CONTROLS.forEach((c) => c.read && inspect.setOriginal(c.key, String(c.read(props))));
  let p: any = props;
  for (const c of CONTROLS) { const o = c.options.find((o) => o.id === inspect.get(c.key)); if (o && 'patch' in o) p = (o as any).patch(p); }
  return <OrderCard {...p} />;
}
```

Notes:
- The first option of every control, "Original", is the page's own value, so the page looks as it did until a control moves.
- A patch sets everything the state needs: the field the control names and the other fields that its conditional renders read (timestamps, flags, related lists). In plain HTML, the same: show, hide and fill every part that depends on the state.
- Patch at the prop or data field the control names: a nested field (`order.status`), a flag, a list (`[]`, one item), an optional field present or absent.
- The wrapper never touches the component's behavior: callbacks, handlers, forms and API calls run as they do on the page.
- The wrapper uses `useSyncExternalStore`, so it needs React 18 or later. On older React, subscribe in an effect and keep a version counter in state.

## Other frameworks

The same wrapper shape, with the framework's own way of re-rendering on `subscribe` (job 2). The patches and the mount are unchanged.

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
];

const inspect = createInspect({
  id: 'order-card',
  controls: CONTROLS.map(({ key, label, options }) => ({ key, label, options: options.map(({ id, label }) => ({ id, label })) })),
});
CONTROLS.forEach((c) => c.read && inspect.setOriginal(c.key, c.read(original)));

// Each change rebuilds the element from the snapshot, applies the selected patches, and swaps it in.
function apply() {
  const next = original.cloneNode(true);
  for (const c of CONTROLS) { const o = c.options.find((o) => o.id === inspect.get(c.key)); if (o && o.patch) o.patch(next); }
  current.replaceWith(next); current = next;
}
inspect.subscribe(apply); inspect.mount(); apply();
</script>
```

Notes:
- Actions keep working: inline handlers (`onclick="..."`), delegated listeners on an ancestor or `document`, links and forms all survive the swap. Listeners that JavaScript attached directly to the element or its children do not; patch such a component in place (class, `data-` attribute, text on the live element) instead of swapping it, or use its framework's wrapper.
- A page whose framework hydrates or re-renders over DOM edits (Next, Nuxt) uses that framework's wrapper too.

## Out of scope

Native projects (SwiftUI, Android) have no web page to put a drawer on, so this skill does not apply to them.
