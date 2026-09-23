<script lang="ts">
	import SearchBar from "$lib/components/search-bar/search-bar.svelte";

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
		<p class="mb-2">Tracking the price of the products from Australia's supermarkets.</p>
	</div>
	<form class="column-child" action="/search" bind:this={form}>
		<div>
			{#if isNameSearch}
				<SearchBar
					bind:query={nameQuery}
					url="/names"
					name="name"
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
	</form>
</div>
