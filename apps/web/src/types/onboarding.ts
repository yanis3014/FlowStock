import type { ExtractedDish } from '@bmad/shared';

export type OnboardingStep =
  | 'profil' | 'menu' | 'emplacements'
  | 'stocks' | 'fournisseurs' | 'pos' | 'analyse-ventes' | 'done';

export type CuisineType =
  | 'Française' | 'Italienne' | 'Japonaise'
  | 'Méditerranéenne' | 'Pizzeria' | 'Brasserie' | 'Autre';

export type EmplacementType = 'froid' | 'sec' | 'cave' | 'cuisine' | 'autre';

export type JourSemaine = 'lun' | 'mar' | 'mer' | 'jeu' | 'ven' | 'sam' | 'dim';

export interface ProfilRestaurant {
  nom: string;
  type_cuisine: CuisineType;
  nb_couverts: number;
  service_midi: boolean;
  service_soir: boolean;
  jours_fermeture: JourSemaine[];
}

/** ExtractedDish + id local React key */
export interface MenuPlatLocal extends ExtractedDish {
  id: string; // crypto.randomUUID() côté client
}

export interface Emplacement {
  id: string;
  nom: string;
  type: EmplacementType;
  temperature?: string;
}

export interface OnboardingProgressData {
  current_step: OnboardingStep;
  completed_steps: OnboardingStep[];
  profil?: ProfilRestaurant;
  menu_extracted?: boolean;
  menu_skipped?: boolean;
  emplacements_count?: number;
  stocks_mode?: 'csv' | 'guided';
  stocks_count?: number;
}

export interface OnboardingApiResponse {
  onboarding_data: OnboardingProgressData | null;
  onboarding_completed: boolean;
}
