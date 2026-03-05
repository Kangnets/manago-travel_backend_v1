export enum UserType {
  CUSTOMER = 'customer',
  AGENCY = 'agency',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  KAKAO = 'kakao',
}

/** 여행사 내 역할: 사장(owner) | 직원(employee) */
export type AgencyRole = 'owner' | 'employee';

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  phone?: string;
  userType: UserType;
  provider: AuthProvider;
  providerId?: string;
  agencyName?: string;
  agencyEmail?: string;
  businessNumber?: string;
  licenseNumber?: string;
  address?: string;
  /** 여행사일 때만: owner(사장) | employee(직원) */
  agencyRole?: AgencyRole;
  /** 직원일 때만: 소속 사장(owner)의 user id */
  agencyOwnerId?: string;
  isActive: boolean;
  isVerified: boolean;
  created?: string;
  updated?: string;
}

export async function validatePassword(user: User, plainPassword: string): Promise<boolean> {
  if (!user.password || !plainPassword) return false;
  try {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(plainPassword, user.password);
  } catch {
    return false;
  }
}
