export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

export enum TravelerType {
  ADULT = 'adult',
  CHILD = 'child',
  INFANT = 'infant',
}

export interface Traveler {
  id: string;
  reservationId: string;
  travelerType: TravelerType;
  passportLastName: string;
  passportFirstName: string;
  passportNumber: string;
  passportExpiry: string;
  birthDate: string;
  gender: Gender;
  nationality: string;
  phone?: string;
  email?: string;
  specialRequest?: string;
  created?: string;
  updated?: string;
}
