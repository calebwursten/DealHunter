export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: "Single Family" | "Multi-Family" | "Condo" | "Commercial";
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  estimatedValue: string;
  equity: string;
  equityLevel: "high" | "medium" | "low";
  equityPercent: number;
  ownerName: string;
  ownerType: "Individual" | "LLC" | "Trust" | "Corporate";
  ownerMailingLine1?: string;
  ownerMailingLine2?: string;
  ownerMailingCity?: string;
  ownerMailingState?: string;
  ownerMailingZip?: string;
  isHomestead?: boolean;
  neighborhood?: string;
  lastSaleDate: string;
  lastSalePrice: string;
  prevSaleDate?: string;
  prevSalePrice?: string;
  openMortgage: string;
  lotArea?: number;
  condition?: string;
  exteriorFinish?: string;
  totalRooms?: number;
  tags: string[];
}

export interface Lead {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  propertyValue: string;
  equity: string;
  motivation: "High" | "Medium" | "Low";
  status: "New" | "Contacted" | "Negotiating" | "Closed" | "Dead";
  addedDate: string;
  listName: string;
}

export interface Comp {
  id: string;
  address: string;
  salePrice: string;
  saleDate: string;
  sqft: number;
  pricePerSqft: string;
  beds: number;
  baths: number;
  distance: string;
}
