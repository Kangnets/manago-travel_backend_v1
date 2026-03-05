export enum PaymentMethod {
  CARD = 'card',
  BANK = 'bank',
  CASH = 'cash',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
}

export interface Payment {
  id: string;
  reservationId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paidAt?: string;
  memo?: string;
  created?: string;
  updated?: string;
}
