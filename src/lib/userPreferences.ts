export const MAX_USER_PREFERENCES = 10;
export const MAX_USER_PREFERENCE_LENGTH = 120;
export const USER_PREFERENCES_STORAGE_KEY = 'b_user_preferences';

export interface AddPreferenceResult {
  success: boolean;
  error?: string;
  preferences: string[];
}

export interface RemovePreferenceResult {
  success: boolean;
  preferences: string[];
}

/**
 * Loads user preferences from browser storage.
 */
export function loadUserPreferences(): string[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = localStorage.getItem(USER_PREFERENCES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim().slice(0, MAX_USER_PREFERENCE_LENGTH))
      .slice(0, MAX_USER_PREFERENCES);
  } catch {
    return [];
  }
}

/**
 * Persists user preferences to browser storage.
 */
export function saveUserPreferences(preferences: string[]): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const sanitized = preferences
      .filter((item) => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim().slice(0, MAX_USER_PREFERENCE_LENGTH))
      .slice(0, MAX_USER_PREFERENCES);
    localStorage.setItem(USER_PREFERENCES_STORAGE_KEY, JSON.stringify(sanitized));
    return true;
  } catch {
    return false;
  }
}

/**
 * Adds a new preference subject to the 10-item cap and 120-character limit.
 */
export function addUserPreference(
  preference: string,
  currentPreferences: string[] = loadUserPreferences()
): AddPreferenceResult {
  const trimmed = (preference || '').trim();

  if (trimmed.length === 0) {
    return {
      success: false,
      error: 'Preference cannot be empty.',
      preferences: currentPreferences,
    };
  }

  if (trimmed.length > MAX_USER_PREFERENCE_LENGTH) {
    return {
      success: false,
      error: `Preference exceeds ${MAX_USER_PREFERENCE_LENGTH} characters (${trimmed.length}/${MAX_USER_PREFERENCE_LENGTH}).`,
      preferences: currentPreferences,
    };
  }

  if (currentPreferences.length >= MAX_USER_PREFERENCES) {
    return {
      success: false,
      error: `Maximum limit of ${MAX_USER_PREFERENCES} user preferences reached.`,
      preferences: currentPreferences,
    };
  }

  const updated = [...currentPreferences, trimmed];
  saveUserPreferences(updated);
  return {
    success: true,
    preferences: updated,
  };
}

/**
 * Removes a preference by index.
 */
export function removeUserPreference(
  index: number,
  currentPreferences: string[] = loadUserPreferences()
): RemovePreferenceResult {
  if (index < 0 || index >= currentPreferences.length) {
    return { success: false, preferences: currentPreferences };
  }
  const updated = currentPreferences.filter((_, i) => i !== index);
  saveUserPreferences(updated);
  return {
    success: true,
    preferences: updated,
  };
}

/**
 * Formats preferences for subagent system prompt injection.
 */
export function formatPreferencesForPrompt(preferences: string[]): string {
  if (!preferences || preferences.length === 0) {
    return '';
  }
  const items = preferences.map((p, i) => `${i + 1}. ${p}`).join('\n');
  return `\n\n## User Custom Preferences\nYou MUST strictly adhere to these user preferences during diagramming, formatting, and analysis:\n${items}\n`;
}
