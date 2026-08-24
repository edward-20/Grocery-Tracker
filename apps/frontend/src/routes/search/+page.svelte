<!--
	Bugs:
	* pressing enter doesn't close the suggestions
  * hovering over a suggestion and then pressing enter will cause that suggestion to be searched 
  * pressing enter doesn't change the search results (the query parameter changes but the search results don't)
-->
<script lang="ts">
	import type { PageProps } from './$types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	let { data }: PageProps = $props();
	import { SearchBar } from '$lib/components/search-bar';
	let isNameSearch = $state(true);
	let nameQuery = $state(page.url.searchParams.get('product') ?? '');
	let idQuery = $state(page.url.searchParams.get('id') ?? '');

	// pagination
	let pageNumber = $state(parseInt(page.url.searchParams.get('page') ?? '1'));
	let currentPage = $derived(Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1);
	let totalPages = $derived(
		data.type === 'success' && typeof data.totalPages === 'number' && data.totalPages > 0
			? data.totalPages
			: 0
	);

	let pagesToShow = $derived.by(() => {
		let topIndex = currentPage + 4 > totalPages ? totalPages : currentPage + 4;
		let bottomIndex = topIndex - 9 > 0 ? topIndex - 9 : 1;
		return Array.from({ length: topIndex - bottomIndex + 1 }, (_, index) => bottomIndex + index);
	});
</script>

<div class="border-b-solid border-b-1 p-4">
	<form action="/search">
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
			<a class="link" style="color: var(--color-secondary);" href={resolve('/advanced-search')}>Advanced Search</a>
		</div>
	</form>
</div>
{#if data.type !== 'success'}
	<p>An error occurred while trying to fetch data.</p>
{:else}
	<ul>
		{#each data.items as item (item.id)}
			<li class="border-b-1 p-3">
				<strong>{item.name}</strong><br />
				<p>{item.store}</p>
				<p>Location: {item.location}</p>
				<p>Department: {item.department}</p>
				<p class="text-sm">ID: {item.id}</p>
				<p>Cost: {item.cents}</p>
				<p>Cost Change: {item.cents_change}</p>
				<p>Weight: {item.grams}</p>
				<p>
					<a class="link" style="color: var(--color-primary);" href={resolve(`/product/${encodeURIComponent(item.id as string)}`)}
						>Price history & chart</a
					>
				</p>
			</li>
		{/each}
	</ul>
{/if}

<nav aria-label="Search results pages" class="p-3">
	<ul>
		{#if data.type === 'success'}
			{#if currentPage > 1}
				<li class="inline">
					<a class="link" style="color: var(--color-secondary);"
						href={`/search?product=${encodeURIComponent(nameQuery)}&page=${currentPage - 1}`}
						onclick={() => { pageNumber-- }}
					>Previous</a>
				</li>
			{/if}
			{#each pagesToShow as pageValue (pageValue)}
				<!--
				this will break if we deploy to a subdirectory, but for now it's fine. We
				should ideally use the resolve function here, but it doesn't work with
				query parameters.
				
				issue raised concerning resolve and query parameters:
				https://github.com/sveltejs/kit/issues/14750
				-->
				<!--eslint-disable-next-line svelte/no-navigation-without-resolve-->
				<li class={`inline p-3 ${currentPage === pageValue ? '!font-extrabold' : '!font-thin'}`}>
					<a class="link" style="color: var(--color-secondary);"
						href={`/search?product=${encodeURIComponent(nameQuery)}&page=${pageValue}`} aria-current={currentPage === pageValue}
						onclick={() => {pageNumber = pageValue}}
						>{pageValue}</a
					>
				</li>
			{/each}
			{#if currentPage < data.totalPages}
				<li class="inline">
					<a class="link" style="color: var(--color-secondary);"
						href={`/search?product=${encodeURIComponent(nameQuery)}&page=${currentPage + 1}`} 
						onclick={() => { pageNumber++ }}
					>Next</a>
				</li>
			{/if}
		{/if}
	</ul>
</nav>
<a class="link px-3 pb-3" style="color: var(--color-secondary)" href={resolve('/')}>← Back to search</a>

<style>
	ul {
		list-style: none;
		padding: 0;
	}
</style>
