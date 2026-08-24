<script lang="ts">
	import { fade } from 'svelte/transition';
	import { resolve } from '$app/paths';

	import { SearchBar } from '$lib/components/search-bar';

	// range slider
	// TBD: get a histogram for the price slider
	import RangeSlider from 'svelte-range-slider-pips';

	let slideCostValues = $state<[number, number]>([0, 50]);
	let inputCostValues = $state<[null | number, null | number]>([null, null]);

	// woolworths and coles filter (need logic to ensure at least one of these is selected)
	let searchWoolworths = $state(true);
	let searchColes = $state(true);

	// main search
	let nameQuery = $state('');
	// department search
	let departmentQuery = $state('');
</script>

<div class="border-b-1 border-solid p-4">
	<h1 class="text-xl font-semibold">Advanced Search</h1>
</div>
<form action="/search" class="max-w-[800px] p-4">
	<SearchBar
		bind:query={nameQuery}
		url="/names"
		name="product"
		label="Search by product name"
		placeholder="Peanut Butter"
	></SearchBar>
	<!-- Store Selection -->
	<fieldset class="mt-4 pb-4">
		<legend>Store:</legend>
		<input
			type="checkbox"
			id="woolworths-checkbox"
			name="store"
			value="woolworths"
			class="checkbox"
			bind:checked={searchWoolworths}
		/>
		<label for="woolworths-checkbox" class="label">Woolworths</label>
		<input
			type="checkbox"
			id="coles-checkbox"
			name="store"
			value="coles"
			class="checkbox"
			bind:checked={searchColes}
		/>
		<label for="coles-checkbox" class="label">Coles</label>
		{#if !searchWoolworths && !searchColes}
			<div role="alert" class="mt-4 alert alert-error" transition:fade>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6 shrink-0 stroke-current"
					fill="
none"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 14l2-
2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span>Ensure at least one store is selected.</span>
			</div>
		{/if}
	</fieldset>
	<!-- Other Filters -->
	<fieldset class="pb-4">
		<legend>Cost:</legend>
		<RangeSlider
			darkmode="auto"
			disabled={inputCostValues[0] !== null || inputCostValues[1] !== null}
			pips
			float
			range
			pushy
			draggy
			rangeFloat
			prefix="$"
			step={0.01}
			pipstep={500}
			bind:values={slideCostValues}
			first="label"
			last="label"
			min={0}
			max={100}
		/>
		<small id="slider-hint" class="block py-2">
			For values beyond $0-$100, please use the number inputs below.
		</small>
		<div class="grid grid-cols-2 gap-2">
			<label for="minPrice" class="block">Minimum Price:</label>
			<label for="maxPrice" class="block">Maximum Price:</label>
			<input
				aria-describedby="slider-hint"
				class="block"
				name="minPrice"
				id="minPrice"
				type="number"
				step="0.01"
				bind:value={inputCostValues[0]}
			/>
			<input
				aria-describedby="slider-hint"
				class="block"
				name="maxPrice"
				id="maxPrice"
				type="number"
				step="0.01"
				bind:value={inputCostValues[1]}
			/>
			{#if inputCostValues[0] !== null && inputCostValues[1] !== null && inputCostValues[0] > inputCostValues[1]}
				<div role="alert" class="alert alert-error" transition:fade>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
						fill="
    none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-
    2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>Ensure minimum price is below maximum price.</span>
				</div>
			{/if}
		</div>
	</fieldset>
	<SearchBar
		query={departmentQuery}
		url="/departments"
		name="departments"
		label="Departments"
		placeholder="Hams and Cheese"
	></SearchBar>
	<div class="mt-4 flex flex-row items-center gap-2">
		<button type="submit" class="btn rounded-full">Search</button>
		<a class="link" style="color: var(--color-secondary);" href={resolve('/')}>Return to basic search</a>
	</div>
</form>
