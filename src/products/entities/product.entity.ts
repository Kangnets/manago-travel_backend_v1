export enum ProductCategory {
  HOTEL = 'hotel',
  GOLF = 'golf',
  TOUR = 'tour',
  CONVENIENCE = 'convenience',
  INSURANCE = 'insurance',
}

export interface Product {
  id: string;
  title: string;
  description?: string;
  location: string;
  country: string;
  duration: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  imageUrl: string;
  category: ProductCategory;
  isActive: boolean;
  isFeatured: boolean;
  viewCount: number;
  agencyId?: string;
  minParticipants: number;
  maxParticipants: number;
  created?: string;
  updated?: string;
}
