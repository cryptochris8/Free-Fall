/**
 * AccessibilitySystem - Manages accessibility settings
 *
 * Stores and applies player accessibility preferences.
 * Sends settings to UI for client-side application.
 */

import { Player, World } from 'hytopia';
import type { AccessibilitySettings } from '../types';

export class AccessibilitySystem {
  private static _instance: AccessibilitySystem;

  // Player accessibility settings
  private _playerSettings: Map<string, AccessibilitySettings> = new Map();

  // Default settings
  private readonly _defaultSettings: AccessibilitySettings = {
    colorBlindFriendly: false,
    highContrast: false,
    textSize: 'medium',
    reducedMotion: false,
    flashReduction: false,
    audioDescriptions: false,
    soundVolume: 1.0,
    musicVolume: 0.7,
    audioCues: true,
    oneHandedMode: false,
    extendedTimeouts: false,
    hapticFeedback: true
  };

  private constructor() {}

  public static getInstance(): AccessibilitySystem {
    if (!AccessibilitySystem._instance) {
      AccessibilitySystem._instance = new AccessibilitySystem();
    }
    return AccessibilitySystem._instance;
  }

  /**
   * Get settings for a player (returns defaults if not set)
   */
  public getSettings(playerId: string): AccessibilitySettings {
    return this._playerSettings.get(playerId) || { ...this._defaultSettings };
  }

  /**
   * Update settings for a player
   */
  public updateSettings(playerId: string, settings: Partial<AccessibilitySettings>): AccessibilitySettings {
    const current = this.getSettings(playerId);
    const updated: AccessibilitySettings = {
      ...current,
      ...settings
    };

    this._playerSettings.set(playerId, updated);
    console.log(`[AccessibilitySystem] Updated settings for ${playerId}:`, settings);

    return updated;
  }

  /**
   * Initialize settings for a new player
   */
  public initializePlayer(playerId: string): void {
    if (!this._playerSettings.has(playerId)) {
      this._playerSettings.set(playerId, { ...this._defaultSettings });
      console.log(`[AccessibilitySystem] Initialized default settings for ${playerId}`);
    }
  }

  /**
   * Load settings from persisted data (call when player joins)
   */
  public loadFromPersistedData(player: Player): AccessibilitySettings {
    const persisted = player.getPersistedData();
    if (persisted?.accessibilitySettings) {
      const settings = {
        ...this._defaultSettings,
        ...persisted.accessibilitySettings
      };
      this._playerSettings.set(player.id, settings);
      return settings;
    }
    return this.getSettings(player.id);
  }

  /**
   * Save settings to persisted data
   */
  public saveToPersistedData(player: Player): void {
    const settings = this.getSettings(player.id);
    player.setPersistedData({ accessibilitySettings: settings });
  }

  /**
   * Apply reduced motion setting (returns true if reduced motion is enabled)
   */
  public isReducedMotion(playerId: string): boolean {
    return this.getSettings(playerId).reducedMotion;
  }

  /**
   * Get volume multiplier for sounds
   */
  public getSoundVolume(playerId: string): number {
    return this.getSettings(playerId).soundVolume;
  }

  /**
   * Get volume multiplier for music
   */
  public getMusicVolume(playerId: string): number {
    return this.getSettings(playerId).musicVolume;
  }

  /**
   * Check if audio cues are enabled
   */
  public areAudioCuesEnabled(playerId: string): boolean {
    return this.getSettings(playerId).audioCues;
  }

  /**
   * Check if extended timeouts are needed
   */
  public needsExtendedTimeouts(playerId: string): boolean {
    return this.getSettings(playerId).extendedTimeouts;
  }

  /**
   * Get text size preference
   */
  public getTextSize(playerId: string): string {
    return this.getSettings(playerId).textSize;
  }

  /**
   * Check if color blind friendly mode is enabled
   */
  public isColorBlindFriendly(playerId: string): boolean {
    return this.getSettings(playerId).colorBlindFriendly;
  }

  /**
   * Check if high contrast mode is enabled
   */
  public isHighContrast(playerId: string): boolean {
    return this.getSettings(playerId).highContrast;
  }

  /**
   * Remove settings when player leaves (optional)
   */
  public clearPlayerSettings(playerId: string): void {
    this._playerSettings.delete(playerId);
  }
}
