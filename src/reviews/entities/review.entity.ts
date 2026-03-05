export interface Review {
  id: string;
  productId: string;
  productTitle: string;
  rating: number;
  comment: string;
  images?: string[];
  userName?: string;
  isActive: boolean;
  created?: string;
  updated?: string;
}
