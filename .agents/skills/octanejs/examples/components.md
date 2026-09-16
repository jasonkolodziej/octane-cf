# Octane Component Recipes

Copy-adaptable examples covering the core APIs. All examples assume `.tsrx` files and `import { ... } from 'octane'` where hooks/components are used.

## 1. Counter with reducer and conditional messages

```tsx
import { useState } from 'octane';

interface CounterProps {
	step?: number;
}

export function Counter(props: CounterProps) @{
	const [count, setCount] = useState(0);
	const step = props.step ?? 1;

	<section>
		<p>{'Items packed: ' + count}</p>
		<button onClick={() => setCount((current) => current + step)}>
			Add {step}
		</button>
		<button onClick={() => setCount(0)}>Reset</button>
		<p>
			@if (count === 0) {
				Bag is empty
			} @else {
				Ready to go
			}
		</p>
	</section>
}
```

## 2. Controlled form with async action

```tsx
import { useActionState } from 'octane';

async function saveName(previousMessage: string, formData: FormData) {
	const name = String(formData.get('name') ?? '').trim();
	if (!name) return 'Enter a name before saving.';
	await new Promise((resolve) => setTimeout(resolve, 500)); // replace with API call
	return 'Saved ' + name;
}

export function ProfileForm() @{
	const [message, submit, isPending] = useActionState(saveName, '');

	<form action={submit}>
		<label>
			Name
			<input name="name" />
		</label>
		<button type="submit" disabled={isPending}>
			{isPending ? 'Saving…' : 'Save'}
		</button>
		<p aria-live="polite">{message}</p>
	</form>
}
```

Related: `useFormStatus` reads the nearest parent form's status from a child; `useOptimistic` shows the expected result while an action runs; `requestFormReset(form)` resets uncontrolled fields after the action settles.

## 3. Data fetching with `use` + boundaries

```tsx
import { ErrorBoundary, Suspense, use } from 'octane';

interface ProfileData {
	name: string;
	bio: string;
}

function Profile(props: { data: Promise<ProfileData> }) @{
	const profile = use(props.data);

	<article>
		<h2>{profile.name}</h2>
		<p>{profile.bio}</p>
	</article>
}

export function ProfilePage(props: { data: Promise<ProfileData> }) @{
	// The Promise may come from the data layer/router OR be created during render —
	// Octane memoizes render-created promises feeding use() at their declaration,
	// keyed on real inputs, so no cache() wrapper is needed. For user-triggered
	// requests, create it in the event handler instead.
	<ErrorBoundary fallback={<p>We could not load this profile.</p>}>
		<Suspense fallback={<p>Loading profile…</p>}>
			<Profile data={props.data} />
		</Suspense>
	</ErrorBoundary>
}
```

Template form of the same page:

```tsx
export function ProfilePage(props: { data: Promise<ProfileData> }) @{
	@try {
		<Profile data={props.data} />
	} @pending {
		<p>Loading profile…</p>
	} @catch (error, reset) {
		<>
			<p>{'Could not load profile: ' + (error instanceof Error ? error.message : String(error))}</p>
			<button onClick={reset}>Try again</button>
		</>
	}
}
```

## 4. Context for theme

```tsx
import { createContext, use, useState } from 'octane';

const Theme = createContext('light');

function ThemeLabel() @{
	const theme = use(Theme);
	<p>{'The current theme is ' + theme + '.'}</p>
}

export function Settings() @{
	const [theme, setTheme] = useState('light');

	<section>
		<button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
			Switch theme
		</button>
		<Theme.Provider value={theme}>
			<ThemeLabel />
		</Theme.Provider>
	</section>
}
```

`useContext(Theme)` is the equivalent context-specific spelling.

## 5. Refs and an external-system effect

```tsx
import { useEffect, useRef } from 'octane';

export function SearchBox() @{
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target;
			const isTyping =
				target instanceof HTMLElement &&
				(target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
			if (event.key !== '/' || event.metaKey || event.ctrlKey || event.isComposing || isTyping) {
				return;
			}
			event.preventDefault();
			inputRef.current?.focus();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}); // dependencies inferred; captures only a stable ref, so this connects once

	<div>
		<input ref={inputRef} aria-label="Search" />
		<button onClick={() => inputRef.current?.focus()}>Focus search</button>
	</div>
}
```

## 6. `useLinkedState` — editable state that follows a changing source

```tsx
import { useLinkedState } from 'octane';

export function ProfileEditor(props: { user: { id: string; name: string } }) @{
	const [name, setName] = useLinkedState(props.user.id, () => props.user.name);

	<label>
		Name
		<input value={name} onInput={(event) => setName(event.currentTarget.value)} />
	</label>
}
```

## 7. Tabs with `useTransition`

```tsx
import { useState, useTransition } from 'octane';

export function ProjectTabs() @{
	const [tab, setTab] = useState('overview');
	const [isPending, startTransition] = useTransition();

	<>
		<button onClick={() => startTransition(() => setTab('activity'))}>
			{isPending ? 'Opening…' : 'Open activity'}
		</button>
		<TabPanel tab={tab} />
	</>
}
```

## 8. Search with `useDeferredValue`

```tsx
import { useDeferredValue, useState } from 'octane';

export function ProductSearch() @{
	const [query, setQuery] = useState('');
	const deferredQuery = useDeferredValue(query);
	const isStale = query !== deferredQuery;

	<>
		<input value={query} onInput={(event) => setQuery(event.currentTarget.value)} />
		<div aria-busy={isStale}>
			<ProductResults query={deferredQuery} />
		</div>
	</>
}
```

## 9. Portal toast with logical event bubbling

```tsx
import { createPortal, useState } from 'octane';

interface SavedToastProps {
	target: HTMLElement;
	onDismiss: () => void;
}

function ToastBody(props: { onDismiss: () => void }) @{
	<aside class="toast" aria-label="Save notification">
		<p role="status">Draft saved.</p>
		<button type="button" onClick={props.onDismiss}>Dismiss</button>
	</aside>
}

function SavedToast(props: SavedToastProps) {
	// Component first, target second, props third.
	return createPortal(ToastBody, props.target, { onDismiss: props.onDismiss });
}

export function Editor(props: { toastRoot: HTMLElement }) @{
	const [toastOpen, setToastOpen] = useState(false);

	<>
		<button type="button" onClick={() => setToastOpen(true)}>Save draft</button>
		@if (toastOpen) {
			<SavedToast target={props.toastRoot} onDismiss={() => setToastOpen(false)} />
		}
	</>
}
```

## 10. `useSyncExternalStore` for browser state

```tsx
import { useSyncExternalStore } from 'octane';

function subscribe(onStoreChange: () => void) {
	window.addEventListener('online', onStoreChange);
	window.addEventListener('offline', onStoreChange);
	return () => {
		window.removeEventListener('online', onStoreChange);
		window.removeEventListener('offline', onStoreChange);
	};
}

function getSnapshot() {
	return navigator.onLine;
}

function getServerSnapshot() {
	return true;
}

export function NetworkStatus() @{
	const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

	<p role="status">
		{isOnline ? 'Online' : 'Offline — changes will sync when you reconnect.'}
	</p>
}
```

## 11. Deferred hydration with prefetch

```tsx
import { Hydrate } from 'octane';
import { idle, interaction, visible } from 'octane/hydration';

export function ProductPage() @{
	<main>
		<ProductHero />
		<Hydrate when={visible({ rootMargin: '400px' })}>
			<Reviews />
		</Hydrate>
		<Hydrate when={interaction()} prefetch={idle()}>
			<RecommendationEditor />
		</Hydrate>
		<Hydrate
			when={visible()}
			prefetch={async ({ preload, signal }) => {
				await preload();
				await warmReviews({ signal });
			}}
		>
			<HeavyReviewsWidget />
		</Hydrate>
	</main>
}
```

## 12. Client entry with deferred boundaries

```tsx
import { hydrateRoot } from 'octane';
import { initializeHydrationEventCapture } from 'octane/hydration';
import { App } from './App.tsrx';

// Required only if the entry awaits work before hydrateRoot():
initializeHydrationEventCapture();

const container = document.getElementById('app');
if (!container) throw new Error('Missing #app element');
hydrateRoot(container, App);
```
