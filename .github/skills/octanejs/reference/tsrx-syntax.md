# .tsrx Authoring Format Reference

Octane offers two authoring formats. Choose deliberately:

| Format | What you get | When to use |
| --- | --- | --- |
| `.tsrx` | Control-flow directives, `@{ }` return shorthand, full-compiled dependency inference | Default for components |
| `.tsx` / `.jsx` | Standard JSX | Compatibility, incremental adoption |
| `.ts` / `.js` (custom hooks) | Direct built-in hook calls DO infer dependencies; calls to custom wrapper hooks need explicit arrays | Shared plain-TS hooks, transparent local wrappers |

## The `@{ }` return form

`@{ expression }` at the end of a component means "return the final JSX node." It is shorthand for a body with `return`. Either style is fine; be consistent within a file.

```tsx
function WelcomeCard(props: WelcomeCardProps) @{
	<section class="welcome-card">
		<h2>{'Hello, ' + props.name}</h2>
	</section>
}
```

A component may also return text, an array, or `null`.

## Directives

### `@if`

```tsx
@if (item.packed) {
	<span aria-label="packed">✓</span>
}
```

### `@for` (keyed) with `@empty`

```tsx
@for (const item of props.items; key item.id) {
	<li>{item.label}</li>
} @empty {
	<li>Your list is empty.</li>
}
```

- The key must be stable for the item — an ID from data. Never use the index when items can be inserted, removed, or reordered.
- Do NOT put hooks inside the loop body of a plain JS loop — every iteration shares one compiled call site. Use `@for` (keyed) or extract a child component.

### `@switch`

Use for several exclusive branches (see `reference/idioms-and-pitfalls.md` for a full example).

### `@try / @pending / @catch`

Template form of Suspense/ErrorBoundary for Promise-driven UI. `@catch` optionally receives a `reset` callback for retry UIs (`@catch (error, reset) { <button onClick={reset}>Try again</button> }`):

```tsx
export function ProfilePage(props: { data: Promise<ProfileData> }) @{
	@try {
		<Profile data={props.data} />
	} @pending {
		<p>Loading profile…</p>
	} @catch (error) {
		<p>{'Could not load profile: ' + (error instanceof Error ? error.message : String(error))}</p>
	}
}
```

## Hooks rules (Octane-specific)

1. Hooks are identified by their **compiled call site** — they may appear after an early return or inside a condition.
2. Exception: the context and Promise readers `use()` and `useContext()` may be conditional.
3. Never place slot-keyed hooks in a plain JavaScript loop; every iteration would share one call site.
4. Third tuple items: `const [value, setValue, getValue] = useState(initial)` — `getValue()` reads the latest scheduled value in a long-lived callback (e.g., after `await`); it does not subscribe or render. The same getter exists for `useReducer` and `useLinkedState`.

## Events

- Text entry: `onInput` with `event.currentTarget.value`.
- Deliberate commit-on-blur: keep native `onChange` and add `suppressNativeChangeWarning`. The hint is not rendered and does not alter the event.
- No suppression needed for `select`, checkbox/radio inputs, custom elements, or component API props named `onChange`.

## Strong mode

Opt in per file with `'use strong'` before imports, or app-wide via `compiler: { strong: true }` in `octane.config.ts`.

Forbidden in Strong modules:
- Updating state while rendering.
- Updating state synchronously while setting up an effect.
- Writing `ref.current` while rendering.
- Calling a statically known Effect Event during render, or listing it in explicit hook dependencies.
- Detectable state-snapshot mutations.
- Direct clock or random reads during render (lazy state init may still obtain an initial value).

Still valid: event handlers updating state, genuinely deferred callbacks, effect cleanup, effects that synchronize external systems, refs for DOM nodes or timers, `useLinkedState` for editable state that follows an input.

Do not hide ref contents, state getters, mutable module/global data, live external stores, clocks, randomness, or mutation behind a stable function or receiver — keep that consumer in compatibility mode or pass an actual snapshot into a separate Strong component.

## Title hoisting

Render `<title>` in the component; Octane hoists it to the document head. No effect needed:

```tsx
export function Article(props: { title: string }) @{
	<>
		<title>{props.title}</title>
		<article><h1>{props.title}</h1></article>
	</>
}
```
