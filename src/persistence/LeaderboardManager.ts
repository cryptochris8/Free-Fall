/**
 * LeaderboardManager - Manages leaderboards using Hytopia's native persistence
 *
 * Leaderboard Categories:
 * - Daily Score (resets at midnight UTC)
 * - Weekly Score (resets Sunday midnight UTC)
 * - All-Time Score
 * - Best Streak
 * - Speed Run (fastest perfect game)
 * - Per-Subject high scores
 */

import type { Player } from 'hytopia';
import type { SubjectType } from '../questions/QuestionProvider';

export type LeaderboardType =
  | 'daily'
  | 'weekly'
  | 'all-time'
  | 'streak'
  | 'speed-run'
  | 'math'
  | 'spelling'
  | 'geography'
  | 'science'
  | 'history';

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  score: number;
  achievedAt: number;
  additionalData?: {
    streak?: number;
    accuracy?: number;
    grade?: string;
    time?: number; // for speed runs
  };
}

export interface LeaderboardData {
  type: LeaderboardType;
  entries: LeaderboardEntry[];
  lastUpdated: number;
  resetTime?: number; // When this leaderboard resets (for daily/weekly)
}

// In-memory leaderboard storage (would be persisted via a shared data mechanism in production)
// For now, this persists within the server session
const MAX_ENTRIES_PER_LEADERBOARD = 100;

export class LeaderboardManager {
  private static _instance: LeaderboardManager;

  // In-memory leaderboards
  private _leaderboards: Map<LeaderboardType, LeaderboardData> = new Map();

  // Track when daily/weekly reset
  private _dailyResetDate: string = '';
  private _weeklyResetWeek: string = '';

  private constructor() {
    this._initializeLeaderboards();
    this._scheduleResets();
  }

  public static getInstance(): LeaderboardManager {
    if (!LeaderboardManager._instance) {
      LeaderboardManager._instance = new LeaderboardManager();
    }
    return LeaderboardManager._instance;
  }

  /**
   * Submit a score to relevant leaderboards
   */
  public submitScore(
    player: Player,
    score: number,
    subject: SubjectType,
    additionalData?: {
      streak?: number;
      accuracy?: number;
      grade?: string;
      perfectGameTime?: number;
    }
  ): {
    newRanks: Record<LeaderboardType, number | null>;
    improvements: LeaderboardType[];
  } {
    const result = {
      newRanks: {} as Record<LeaderboardType, number | null>,
      improvements: [] as LeaderboardType[]
    };

    // Check resets
    this._checkResets();

    const playerId = player.id;
    const username = player.username;
    const now = Date.now();

    // Submit to main leaderboards
    const mainBoards: LeaderboardType[] = ['daily', 'weekly', 'all-time'];
    for (const boardType of mainBoards) {
      const improvement = this._submitToBoard(boardType, playerId, username, score, now, additionalData);
      result.newRanks[boardType] = this._getPlayerRank(boardType, playerId);
      if (improvement) {
        result.improvements.push(boardType);
      }
    }

    // Submit to subject-specific leaderboard
    const subjectBoard = subject as LeaderboardType;
    if (this._leaderboards.has(subjectBoard)) {
      const improvement = this._submitToBoard(subjectBoard, playerId, username, score, now, additionalData);
      result.newRanks[subjectBoard] = this._getPlayerRank(subjectBoard, playerId);
      if (improvement) {
        result.improvements.push(subjectBoard);
      }
    }

    // Submit streak
    if (additionalData?.streak) {
      const streakImprovement = this._submitToBoard('streak', playerId, username, additionalData.streak, now, additionalData);
      result.newRanks['streak'] = this._getPlayerRank('streak', playerId);
      if (streakImprovement) {
        result.improvements.push('streak');
      }
    }

    // Submit speed run (only if perfect game)
    if (additionalData?.perfectGameTime) {
      // For speed runs, lower is better, so we negate for sorting
      const speedScore = -additionalData.perfectGameTime;
      const speedImprovement = this._submitToBoard('speed-run', playerId, username, speedScore, now, {
        ...additionalData,
        time: additionalData.perfectGameTime
      });
      result.newRanks['speed-run'] = this._getPlayerRank('speed-run', playerId);
      if (speedImprovement) {
        result.improvements.push('speed-run');
      }
    }

    console.log(`[Leaderboard] ${username} submitted score ${score}, improvements:`, result.improvements);

    return result;
  }

  /**
   * Get leaderboard entries
   */
  public getLeaderboard(type: LeaderboardType, limit: number = 10, offset: number = 0): LeaderboardEntry[] {
    this._checkResets();

    const board = this._leaderboards.get(type);
    if (!board) return [];

    return board.entries.slice(offset, offset + limit).map((entry, idx) => ({
      ...entry,
      rank: offset + idx + 1
    }));
  }

  /**
   * Get a player's rank on a specific leaderboard
   */
  public getPlayerRank(type: LeaderboardType, playerId: string): number | null {
    return this._getPlayerRank(type, playerId);
  }

  /**
   * Get a player's entry on a specific leaderboard
   */
  public getPlayerEntry(type: LeaderboardType, playerId: string): LeaderboardEntry | null {
    const board = this._leaderboards.get(type);
    if (!board) return null;

    const idx = board.entries.findIndex(e => e.playerId === playerId);
    if (idx === -1) return null;

    return {
      ...board.entries[idx],
      rank: idx + 1
    };
  }

  /**
   * Get surrounding players (for context)
   */
  public getSurroundingEntries(type: LeaderboardType, playerId: string, range: number = 2): LeaderboardEntry[] {
    const board = this._leaderboards.get(type);
    if (!board) return [];

    const idx = board.entries.findIndex(e => e.playerId === playerId);
    if (idx === -1) return [];

    const start = Math.max(0, idx - range);
    const end = Math.min(board.entries.length, idx + range + 1);

    return board.entries.slice(start, end).map((entry, i) => ({
      ...entry,
      rank: start + i + 1
    }));
  }

  /**
   * Get leaderboard summary for UI
   */
  public getLeaderboardSummary(playerId: string): {
    daily: { rank: number | null; score: number };
    weekly: { rank: number | null; score: number };
    allTime: { rank: number | null; score: number };
    streak: { rank: number | null; value: number };
  } {
    return {
      daily: {
        rank: this._getPlayerRank('daily', playerId),
        score: this._getPlayerScore('daily', playerId)
      },
      weekly: {
        rank: this._getPlayerRank('weekly', playerId),
        score: this._getPlayerScore('weekly', playerId)
      },
      allTime: {
        rank: this._getPlayerRank('all-time', playerId),
        score: this._getPlayerScore('all-time', playerId)
      },
      streak: {
        rank: this._getPlayerRank('streak', playerId),
        value: this._getPlayerScore('streak', playerId)
      }
    };
  }

  /**
   * Get available leaderboard types
   */
  public getAvailableLeaderboards(): LeaderboardType[] {
    return Array.from(this._leaderboards.keys());
  }

  // ============ Private Methods ============

  private _initializeLeaderboards(): void {
    const types: LeaderboardType[] = [
      'daily',
      'weekly',
      'all-time',
      'streak',
      'speed-run',
      'math',
      'spelling',
      'geography',
      'science',
      'history'
    ];

    for (const type of types) {
      this._leaderboards.set(type, {
        type,
        entries: [],
        lastUpdated: Date.now(),
        resetTime: type === 'daily' || type === 'weekly' ? this._getNextResetTime(type) : undefined
      });
    }

    this._dailyResetDate = this._getDateString();
    this._weeklyResetWeek = this._getWeekString();

    console.log('[Leaderboard] Initialized leaderboards:', types);
  }

  private _submitToBoard(
    type: LeaderboardType,
    playerId: string,
    username: string,
    score: number,
    achievedAt: number,
    additionalData?: any
  ): boolean {
    const board = this._leaderboards.get(type);
    if (!board) return false;

    // Check if player already has an entry
    const existingIdx = board.entries.findIndex(e => e.playerId === playerId);

    if (existingIdx !== -1) {
      // Player already on board - only update if new score is better
      const existing = board.entries[existingIdx];
      if (score <= existing.score) {
        return false; // No improvement
      }

      // Remove old entry
      board.entries.splice(existingIdx, 1);
    }

    // Create new entry
    const newEntry: LeaderboardEntry = {
      rank: 0, // Will be set when retrieved
      playerId,
      username,
      score,
      achievedAt,
      additionalData
    };

    // Insert in sorted position (descending by score)
    let inserted = false;
    for (let i = 0; i < board.entries.length; i++) {
      if (score > board.entries[i].score) {
        board.entries.splice(i, 0, newEntry);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      board.entries.push(newEntry);
    }

    // Trim to max entries
    if (board.entries.length > MAX_ENTRIES_PER_LEADERBOARD) {
      board.entries = board.entries.slice(0, MAX_ENTRIES_PER_LEADERBOARD);
    }

    board.lastUpdated = Date.now();

    return true; // Improvement made
  }

  private _getPlayerRank(type: LeaderboardType, playerId: string): number | null {
    const board = this._leaderboards.get(type);
    if (!board) return null;

    const idx = board.entries.findIndex(e => e.playerId === playerId);
    return idx === -1 ? null : idx + 1;
  }

  private _getPlayerScore(type: LeaderboardType, playerId: string): number {
    const board = this._leaderboards.get(type);
    if (!board) return 0;

    const entry = board.entries.find(e => e.playerId === playerId);
    return entry?.score || 0;
  }

  private _checkResets(): void {
    const today = this._getDateString();
    const thisWeek = this._getWeekString();

    // Daily reset
    if (today !== this._dailyResetDate) {
      console.log('[Leaderboard] Daily reset triggered');
      this._resetLeaderboard('daily');
      this._dailyResetDate = today;
    }

    // Weekly reset
    if (thisWeek !== this._weeklyResetWeek) {
      console.log('[Leaderboard] Weekly reset triggered');
      this._resetLeaderboard('weekly');
      this._weeklyResetWeek = thisWeek;
    }
  }

  private _resetLeaderboard(type: LeaderboardType): void {
    const board = this._leaderboards.get(type);
    if (board) {
      board.entries = [];
      board.lastUpdated = Date.now();
      board.resetTime = this._getNextResetTime(type);
    }
  }

  private _scheduleResets(): void {
    // Check for resets every minute
    setInterval(() => {
      this._checkResets();
    }, 60000);
  }

  private _getNextResetTime(type: 'daily' | 'weekly'): number {
    const now = new Date();

    if (type === 'daily') {
      // Next midnight UTC
      const tomorrow = new Date(now);
      tomorrow.setUTCHours(24, 0, 0, 0);
      return tomorrow.getTime();
    } else {
      // Next Sunday midnight UTC
      const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
      const nextSunday = new Date(now);
      nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
      nextSunday.setUTCHours(0, 0, 0, 0);
      return nextSunday.getTime();
    }
  }

  private _getDateString(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
  }

  private _getWeekString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const week = Math.ceil((((date.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }
}
