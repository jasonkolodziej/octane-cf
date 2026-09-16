# React ↔ Octane Interop (`octane/react`)

Host compiled Octane components in a React app, or real React components in an Octane app. Each renderer owns its subtree ("**island**"), including its hooks, state, and DOM. React stays React — never alias React/React DOM to Octane.

| Your app | Host (from `octane/react`) | Renders |
| --- | --- | --- |
| React 19 | `OctaneCompat` | Compiled Octane components inside React |
| Octane | `ReactCompat` | Real React components inside Octane |

Version requirements: `OctaneCompat` supports React 19; `ReactCompat` requires 19.2+. Every island adds a separate root plus its own scheduling, event, and lifecycle overhead — prefer one boundary around a useful subtree over one per tiny widget. The native Octane client runtime does not include React; importing the integration adds it.

## Toolchain: keep each component under its own compiler

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { octane } from '@octanejs/vite-plugin';

export default defineConfig({
	plugins: [octane({ requireDirective: true }), react()],
});
```

- `.tsrx` files **always** belong to Octane.
- With `requireDirective: true`, mark Octane-owned `.tsx`/`.ts`/`.js` application files with a leading `/** @jsxImportSource octane */` pragma — including native hook and context helpers.
- Keep React JSX under React's transform with `/** @jsxImportSource react */`.
- `requireDirective` applies to application modules under the bundler root — keep mixed app source inside it. Installed/linked packages keep package ownership rules (a React library that does not declare Octane remains React-owned).

## Octane inside React (`OctaneCompat`)

```tsx
/** @jsxImportSource react */
import { OctaneCompat } from 'octane/react';
import { Counter } from './islands/Counter.tsrx';

export function App() {
	return (
		<main>
			<h1>My React app</h1>
			<OctaneCompat>
				<Counter start={3} />
			</OctaneCompat>
		</main>
	);
}
```

- Pass **exactly one** compiled Octane component element. React transports the component and its props; it never invokes the Octane component itself.
- Equivalent typed form: `<OctaneCompat component={Counter} props={{ start: 3 }} />` — omit `props` when none are needed. Missing/incorrect/unknown props are errors at the child call site; no casts or ambient `.tsrx` shims.
- Octane element values are NOT ordinary React renderables outside this component transport.
- `.tsrx` exports keep Octane types through `tsrx-tsc` and the editor plugin.

## React inside Octane (`ReactCompat`)

```tsx
/** @jsxImportSource react */
// src/Counter.react.tsx
import { useState } from 'react';

export function Counter({ start }: { start: number }) {
	const [count, setCount] = useState(start);
	return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

```tsx
// src/App.tsrx
import { ReactCompat } from 'octane/react';
import { Counter } from './Counter.react';

export function App() @{
	<main>
		<h1>My Octane app</h1>
		<ReactCompat>
			<Counter start={3} />
		</ReactCompat>
	</main>
}
```

- Use a **named** `ReactCompat` import (aliases supported). The Octane compiler transports the child as an element descriptor.
- Accepted island roots: function, class, `memo`, `lazy`, `forwardRef` components. A DOM element, fragment, array, or multiple children **cannot** be the island root — put those structures inside a React component.
- Do not combine the child and `component`/`props` forms. Children passed in `props` must be React renderables, not Octane template blocks.
- Prefer JavaScript default parameters for function defaults: the outer element is authored by Octane and follows Octane's descriptor and `defaultProps` normalization.
- A component inside `ReactCompat` still runs under React's own rules — see `reference/differences-from-react.md` for what that means.

## Sharing context

**React context → Octane island (no mapping needed):** the island reads the React app's real context objects with Octane's ordinary `use()`/`useContext()`. The host resolves the nearest committed React provider and updates the island on change; no provider means the React context's default.

```tsx
// src/islands/ThemedBadge.tsrx
import { use } from 'octane';
import { ThemeContext } from '../react-theme.ts'; // React createContext

export function ThemedBadge() @{
	const theme = use(ThemeContext);
	<span className={'badge badge-' + theme}>Octane island</span>
}
```

**Octane context → React island (map once with `bridgeReactContext`):**

```tsx
/** @jsxImportSource octane */
// src/theme.ts
import { createContext } from 'octane';
import { createContext as createReactContext } from 'react';
import { bridgeReactContext } from 'octane/react';

export const Theme = createContext('light');
export const ReactTheme = createReactContext('light');
export const reactContexts = [bridgeReactContext(Theme, ReactTheme)];
```

```tsx
/** @jsxImportSource react */
// src/ThemedPanel.react.tsx
import { useContext } from 'react';
import { ReactTheme } from './theme';

export function ThemedPanel() {
	const theme = useContext(ReactTheme);
	return <p>React theme: {theme}</p>;
}
```

```tsx
// src/ThemedApp.tsrx
import { ReactCompat } from 'octane/react';
import { Theme, reactContexts } from './theme';
import { ThemedPanel } from './ThemedPanel.react';

export function ThemedApp() @{
	<Theme value="dark">
		<ReactCompat contexts={reactContexts}>
			<ThemedPanel />
		</ReactCompat>
	</Theme>
}
```

The React component receives the nearest Octane provider value, **including an explicit `undefined`**. Updates cross memo boundaries without resetting state. Mappings are local to each island; providers inside React keep their usual precedence. Keep ordered source/target context identities stable for the boundary's lifetime (or change its `key`). Duplicate target contexts are rejected.

## State, refs, and events across the boundary

- Changing props preserves the island's component state and DOM identity. A child key or type change replaces the component; changing the outer compatibility boundary's `key` replaces the whole root.
- `ReactCompat` passes ordinary props, callbacks, and React 19 ref props through; class refs target the React instance.
- **Events are not translated.** React components keep React's event behavior (synthetic `onChange` for text inputs); Octane components keep native events (`onInput` per keystroke). In `OctaneCompat`, native events are delegated at the island host; React ancestors observe platform capture/bubble order, targets, `stopPropagation()`, and `preventDefault()`.

## Suspense, errors, and visibility

- Local boundaries handle their descendants first. An Octane island's escaped suspension/error reaches the enclosing React Suspense/error boundary. In the other direction, escaped React suspension reaches Octane's nearest `@pending`/Suspense boundary, and escaped render/layout/passive-effect errors reach the nearest Octane catch boundary.
- Resetting an Octane catch boundary **remounts** the React island.
- Event-handler errors follow the owning renderer's event error reporting, not its render error boundaries.
- `ReactCompat` starts/updates its React root **after** the Octane host commits. Octane `root.render()` and `flushSync()` do NOT synchronously flush React work. React-local transitions behave normally, but an Octane transition does not wait for the separate React root or roll back committed Octane siblings. Neither host provides an atomic transaction across both renderers.
- While a React island has escaped as pending, new parent props and context snapshots are published on reveal. To cancel or replace a pending island, delete `ReactCompat` or change its outer key.
- When Octane Suspense **hides** a React island: layout effects and refs disconnect, portals hide, passive effects stay connected. Octane `Activity` hiding also disconnects passive effects. Reveal restores the same React state and nodes.
- Actual deletion invalidates the island immediately and unmounts React in a microtask — including when hidden or pending — so nested React→Octane→React client trees delete safely during a React commit.

## Server rendering and hydration

- Server hosts are exported from `octane/react/server`; the client entry `octane/react` hydrates their output. Octane's server compiler retargets `octane/react` imports automatically. A custom pipeline (or React-owned server entry not passing through that compiler) must import from `octane/react/server` explicitly.
- **Octane inside React (`OctaneCompat` server):** runs a synchronous Octane server attempt and delegates unresolved suspension to React's server renderer. Fizz streams the surrounding fallback and retries the island. Scoped island CSS becomes React 19 style resources, hoisted and deduplicated across islands. The client Octane root hydrates the island's HTML; React leaves its descendants opaque.
- **React inside Octane (`ReactCompat` server):** use Octane's asynchronous or streaming server renderer. `ReactCompat` buffers the complete React HTML per island — **8 MiB limit**. An enclosing Octane streaming boundary can send its fallback while pending; React's progressive reveal scripts are not streamed separately. A synchronous Octane render can produce a surrounding fallback but cannot await the React island.
- Pending React work belongs to the Octane server request and is released on abort/cancellation/timeout/completion. React server errors reach Octane's server catch path; React error boundaries do NOT catch server-render errors.
- React `useId` receives a per-island prefix derived from Octane `useId`. React's `hydrateRoot` adopts existing island DOM, preserving nodes, refs, and user-edited form state. Server and client must render the same component, context values, and tree; island-internal mismatches use React's normal hydration recovery.

## Limits

- Both hosts introduce a wrapper div: `div[data-octane-compat]` or `div[data-react-compat]`. Place them where a div is valid — not directly inside a table row, `select`, SVG tree, or another restricted content model. Never let another renderer reconcile or directly write the island's interior.
- React Server Components, Flight, and React's server `cache()` do not cross these boundaries.
- Nested React → `OctaneCompat` → `ReactCompat` **server rendering** is unsupported. Client nesting works in both directions.
- An `OctaneCompat` island cannot hoist `title`, `meta`, or `link` output during React SSR — render head resources from the React tree instead.

## Editor and type checking

- Use `tsrx-tsc` for any program containing `.tsrx`, including a React host app: `"typecheck": "tsrx-tsc --noEmit -p tsconfig.json"`.
- Register the TypeScript plugin for typed `.tsrx` imports in the editor: `"plugins": [{ "name": "@tsrx/typescript-plugin" }]`. Requires TypeScript 5.9/6.x — the plugin API is unavailable in TS 7 previews.
- React host: keep `"jsx": "react-jsx"` with NO global `jsxImportSource`; each `.tsrx` file uses Octane's JSX types on its own.
- Octane host: `"jsxImportSource": "octane"` and mark React modules with `/** @jsxImportSource react */`.
- Do NOT add `declare module '*.tsrx'` shims — they erase the types that make component and ref checks work.
