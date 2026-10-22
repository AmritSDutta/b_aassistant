import { describe, it, expect, beforeEach } from 'vitest';
import {
  MAX_USER_PREFERENCES,
  MAX_USER_PREFERENCE_LENGTH,
  USER_PREFERENCES_STORAGE_KEY,
  loadUserPreferences,
  saveUserPreferences,
  addUserPreference,
  removeUserPreference,
  formatPreferencesForPrompt,
} from '../lib/userPreferences';

describe('userPreferences lib', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('constants', () => {
    it('enforces maximum 10 preferences and 120 characters per preference', () => {
      expect(MAX_USER_PREFERENCES).toBe(10);
      expect(MAX_USER_PREFERENCE_LENGTH).toBe(120);
      expect(USER_PREFERENCES_STORAGE_KEY).toBe('b_user_preferences');
    });
  });

  describe('loadUserPreferences & saveUserPreferences', () => {
    it('returns empty array when storage is empty', () => {
      expect(loadUserPreferences()).toEqual([]);
    });

    it('returns empty array when storage contains invalid JSON', () => {
      localStorage.setItem(USER_PREFERENCES_STORAGE_KEY, 'invalid-json');
      expect(loadUserPreferences()).toEqual([]);
    });

    it('saves and loads valid preferences', () => {
      const prefs = ['Prefer dark mode diagrams', 'Keep explanations under 3 bullets'];
      expect(saveUserPreferences(prefs)).toBe(true);
      expect(loadUserPreferences()).toEqual(prefs);
    });

    it('sanitizes and truncates items over limits on save', () => {
      const overLong = 'a'.repeat(150);
      const items = [overLong, '   trimmed pref   ', ''];
      saveUserPreferences(items);
      const loaded = loadUserPreferences();
      expect(loaded).toHaveLength(2);
      expect(loaded[0]).toBe('a'.repeat(120));
      expect(loaded[1]).toBe('trimmed pref');
    });
  });

  describe('addUserPreference', () => {
    it('successfully adds trimmed preference to storage', () => {
      const res = addUserPreference('  Use pastel colors for database nodes  ', []);
      expect(res.success).toBe(true);
      expect(res.preferences).toEqual(['Use pastel colors for database nodes']);
      expect(loadUserPreferences()).toEqual(['Use pastel colors for database nodes']);
    });

    it('allows duplicate preferences under 10-item cap', () => {
      const first = addUserPreference('Include timestamp', []);
      expect(first.success).toBe(true);
      const second = addUserPreference('Include timestamp', first.preferences);
      expect(second.success).toBe(true);
      expect(second.preferences).toEqual(['Include timestamp', 'Include timestamp']);
    });

    it('rejects empty or whitespace-only preference', () => {
      const res = addUserPreference('   \n  \t  ', []);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Preference cannot be empty.');
      expect(res.preferences).toEqual([]);
    });

    it('rejects preference exceeding 120 characters', () => {
      const text = 'b'.repeat(121);
      const res = addUserPreference(text, []);
      expect(res.success).toBe(false);
      expect(res.error).toContain('120');
      expect(res.preferences).toEqual([]);
    });

    it('enforces maximum 10 preferences cap', () => {
      let current: string[] = [];
      for (let i = 1; i <= 10; i++) {
        const res = addUserPreference(`Preference item ${i}`, current);
        expect(res.success).toBe(true);
        current = res.preferences;
      }
      expect(current.length).toBe(10);

      const overflowRes = addUserPreference('11th item should fail', current);
      expect(overflowRes.success).toBe(false);
      expect(overflowRes.error).toContain('Maximum limit of 10');
      expect(overflowRes.preferences.length).toBe(10);
    });
  });

  describe('removeUserPreference', () => {
    it('removes item at given index and persists changes', () => {
      const initial = ['Alpha', 'Beta', 'Gamma'];
      saveUserPreferences(initial);

      const res = removeUserPreference(1, initial);
      expect(res.success).toBe(true);
      expect(res.preferences).toEqual(['Alpha', 'Gamma']);
      expect(loadUserPreferences()).toEqual(['Alpha', 'Gamma']);
    });

    it('handles out of bounds index safely', () => {
      const initial = ['Alpha'];
      const res = removeUserPreference(5, initial);
      expect(res.success).toBe(false);
      expect(res.preferences).toEqual(['Alpha']);
    });
  });

  describe('formatPreferencesForPrompt', () => {
    it('returns empty string when preferences array is empty', () => {
      expect(formatPreferencesForPrompt([])).toBe('');
    });

    it('formats preferences as numbered instructions for system prompt injection', () => {
      const formatted = formatPreferencesForPrompt([
        'Highlight bottlenecks in red',
        'Always include legend',
      ]);
      expect(formatted).toContain('## User Custom Preferences');
      expect(formatted).toContain('1. Highlight bottlenecks in red');
      expect(formatted).toContain('2. Always include legend');
    });
  });
});
