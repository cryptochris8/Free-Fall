/**
 * PersistenceManager - Handles saving and loading player data using Hytopia's native persistence
 *
 * Uses player.getPersistedData() and player.setPersistedData() for cross-session storage.
 * Data persists across game sessions, server restarts, and different lobbies.
 */

import type { Player } from 'hytopia';
import type { Difficulty } from '../types';
import type { SubjectType, QuestionDifficulty } from '../questions/QuestionProvider';
import type { GameScoreSummary } from '../scoring/ScoringSystem';

// ============ Persisted Data Types ============

export interface PersistedPlayerData {
  // Profile
  username: string;
  firstPlayedAt: number;
  lastPlayedAt: number;
  totalPlayTime: number; // in seconds

  // Overall stats
  totalGamesPlayed: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  totalScore: number;
  totalXP: number;
  currentLevel: number;

  // Best performances
  highScore: number;
  bestStreak: number;
  bestGrade: string;
  fastestPerfectGame: number | null; // milliseconds

  // Per-subject stats
  subjectStats: Record<SubjectType, SubjectStats>;

  // Per-difficulty stats
  difficultyStats: Record<Difficulty, DifficultyStats>;

  // Achievements
  unlockedAchievements: string[];
  achievementProgress: Record<string, number>;

  // Preferences
  preferredDifficulty: Difficulty;
  preferredSubject: SubjectType;

  // Leaderboard
  dailyHighScore: number;
  dailyHighScoreDate: string; // YYYY-MM-DD
  weeklyHighScore: number;
  weeklyHighScoreWeek: string; // YYYY-WW

  // Streaks
  currentDailyStreak: number;
  longestDailyStreak: number;
  lastDailyPlayDate: string | null; // YYYY-MM-DD
}

export interface SubjectStats {
  gamesPlayed: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  highScore: number;
  bestStreak: number;
  totalScore: number;
  averageResponseTime: number;
  categoryProgress: Record<string, CategoryProgress>;
}

export interface CategoryProgress {
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  mastered: boolean;
}

export interface DifficultyStats {
  gamesPlayed: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  averageScore: number;
  highScore: number;
}

// ============ Default Data ============

function createDefaultSubjectStats(): SubjectStats {
  return {
    gamesPlayed: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    accuracy: 0,
    highScore: 0,
    bestStreak: 0,
    totalScore: 0,
    averageResponseTime: 0,
    categoryProgress: {}
  };
}

function createDefaultDifficultyStats(): DifficultyStats {
  return {
    gamesPlayed: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    accuracy: 0,
    averageScore: 0,
    highScore: 0
  };
}

function createDefaultPlayerData(username: string): PersistedPlayerData {
  return {
    username,
    firstPlayedAt: Date.now(),
    lastPlayedAt: Date.now(),
    totalPlayTime: 0,

    totalGamesPlayed: 0,
    totalQuestionsAnswered: 0,
    totalCorrectAnswers: 0,
    totalScore: 0,
    totalXP: 0,
    currentLevel: 1,

    highScore: 0,
    bestStreak: 0,
    bestGrade: 'F',
    fastestPerfectGame: null,

    subjectStats: {
      math: createDefaultSubjectStats(),
      spelling: createDefaultSubjectStats(),
      vocabulary: createDefaultSubjectStats(),
      geography: createDefaultSubjectStats(),
      science: createDefaultSubjectStats(),
      history: createDefaultSubjectStats(),
      language: createDefaultSubjectStats(),
      typing: createDefaultSubjectStats()
    },

    difficultyStats: {
      beginner: createDefaultDifficultyStats(),
      moderate: createDefaultDifficultyStats(),
      hard: createDefaultDifficultyStats()
    },

    unlockedAchievements: [],
    achievementProgress: {},

    preferredDifficulty: 'moderate',
    preferredSubject: 'math',

    dailyHighScore: 0,
    dailyHighScoreDate: '',
    weeklyHighScore: 0,
    weeklyHighScoreWeek: '',

    currentDailyStreak: 0,
    longestDailyStreak: 0,
    lastDailyPlayDate: null
  };
}

// ============ Persistence Manager ============

export class PersistenceManager {
  private static _instance: PersistenceManager;

  // In-memory cache of player data
  private _playerDataCache: Map<string, PersistedPlayerData> = new Map();

  // Session start times for play time tracking
  private _sessionStartTimes: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): PersistenceManager {
    if (!PersistenceManager._instance) {
      PersistenceManager._instance = new PersistenceManager();
    }
    return PersistenceManager._instance;
  }

  /**
   * Load player data from persistence (or create default)
   */
  public async loadPlayerData(player: Player): Promise<PersistedPlayerData> {
    const playerId = player.id;

    try {
      // Try to get persisted data from Hytopia
      const persistedData = await player.getPersistedData();

      if (persistedData && typeof persistedData === 'object') {
        // Merge with defaults to ensure all fields exist
        const merged = this._mergeWithDefaults(persistedData as Partial<PersistedPlayerData>, player.username);

        // Update last played
        merged.lastPlayedAt = Date.now();

        // Check and update daily streak
        this._updateDailyStreak(merged);

        // Cache it
        this._playerDataCache.set(playerId, merged);

        // Start session timer
        this._sessionStartTimes.set(playerId, Date.now());

        console.log(`[Persistence] Loaded data for ${player.username}`);
        return merged;
      }
    } catch (error) {
      console.warn(`[Persistence] Error loading data for ${player.username}:`, error);
    }

    // Create default data
    const defaultData = createDefaultPlayerData(player.username);
    this._playerDataCache.set(playerId, defaultData);
    this._sessionStartTimes.set(playerId, Date.now());

    // Save the default data
    await this.savePlayerData(player);

    console.log(`[Persistence] Created new data for ${player.username}`);
    return defaultData;
  }

  /**
   * Save player data to persistence
   */
  public async savePlayerData(player: Player): Promise<boolean> {
    const playerId = player.id;
    const data = this._playerDataCache.get(playerId);

    if (!data) {
      console.warn(`[Persistence] No data to save for player ${playerId}`);
      return false;
    }

    try {
      // Update play time
      const sessionStart = this._sessionStartTimes.get(playerId);
      if (sessionStart) {
        data.totalPlayTime += Math.floor((Date.now() - sessionStart) / 1000);
        this._sessionStartTimes.set(playerId, Date.now()); // Reset timer
      }

      // Update last played
      data.lastPlayedAt = Date.now();

      // Save to Hytopia persistence
      await player.setPersistedData(data);

      console.log(`[Persistence] Saved data for ${player.username}`);
      return true;
    } catch (error) {
      console.error(`[Persistence] Error saving data for ${player.username}:`, error);
      return false;
    }
  }

  /**
   * Get cached player data (fast, in-memory)
   */
  public getPlayerData(playerId: string): PersistedPlayerData | undefined {
    return this._playerDataCache.get(playerId);
  }

  /**
   * Record a completed game
   */
  public async recordGameResult(
    player: Player,
    summary: GameScoreSummary,
    subject: SubjectType
  ): Promise<void> {
    const data = this._playerDataCache.get(player.id);
    if (!data) return;

    const today = this._getDateString();
    const week = this._getWeekString();

    // Update overall stats
    data.totalGamesPlayed++;
    data.totalQuestionsAnswered += summary.correctAnswers + summary.wrongAnswers;
    data.totalCorrectAnswers += summary.correctAnswers;
    data.totalScore += summary.totalScore;
    data.totalXP += summary.xpEarned;
    data.currentLevel = this._calculateLevel(data.totalXP);

    // Update best performances
    if (summary.totalScore > data.highScore) {
      data.highScore = summary.totalScore;
    }
    if (summary.bestStreak > data.bestStreak) {
      data.bestStreak = summary.bestStreak;
    }
    if (this._isGradeBetter(summary.grade, data.bestGrade)) {
      data.bestGrade = summary.grade;
    }
    if (summary.perfectGame) {
      const gameTime = summary.averageResponseTime * (summary.correctAnswers + summary.wrongAnswers) * 1000;
      if (!data.fastestPerfectGame || gameTime < data.fastestPerfectGame) {
        data.fastestPerfectGame = gameTime;
      }
    }

    // Update subject stats
    const subjectStats = data.subjectStats[subject];
    subjectStats.gamesPlayed++;
    subjectStats.questionsAnswered += summary.correctAnswers + summary.wrongAnswers;
    subjectStats.correctAnswers += summary.correctAnswers;
    subjectStats.accuracy = subjectStats.questionsAnswered > 0
      ? (subjectStats.correctAnswers / subjectStats.questionsAnswered) * 100
      : 0;
    subjectStats.totalScore += summary.totalScore;
    if (summary.totalScore > subjectStats.highScore) {
      subjectStats.highScore = summary.totalScore;
    }
    if (summary.bestStreak > subjectStats.bestStreak) {
      subjectStats.bestStreak = summary.bestStreak;
    }
    // Update running average response time
    const totalResponses = subjectStats.questionsAnswered;
    const prevAvg = subjectStats.averageResponseTime;
    const newResponses = summary.correctAnswers + summary.wrongAnswers;
    subjectStats.averageResponseTime =
      ((prevAvg * (totalResponses - newResponses)) + (summary.averageResponseTime * newResponses)) / totalResponses;

    // Update difficulty stats
    const diffStats = data.difficultyStats[summary.difficulty];
    diffStats.gamesPlayed++;
    diffStats.questionsAnswered += summary.correctAnswers + summary.wrongAnswers;
    diffStats.correctAnswers += summary.correctAnswers;
    diffStats.accuracy = diffStats.questionsAnswered > 0
      ? (diffStats.correctAnswers / diffStats.questionsAnswered) * 100
      : 0;
    diffStats.averageScore =
      ((diffStats.averageScore * (diffStats.gamesPlayed - 1)) + summary.totalScore) / diffStats.gamesPlayed;
    if (summary.totalScore > diffStats.highScore) {
      diffStats.highScore = summary.totalScore;
    }

    // Update daily/weekly high scores
    if (data.dailyHighScoreDate !== today) {
      data.dailyHighScore = summary.totalScore;
      data.dailyHighScoreDate = today;
    } else if (summary.totalScore > data.dailyHighScore) {
      data.dailyHighScore = summary.totalScore;
    }

    if (data.weeklyHighScoreWeek !== week) {
      data.weeklyHighScore = summary.totalScore;
      data.weeklyHighScoreWeek = week;
    } else if (summary.totalScore > data.weeklyHighScore) {
      data.weeklyHighScore = summary.totalScore;
    }

    // Update daily streak
    this._updateDailyStreak(data);

    // Save to persistence
    await this.savePlayerData(player);

    console.log(`[Persistence] Recorded game for ${player.username}: Score ${summary.totalScore}, Grade ${summary.grade}`);
  }

  /**
   * Update category progress for a subject
   */
  public updateCategoryProgress(
    playerId: string,
    subject: SubjectType,
    category: string,
    correct: boolean
  ): void {
    const data = this._playerDataCache.get(playerId);
    if (!data) return;

    const categoryProgress = data.subjectStats[subject].categoryProgress[category] || {
      questionsAnswered: 0,
      correctAnswers: 0,
      accuracy: 0,
      mastered: false
    };

    categoryProgress.questionsAnswered++;
    if (correct) {
      categoryProgress.correctAnswers++;
    }
    categoryProgress.accuracy = (categoryProgress.correctAnswers / categoryProgress.questionsAnswered) * 100;

    // Mark as mastered if 90%+ accuracy with 20+ questions
    if (categoryProgress.questionsAnswered >= 20 && categoryProgress.accuracy >= 90) {
      categoryProgress.mastered = true;
    }

    data.subjectStats[subject].categoryProgress[category] = categoryProgress;
  }

  /**
   * Unlock an achievement
   */
  public unlockAchievement(playerId: string, achievementId: string): boolean {
    const data = this._playerDataCache.get(playerId);
    if (!data) return false;

    if (!data.unlockedAchievements.includes(achievementId)) {
      data.unlockedAchievements.push(achievementId);
      return true;
    }
    return false;
  }

  /**
   * Update achievement progress
   */
  public updateAchievementProgress(playerId: string, achievementId: string, progress: number): void {
    const data = this._playerDataCache.get(playerId);
    if (!data) return;

    data.achievementProgress[achievementId] = progress;
  }

  /**
   * Get player stats summary for UI
   */
  public getPlayerStatsSummary(playerId: string): {
    level: number;
    xp: number;
    totalScore: number;
    gamesPlayed: number;
    overallAccuracy: number;
    bestStreak: number;
    highScore: number;
    dailyStreak: number;
  } | null {
    const data = this._playerDataCache.get(playerId);
    if (!data) return null;

    return {
      level: data.currentLevel,
      xp: data.totalXP,
      totalScore: data.totalScore,
      gamesPlayed: data.totalGamesPlayed,
      overallAccuracy: data.totalQuestionsAnswered > 0
        ? (data.totalCorrectAnswers / data.totalQuestionsAnswered) * 100
        : 0,
      bestStreak: data.bestStreak,
      highScore: data.highScore,
      dailyStreak: data.currentDailyStreak
    };
  }

  /**
   * Handle player disconnect - save data
   */
  public async handlePlayerDisconnect(player: Player): Promise<void> {
    await this.savePlayerData(player);
    this._playerDataCache.delete(player.id);
    this._sessionStartTimes.delete(player.id);
    console.log(`[Persistence] Player ${player.username} disconnected, data saved`);
  }

  // ============ Private Helpers ============

  private _mergeWithDefaults(partial: Partial<PersistedPlayerData>, username: string): PersistedPlayerData {
    const defaults = createDefaultPlayerData(username);

    // Deep merge for nested objects
    const merged = { ...defaults, ...partial };

    // Merge subject stats
    if (partial.subjectStats) {
      merged.subjectStats = { ...defaults.subjectStats };
      for (const [key, value] of Object.entries(partial.subjectStats)) {
        merged.subjectStats[key as SubjectType] = {
          ...createDefaultSubjectStats(),
          ...value
        };
      }
    }

    // Merge difficulty stats
    if (partial.difficultyStats) {
      merged.difficultyStats = { ...defaults.difficultyStats };
      for (const [key, value] of Object.entries(partial.difficultyStats)) {
        merged.difficultyStats[key as Difficulty] = {
          ...createDefaultDifficultyStats(),
          ...value
        };
      }
    }

    return merged;
  }

  private _updateDailyStreak(data: PersistedPlayerData): void {
    const today = this._getDateString();
    const yesterday = this._getDateString(new Date(Date.now() - 86400000));

    if (data.lastDailyPlayDate === today) {
      // Already played today, no change
      return;
    } else if (data.lastDailyPlayDate === yesterday) {
      // Played yesterday, increment streak
      data.currentDailyStreak++;
      data.longestDailyStreak = Math.max(data.longestDailyStreak, data.currentDailyStreak);
    } else {
      // Missed a day, reset streak
      data.currentDailyStreak = 1;
    }

    data.lastDailyPlayDate = today;
  }

  private _calculateLevel(xp: number): number {
    // Level formula: level = floor(sqrt(xp / 100)) + 1
    // Level 1: 0 XP, Level 2: 100 XP, Level 3: 400 XP, Level 4: 900 XP, etc.
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  private _isGradeBetter(newGrade: string, currentGrade: string): boolean {
    const gradeOrder = ['F', 'D', 'C', 'B', 'A', 'S'];
    return gradeOrder.indexOf(newGrade) > gradeOrder.indexOf(currentGrade);
  }

  private _getDateString(date: Date = new Date()): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private _getWeekString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const week = Math.ceil((((date.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }
}
