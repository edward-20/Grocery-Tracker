<!--
	TBD:
	
	feature:
	* highlight the part of the text in the suggestions that matched the user's input (feature not fix)

	https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
	https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/
-->
<script lang="ts">
	let { query = $bindable(), url, name, label, placeholder } = $props();

	let suggestions: string[] = $state([]);
	let selectedSuggestionIndex = $state(-1);
	let lastUserTypedInput: string = $state('');
	let expanded: boolean = $state(false);
	let timeout: NodeJS.Timeout;

	// scroll into view the suggestion if necessary
	$effect(() => {
		if (selectedSuggestionIndex < 0) return;
		const el = document.getElementById(`suggestion-${selectedSuggestionIndex}`);
		el?.scrollIntoView({ block: 'nearest' });
	});
	// department search suggestions
	async function getSuggestions() {
		// debouncing pattern
		clearTimeout(timeout);

		timeout = setTimeout(async () => {
			if (!query) {
				suggestions = [];
				return;
			}
			// claim: every time there's a request for getSuggestions then the
			// last user typed input is made
			lastUserTypedInput = query;
			const res = await fetch(`${url}?query=${query}`); // need to handle this fetch
			selectedSuggestionIndex = -1;
			suggestions = await res.json();
			expanded = suggestions.length === 0 ? false : true;
		}, 250);
	}

	const MIN = -1;
	function handleKeyDown(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		function wrap(value: number) {
			const rangeSize = suggestions.length - 1 - MIN + 1; // 11 values total
			return ((((value - MIN) % rangeSize) + rangeSize) % rangeSize) + MIN;
		}

		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			const input = event.currentTarget;
			if (suggestions.length !== 0) {
				if (event.key === 'ArrowDown') {
					console.log('hello1');
					selectedSuggestionIndex = wrap(selectedSuggestionIndex + 1);
					console.log(selectedSuggestionIndex);
				} else {
					console.log('hello2');
					selectedSuggestionIndex = wrap(selectedSuggestionIndex - 1);
					console.log(selectedSuggestionIndex);
				}
			} else {
				console.log('hello3');
				selectedSuggestionIndex = -1;
			}
			// change the input to the new selected suggested index
			query =
				selectedSuggestionIndex === -1 ? lastUserTypedInput : suggestions[selectedSuggestionIndex];
			requestAnimationFrame(() => {
				input.setSelectionRange(query.length, query.length);
			});
		} else if (event.key === 'Escape') {
			const needToBlur = selectedSuggestionIndex === -1;
			expanded = false;
			selectedSuggestionIndex = -1;
			if (needToBlur) event.currentTarget.blur();
		} else if (event.key === 'Tab') {
			suggestions = [];
		} else if (event.key === 'Enter') {
			if (selectedSuggestionIndex !== -1) {
				query = suggestions[selectedSuggestionIndex];
				suggestions = [];
				expanded = false;
			}
		}
	}
</script>

<div class="relative">
	<label for={name}>{label}:</label>
	<input
		id={name}
		type="text"
		class={`search-input relative mt-2 ${expanded ? 'rounded-t-[1.5em] rounded-b-none' : 'rounded-full'}`}
		{placeholder}
		{name}
		oninput={getSuggestions}
		onfocus={getSuggestions}
		onkeydown={handleKeyDown}
		bind:value={query}
		role="combobox"
		aria-controls={`${name}-listbox`}
		aria-expanded={expanded}
		aria-autocomplete="list"
		aria-activedescendant={`suggestion-${selectedSuggestionIndex}`}
		onfocusout={() => {expanded = false}}
	/>
	{#if expanded}
		<ul
			id={`${name}-listbox`}
			role="listbox"
			class="absolute z-99 max-h-[10em] w-full overflow-scroll"
			tabindex="-1"
		>
			{#each suggestions as s, i (s)}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_mouse_events_have_key_events -->
				<li
					class={`p-2 ${selectedSuggestionIndex === i ? 'active-suggestion' : 'inactive-suggestion'}`}
					role="option"
					aria-selected={selectedSuggestionIndex === i}
					id={`suggestion-${i}`}
					onclick={() => {
						query = s;
					}}
					onmouseover={() => {
						selectedSuggestionIndex = i;
					}}
					onmousedown={() => {
						query = s;
						suggestions = [];
						expanded = false;
					}}
				>
					{s}
				</li>
			{/each}
		</ul>
	{/if}
</div>
<style>
	.inactive-suggestion {
		background-color: var(--color-base-200);
		border: 1px solid var(--color-base-300);
		color: var(--color-base-content);
	}

	.active-suggestion {
		background-color: var(--color-primary);
		color: var(--color-primary-content);
	}
</style>
