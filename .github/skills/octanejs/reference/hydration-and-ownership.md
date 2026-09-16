# Deferred Hydration and External Ownership Reference

## The three performance decisions of `Hydrate`

| Prop | Default | Decision |
| --- | --- | --- |
| `when` | required | When the preserved server HTML becomes interactive |
| `split` | `true` | Whether the compiler creates a deferred child chunk |
| `prefetch` | none | Whether code or data preparation starts before `when` fires |

The server still renders the children. During initial hydration the HTML stays visible but dormant; on activation Octane loads the generated child chunk, adopts the same DOM in place, then enables refs, effects, and events.

Constraints:
- `Hydrate` is experimental and applies only to matching server HTML in the initial document. A boundary first mounted after the app is running renders normally on the client.
- Move hooks and other setup into a child component if the compiler cannot split the direct JSX child (it splits direct children and captures ordinary lexical values).

## Strategies (`octane/hydration`)

| Strategy | Use when |
| --- | --- |
| `load()` | Hydrate with the initial app hydration |
| `idle({ timeout? })` | Browser is idle |
| `visible({ rootMargin?, threshold? })` | Near or inside the viewport |
| `media(query)` | A media query matches |
| `interaction({ events? })` | User shows intent; triggering event is replayed |
| `condition(booleanOrGetter)` | An application condition becomes truthy |
| `never()` | Keep the initial server HTML permanently static |

Function form: `when={() => window.matchMedia('(pointer: coarse)').matches ? interaction() : visible()}` — never called on the server, must return synchronously.

## Prefetch

Strategy-form prefetch downloads the generated child chunk early (requires splitting):

```tsx
<Hydrate when={interaction()} prefetch={idle()}>
	<RecommendationEditor />
</Hydrate>
```

Procedural prefetch can also warm data. Awaited work blocks activation if `when` fires first; `signal` aborts if the boundary goes away:

```tsx
<Hydrate
	when={visible()}
	prefetch={async ({ preload, signal }) => {
		await preload();
		await warmReviews({ signal });
	}}
>
	<Reviews />
</Hydrate>
```

Procedural prefetch works with `split={false}` too (`preload()` resolves immediately). Its `waitFor(strategy)` helper accepts `load()`, `idle()`, `visible()`, `media()`, `interaction()`.

## Fallbacks and completion

- `fallback` is client-only loading UI for a boundary mounted later on the client whose child suspends. It does NOT replace preserved server HTML while an initial boundary waits.
- `onHydrated` runs once after the child commits on the client (adopted server DOM or client-only mount).

## Interaction capture before `hydrateRoot()`

An immediate `hydrateRoot()` needs no setup. If the client entry awaits route discovery, data, or dynamic imports first:

```tsx
import { hydrateRoot } from 'octane';
import { initializeHydrationEventCapture } from 'octane/hydration';

initializeHydrationEventCapture(); // safe to call more than once
await prepareClient();
hydrateRoot(document.getElementById('app')!, App);
```

## Permanently static streamed HTML

Use the exact two-attribute form when Octane renders a range on the server but never creates its descendant component graph on the client:

```tsx
import { Hydrate } from 'octane';
import { never } from 'octane/hydration';

<Hydrate split={false} when={never()}>
	<article id="streamed-article">
		<a href="#annotation" data-annotation>Open annotation</a>
	</article>
</Hydrate>
```

Requirements: `Hydrate` and `never` must be direct imports (local renames OK); the opening tag must have exactly `split={false}` and `when={never()}`; no extra attributes, spreads, or indirect values. Component event handlers inside this range never run — there is no client component tree.

## Behavior-only roots (`octane/behavior`)

For DOM owned by another system (streaming renderer, content platform, separate app). The focused entry does not pull in the component runtime, compiler, or server renderer; the same API and types are also exported from `octane`.

```tsx
import { attachBehaviorRoot } from 'octane/behavior';

const page = new AbortController();
const root = attachBehaviorRoot(container, { signal: page.signal });

root.registerExternalRange(articleElement, {
	owner: streamOwnerSymbol,
	ready: articleStream.allReady, // optional: wait for the owner's stream
});

const behavior = root.registerBehavior({
	id: 'article-annotations',
	owner: streamOwnerSymbol,
	target: '[data-annotation]',   // selector, or a single Element
	events: ['click'],
	ready: import('./annotations.js'), // optional: wait for client code
	adopt(element, { signal }) {
		return observeAnnotation(element, signal); // cleanup on unmount/move/owner change
	},
	handleEvent(event, element) {
		openAnnotation(event, element); // receives the ORIGINAL native Event, genuine isTrusted
	},
});

await root.ready;
behavior.dispose(); // remove behavior, keep markup
root.dispose();     // dispose all; pass { preserveDOM: false } only when clearing is intended
```

Ownership and coordination rules:
- Ranges and roots are scoped to their original document; a registered range must belong to its root's container.
- Strictly nested ranges are allowed; the closest range determines which owner-constrained behaviors apply.
- Claiming the same element for another owner throws unless `{ replace: true }` transfers ownership explicitly. A replacement whose signal is already aborted never displaces a healthy owner.
- Disposing a separately managed nested root immediately restores eligible behavior from its surviving ancestor.
- Behaviors may declare `dependencies` (wait for) and `conflicts` (mutually exclusive) by name.
- Adoption waits for dependencies, the behavior's own `ready`, and its closest external range.
- Each range and behavior exposes `ready`, `signal`, and idempotent `dispose()`. Readiness failures preserve the original error; cancellation settles promptly even if third-party preparation never finishes.
- Delegated listeners start immediately, before async behavior is ready. Octane does not redispatch events, invent trust, repeat navigation/submission, or restore expired transient user activation. Code needing transient activation must run synchronously in the original event.
- Attaching a second root to the same live container requires `{ replace: true }`; the previous root is disposed without deleting the DOM.
