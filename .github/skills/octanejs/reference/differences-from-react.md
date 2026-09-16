# Differences from React — Full Reference

Bring the React mental model. Octane keeps the component and hook APIs and changes a small set of rules where the compiler or the browser can do more of the work. Use this file when migrating React code or reviewing behavior expectations.

## 1. Hooks fit the code

- Octane tracks a hook by **source location**, not call order. A hook can sit behind a condition or after an early return without shifting another hook's state:

```tsx
export function Profile(props) {
	if (!props.user) return <EmptyState />;
	const [editing, setEditing] = useState(false);
	return <button onClick={() => setEditing(!editing)}>Edit profile</button>;
}
```

- Exception: a slot-based hook inside a **plain JavaScript loop** shares one source location across iterations — the compiler reports an error. Use keyed `@for` or move the hook into a child component. `use()` and `useContext()` are exempt (not slot-keyed).

- **Dependency lists are optional** for effects, memos, callbacks, and imperative handles. When omitted, the compiler derives them from the callback's captures — in every compiler-processed module, **including custom hooks written in plain `.ts`/`.js`**:

```ts
export function useLoggedValue(value: string, log: (value: string) => void) {
	useEffect(() => log(value)); // inferred from log and value
}
```

- Inference through a **custom wrapper** is narrower: it works for local wrappers in fully compiled `.tsrx`/`.tsx` modules that transparently forward their callback and final dependency parameter to a built-in hook (nested local transparent wrappers too). Wrapper calls in plain `.ts`/`.js` and imported, method-style, or non-transparent wrappers need an explicit list — their internal calls to built-ins still infer.
- An explicit array keeps its exact React meaning. Pass `null` to intentionally run after every render.

- `useState`/`useReducer` (and `useLinkedState`) offer an optional **third tuple item**: a stable function reading the latest scheduled state — it replaces the post-`await` ref pattern:

```tsx
const [draft, setDraft, getDraft] = useState('');
await waitForConnection();
await save(getDraft());
```

- `useLinkedState(source, compute)` replaces reset-an-effect-after-prop-change patterns; `compute` may read the previous `{ source, value }`.

## 2. Strong mode (optional) — extra contract details

Beyond the basics in `tsrx-syntax.md`:

- The compiler follows provable calls through `useCallback`, `useEffectEvent`, and functions returned by analyzable `useMemo` factories. Built-ins are recognized by import provenance (including optional calls); same-module custom hooks and function-valued module bindings resolve by lexical binding to a transitive fixed point, so aliases and cycles keep context/state/suspense/effect behavior.
- Diagnostics use `console.log`-class evidence: a diagnostic `console.log` no longer disqualifies an otherwise eligible Strong row, but handlers like `() => setItems(items.filter(...))` still capture `items` — appending changes that capture, so the row must receive its current handler. Logging can differ across production, development, HMR, and profiling builds; it is not a commit counter. Keys preserve surviving DOM nodes, not an exact evaluation count.
- Cross-row writes from a keyed `@for` row to an outer binding are rejected with `OCTANE_STRONG_RETAINED_ROW_MUTATION`. Keep scratch data inside one row, build the full result before `@for`, or use `@for (...; index position; key item.id)`. Compatibility mode accepts cross-row writes but does not promise retained-row evaluation order — rendered output must not depend on them.
- Fresh local mutation that completes during ordinary setup remains valid (e.g., filling a new array in a plain JS loop before rendering it).
- Compatibility mode conservatively reevaluates method calls: a stable receiver can hide changing state. TanStack Table v8 is identified (as by React Compiler) as incompatible with memoization due to interior mutability.
- React Compiler lint results and React's outlining/debug/memo options are comparison evidence only — they are not Octane controls and do not change the compatibility/Strong contract.
- Passing a live row/header, shallow-copying its live methods, or forcing an unrelated render is NOT a snapshot handoff into a Strong child/`memo` boundary. A compatibility consumer should subscribe, select a primitive or immutable value, and pass that value in.

## 3. Events come from the browser

Handlers receive the browser's **real `Event` object** — no synthetic wrapper. Bubbling, capture, `stopPropagation()`, and logical bubbling through portals still work.

- Use `onInput` for every text edit. Native `change` fires on commit (usually blur).
- No synthetic `onChange`, `onBeforeInput`, or `onSelect` polyfills.
- Mouse/pointer enter/leave use the platform's native events.
- The text-entry warning covers `<textarea>` and input types `text`, `search`, `url`, `tel`, `password`, `email`, `number` (and missing/invalid type). It does NOT apply to selects, checkbox/radio/file and other non-text types, custom elements, statically read-only/disabled controls, or component callbacks merely named `onChange`. Compiler surface: warning severity; unresolved final-prop violations log `console.error` in development, once per broken episode.
- Capture-phase fix: use `onInputCapture` (an `onChangeCapture` rewrite preserves phase).
- Native commit-on-blur is valid — mark it with `suppressNativeChangeWarning` instead of adding a noop input handler. The hint is JS-only, never rendered to HTML, and changes neither event delivery nor controlled-state restoration.
- Checkboxes/radios: `click` → `input` → non-cancelable `change`. `preventDefault()` in native `onChange` cannot roll the toggle back — cancel the earlier `onClick` when rollback is intended. React's synthetic checkable `onChange` is backed by the cancelable click (intentional timing divergence). Octane still restores rejected controlled state and radio cousins after native `change`.
- `class`/`className` compose clsx-style: arrays, objects, and nested values; `['a', 'b']` → `"a b"` on client and server (React produces `"a,b"`).

## 4. Transitions without time slicing

- Updates batch in a microtask; each render runs to completion. Urgent vs transition updates exist, but there are **no lanes, yield points, CPU time slicing, or selective hydration**.
- Useful transition behavior remains: a suspended replacement keeps the current screen visible and `isPending` explains the wait.
- `flushSync` drains the full update queue; passive effects still run after paint.
- The compiler transform eliminates avoidable `use()` waterfalls: provably independent requests start together; dependent ones stay sequential.
- **Promises created during render are safe — no `cache()` wrapper needed.** The compiler memoizes every creation that feeds a `use()` at its declaration, keyed on its real inputs, including local chains:

```tsx
const userPromise = fetchUser(id);
const thumbnailPromise = userPromise.then((user) => user.thumbnail());
<Avatar thumbnail={use(thumbnailPromise)} />
```

## 5. Errors and server rendering

- No class components → error boundaries are the template block or function-based `ErrorBoundary`:

```tsx
@try {
	<RiskyPanel />
} @catch (error, reset) {
	<button onClick={reset}>Try again</button>
}
```

- Uncaught errors report through `console.error` — no React `onUncaughtError` callback.
- Framework-authored errors in the core DOM client/server runtimes keep full messages in development; optimized production builds replace them with Octane-owned append-only codes plus a decoder link. Octane does not reuse React's error numbers. User-thrown errors and compiler diagnostics keep original messages/codes.
- Buffered server rendering returns `{ html, css }`; `css` carries sibling-scoped `<style>` blocks and themes (a block styles its siblings and everything below), collected per request inside each component body rather than at module load, deduplicated by hash. Streaming flushes each scoped `<style>` inline with its content and still reveals Suspense content as it becomes ready.
- During hydration, value mismatches are patched and structural mismatches rebuilt in place **with a warning** instead of throwing to a boundary.

## 6. Less common observable differences

- A same-value state update can skip Octane's component body where React may enter it once more before bailing out; the committed result is the same.
- `useSyncExternalStore` does not repeat an unchanged snapshot read at commit just because callback identity changed; notifying stores are unaffected.
- When a form action rejects, Octane continues later queued actions instead of cancelling them.
- The keyed reconciler uses longest-increasing-subsequence moves. Final order, node identity, focus, and state match React; only the exact physical move pattern can differ.
- Custom-element property handling stays closer to the browser; applicable attribute diagnostics are expanding progressively without embedding React's complete property-name table in every runtime.

## 7. APIs Octane leaves out

- Class components, legacy roots, class error-boundary lifecycles.
- Server Components, RSC/Flight, `cache()`.
- `StrictMode` double-invocation, `Profiler`, `SuspenseList`.
- `forwardRef`, `createRef` — refs are ordinary props (object, callback, and arrays of refs).
- Most `React.Children` utilities — keyed `@for` is the normal collection API.

Present-but-inert: `useDebugValue` (no visible runtime effect). Supported resource hints: `preload`, `preinit`, `preconnect`, `prefetchDNS`.
