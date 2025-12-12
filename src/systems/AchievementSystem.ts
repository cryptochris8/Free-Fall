/**
 * AchievementSystem - Tracks and awards achievements
 *
 * Monitors player actions and awards achievements based on performance.
 * Sends UI notifications when achievements are unlocked.
 */

import { World, Player } from 'hytopia';
import type { Achievement, PlayerAchievements, AchievementNotification } from '../types';

export class AchievementSystem {
  private static _instance: AchievementSystem;
  private _world: World;

  // Achievement definitions
  private _achievements: Map<string, Achievement> = new Map();

  // Player achievement tracking
  private _playerAchievements: Map<string, PlayerAchievements> = new Map();

  // Callbacks for notifications
  private _notificationCallbacks: ((playerId: string, achievement: Achievement) => void)[] = [];

  private constructor(world: World) {
    this._world = world;
    this._initializeAchievements();
  }

  public static getInstance(world?: World): AchievementSystem {
    if (!AchievementSystem._instance) {
      if (!world) throw new Error('AchievementSystem requires world on first instantiation');
      AchievementSystem._instance = new AchievementSystem(world);
    }
    return AchievementSystem._instance;
  }

  /**
   * Register callback for achievement notifications
   */
  public onAchievementUnlocked(callback: (playerId: string, achievement: Achievement) => void): void {
    this._notificationCallbacks.push(callback);
  }

  /**
   * Get player achievements
   */
  public getPlayerAchievements(playerId: string): {
    unlocked: Achievement[];
    progress: { achievementId: string; current: number; required: number }[];
  } {
    const playerData = this._playerAchievements.get(playerId) || {
      playerId,
      unlockedAchievements: new Set<string>(),
      progress: new Map<string, number>()
    };

    const unlocked: Achievement[] = [];
    const progress: { achievementId: string; current: number; required: number }[] = [];

    this._achievements.forEach((achievement, id) => {
      if (playerData.unlockedAchievements.has(id)) {
        unlocked.push(achievement);
      } else {
        const current = playerData.progress.get(id) || 0;
        progress.push({
          achievementId: id,
          current,
          required: achievement.requirement
        });
      }
    });

    return { unlocked, progress };
  }

  /**
   * Initialize player achievement tracking
   */
  public initializePlayer(playerId: string): void {
    if (this._playerAchievements.has(playerId)) return;

    this._playerAchievements.set(playerId, {
      playerId,
      unlockedAchievements: new Set<string>(),
      progress: new Map<string, number>()
    });

    console.log(`[AchievementSystem] Initialized achievements for player ${playerId}`);
  }

  /**
   * Record an action that may progress toward achievements
   */
  public recordAction(
    playerId: string,
    actionType: string,
    data: { streak?: number; score?: number; questionsAnswered?: number; accuracy?: number }
  ): void {
    let playerData = this._playerAchievements.get(playerId);
    if (!playerData) {
      this.initializePlayer(playerId);
      playerData = this._playerAchievements.get(playerId)!;
    }

    // Check each achievement type
    switch (actionType) {
      case 'correct_answer':
        this._incrementProgress(playerId, 'correct_streak', data.streak || 1);
        this._incrementProgress(playerId, 'total_correct', 1);
        break;

      case 'game_completed':
        this._incrementProgress(playerId, 'games_completed', 1);
        this._checkScoreAchievements(playerId, data.score || 0);
        break;

      case 'streak_reached':
        this._checkStreakAchievements(playerId, data.streak || 0);
        break;

      case 'accuracy_recorded':
        this._checkAccuracyAchievements(playerId, data.accuracy || 0);
        break;
    }
  }

  /**
   * Increment progress toward an achievement
   */
  private _incrementProgress(playerId: string, achievementType: string, amount: number): void {
    const playerData = this._playerAchievements.get(playerId);
    if (!playerData) return;

    // Find all achievements of this type
    this._achievements.forEach((achievement, id) => {
      if (achievement.type === achievementType && !playerData.unlockedAchievements.has(id)) {
        const currentProgress = playerData.progress.get(id) || 0;
        const newProgress = currentProgress + amount;
        playerData.progress.set(id, newProgress);

        // Check if unlocked
        if (newProgress >= achievement.requirement) {
          this._unlockAchievement(playerId, id);
        }
      }
    });
  }

  /**
   * Check streak-based achievements
   */
  private _checkStreakAchievements(playerId: string, streak: number): void {
    const playerData = this._playerAchievements.get(playerId);
    if (!playerData) return;

    this._achievements.forEach((achievement, id) => {
      if (achievement.type === 'streak' &&
          !playerData.unlockedAchievements.has(id) &&
          streak >= achievement.requirement) {
        this._unlockAchievement(playerId, id);
      }
    });
  }

  /**
   * Check score-based achievements
   */
  private _checkScoreAchievements(playerId: string, score: number): void {
    // Score achievements are based on single-game score
    const playerData = this._playerAchievements.get(playerId);
    if (!playerData) return;

    // For simplicity, map score to achievement progress
    if (score >= 10) this._incrementProgress(playerId, 'games_completed', 0); // Perfect game
  }

  /**
   * Check accuracy-based achievements
   */
  private _checkAccuracyAchievements(playerId: string, accuracy: number): void {
    const playerData = this._playerAchievements.get(playerId);
    if (!playerData) return;

    this._achievements.forEach((achievement, id) => {
      if (achievement.type === 'accuracy' &&
          !playerData.unlockedAchievements.has(id) &&
          accuracy * 100 >= achievement.requirement) {
        this._unlockAchievement(playerId, id);
      }
    });
  }

  /**
   * Unlock an achievement for a player
   */
  private _unlockAchievement(playerId: string, achievementId: string): void {
    const playerData = this._playerAchievements.get(playerId);
    const achievement = this._achievements.get(achievementId);

    if (!playerData || !achievement || playerData.unlockedAchievements.has(achievementId)) {
      return;
    }

    playerData.unlockedAchievements.add(achievementId);
    console.log(`[AchievementSystem] Player ${playerId} unlocked: ${achievement.name}`);

    // Notify callbacks
    this._notificationCallbacks.forEach(cb => cb(playerId, achievement));

    // Try to send to player UI
    this._sendUINotification(playerId, achievement);
  }

  /**
   * Send achievement notification to player UI
   */
  private _sendUINotification(playerId: string, achievement: Achievement): void {
    try {
      // Find player in world and send notification
      const players = this._world.playerManager?.getConnectedPlayers() || [];
      const player = players.find(p => p.id === playerId);

      if (player) {
        player.ui.sendData({
          type: 'achievement-unlocked',
          achievement: {
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            tier: achievement.tier
          }
        });
      }
    } catch (error) {
      console.error('[AchievementSystem] Error sending UI notification:', error);
    }
  }

  /**
   * Initialize achievement definitions
   */
  private _initializeAchievements(): void {
    const achievements: Achievement[] = [
      // Streak achievements
      { id: 'streak_3', name: 'Hat Trick', description: 'Get 3 answers correct in a row', icon: 'streak', tier: 'bronze', requirement: 3, type: 'streak' },
      { id: 'streak_5', name: 'On Fire', description: 'Get 5 answers correct in a row', icon: 'streak', tier: 'silver', requirement: 5, type: 'streak' },
      { id: 'streak_10', name: 'Unstoppable', description: 'Get 10 answers correct in a row', icon: 'streak', tier: 'gold', requirement: 10, type: 'streak' },

      // Total correct achievements
      { id: 'correct_10', name: 'Getting Started', description: 'Answer 10 questions correctly', icon: 'check', tier: 'bronze', requirement: 10, type: 'total_correct' },
      { id: 'correct_50', name: 'Practiced', description: 'Answer 50 questions correctly', icon: 'check', tier: 'silver', requirement: 50, type: 'total_correct' },
      { id: 'correct_100', name: 'Math Whiz', description: 'Answer 100 questions correctly', icon: 'check', tier: 'gold', requirement: 100, type: 'total_correct' },
      { id: 'correct_500', name: 'Math Master', description: 'Answer 500 questions correctly', icon: 'check', tier: 'platinum', requirement: 500, type: 'total_correct' },

      // Games completed achievements
      { id: 'games_1', name: 'First Fall', description: 'Complete your first game', icon: 'game', tier: 'bronze', requirement: 1, type: 'games_completed' },
      { id: 'games_10', name: 'Regular Player', description: 'Complete 10 games', icon: 'game', tier: 'silver', requirement: 10, type: 'games_completed' },
      { id: 'games_50', name: 'Dedicated', description: 'Complete 50 games', icon: 'game', tier: 'gold', requirement: 50, type: 'games_completed' },

      // Accuracy achievements
      { id: 'accuracy_80', name: 'Sharp Mind', description: 'Achieve 80% accuracy overall', icon: 'target', tier: 'silver', requirement: 80, type: 'accuracy' },
      { id: 'accuracy_95', name: 'Near Perfect', description: 'Achieve 95% accuracy overall', icon: 'target', tier: 'platinum', requirement: 95, type: 'accuracy' },
    ];

    achievements.forEach(a => this._achievements.set(a.id, a));
    console.log(`[AchievementSystem] Initialized ${achievements.length} achievements`);
  }
}
