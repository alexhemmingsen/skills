---
name: inspect-component
description: Put a drawer of controls beside a component on the page you already have open, change what it shows through its props, adjust the design in context, then implement it and remove the drawer.
disable-model-invocation: true
---

# Inspect Component

Invoked with a component ("inspect the order card"), start at Phase 1. Invoked bare, ask one question: **Which component?**

A drawer of controls opens on the page the developer already has open. The controls drive the component's props, and the component stays **in context**: the page's layout, data, providers and theme. No new page is built.

## Speed

This skill must not break the developer's flow. **Aim to have the drawer and its controls rendered on their page within 90 seconds, at most, if possible.** Stamp the start with `date` and check it before reading further.

- Read only what the drawer needs: the component, its types and its usage site.
- Make independent reads together, in one step.
- Skip repo-wide exploration, builds and checks until Phase 5.
- Put the drawer up with the controls the first read finds, then add the rest while the developer plays.

## Workflow

### Phase 1: Find

Locate the component's source and the file where the open page renders it. The page is the one the developer is on; ask only when it is unclear which.

**Done when** the component file and its usage site are located.

### Phase 2: Define the controls

A **control** is a prop the component gets, or a field inside a prop's data (`order.status`): anything that changes what the component shows. Read the component and its types, then take values from the type: every member of a union or enum, both values of a boolean, an optional field present and absent, a list empty, one and many, text short and long.

- Start with the props and fields that most change what the component shows; the first read is enough. Ids, handlers and plumbing are not controls.
- **Mind the conditional renders.** A control sets a state, and everything that depends on that state must follow. For each field a control sets, find every conditional that reads it (`&&`, ternaries, `switch`, early returns, conditional classes, child components, hooks) and have the patch set every other field those branches need, so the whole state shows. Setting an order to Accepted also gives it the accepted time and prep time that its timeline and buttons render when accepted. One option can patch several fields.
- Each control starts at **Original**: the page's own value, so the page looks as it did until a control moves.
- Label each in product language (**Order state**, not `order.status`).
- Leave the component's behavior alone: clicks, handlers, forms and API calls run exactly as they do on the page. Controls change what the component shows, never what its actions do.

Print the controls in a few lines, each with its values.

**Done when** the controls the first read finds each have a label, their values and the change they make to the props, and the list is printed.

### Phase 3: Wire it and open it

1. Put the work in a folder named `ahem-inspect-<component>` and copy [drawer.js](drawer.js) into it.
2. Write the wrapper as [WRAPPER.md](WRAPPER.md) shows for the project's framework (React, Vue, Svelte, Solid, Angular, or plain HTML). In a framework it is `Inspected`: it renders the real component with the selected controls applied to the props the page passes, and mounts the drawer. Every instance the page renders through it shares the controls.
3. Swap the page's import of the component for `Inspected` (plain HTML: add the script tag). That is the only edit to the project; mark it with a comment containing `ahem-inspect`.
4. Start the dev server if it is not running.
5. **Navigate the developer to the page where the drawer is mounted, yourself, every time.** This is extremely important: the developer never navigates there on their own. Hot reload bringing the drawer up on the page they happen to have open is not enough, because that may not be the page that renders the component. Find the route where the component renders with real data (the page's path plus the id or query it needs), then send their browser there: navigate their tab with the browser tool when you have one, otherwise run `open <url>` (macOS), `xdg-open <url>` (Linux) or `start <url>` (Windows). Print the URL beside it as a courtesy, never as a substitute. When the component only shows after an interaction (a modal, a tab), navigate to the page and tell the developer the one step that reveals it. Only when every way of opening it fails, say so plainly.
6. Check each control: it changes the component, **every part that depends on it follows** (no half-rendered state, such as a new badge above a timeline and buttons still showing the old state), and Original brings back what the page showed.
7. Tell the developer how to move the drawer: **Alt+I** or the ✕ folds it away, the grip at its top center docks it on either side, and its edges resize width and height.

**Done when** you have navigated the developer's browser to the page where the drawer is mounted (step 5), the drawer is visible there, and every control works.

### Phase 4: Adjust

While the developer plays, read on and add the controls you left out, so that every prop or field that changes the look ends up a control or dropped with a reason. The loop: the developer moves the controls and says what to change ("the badge should be blue", "tighten the spacing when it is in progress"). Each request becomes **one edit** to the real component, in the project's conventions (its tokens and classes), followed by a one-line reply; hot reload shows it in context. `add control <x>` and `drop control <x>` change the drawer. After a visual change, step through the control values that touch the changed part: a fix for one often breaks another. Project checks wait for Phase 5.

**Done when** each request ends with its one edit and a one-line reply. The loop ends when the developer is finished, in any words (see Phase 5), or drops it.

### Phase 5: Implement and remove

**Run this the moment the developer says they are finished**, in any words: "done", "I'm done editing", "looks good", "implement it", "transfer it to the real component", "that is it". Run it at once and without asking: removing the inspector is the expected outcome.

1. **Make sure the real component has every change.** List the edits you made in Phase 4 (your one-line replies) and check each against `git diff` of the component and its files. An edit that lives only in the `ahem-inspect-<component>` folder (a patch, a wrapper tweak, a lab-only prop) moves into the real component, in the project's conventions.
2. Swap the page's import back (plain HTML: remove the script tag), so the page renders the real component again.
3. Delete the `ahem-inspect-<component>` folder.
4. Prove it is gone: a search of the repo for `ahem-inspect` finds nothing, and `git status` lists no inspector path. Stop the dev server if you started it.
5. Run the project's checks, now that the work is production code.
6. Report the changes in the component, one line per edit, with the files.

**Done when** the component's diff holds every change from the session, the repo has zero hits for `ahem-inspect`, and the checks pass.

`drop it` skips step 1: it runs steps 2 to 4, then asks before reverting this session's edits to the component.

While the drawer exists, its files stay unstaged and uncommitted. A request to commit, push or open a PR gets a stop: say the drawer still exists, and finish or drop it first.

## Invocation

| Invocation | Behavior |
| --- | --- |
| `<component>` | Phases 1 to 4 |
| `add control <x>` / `drop control <x>` | Change the drawer |
| `done`, or anything that means finished | Phase 5 at once: the component keeps every change, the drawer is removed |
| `drop it` | Remove the drawer, then ask before reverting the edits |
