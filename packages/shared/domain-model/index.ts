type CrossProductIdentity = {
  crossRetailerId: string;
  gtinFormat: number;
}

export type ProductConstructorProps = {
  retailer: Retailer["name"],
  retailerProductId: string,
  category: Category,

  currentValue: ValueAtTime,
  name: string,
  path: string,
  description: string,
  brand?: string,
  imageUrl?: string,
  crossProductIdentity?: CrossProductIdentity
};

export class Product {
  readonly retailer: Retailer["name"];
  readonly retailerProductId: string;
  readonly category: Category;
  readonly uid: string;

  readonly currentValue: ValueAtTime;
  readonly name: string;
  readonly path: string;
  readonly description: string;
  readonly brand?: string;
  readonly imageUrl?: string;
  readonly crossProductIdentity?: CrossProductIdentity;

  constructor(props: ProductConstructorProps) {
    this.retailer = props.retailer;
    this.retailerProductId = props.retailerProductId;
    this.category = props.category;
    this.currentValue = props.currentValue;
    this.name = props.name;
    this.path = props.path;
    this.description = props.description;
    this.brand = props.brand;
    this.imageUrl = props.imageUrl;
    this.crossProductIdentity = props.crossProductIdentity;
    this.uid = JSON.stringify([this.retailer, this.retailerProductId]);
  }
}

export interface Category {
  retailer: Retailer["name"];
  retailerDesignatedCategoryId: string;
  name: string;
  path: string;
}

export interface Retailer {
  name: "Woolworths" | "Coles";
  url: string;
}

export type UnitOfMeasurement = "Each" | "Kg" | "g" | "L" | "mL" | "SS" | "sheets" | "m" | "kgM"

export class ValueAtTime {
  constructor(
    readonly size: string,
    readonly price: number,
    readonly time: Date,
    readonly unitPricing?: {
      unitPrice: number,
      unitPriceQuantity: number,
      unitPriceUnitofMeasurement: UnitOfMeasurement
    }
  ) { }
}
