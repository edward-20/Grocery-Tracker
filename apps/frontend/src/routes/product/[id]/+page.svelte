<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import PriceChart from '$lib/components/price-chart/PriceChart.svelte';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.type === 'success' ? data.product.name : 'Product'} — Price history</title>
</svelte:head>

<p class="mb-4">
	<a class="link link-primary" style="color: var(--color-secondary);" href={resolve('/search')}>← Back to search results</a>
</p>

{#if data.type === 'success'}
	<h1 class="mb-2 text-2xl font-semibold">{data.product.name}</h1>
	<p class="mb-4 text-sm opacity-70">ID: <code class="text-xs">{data.product.retailerProductId}</code></p>


	<div class="mb-6 rounded-lg border p-4 price-chart-container">
		{#if data.points.length === 0}
			<p class="py-12 text-center text-base-content/60">
				No price points to plot for this id in the last year.
			</p>
		{:else}
			<PriceChart points={data.points} />
		{/if}
	</div>

	<div class="overflow-x-auto">
		<table class="table table-zebra table-sm">
			<thead>
				<tr>
					<th>Time</th>
					<th>Price</th>
					<th>Size</th>
					<th>Unit Price</th>
					<th>Unit Price Quantity</th>
					<th>Unit Price Unit of Measurement</th>
				</tr>
			</thead>
			<tbody>
				{#each data.points as p (p.time)}
					<tr>
						<td>{p.time}</td>
						<td>{p.price}</td>
						<td>{p.size}</td>
						<td>{p.unitPricing?.unitPrice}</td>
						<td>{p.unitPricing?.unitPriceQuantity}</td>
						<td>{p.unitPricing?.unitPriceUnitofMeasurement}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<div style="background-color: var(--color-error); color: var(--color-error-content);">
		<h1 class="mb-2 text-xl font-semibold">Could not load price history</h1>
		<p class="text-sm">Internal Error</p>
		<pre class="mt-2 max-h-48 overflow-auto rounded p-2 text-xs">{data.message}</pre>
		<p class="text-sm">{data.message}</p>
	</div>
{/if}

<style>
	.price-chart-container {
		border: 1px solid var(--color-base-300);
		background-color: var(--color-base-100);
	}	
</style>
