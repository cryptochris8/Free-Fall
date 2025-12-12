/**
 * ScoringSystem - Enhanced scoring with multipliers, bonuses, and streaks
 *
 * Scoring Formula:
 * - Base points per correct answer
 * - Difficulty multiplier (Beginner 1x, Moderate 2x, Hard 3x)
 * - Speed bonus (answer quickly for bonus)
 * - Streak multiplier (consecutive correct answers)
 * - Perfect game bonus
 */

import type { Difficulty } from '../types';

export interface ScoreBreakdown {
  basePoints: number;
  difficultyMultiplier: number;
  speedBonus: number;
  streakMultiplier: number;
  totalPoints: number;
  bonusType?: 'speed' | 'streak' | 'perfect' | 'combo';
}

export interface GameScoreSummary {
  totalScore: number;
  correctAnswers: number;
  wrongAnswers: number;
  bestStreak: number;
  averageResponseTime: number;
  perfectGame: boolean;
  difficulty: Difficulty;
  bonusPointsEarned: number;
  basePointsEarned: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  xpEarned: number;
}

export interface ScoringConfig {
  basePointsPerCorrect: number;
  difficultyMultipliers: Record<Difficulty, number>;
  speedBonusThresholds: { seconds: number; multiplier: number }[];
  streakBonuses: { streak: number; multiplier: number }[];
  perfectGameBonus: number;
  maxStreakMultiplier: number;
  xpPerPoint: number;
}

const DEFAULT_CONFIG: ScoringConfig = {
  basePointsPerCorrect: 100,

  difficultyMultipliers: {
    beginner: 1.0,
    moderate: 2.0,
    hard: 3.0
  },

  // Speed bonuses - faster answers earn more
  speedBonusThresholds: [
    { seconds: 1.5, multiplier: 2.0 },   // Lightning fast
    { seconds: 3.0, multiplier: 1.5 },   // Very fast
    { seconds: 5.0, multiplier: 1.25 },  // Fast
    { seconds: 8.0, multiplier: 1.1 },   // Moderate
    { seconds: Infinity, multiplier: 1.0 } // Normal
  ],

  // Streak multipliers - consecutive correct answers
  streakBonuses: [
    { streak: 10, multiplier: 2.0 },  // Perfect streak!
    { streak: 7, multiplier: 1.75 },  // On fire!
    { streak: 5, multiplier: 1.5 },   // Hot streak!
    { streak: 3, multiplier: 1.25 },  // Warming up
    { streak: 2, multiplier: 1.1 },   // Double
    { streak: 1, multiplier: 1.0 }    // Single
  ],

  perfectGameBonus: 500,
  maxStreakMultiplier: 2.0,
  xpPerPoint: 0.1 // 10 points = 1 XP
};

export class ScoringSystem {
  private static _instance: ScoringSystem;
  private _config: ScoringConfig;

  // Per-player tracking
  private _playerSessions: Map<string, {
    currentStreak: number;
    bestStreak: number;
    totalScore: number;
    correctAnswers: number;
    wrongAnswers: number;
    responseTimes: number[];
    questionStartTime: number;
    scoreHistory: ScoreBreakdown[];
  }> = new Map();

  private constructor(config: Partial<ScoringConfig> = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  public static getInstance(config?: Partial<ScoringConfig>): ScoringSystem {
    if (!ScoringSystem._instance) {
      ScoringSystem._instance = new ScoringSystem(config);
    }
    return ScoringSystem._instance;
  }

  /**
   * Start a new game session for a player
   */
  public startSession(playerId: string): void {
    this._playerSessions.set(playerId, {
      currentStreak: 0,
      bestStreak: 0,
      totalScore: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      responseTimes: [],
      questionStartTime: Date.now(),
      scoreHistory: []
    });

    console.log(`[ScoringSystem] Started session for player ${playerId}`);
  }

  /**
   * Mark the start of a new question (for timing)
   */
  public startQuestion(playerId: string): void {
    const session = this._playerSessions.get(playerId);
    if (session) {
      session.questionStartTime = Date.now();
    }
  }

  /**
   * Calculate and record score for a correct answer
   */
  public recordCorrectAnswer(playerId: string, difficulty: Difficulty): ScoreBreakdown {
    const session = this._playerSessions.get(playerId);
    if (!session) {
      console.warn(`[ScoringSystem] No session found for player ${playerId}`);
      return this._createEmptyBreakdown();
    }

    // Calculate response time
    const responseTime = (Date.now() - session.questionStartTime) / 1000;
    session.responseTimes.push(responseTime);

    // Update streak
    session.currentStreak++;
    session.bestStreak = Math.max(session.bestStreak, session.currentStreak);
    session.correctAnswers++;

    // Calculate score breakdown
    const breakdown = this._calculateScore(difficulty, responseTime, session.currentStreak);

    // Update totals
    session.totalScore += breakdown.totalPoints;
    session.scoreHistory.push(breakdown);

    console.log(`[ScoringSystem] Player ${playerId} correct: +${breakdown.totalPoints} pts (streak: ${session.currentStreak})`);

    return breakdown;
  }

  /**
   * Record a wrong answer (resets streak)
   */
  public recordWrongAnswer(playerId: string): void {
    const session = this._playerSessions.get(playerId);
    if (!session) return;

    // Calculate response time for analytics
    const responseTime = (Date.now() - session.questionStartTime) / 1000;
    session.responseTimes.push(responseTime);

    // Reset streak
    session.currentStreak = 0;
    session.wrongAnswers++;

    console.log(`[ScoringSystem] Player ${playerId} wrong answer - streak reset`);
  }

  /**
   * End a game session and return summary
   */
  public endSession(playerId: string, difficulty: Difficulty): GameScoreSummary {
    const session = this._playerSessions.get(playerId);
    if (!session) {
      return this._createEmptySummary(difficulty);
    }

    const totalQuestions = session.correctAnswers + session.wrongAnswers;
    const perfectGame = session.correctAnswers === totalQuestions && totalQuestions >= 10;

    // Apply perfect game bonus
    let finalScore = session.totalScore;
    let bonusPoints = 0;

    if (perfectGame) {
      bonusPoints = this._config.perfectGameBonus * this._config.difficultyMultipliers[difficulty];
      finalScore += bonusPoints;
      console.log(`[ScoringSystem] Perfect game bonus: +${bonusPoints} pts`);
    }

    // Calculate average response time
    const avgResponseTime = session.responseTimes.length > 0
      ? session.responseTimes.reduce((a, b) => a + b, 0) / session.responseTimes.length
      : 0;

    // Calculate base vs bonus points
    const basePointsEarned = session.scoreHistory.reduce((sum, s) => sum + s.basePoints, 0);
    const bonusPointsEarned = session.totalScore - basePointsEarned + bonusPoints;

    // Determine grade
    const accuracy = totalQuestions > 0 ? session.correctAnswers / totalQuestions : 0;
    const grade = this._calculateGrade(accuracy, avgResponseTime, session.bestStreak);

    // Calculate XP
    const xpEarned = Math.floor(finalScore * this._config.xpPerPoint);

    const summary: GameScoreSummary = {
      totalScore: finalScore,
      correctAnswers: session.correctAnswers,
      wrongAnswers: session.wrongAnswers,
      bestStreak: session.bestStreak,
      averageResponseTime: avgResponseTime,
      perfectGame,
      difficulty,
      bonusPointsEarned,
      basePointsEarned,
      grade,
      xpEarned
    };

    // Clean up session
    this._playerSessions.delete(playerId);

    console.log(`[ScoringSystem] Session ended for ${playerId}:`, summary);

    return summary;
  }

  /**
   * Get current session stats (for live UI updates)
   */
  public getSessionStats(playerId: string): {
    score: number;
    streak: number;
    bestStreak: number;
    correct: number;
    wrong: number;
  } | null {
    const session = this._playerSessions.get(playerId);
    if (!session) return null;

    return {
      score: session.totalScore,
      streak: session.currentStreak,
      bestStreak: session.bestStreak,
      correct: session.correctAnswers,
      wrong: session.wrongAnswers
    };
  }

  /**
   * Calculate score for a single correct answer
   */
  private _calculateScore(
    difficulty: Difficulty,
    responseTime: number,
    streak: number
  ): ScoreBreakdown {
    const basePoints = this._config.basePointsPerCorrect;
    const difficultyMultiplier = this._config.difficultyMultipliers[difficulty];

    // Speed bonus
    let speedBonus = 1.0;
    for (const threshold of this._config.speedBonusThresholds) {
      if (responseTime <= threshold.seconds) {
        speedBonus = threshold.multiplier;
        break;
      }
    }

    // Streak multiplier
    let streakMultiplier = 1.0;
    for (const bonus of this._config.streakBonuses) {
      if (streak >= bonus.streak) {
        streakMultiplier = Math.min(bonus.multiplier, this._config.maxStreakMultiplier);
        break;
      }
    }

    // Calculate total
    const totalPoints = Math.round(
      basePoints * difficultyMultiplier * speedBonus * streakMultiplier
    );

    // Determine bonus type for UI feedback
    let bonusType: ScoreBreakdown['bonusType'];
    if (speedBonus > 1.0 && streakMultiplier > 1.0) {
      bonusType = 'combo';
    } else if (speedBonus > 1.0) {
      bonusType = 'speed';
    } else if (streakMultiplier > 1.0) {
      bonusType = 'streak';
    }

    return {
      basePoints,
      difficultyMultiplier,
      speedBonus,
      streakMultiplier,
      totalPoints,
      bonusType
    };
  }

  /**
   * Calculate letter grade based on performance
   */
  private _calculateGrade(
    accuracy: number,
    avgResponseTime: number,
    bestStreak: number
  ): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
    // Weighted score: accuracy (60%), speed (25%), streak (15%)
    const accuracyScore = accuracy * 100;
    const speedScore = Math.max(0, 100 - (avgResponseTime * 10)); // 10 seconds = 0
    const streakScore = Math.min(100, bestStreak * 10); // 10 streak = 100

    const weightedScore = (accuracyScore * 0.6) + (speedScore * 0.25) + (streakScore * 0.15);

    if (weightedScore >= 95) return 'S';
    if (weightedScore >= 85) return 'A';
    if (weightedScore >= 70) return 'B';
    if (weightedScore >= 55) return 'C';
    if (weightedScore >= 40) return 'D';
    return 'F';
  }

  private _createEmptyBreakdown(): ScoreBreakdown {
    return {
      basePoints: 0,
      difficultyMultiplier: 1,
      speedBonus: 1,
      streakMultiplier: 1,
      totalPoints: 0
    };
  }

  private _createEmptySummary(difficulty: Difficulty): GameScoreSummary {
    return {
      totalScore: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      bestStreak: 0,
      averageResponseTime: 0,
      perfectGame: false,
      difficulty,
      bonusPointsEarned: 0,
      basePointsEarned: 0,
      grade: 'F',
      xpEarned: 0
    };
  }

  /**
   * Get scoring configuration (for UI display)
   */
  public getConfig(): ScoringConfig {
    return { ...this._config };
  }
}
