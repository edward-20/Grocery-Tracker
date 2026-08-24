<!--WrapperSearchBar.svelte-->
<script>
	import { SearchBar } from '$lib/components/search-bar';

	let query = $state('');
</script>

<SearchBar
	{query}
	url="/fake-endpoint"
	name="Product Name"
	label="Product Name"
	placeholder="Juniper beads"
/>
