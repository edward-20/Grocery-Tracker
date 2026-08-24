<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import PriceChart from '$lib/components/PriceChart.svelte';

	let { data }: PageProps = $props();

	const colesPoints = $derived(
		data.type === 'success' ? data.points.filter((p) => p.store === 'Coles') : []
	);
	const woolPoints = $derived(
		data.type === 'success' ? data.points.filter((p) => p.store === 'Woolworths') : []
	);
</script>

<svelte:head>
	<title>{data.type === 'success' ? data.productName : 'Product'} — Price history</title>
</svelte:head>

<p class="mb-4">
	<a class="link link-primary" style="color: var(--color-secondary);" href={resolve('/search')}>← Back to search results</a>
</p>

{#if data.type === 'success'}
	<h1 class="mb-2 text-2xl font-semibold">{data.productName}</h1>
	<p class="mb-4 text-sm opacity-70">ID: <code class="text-xs">{data.id}</code></p>

	<p class="mb-4">
		Coles: <strong>{colesPoints.length}</strong> points · Woolworths:
		<strong>{woolPoints.length}</strong> points
	</p>

	<div class="mb-6 rounded-lg border p-4 price-chart-container">
		{#if colesPoints.length === 0 && woolPoints.length === 0}
			<p class="py-12 text-center text-base-content/60">
				No price points to plot for this id in the last year.
			</p>
		{:else}
			{#key data.id}
				<PriceChart points={data.points} />
			{/key}
		{/if}
	</div>

	<div class="overflow-x-auto">
		<table class="table table-zebra table-sm">
			<thead>
				<tr>
					<th>Time</th>
					<th>Store</th>
					<th>Price (¢)</th>
					<th>Grams</th>
				</tr>
			</thead>
			<tbody>
				{#each data.points as p (p.time)}
					<tr>
						<td class="text-xs whitespace-nowrap">{p.time}</td>
						<td>{p.store}</td>
						<td>{p.cents}</td>
						<td>{p.grams}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<div style="background-color: var(--color-error); color: var(--color-error-content);">
		<h1 class="mb-2 text-xl font-semibold">Could not load price history</h1>
		<p class="mb-2 text-sm">ID: <code>{data.id}</code></p>
		{#if data.type === 'influxdb_error'}
			<p class="text-sm">InfluxDB error {data.code ?? ''}</p>
			<pre class="mt-2 max-h-48 overflow-auto rounded p-2 text-xs">{data.message}</pre>
		{:else}
			<p class="text-sm">{data.message}</p>
		{/if}
	</div>
{/if}

<style>
	.price-chart-container {
		border: 1px solid var(--color-base-300);
		background-color: var(--color-base-100);
	}	
</style>
