<!--
  Client-only line chart: Coles vs Woolworths price (¢) over time.
-->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { influxTimeToUnixMs } from '$lib/influx-time';
	import type { PricePoint } from '$lib/types/price-point';
	import type { Chart as ChartType } from 'chart.js';

	let { points }: { points: PricePoint[] } = $props();

	let canvas: HTMLCanvasElement | undefined = $state();

	function toXY(rows: PricePoint[]) {
		return rows
			.map((p) => {
				const t = influxTimeToUnixMs(p.time);
				if (t == null) return null;
				return { x: t, y: p.cents };
			})
			.filter((v): v is { x: number; y: number } => v !== null)
			.sort((a, b) => a.x - b.x);
	}

	onMount(() => {
		if (!browser || !canvas) return;

		let chart: ChartType | null = null;

		const run = async () => {
			const [{ Chart, registerables }, _adapter] = await Promise.all([
				import('chart.js'),
				import('chartjs-adapter-date-fns')
			]);
			Chart.register(...registerables);

			const coles = toXY(points.filter((p) => p.store === 'Coles'));
			const wool = toXY(points.filter((p) => p.store === 'Woolworths'));

			chart?.destroy();
			chart = new Chart(canvas!, {
				type: 'line',
				data: {
					datasets: [
						{
							label: 'Coles (¢)',
							data: coles,
							borderColor: 'rgb(218, 41, 28)',
							backgroundColor: 'rgba(218, 41, 28, 0.08)',
							fill: false,
							tension: 0.2,
							spanGaps: true
						},
						{
							label: 'Woolworths (¢)',
							data: wool,
							borderColor: 'rgb(29, 120, 63)',
							backgroundColor: 'rgba(29, 120, 63, 0.08)',
							fill: false,
							tension: 0.2,
							spanGaps: true
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
