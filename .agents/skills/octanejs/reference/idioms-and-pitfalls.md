# React → Octane Idioms and Review Pitfalls

## Migration table

| React habit | Octane equivalent |
| --- | --- |
| `return (...)` JSX | `@{ ... }` or plain `return` in `.tsrx` |
| `items.map(...)` with `key` | `@for (const item of items; key item.id) { ... } @empty { ... }` |
| `cond && <X/>` / ternaries | `@if` / `@switch` directives |
| `onChange` on text inputs | `onInput` (native `onChange` triggers a diagnostic; add `suppressNativeChangeWarning` for intentional blur-commit) |
| `forwardRef` + `useImperativeHandle` | Refs are ordinary props; pass `ref` directly to your component |
| `useEffect(() => { document.title = ... })` | Render `<title>` directly; Octane hoists it |
| `useMemo`/`useCallback` for dependency arrays | Automatic dependency inference in full-compiled modules |
| `useEffect(..., deps)` guessing | Omit the array in `.tsrx`/`.tsx`; pass it explicitly only in plain `.ts` hooks or for exact control (`[]` mount-only, `null` every render) |
| `flushSync` everywhere | Rare; only for browser/third-party integrations that require immediate DOM |
| React StrictMode purity assumptions | Optional Strong mode (`'use strong'`) with compiler-enforced purity |
| `className={clsx(...)}` helper | `class={['card', isActive && 'active', { selected }]}` — built-in clsx-style composition on client and server |
| `cache()` from React / memoizing fetch fns | Nothing needed — the compiler memoizes render-created promises feeding `use()`, keyed on real inputs |
| `<ErrorBoundary onError={...}>` / class boundaries | `@try/@catch (error, reset)` template or function-based `ErrorBoundary`; uncaught errors go to `console.error`, not an `onUncaughtError` callback |
| `onChangeCapture` on text inputs | `onInputCapture` (native events, no synthetic polyfills) |
| Checkbox/radio `onChange` + `preventDefault()` rollback | Cancel the earlier `onClick` — native `change` is non-cancelable (`click` → `input` → `change`) |
| Time-sliced concurrent rendering | Microtask batching, render-to-completion; urgent/transition updates without lanes/yield points/selective hydration |
| `React.Children` traversal | Keyed `@for` (most `Children` utilities intentionally omitted) |
| React error codes | Octane-owned append-only production codes + decoder link (development keeps full messages) |

## Interop pitfalls (`octane/react`)

| Mistake | Rule |
| --- | --- |
| Aliasing `react`/`react-dom` to Octane | Never — React stays React; use `OctaneCompat`/`ReactCompat` hosts |
| One island per tiny widget | Each island is a separate root with scheduling/event/lifecycle overhead — boundary a useful subtree instead |
| Fragment/array/DOM element/multiple children as island root | Island root must be exactly one component (`ReactCompat`: function/class/`memo`/`lazy`/`forwardRef`) |
| Combining child form with `component`/`props` form | Pick one; children passed via `props` must be React renderables, not Octane template blocks |
| "Translating" events across the boundary | Events are never translated — React islands keep synthetic `onChange`, Octane islands keep native `onInput` |
| Passing a live Octane context object to React | Map once with `bridgeReactContext(octaneCtx, reactCtx)` and pass `contexts={[...]}`; keep identities stable or change the island key; duplicate targets are rejected |
| Expecting `flushSync()`/`root.render()` to flush the other renderer | `ReactCompat` roots start/update after the Octane commit; no atomic transaction across renderers exists |
| Cancelling a pending React island by updating props | Props/context publish on reveal; delete `ReactCompat` or change its outer key to cancel/replace |
| Octane island hoisting `<title>`/`<meta>`/`<link>` in React SSR | Not supported — render head resources from the React tree |
| Compat wrapper inside `<tr>`, `<select>`, or SVG | Both hosts inject a `div[data-octane-compat]`/`div[data-react-compat]` wrapper — place where a div is valid |
| `declare module '*.tsrx'` shims | They erase the types that make component/ref checks work — use `tsrx-tsc` + `@tsrx/typescript-plugin` instead |
| Server-rendering React → `OctaneCompat` → `ReactCompat` nesting | Unsupported on the server (client nesting in both directions is fine) |
| React error boundary catching a React server-render error inside Octane | It cannot — React server errors reach Octane's server catch path |
| `defaultProps` on a React island component | Prefer JS default parameters; the outer element is authored by Octane and follows Octane's descriptor/defaultProps normalization |

## Common pitfalls to flag in review

1. **Index keys in `@for`** — use stable item IDs.
2. **Mutating state** — `setItems(items.push(x))` is wrong; `setItems([...items, x])` is right. Strong mode rejects detectable snapshot mutations.
3. ~~New Promise per render~~ — actually SAFE in Octane: the compiler memoizes render-created promises feeding `use()` at their declaration, keyed on real inputs (including `.then` chains), so no `cache()` is needed. The remaining real bug is creating a fresh promise in a way the compiler cannot key (e.g., capturing a changing value without it being an input) — prefer deriving from props/state, and create the promise in the event handler for user-triggered requests.
4. **`onChange` on a text `<input>`** — switch to `onInput` unless commit-on-blur is intentional.
5. **Effect for syncing editable state with props** — use `useLinkedState(source, compute)` instead; it returns the right value immediately with no effect or render-time setter.
6. **`forwardRef` wrappers** — delete them; accept `ref` as a normal prop.
7. **Effect Event in deps** — `useEffectEvent` callbacks must never appear in dependency arrays.
8. **Hooks in JS loops** — extract a keyed child component or use `@for`; plain JS loops share one compiled call site.
9. **`useDeferredValue` as a debounce** — it changes which render may wait; it does not add delay or reduce requests.
10. **`startTransition` around typing** — urgent state (text inputs) stays outside transitions.
11. **Expecting `fallback` to show during initial deferred hydration** — `fallback` is for later client-only mounts; preserved server HTML stays visible instead.
12. **Calling the component function directly** — always render with a capitalized JSX tag; Octane schedules renders, you describe output.
13. **Uncontrolled form reset after action** — call `requestFormReset(form)` after the surrounding action or transition settles.
14. **Expecting React's synthetic event timing** — handlers get the browser's real `Event` (no `onBeforeInput`/`onSelect` polyfills, native enter/leave). `preventDefault()` in checkbox/radio `onChange` cannot roll back the toggle; cancel `onClick` instead.
15. **Relying on omitted APIs** — no class components, `forwardRef`, `createRef`, `StrictMode` double-invocation, `Profiler`, `SuspenseList`, RSC/`cache()`, or most `React.Children` utilities. `useDebugValue` exists but has no runtime effect.
16. **Portable event assumptions in behavior roots** — `handleEvent` receives the original native event (real `isTrusted`, no redispatch); run activation-gated code synchronously inside it.
17. **`createPortal` argument order** — `createPortal(Component, target, props?)`, component first.

## When to reach for each state tool

- One value, local: `useState`.
- Many related updates / complex transitions: `useReducer`.
- Editable local state that must follow a changing source (selected user, draft per record): `useLinkedState`.
- Many distant consumers of the same value: `createContext` + `use(Theme)` + `<Theme.Provider>`.
- Truth owned outside Octane with a subscription: `useSyncExternalStore`.
- Async data: Promise from the data layer + `use()` inside `Suspense`/`ErrorBoundary` (or `@try/@pending/@catch`).
