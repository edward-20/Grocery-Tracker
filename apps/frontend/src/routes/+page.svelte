<script lang="ts">
	/*
	 * TBD:
	 * pagination on search results page (search?q=shoes&page=2&pageSize=20)

	 	Search Bar Area on Search Results Page (like google)
	 * search bar (name) at the top of the search results page
	 * home page icon
	 * search by id 
	 * advanced search option
	 */
	import { SearchBar } from '$lib/components/search-bar';

	let isNameSearch = $state(true);

	// main search
	let nameQuery = $state('');
	let idQuery = $state('');

	let form = $state<HTMLFormElement>();
</script>

<div class="main-container">
	<!-- Title -->
	<div class="column-child">
		<h1 class="mb-4 text-3xl font-bold">Grocery Tracker</h1>
		<p class="mb-2">Track your grocery list and see how much you're spending.</p>
	</div>
	<form class="column-child" action="/search" bind:this={form}>
		<div>
			{#if isNameSearch}
				<SearchBar
					bind:query={nameQuery}
					url="/names"
					name="product"
					label="Search by product name"
					placeholder="Peanut Butter"
				></SearchBar>
			{:else}
				<!-- change to product id search -->
				<SearchBar
					bind:query={idQuery}
					url="/ids"
					name="id"
					label="Search by product id"
					placeholder="woolworths_sku1201 or coles_id_09231"
				></SearchBar>
			{/if}
		</div>
		<!-- Search Button -->
		<div class="space-evenly flex w-full flex-col gap-2 pt-2 md:flex-row md:items-center">
			<button type="submit" class="btn rounded-full">Search</button>
			{#if isNameSearch}
				<button
					type="button"
					class="btn rounded-full"
					onclick={() => {
						isNameSearch = false;
					}}>or if you know the Product ID</button
				>
			{:else}
				<button
					type="button"
					class="btn rounded-full"
					onclick={() => {
						isNameSearch = true;
					}}>or if you want to search by name</button
				>
			{/if}
		</div>
		<!--
				What can we filter by?
					* Name
					* Store
					* Location
					* Department
					* ID
					* Cost
					* Cost Change
					* Weight
			-->
		<!--
				Todos:
				* results page highlights what matches from the search
				* an option to do an advanced search -> prettify with an accordion
					* location fuzzy search -> suggestions
					* department fuzzy search -> suggestions
					* ID fuzzy search
					* Cost -> max and min slider bar -> show the analytics on price changes
					* Cost Change -> slider bar with analytics
					* Weight -> slider bar with analytics
			-->
	</form>
</div>
