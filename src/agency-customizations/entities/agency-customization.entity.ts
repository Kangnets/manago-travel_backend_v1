export type SupportedLanguage = 'ko' | 'en';

export interface AgencyCustomization {
  id: string;
  agencyId: string;
  slug: string;
  adminLanguage: SupportedLanguage;
  serviceLanguage: SupportedLanguage;
  settings: Record<string, unknown>;
  created: string;
  updated: string;
}
