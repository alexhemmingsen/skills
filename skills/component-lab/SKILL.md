---
name: component-lab
description: Work on one existing component in a throwaway lab page that shows every variant and state at once. Edit it with the agent, then lift it into the real component.
disable-model-invocation: true
---

# Component Lab

Invoked with a component ("lets work on the action button"), start at Phase 1. Invoked bare, ask one question: **Which component?**

The lab is a **throwaway** page that you open in the user's browser yourself. [lab.html](lab.html) is the page; its header comment says how it behaves. It renders the project's **real component**, imported **untouched**, so what the user sees is production styling. One marked guard goes into the project's code, and the lab is deleted when the work ends.

## Workflow

### Phase 1: Scope

Search the project once by name. "The buttons" is a **family**: every variant. "The action button" is **one variant**: states only. When nothing matches, or the user wants a new one ("make a new button"), say so in one line and point to `/prototype-component`. Stop.

**Done when** the component's source files are located and the scope is one sentence.

### Phase 2: Discover axes

**The lab is only as good as its list of states.** A missing state is a bug nobody sees until production, so investigate until the list is **exhaustive**.

Read the component file, every file it imports that shapes its output (child components, style files, variant helpers such as `cva` or a `variants` map, hooks, stores, contexts, i18n keys), and the types it uses. Then sort everything that can change into three kinds of axis:

- **Variants** are versions of the component, each with its own set of states: a button used for different things (action, neutral, destructive), a timeline that shows different elements depending on a flag or type, a product card per product type. The variant select switches between them and the grid shows the states of the selected one. **A variant is never a state**: hover, loading, disabled, empty and error are states, found inside every variant. The test: does it come with its own set of states, so it could fill a grid of its own? Sense them in the component: a `variant`, `kind`, `intent` or `type` prop, a discriminated union, a `cva` or `variants` map, a flag or data type the render branches on to show different elements, sibling components of a family. A prop that only restyles every state of one version (size, shape, theme) is a global axis, not a variant.
- **Global axes** are the right sidebar. **If it affects all states of the component, it goes in the right sidebar.** That covers theme, `size`, shape or radius, shadow or elevation, fill color, border, density, text style, width and direction: any prop, class or token that restyles every cell at once. One select per axis, one option per value (a `radius` prop with three values is three options, not three cells). The test: would a user want to flip it for the whole grid at once? The component's variant helper (`cva`, a `variants` map, conditional classes) is where these keys live. **Every global axis reaches everything** the component renders **and everything its interactions open** (the dialog a button opens, a menu, a popover, a toast): the sidebar controls hold during interaction, not just at rest. Axes style the components only, never the lab's chrome.
- **State axes** are what it is *doing* (`loading`, `error`, `disabled`, `open`). They fill the grid. **Every cell is live**: the component *feels* the way it does in production, on the state the cell shows. Hover and press styles, focus, drag and drop, keyboard, scroll, gestures and its transitions all work (hover the loading button and its hover style appears), so interaction is never a cell of its own.

**Find the states by reading.** Walk the component top to bottom and write down every branch:

- every prop that is not a sidebar control: every value of every union and enum, both values of every boolean, and the combinations the code branches on (`disabled` with `loading`, `selected` with `error`);
- every conditional in the render (`&&`, ternaries, early returns, `switch`), and every conditional class or style;
- data branches: empty, one, many, long text, no text, missing optional fields, error;
- store, context, query and feature-flag values it reads, and the role or plan checks;
- persistent states in the styles and markup (`:disabled`, `[aria-*]`, `[data-*]`, open, expanded, selected, focused with a value), each a cell seeded through props or initial state, and breakpoints or container queries;
- states shown in stories, tests or fixtures that the file leaves unclear.

A state the code cannot reach is not a state: list it as missing and leave it out. Group the states (Data, Interaction, Layout, whatever the component has); groups order the grid. Write the full list down, one line each, before building.

Collect the project's **color variables** for the background dropdown with one search (CSS custom properties that hold colors, the Tailwind theme, a tokens file): every variable whose value is a raw color (hex, `rgb()`, `hsl()`, `oklch()`, `color()`) as `{ name, value }`. Aliases like `var(--other)` and non-colors stay out. An empty list hides the dropdown.

**Done when** every prop value, branch and persistent state in the code is a cell, a sidebar control value, or dropped on purpose with a reason, and the color variables are listed. Print the list, with how many variants and states you found.

### Phase 3: Render the real component and build

With no web dev server (SwiftUI, Android, a plain static site, no project), read [NON-WEB.md](NON-WEB.md): it replaces step 1, step 7 and the clean-up in Phase 5.

1. **Import the real component.** Put the lab in a folder named `ahem-skill-<component>` and import the component from the project, untouched. It brings its own markup, icons, fonts, sizes, spacing, colors, radii and shadows, plus the app's global styles, providers and theme; the lab supplies only the page, the scenarios and the controls, and production does the styling. A hand copy drifts from production, and styling is where it drifts first. Supply what the component has in production around it (a parent's text color, a width, a provider) the way production does.
   Fork a copy into the folder only when the real component cannot be mounted without editing it. Say so in one line, and ask before editing the real component.
2. **Feed each state at the data boundary**, without editing the component, in this order: props, then the app's own data seam (a seeded query cache, a mock provider, the project's request mocks, a store set before render). A fixture threaded through five levels of internals tests a path production never takes. Where the only way in is editing the component, say so and ask before adding a seam.
3. **Keep it in the cell.** Everything the component renders stays inside its grid cell, panels included. With overlays (dialogs, menus, popovers, tooltips, toasts), read the Overlays section of [LAB-MECHANICS.md](LAB-MECHANICS.md): it also says how overlays receive the global axes. Reuse the app's own providers and components for anything the lab needs around the component, so theme, tokens and behavior come with them.
4. **Make it testable.** Every cell is live, and **no request ever leaves the lab**: every API call, mutation, subscription and other side effect (analytics, storage, navigation) is a stub that does the UI part only. Save in a dialog closes the dialog, a submit shows its success state, Delete leaves the data as it is; the network is never touched. Navigation is a side effect too: an external link, `window.open`, `mailto:` or `tel:` link, download or route change does nothing, so the lab page never navigates away and no interaction produces its real result. Reads come from scenario data, writes go nowhere. When the component calls the API itself (a hook, a client), stub it at the app's data seam (a mocked client or provider, a mutation stub); where the only way is editing the component, say so and ask. Write scenarios with product-shaped copy, real-shaped names, amounts and counts, and plausible values: three rows of "Test item" make every state look fine. Loading and pending states stay pending for good.
5. **Leave interaction to the cells.** Every interaction the component supports works in every cell on the state it shows, driven by the component's own code, so the lab adds no forcing and the component gets no extra selectors. Interactions that need handlers (drag and drop, selection, typing) get local state in `render`, so the cell responds while the callbacks stay stubbed. A state a user reaches by interacting that persists (an open menu, an expanded row, a selected tab) is its own cell, seeded through props or initial state.
6. **Fill the page.** Copy [lab.html](lab.html) into the same folder and edit only its `Per run` block: name, variants, axes, `COLORS`, scenarios (`id`, `label`, `group`, `props`, optional `variants`) and `render(variant, props, force, axes, host)`, which mounts the real component. The rest stays as it is, so the lab looks the same on every run.
7. **Mount it.** Reach the lab with the search param `?ahem-skill=<component>` (kebab-case) on the page the app already serves, so hot reload works, through one guard where the whole app is rendered, inside the providers the component needs. Mark the guard with a comment containing `ahem-skill`: the clean-up search finds it by that marker. The Mount section of [LAB-MECHANICS.md](LAB-MECHANICS.md) has the framework specifics.
8. **Check every cell.** Start the app's dev server if it is not running. Compare the lab's cell count with the Phase 2 list, check that each cell shows the mock data, not the real data and not a blank, and use a few cells (hover, press, drag, type) to see their interactions respond. **Switch every global axis (theme, language, size, ...), then interact to open each dialog, menu, popover and toast, and check each one follows**: an overlay that ignores an axis, or sits outside its cell, is the common failure. A fixture that never appears (a refetch over the seed, live sync, a server boundary) is the common failure: fix the plumbing before handing over. With no browser to inspect, say so.
9. **Open the lab in the user's browser yourself.** This is paramount: the user never navigates there on their own. Run `open <url>` (macOS), `xdg-open <url>` (Linux) or `start <url>` (Windows), with `<url>` = `http://localhost:<port>/?ahem-skill=<component>`; when a browser tool is available, navigate a tab to it instead (a new tab, or the one already on the app). Print the URL beside it as a courtesy, never as a substitute. Only when every way of opening it fails, say so plainly.

**Done when** you have opened the lab in the user's browser (step 9) and it has a cell for every state on the Phase 2 list.

### Phase 4: Talk and change

The loop: the user says what to change ("rounder", "hover darker", "add an empty state", "merge those two"), and each request becomes **one edit** to the component, the scenarios or the lab page, followed by a one-line reply saying what changed. Edits to the component go straight into the real file, in the project's conventions (its tokens and classes), unless it is a fork. After a visual change, look at every state again: a fix for one often breaks another. The user's eyes are the verification; project rules that ask for a browser check, tests, lint, a typecheck or a build wait for Phase 5.

**Done when** each request ends with its one edit and a one-line reply. The loop ends at `lift out` or `drop it`.

### Phase 5: Lift out and delete the lab

1. With a fork, translate its changes into the real component, in the project's conventions: its tokens, utility classes, naming and file layout. With the real component rendered in place, its edits are already there.
2. Remove any lab-only props from the real component.
3. **Delete the lab, always, without waiting to be asked.** Remove the `ahem-skill-<component>` folder and the guard (the block marked `ahem-skill`) with its import.
4. Prove it is gone: a search of the repo for `ahem-skill` finds nothing, and `git status` lists no lab path. Stop the dev server if you started it.
5. Run the project's checks, now that the work is production code.

**Done when** the real component shows the result, step 4 passes, and the checks pass.

When the user drops the work ("never mind", "scrap it"), run steps 3 and 4 only.

While a lab exists, its files stay unstaged and uncommitted. A request to commit, push or open a PR gets a stop: say a lab still exists, and lift it out or delete it first.

## Invocation

| Invocation | Behavior |
| --- | --- |
| `<component>` | Phases 1 to 4 |
| `<component> <detail>` | Same, narrowed ("only the destructive variant", "just loading states") |
| `add <scenario>` | New cell in the running lab's grid |
| `lift out` | Phase 5: move the work into the real component, then delete the lab |
| `drop it` | Phase 5 steps 3 and 4: delete the lab without lifting anything out |
