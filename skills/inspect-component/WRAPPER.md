# The wrapper

Read in Phase 3 of [SKILL.md](SKILL.md). The shape is the same in every framework; this one is React. The wrapper lives in `ahem-inspect-<component>/Inspected.tsx` beside a copy of [drawer.js](drawer.js). The page renders `Inspected` where it rendered the real component, so the component stays in its real context: the page's layout, data, providers and theme.

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
- Other frameworks: the same three parts. A wrapper that reads `inspect.get(key)`, applies the selected patches to the incoming props, and mounts the drawer once.
