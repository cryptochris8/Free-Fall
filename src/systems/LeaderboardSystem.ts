/**
 * LeaderboardSystem - Manages game leaderboards
 *
 * Tracks player scores and maintains leaderboards.
 * In-memory for now, could be persisted later.
 */

import type { LeaderboardCategory, LeaderboardEntry, PlayerStats } from '../types';

export class LeaderboardSystem {
  private static _instance: LeaderboardSystem;

  // Leaderboards by category
  private _leaderboards: Map<LeaderboardCategory, LeaderboardEntry[]> = new Map();

  // Player statistics
  private _playerStats: Map<string, PlayerStats> = new Map();

  // Daily/Weekly reset timestamps
  private _dailyResetTime: number = 0;
  private _weeklyResetTime: number = 0;

  private constructor() {
    this._initializeLeaderboards();
    this._scheduleResets();
  }

  public static getInstance(): LeaderboardSystem {
    if (!LeaderboardSystem._instance) {
      LeaderboardSystem._instance = new LeaderboardSystem();
    }
    return LeaderboardSystem._instance;
  }

  /**
   * Initialize empty leaderboards
   */
  private _initializeLeaderboards(): void {
    const categories: LeaderboardCategory[] = [
      'daily_score', 'weekly_score', 'all_time_score', 'race_wins', 'accuracy', 'streak'
    ];

    categories.forEach(cat => this._leaderboards.set(cat, []));
    console.log('[LeaderboardSystem] Initialized leaderboards');
  }

  /**
   * Schedule daily and weekly resets
   */
  private _scheduleResets(): void {
    const now = Date.now();
    const msInDay = 24 * 60 * 60 * 1000;
    const msInWeek = 7 * msInDay;

    this._dailyResetTime = now + msInDay;
    this._weeklyResetTime = now + msInWeek;

    // Check for resets every hour
    setInterval(() => {
      const current = Date.now();
      if (current > this._dailyResetTime) {
        this._resetLeaderboard('daily_score');
        this._dailyResetTime = current + msInDay;
      }
      if (current > this._weeklyResetTime) {
        this._resetLeaderboard('weekly_score');
        this._weeklyResetTime = current + msInWeek;
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Reset a specific leaderboard
   */
  private _resetLeaderboard(category: LeaderboardCategory): void {
    this._leaderboards.set(category, []);
    console.log(`[LeaderboardSystem] Reset ${category} leaderboard`);
  }

  /**
   * Submit a score to the leaderboards
   */
  public submitScore(playerId: string, username: string, score: number): void {
    // Update player stats
    this._updatePlayerStats(playerId, username, score);

    // Update all relevant leaderboards
    this._addToLeaderboard('daily_score', playerId, username, score);
    this._addToLeaderboard('weekly_score', playerId, username, score);
    this._addToLeaderboard('all_time_score', playerId, username, score);

    console.log(`[LeaderboardSystem] Submitted score ${score} for ${username}`);
  }

  /**
   * Submit a race win
   */
  public submitRaceWin(playerId: string, username: string): void {
    const stats = this._getOrCreateStats(playerId, username);
    stats.racesWon++;
    this._addToLeaderboard('race_wins', playerId, username, stats.racesWon);
  }

  /**
   * Update accuracy leaderboard
   */
  public updateAccuracy(playerId: string, username: string, accuracy: number): void {
    const stats = this._getOrCreateStats(playerId, username);
    stats.averageAccuracy = accuracy;
    this._addToLeaderboard('accuracy', playerId, username, Math.round(accuracy * 100));
  }

  /**
   * Update streak leaderboard
   */
  public updateStreak(playerId: string, username: string, streak: number): void {
    const stats = this._getOrCreateStats(playerId, username);
    if (streak > stats.bestStreak) {
      stats.bestStreak = streak;
      this._addToLeaderboard('streak', playerId, username, streak);
    }
  }

  /**
   * Add or update entry in a leaderboard
   */
  private _addToLeaderboard(
    category: LeaderboardCategory,
    playerId: string,
    username: string,
    score: number
  ): void {
    const leaderboard = this._leaderboards.get(category);
    if (!leaderboard) return;

    // Find existing entry
    const existingIndex = leaderboard.findIndex(e => e.playerId === playerId);

    if (existingIndex >= 0) {
      // Update if new score is better
      if (score > leaderboard[existingIndex].score) {
        leaderboard[existingIndex].score = score;
        leaderboard[existingIndex].username = username;
      }
    } else {
      // Add new entry
      leaderboard.push({
        playerId,
        username,
        score,
        rank: 0
      });
    }

    // Sort and assign ranks
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Keep top 100
    if (leaderboard.length > 100) {
      leaderboard.splice(100);
    }
  }

  /**
   * Get leaderboard data
   */
  public getLeaderboard(category: LeaderboardCategory, limit: number = 20): LeaderboardEntry[] {
    const leaderboard = this._leaderboards.get(category);
    if (!leaderboard) return [];

    return leaderboard.slice(0, limit);
  }

  /**
   * Get player's rank in a category
   */
  public getPlayerRank(playerId: string, category: LeaderboardCategory): number | null {
    const leaderboard = this._leaderboards.get(category);
    if (!leaderboard) return null;

    const entry = leaderboard.find(e => e.playerId === playerId);
    return entry?.rank || null;
  }

  /**
   * Get player stats
   */
  public getPlayerStats(playerId: string): PlayerStats | null {
    return this._playerStats.get(playerId) || null;
  }

  /**
   * Update player statistics
   */
  private _updatePlayerStats(playerId: string, username: string, gameScore: number): void {
    const stats = this._getOrCreateStats(playerId, username);

    stats.totalGamesPlayed++;
    stats.totalScore += gameScore;
    stats.bestSingleGameScore = Math.max(stats.bestSingleGameScore, gameScore);
    stats.lastPlayed = Date.now();
  }

  /**
   * Get or create player stats
   */
  private _getOrCreateStats(playerId: string, username: string): PlayerStats {
    let stats = this._playerStats.get(playerId);

    if (!stats) {
      stats = {
        playerId,
        username,
        totalGamesPlayed: 0,
        totalQuestionsAnswered: 0,
        correctAnswers: 0,
        bestStreak: 0,
        averageAccuracy: 0,
        totalScore: 0,
        bestSingleGameScore: 0,
        racesWon: 0,
        racesParticipated: 0,
        teamChallengesWon: 0,
        lastPlayed: Date.now()
      };
      this._playerStats.set(playerId, stats);
    }

    return stats;
  }
}
