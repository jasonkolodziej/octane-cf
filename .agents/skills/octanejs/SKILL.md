---
name: octanejs
description: Build Octane (octanejs) applications — React's programming model, compiled. Use when writing, reviewing, or debugging Octane components, .tsrx control flow, hooks (useState, useEffect, use), context, deferred hydration, transitions, forms/actions, or server rendering with octanejs. Covers Octane-specific idioms that differ from React (no forwardRef, @if/@for directives, automatic effect dependency inference, compiler-based hydration splitting).
license: MIT
---

# Octane (octanejs) Development Guide

Octane is "React's programming model, compiled." Components, props, state, and hooks feel familiar, but Octane adds a compiler, `.tsrx` control-flow directives, automatic effect-dependency inference, compiler-driven code splitting, and an optional Strong mode purity contract. Follow these instructions when generating, reviewing, or refactoring Octane code.

## Golden rules (check every code sample against these)

1. **File format matters.** Use `.tsrx` for full Octane syntax (control-flow directives, `@{ }` returns). Use `.tsx`/`.jsx` in compatibility mode. Direct calls to built-in hooks infer their dependency lists in every compiler-processed module — including custom hooks written in plain `.ts`/`.js`. Only calls to custom wrapper hooks in plain `.ts`/`.js` (or imported/method-style/non-transparent wrappers) need an explicit dependency array.
2. **Use `onInput` for text fields**, not `onChange**. Keep native `onChange` only for deliberate commit-on-blur, and add `suppressNativeChangeWarning`. Events are the browser's real `Event` objects — there are no synthetic-event polyfills (`onBeforeInput`, `onSelect`), and native enter/leave handlers apply. For capture-phase text input, use `onInputCapture` (an `onChangeCapture` fix preserves phase).
3. **Never mutate state snapshots.** For objects/arrays, create a new value.
4. **Prefer the updater form** `setCount((current) => current + 1)` when the next value depends on the previous one.
5. **No `forwardRef`.** Refs are ordinary props in Octane. A host element can receive several refs: `ref={[inputRef, measurementRef]}`.
6. **Render `<title>` directly** — Octane hoists it to `<head>`. Do not use an effect for page metadata.
7. **Keys for `@for` must be stable** — use an item ID, never the array index when items can be inserted, removed, or reordered.
8. **Hooks are identified by compiled call site**, so they may appear after an early return or inside a condition. Do NOT put hooks in a plain JS loop (shared call site) — use a keyed `@for` block or extract a child component. Exception: the readers `use()` and `useContext()` may be conditional.
9. **Promises created during render are safe** — Octane's compiler memoizes every creation that feeds a `use()` at its declaration, keyed on its real inputs (including local promise chains), so no `cache()` wrapper is needed. Independent `use()` calls also start in parallel automatically. Still create the Promise in an event handler when a user action triggers the request.
10. **`class`/`className` compose clsx-style** — arrays, objects, and nested values join with spaces (`['a', cond && 'b', { selected }]` → `"a b selected"`), on both client and server. Do not reach for a classnames helper.
11. **No synthetic checkable-event timing** — for checkboxes/radios the browser fires `click` → `input` → non-cancelable `change`, so `preventDefault()` in native `onChange` cannot roll a toggle back. Cancel the earlier `onClick` when rollback is intended. (React's synthetic checkable `onChange` is backed by the cancelable click — an intentional timing divergence.)
12. **Strong mode** (`'use strong'`) forbids: updating state during render, writing `ref.current` during render, state-snapshot mutations, direct clock/random reads during render, and calling Effect Events during render or listing them in dependency arrays.

## Mental model

- Components are TypeScript functions: props in → UI out. Attach `onClick`/`onInput` handlers and let Octane keep the page in sync; never imperatively re-render.
- `useState` returns `[value, setValue]`; the value during render is a snapshot.
- Optional third tuple item `getValue` reads the latest scheduled value inside long-lived async callbacks without subscribing or rendering: `const [count, setCount, getCount] = useState(0)`.
- Context is for values many distant components need (theme, locale, user). It is not automatic global state — lift state only when several branches truly share a source of truth.

## .tsrx control flow

Use directives instead of ternaries/`&&`/`.map()` for rendered control flow:

```tsx
export function PackingList(props: { items: Item[] }) @{
	<ul>
		@for (const item of props.items; key item.id) {
			<li>
				{item.label}
				@if (item.packed) {
					<span aria-label="packed">✓</span>
				}
			</li>
		} @empty {
			<li>Your list is empty.</li>
		}
	</ul>
}
```

- `@switch` — several exclusive branches.
- `@try { ... } @pending { ... } @catch (error) { ... }` — Promise/Suspense template control flow.
- `@{ ... }` means "return the final JSX node"; a normal `return` body is equally valid.
- Fragment `<>...</>` for siblings without a wrapper.

## Events and inputs

Text inputs use the native `input` event:

```tsx
<input value={name} onInput={(event) => setName(event.currentTarget.value)} />
```

`select`, checkbox/radio, custom elements, and component props named `onChange` need no suppression.

## Data fetching: `use` + Suspense/ErrorBoundary

```tsx
import { ErrorBoundary, Suspense, use } from 'octane';

function Profile(props: { data: Promise<ProfileData> }) @{
	const profile = use(props.data); // suspends while pending, throws on reject
	<article>
		<h2>{profile.name}</h2>
		<p>{profile.bio}</p>
	</article>
}

export function ProfilePage(props: { data: Promise<ProfileData> }) @{
	<ErrorBoundary fallback={<p>We could not load this profile.</p>}>
		<Suspense fallback={<p>Loading profile…</p>}>
			<Profile data={props.data} />
		</Suspense>
	</ErrorBoundary>
}
```

The parent owns loading/error UI; the child describes only success. Independent `use()` calls start in parallel automatically — no loading waterfalls (a request that needs an earlier result stays sequential). Promises created during render are compiler-memoized at their declaration, keyed on real inputs — `const user = use(fetchUser(id)); const teams = use(fetchTeams(id));` starts both together, and derived chains like `fetchUser(id).then((u) => u.thumbnail())` are safe without `cache()`. `@catch` optionally receives a `reset` callback: `@catch (error, reset) { <button onClick={reset}>Try again</button> }`. `useContext(Theme)` is the context-specific spelling of `use(Theme)`.

## What Octane leaves out (and what changes subtly)

Octane keeps the component/hook APIs but intentionally omits:

- **Class components**, legacy roots, and class error-boundary lifecycles — error boundaries are the function-based `ErrorBoundary` or the `@try/@catch` template (with optional `reset`).
- **Server Components, RSC/Flight, and `cache()`** — render-created promises are safe without `cache()`.
- **`StrictMode` double-invocation, `Profiler`, `SuspenseList`** — do not expect double-render debugging behavior.
- **`forwardRef` and `createRef`** — refs are ordinary props (object refs, callback refs, and arrays of refs all work).
- **Most `React.Children` utilities** — keyed `@for` is the normal collection API.

Subtle behavioral differences worth knowing:

- **Scheduling**: updates batch in a microtask and every render runs to completion. There are urgent and transition updates, but no lanes, yield points, CPU time slicing, or selective hydration. `flushSync` drains the full update queue; passive effects still run after paint. Suspended transitions keep the current screen visible with `isPending` — that behavior is intact.
- **Errors**: an uncaught error is reported via `console.error` (there is no React `onUncaughtError` callback). Production builds replace core-runtime framework messages with Octane-owned append-only codes plus a decoder link; user-thrown errors and compiler diagnostics keep original messages.
- **Hydration**: value mismatches are patched and structural mismatches rebuilt in place with a warning — they are not thrown to a boundary.
- **Reconciliation**: the keyed reconciler uses longest-increasing-subsequence moves; final order, node identity, focus, and state match React, only the physical move pattern can differ.
- **Same-value updates** can skip the component body where React may enter it once more before bailing out; the committed result is identical.
- **`useSyncExternalStore`** does not re-read an unchanged snapshot at commit just because callback identity changed; notifying stores are unaffected.
- **Form actions**: when one action rejects, Octane continues later queued actions instead of cancelling them.
- **Custom elements**: property handling stays closer to the browser than React's property-name table.

## Refs and effects

```tsx
import { useEffect, useRef } from 'octane';

export function ShortcutSearch() @{
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		const focusSearch = (event: KeyboardEvent) => { /* ... */ };
		window.addEventListener('keydown', focusSearch);
		return () => window.removeEventListener('keydown', focusSearch);
	}); // dependencies inferred automatically in .tsrx/.tsx full-compile

	<input ref={inputRef} aria-label="Search" />
}
```

- Dependencies are **inferred** in full-compiled modules; explicit arrays still work: `[]` = mount/unmount, `null` = every render.
- `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` for truth outside Octane that already offers a subscription. Keep `subscribe`/`getSnapshot` stable; keep object snapshot identity until contents change.
- `useLayoutEffect` for measure/adjust before paint. `useInsertionEffect` is for styling libraries.
- `useEffectEvent` creates a non-reactive callback: never add Effect Events to dependency arrays.

## Linked state

`useLinkedState(source, compute)` keeps editable state synced with a changing source without effects:

```tsx
const [name, setName] = useLinkedState(props.user.id, () => props.user.name);
```

While `props.user.id` is unchanged, edits persist; when it changes, the hook returns the new value immediately. `compute` receives `(nextSource, previous)` where `previous` is `{ source, value }` after a change, `undefined` on first render. Optional third argument `{ sourceEqual, valueEqual }` customizes `Object.is` comparison.

## Deferred hydration (`Hydrate`)

Keep server HTML visible while deferring interactivity:

```tsx
import { Hydrate } from 'octane';
import { visible } from 'octane/hydration';

<Hydrate when={visible({ rootMargin: '400px' })}>
	<Reviews />
</Hydrate>
```

Decision table:

| Prop | Default | Purpose |
| --- | --- | --- |
| `when` | required | Activation trigger |
| `split` | `true` | Compiler generates a deferred child chunk |
| `prefetch` | none | Warm code/data before activation |
| `fallback` | none | Client-only loading UI for later mounts |
| `onHydrated` | none | Runs once after child commits on client |

Strategies from `octane/hydration`: `load()`, `idle({ timeout? })`, `visible({ rootMargin?, threshold? })`, `media(query)`, `interaction({ events? })`, `condition(booleanOrGetter)`, `never()`. A function `when={() => strategy}` may use browser-only info and is never called on the server.

Prefetch forms: strategy (`prefetch={idle()}`) or procedural async `({ preload, waitFor, signal, element })` — awaited work blocks activation; `signal` aborts if the boundary unmounts. Procedural prefetch also works with `split={false}`.

If the client entry awaits work before `hydrateRoot()`, call `initializeHydrationEventCapture()` first so early interactions replay:

```tsx
import { hydrateRoot } from 'octane';
import { initializeHydrationEventCapture } from 'octane/hydration';

initializeHydrationEventCapture();
await prepareClient();
hydrateRoot(document.getElementById('app')!, App);
```

## Behavior-only roots (external DOM ownership)

When another system owns the HTML (streams, CMS, separate apps), do not render or hydrate — attach behavior with the focused `octane/behavior` entry:

```tsx
import { attachBehaviorRoot } from 'octane/behavior';

const root = attachBehaviorRoot(container, { signal: page.signal });
root.registerExternalRange(article, { owner, ready: stream.allReady });
const behavior = root.registerBehavior({
	id: 'article-annotations',
	owner,
	target: '[data-annotation]',
	events: ['click'],
	ready: import('./annotations.js'),
	adopt(element, { signal }) { return cleanup; },
	handleEvent(event, element) { /* original native Event, genuine isTrusted */ },
});
await root.ready;
behavior.dispose();          // remove behavior, keep markup
root.dispose();              // dispose all; { preserveDOM: false } only if clearing is intended
```

Ownership models, from most to least Octane ownership:

| Approach | Who owns the DOM? | Client work |
| --- | --- | --- |
| `hydrateRoot(container, App)` | Octane's tree | Full hydration |
| `<Hydrate when={...}>` | Octane after activation | Deferred tree |
| `<Hydrate split={false} when={never()}>` | Server/stream | Nothing (static range) |
| `attachBehaviorRoot(container)` | Existing owner | Only registered behaviors |

## Transitions, deferral, and actions

- `useTransition` — keep the current screen while the next loads: `const [isPending, startTransition] = useTransition();` then `startTransition(() => setTab('activity'))`. Typing state stays urgent.
- `useDeferredValue(value)` — let a slow child lag behind an urgent input; expose staleness with `query !== deferredQuery`. This is not a debounce.
- `ViewTransition` — animate old↔new screens; wrap the changing element and make the change inside a transition. Browsers without the API skip the animation but keep the state change.
- Forms: `useActionState(action, initial)` returns `[state, dispatch, isPending]`; pass `dispatch` to `<form action={dispatch}>`. Companion APIs: `useFormStatus`, `useOptimistic`, `requestFormReset(form)`.

## Roots and portals

```tsx
import { createRoot, hydrateRoot } from 'octane';

const root = createRoot(container);
root.render(App);
// or, when the server already sent HTML:
hydrateRoot(container, App);
```

`createPortal(Component, target, props)` renders into another container while preserving logical parentage: events bubble to the logical parent, context crosses the portal, unmounting the owner removes portalled DOM. Note the argument order is component-first: `createPortal(ToastBody, props.target, { onDismiss })`.

`flushSync(callback)` is for third-party integrations needing immediate DOM. `act(callback)` is for tests only.

## React interop (`octane/react`)

When a task involves mixing renderers, read `reference/react-interop.md` in full. Key rules:

- **Two hosts, one direction each**: React 19 app → `OctaneCompat` renders compiled Octane components; Octane app → `ReactCompat` renders real React (19.2+) components. Never alias React to Octane. Each island is a separate root — one boundary per useful subtree, not per widget.
- **Exactly one component element** per host. `ReactCompat` accepts function/class/`memo`/`lazy`/`forwardRef` roots only — never a DOM element, fragment, array, or multiple children as the island root.
- **Events are never translated.** Inside `ReactCompat`, React components keep synthetic `onChange`; inside `OctaneCompat`, Octane components keep native `onInput`. Don't "fix" an island's handlers to match the host's conventions.
- **Context**: Octane islands read React context directly via `use()`. React islands need `bridgeReactContext(octaneCtx, reactCtx)` passed as `contexts={[...]}` — mappings are per-island; keep identities stable or change the boundary key.
- **Keys**: child key/type change replaces the island component; outer boundary key change replaces the whole root.
- **Toolchain**: `octane({ requireDirective: true })` + `@vitejs/plugin-react` in Vite; `.tsrx` is always Octane-owned; mark Octane-owned `.tsx`/`.ts`/`.js` with `/** @jsxImportSource octane */`, React modules with `/** @jsxImportSource react */`.
- **Type checking**: `tsrx-tsc` for any program containing `.tsrx`; never add `declare module '*.tsrx'` shims.
- **SSR limits**: React-in-Octane islands buffer HTML (8 MiB cap) — async/streaming Octane renderer required; Octane-in-React delegates unresolved suspension to React's renderer. RSC/Flight/`cache()` never cross. Both hosts inject a `div[data-octane-compat]`/`div[data-react-compat]` wrapper — invalid inside table rows, `select`, or SVG trees.

## Server rendering

| Goal | API | Returns |
| --- | --- | --- |
| Hydratable HTML, one pass | `renderToString` (from `octane/server`) | `{ html, css }` |
| Non-hydratable HTML | `renderToStaticMarkup` | `{ html, css }` |
| Progressive Node response | `renderToPipeableStream` | pipeable controller |
| Progressive Web response | `renderToReadableStream` | `Promise<ReadableStream & { allReady }>` |
| Fully resolved (SSG) | `prerender` (from `octane/static`) | `Promise<{ html, css }>` |

Put `html` in the body and `css` (ready-to-place `<style data-octane="hash">` tags) in `<head>`; the client's `injectStyle` recognizes and skips them during hydration. For a standalone SSG script: `node --import octane/compiler/register entry-server.ts`. Streaming APIs flush each scoped `<style>` inline instead of returning a `css` field.

## API quick index by job

- **Remember/share:** `useState`, `useReducer`, `useLinkedState`, `createContext`, `use`/`useContext`, `useSyncExternalStore`
- **Connect to browser:** `useRef`, `useEffect`, `useLayoutEffect`, `useInsertionEffect`, `useEffectEvent`, `useId`, `useImperativeHandle`
- **Load/reveal:** `Hydrate`, `Suspense`, `ErrorBoundary`, `lazy`, `startTransition`, `useTransition`, `useDeferredValue`, `Activity`
- **Forms:** `useActionState`, `useFormStatus`, `useOptimistic`, `requestFormReset`
- **Compose/optimize:** `Fragment`, `memo`, `useMemo`, `useCallback`, `createPortal`, `ViewTransition`, `addTransitionType`
- **Roots/resources:** `createRoot`/`hydrateRoot`, `attachBehaviorRoot`, `preload`/`preinit`, `preconnect`/`prefetchDNS`, `flushSync`/`act`, `setSsrSuspenseTimeout`, `version`

## Resources in this skill

- `reference/tsrx-syntax.md` — full `.tsrx` directive and authoring-format reference.
- `reference/hydration-and-ownership.md` — deep dive on `Hydrate`, strategies, prefetch, behavior roots, and external ownership.
- `reference/idioms-and-pitfalls.md` — React→Octane migration table and common mistakes to flag in review.
- `reference/differences-from-react.md` — full behavioral delta reference: hooks-by-source-location, native events, transitions without time slicing, error/hydration semantics, and omitted APIs.
- `reference/react-interop.md` — two-way React↔Octane interop: `OctaneCompat`/`ReactCompat` hosts, compiler ownership, context bridging, cross-renderer suspense/error semantics, SSR limits, and type-checking setup.
- `examples/components.md` — copy-adaptable component recipes (counter, forms, data fetching, portals, tabs with transitions).
