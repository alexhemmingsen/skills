---
name: inspect-component
description: Put a drawer of controls beside a component on the page you already have open, change what it shows through its props, adjust the design in context, then implement it and remove the drawer.
disable-model-invocation: true
---

# Inspect Component

Invoked with a component ("inspect the order card"), start at Phase 1. Invoked bare, ask one question: **Which component?**

A drawer of controls opens on the page the developer already has open. The controls drive the component's props, and the component stays **in context**: the page's layout, data, providers and theme. No new page is built. (For a grid of every state on a page of its own, or for a native project with no web page, the developer uses `/component-lab`.)

## Workflow

### Phase 1: Find

Locate the component's source and the file where the open page renders it. The page is the one the developer is on; ask only when it is unclear which.

**Done when** the component file and its usage site are located.

### Phase 2: Define the controls

A **control** is a prop the component gets, or a field inside a prop's data (`order.status`): anything that changes what the component shows. Read the component and its types, then take values from the type: every member of a union or enum, both values of a boolean, an optional field present and absent, a list empty, one and many, text short and long.

- Pick every prop or field that changes what the component shows. The drawer scrolls, so completeness costs nothing; ids, handlers and plumbing are not controls.
- Each control starts at **Original**: the page's own value, so the page looks as it did until a control moves.
- Label each in product language (**Order state**, not `order.status`).
- Always add **Actions** (stubbed, live), starting stubbed, so no click on the page does anything real.

Print the controls in a few lines, each with its values.

**Done when** every prop or field that changes the look is a control or dropped with a reason, each control has a label, its values and the change it makes to the props, and the list is printed.

### Phase 3: Wire it and open it

1. Put the work in a folder named `ahem-inspect-<component>` and copy [drawer.js](drawer.js) into it.
2. Write the wrapper as [WRAPPER.md](WRAPPER.md) shows for the project's framework (React, Vue, Svelte, Solid, Angular, or plain HTML). In a framework it is `Inspected`: it renders the real component with the selected controls applied to the props the page passes, and mounts the drawer. Every instance the page renders through it shares the controls.
3. Swap the page's import of the component for `Inspected` (plain HTML: add the script tag). That is the only edit to the project; mark it with a comment containing `ahem-inspect`.
4. **Make the drawer appear on the open page yourself.** This is paramount: the developer never navigates there on their own. Hot reload usually brings it up; when it does not, reload their tab or navigate it to the page (`open <url>` on macOS, `xdg-open` on Linux, `start` on Windows, or the browser tool when you have one). Start the dev server if it is not running.
5. Check each control: it changes the component, and Original brings back what the page showed.
6. Tell the developer how to move the drawer: **Alt+I** or the ✕ folds it away, the grip at its top center docks it on either side, and its edges resize width and height.

**Done when** the drawer is visible on the developer's page, opened by you, and every control works.

### Phase 4: Adjust

The loop: the developer moves the controls and says what to change ("the badge should be blue", "tighten the spacing when it is in progress"). Each request becomes **one edit** to the real component, in the project's conventions (its tokens and classes), followed by a one-line reply; hot reload shows it in context. `add control <x>` and `drop control <x>` change the drawer. After a visual change, step through the control values that touch the changed part: a fix for one often breaks another. Project checks wait for Phase 5.

**Done when** each request ends with its one edit and a one-line reply. The loop ends at `done` or `drop it`.

### Phase 5: Implement and remove

1. The edits are already in the real component. Swap the page's import back (plain HTML: remove the script tag), so the page renders the real component again.
2. Delete the `ahem-inspect-<component>` folder.
3. Prove it is gone: a search of the repo for `ahem-inspect` finds nothing, and `git status` lists no inspector path. Stop the dev server if you started it.
4. Run the project's checks, now that the work is production code.

**Done when** the component shows the result, the repo has zero hits for `ahem-inspect`, and the checks pass.

`drop it` runs steps 1 to 3, then asks before reverting this session's edits to the component.

While the drawer exists, its files stay unstaged and uncommitted. A request to commit, push or open a PR gets a stop: say the drawer still exists, and finish or drop it first.

## Invocation

| Invocation | Behavior |
| --- | --- |
| `<component>` | Phases 1 to 4 |
| `add control <x>` / `drop control <x>` | Change the drawer |
| `done` | Phase 5: remove the drawer, keep the edits |
| `drop it` | Remove the drawer, then ask before reverting the edits |
