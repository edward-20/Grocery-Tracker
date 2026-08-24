/** One observation for price history charts / product detail. */
export type PricePoint = {
	time: string;
	store: string;
	cents: number;
	name: string;
	grams: number;
};
