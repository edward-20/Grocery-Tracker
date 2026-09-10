<!--
  Client-only line chart: Coles vs Woolworths price (¢) over time.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { PriceHistoryPageLoadResponse } from '../../../routes/product/[id]/proxy+page.server';
	import type { Chart as ChartType } from 'chart.js';
	import type { ValueAtTime } from '@grocery-tracker/domain-model';

	let {points}: {
		points: Extract<
			PriceHistoryPageLoadResponse, 
		{type: 'success' }
		>["points"]
	} = $props();

	let canvas: HTMLCanvasElement | undefined = $state();

	function toXY(valueAtTime: ValueAtTime[]): { x: number, y: number }[] {
		return valueAtTime
			.map((vat) => {
				return { x: vat.time.getTime(), y: vat.price }; // this needs to
				// change to unit price depending on whether unit price exists
			})
			.sort((a, b) => a.x - b.x);
	}

	onMount(() => {
		if (!browser || !canvas) return;

		// want to return a page that shows 500 internal error (returns nothing
		// at the moment)

		let chart: ChartType | null = null;

		const run = async () => {
			const [{ Chart, registerables }, _adapter] = await Promise.all([
				import('chart.js'),
				import('chartjs-adapter-date-fns')
			]);
			Chart.register(...registerables);

			chart?.destroy();
			chart = new Chart(canvas!, {
				type: 'line',
				data: {
					datasets: [
						{
							label: 'Price (¢)',
							data: toXY(points),
							borderColor: 'rgb(29, 120, 63)',
							backgroundColor: 'rgba(29, 120, 63, 0.08)',
							fill: false,
							tension: 0.2,
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					interaction: { mode: 'nearest', intersect: false },
					plugins: {
						legend: { position: 'top' },
						tooltip: {
							callbacks: {
								label(ctx) {
									const v = ctx.parsed.y;
									if (v == null) return '';
									return `${ctx.dataset.label?.replace(' (¢)', '') ?? ''}: ${v}¢`;
								}
							}
						}
					},
					scales: {
						x: {
							type: 'time',
							time: {
								tooltipFormat: 'PPpp',
								displayFormats: {
									millisecond: 'HH:mm:ss.SSS',
									second: 'MMM d, HH:mm:ss',
									minute: 'MMM d, HH:mm',
									hour: 'MMM d, ha',
									day: 'MMM d',
									week: 'MMM d',
									month: "MMM ''yy",
									quarter: 'qqq yyyy',
									year: 'yyyy'
								}
							},
							title: { display: true, text: 'Time' },
							ticks: { maxRotation: 45, minRotation: 0 }
						},
						y: {
							title: { display: true, text: 'Price (cents)' },
							beginAtZero: false
						}
					}
				}
			});
		};

		void run();

		return () => {
			chart?.destroy();
			chart = null;
		};
	});
</script>

<div class="relative h-[min(420px,55vh)] min-h-[280px] w-full">
	<canvas bind:this={canvas} class="max-h-full"></canvas>
</div>
