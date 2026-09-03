import { Product } from "@grocery-tracker/domain-model";
import type { Transport } from '@sveltejs/kit';

export const transport: Transport = {
	Product: {
		encode: (value) => {
			if (value instanceof Product) {
				return {
					retailer: value.retailer,
					retailerProductId: value.retailerProductId,
				  	category: {
						...value.category
					},
				  	uid: value.uid,

				  	currentValue: {
						size: value.currentValue.size,
						price: value.currentValue.price,
						time: value.currentValue.time,
						unitPricing: value.currentValue.unitPricing
					},
				  	name: value.name,
				  	path: value.path,
				  	description: value.description,
				  	brand: value.brand,
				  	imageUrl: value.imageUrl,
				  	crossProductIdentity: value.crossProductIdentity ? {
						crossRetailerId: value.crossProductIdentity.crossRetailerId,
						gtinFormat: value.crossProductIdentity.gtinFormat
					} : undefined
				};
			}
			return false;
		},

		decode: (value) => {
			if (value && typeof value === 'object') {
				return new Product(value);
			}

			return value;
		}
	}
};
