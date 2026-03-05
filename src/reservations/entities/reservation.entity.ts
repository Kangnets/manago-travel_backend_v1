export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export interface Reservation {
  id: string;
  reservationNumber: string;
  productId: string;
  agencyId: string;
  customerId?: string;
  status: ReservationStatus;
  departureDate: string;
  returnDate?: string;
  adultCount: number;
  childCount: number;
  infantCount: number;
  totalAmount: number;
  paidAmount: number;
  memo?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  created?: string;
  updated?: string;
}
