/**
 * Types pour les paramètres de l'application
 * Conformément au cahier des charges - Section 8.1
 */

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  plan: 'free' | 'basic' | 'premium';
}

export interface AppearanceSettings {
  theme: 'system' | 'light' | 'dark';
  textSize: 's' | 'm' | 'l';
  language: 'fr' | 'en' | 'es';
  respectSystem: boolean;
}

export interface QuietHours {
  enabled: boolean;
  start: string; // Format: "HH:MM"
  end: string;   // Format: "HH:MM"
}

export interface NotificationSettings {
  emails: boolean;
  reminders: boolean;
  push: boolean;
  quietHours: QuietHours;
  emailTime?: string; // Format: "HH:MM" - Heure d'envoi des emails automatiques
}

export interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export interface SecuritySettings {
  twoFactor: boolean;
  sessions: Session[];
  lastPasswordChange: string;
}

export interface SettingsState {
  profile: UserProfile;
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
}

// Types pour les événements analytics
export interface SettingsEvents {
  // Navigation
  'settings_viewed': { section?: string };
  'settings_section_clicked': { section: string };

  // Modifications
  'profile_updated': { field: string; value: any };
  'theme_changed': { theme: string };
  'notifications_updated': { type: string; enabled: boolean };

  // Actions
  'avatar_uploaded': { success: boolean; size: number };
  'account_deleted': { confirmation_time: number };
  'help_accessed': { source: string };
}

// Types pour les mises à jour partielles
export type ProfileUpdate = Partial<UserProfile>;
export type AppearanceUpdate = Partial<AppearanceSettings>;
export type NotificationUpdate = Partial<NotificationSettings>;
export type SecurityUpdate = Partial<SecuritySettings>;

export type SettingsUpdate =
  | { type: 'profile'; data: ProfileUpdate }
  | { type: 'appearance'; data: AppearanceUpdate }
  | { type: 'notifications'; data: NotificationUpdate }
  | { type: 'security'; data: SecurityUpdate };
