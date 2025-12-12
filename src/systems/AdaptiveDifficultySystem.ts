/**
 * AdaptiveDifficultySystem - Dynamically adjusts game difficulty
 *
 * Tracks player performance and adjusts difficulty in real-time.
 * FIX: Always returns questions, never empty arrays.
 */

import type { Difficulty, DifficultyLevel, CurriculumQuestion } from '../types';
import { CurriculumSystem } from './CurriculumSystem';

interface PlayerPerformance {
  playerId: string;
  recentAnswers: boolean[]; // Last N answers (true = correct)
  recentTimes: number[]; // Response times in ms
  currentDifficulty: Difficulty;
  difficultyLevel: DifficultyLevel;
  stabilityScore: number;
  lastAdjustment: number;
}

export class AdaptiveDifficultySystem {
  private static _instance: AdaptiveDifficultySystem;

  // Player performance tracking
  private _playerPerformance: Map<string, PlayerPerformance> = new Map();

  // Configuration
  private readonly _windowSize = 10; // Track last 10 answers
  private readonly _targetAccuracy = 0.75; // Target 75% accuracy
  private readonly _adjustmentCooldown = 15000; // 15 seconds between adjustments
  private readonly _fastResponseThreshold = 5000; // 5 seconds considered fast
  private readonly _slowResponseThreshold = 15000; // 15 seconds considered slow

  private constructor() {}

  public static getInstance(): AdaptiveDifficultySystem {
    if (!AdaptiveDifficultySystem._instance) {
      AdaptiveDifficultySystem._instance = new AdaptiveDifficultySystem();
    }
    return AdaptiveDifficultySystem._instance;
  }

  /**
   * Initialize tracking for a player
   */
  public initializePlayer(playerId: string, initialDifficulty: Difficulty = 'moderate'): void {
    if (this._playerPerformance.has(playerId)) return;

    this._playerPerformance.set(playerId, {
      playerId,
      recentAnswers: [],
      recentTimes: [],
      currentDifficulty: initialDifficulty,
      difficultyLevel: this._difficultyToLevel(initialDifficulty),
      stabilityScore: 0,
      lastAdjustment: 0
    });

    console.log(`[AdaptiveDifficultySystem] Initialized player ${playerId} at ${initialDifficulty}`);
  }

  /**
   * Record an answer and check for difficulty adjustment
   */
  public recordAnswer(playerId: string, correct: boolean, responseTimeMs: number): Difficulty {
    let performance = this._playerPerformance.get(playerId);
    if (!performance) {
      this.initializePlayer(playerId);
      performance = this._playerPerformance.get(playerId)!;
    }

    // Add to history
    performance.recentAnswers.push(correct);
    performance.recentTimes.push(responseTimeMs);

    // Keep only window size
    if (performance.recentAnswers.length > this._windowSize) {
      performance.recentAnswers.shift();
      performance.recentTimes.shift();
    }

    // Check if adjustment needed
    const adjustment = this._calculateAdjustment(performance);
    if (adjustment !== 0) {
      this._adjustDifficulty(performance, adjustment);
    }

    return performance.currentDifficulty;
  }

  /**
   * Get current difficulty for a player
   */
  public getCurrentDifficulty(playerId: string): Difficulty {
    const performance = this._playerPerformance.get(playerId);
    return performance?.currentDifficulty || 'moderate';
  }

  /**
   * Get adaptive questions for a player
   * FIX: Always returns questions, never empty array
   */
  public getAdaptiveQuestions(playerId: string, count: number = 1): CurriculumQuestion[] {
    // Get curriculum system
    const curriculumSystem = CurriculumSystem.getInstance();

    // Get questions from curriculum (already fixed to never return empty)
    const questions = curriculumSystem.getQuestionsForPlayer(playerId, count * 2);

    if (questions.length === 0) {
      // If still no questions (shouldn't happen), generate fallback
      console.warn('[AdaptiveDifficultySystem] No curriculum questions, using fallback');
      return this._generateFallbackQuestions(count);
    }

    // Filter by optimal difficulty
    const performance = this._playerPerformance.get(playerId);
    const targetLevel = performance?.difficultyLevel || 'intermediate' as DifficultyLevel;

    const optimal = questions.filter(q => this._isDifficultyClose(q.difficulty, targetLevel));

    // Return optimal if enough, otherwise return what we have
    if (optimal.length >= count) {
      return optimal.slice(0, count);
    }

    // Return available questions (never empty)
    return questions.slice(0, count);
  }

  /**
   * Check if question difficulty is close to target
   */
  private _isDifficultyClose(questionDifficulty: DifficultyLevel, targetLevel: DifficultyLevel): boolean {
    const levels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
    const questionIndex = levels.indexOf(questionDifficulty);
    const targetIndex = levels.indexOf(targetLevel);

    // Within 1 level is considered close
    return Math.abs(questionIndex - targetIndex) <= 1;
  }

  /**
   * Generate fallback questions if curriculum fails
   */
  private _generateFallbackQuestions(count: number): CurriculumQuestion[] {
    const questions: CurriculumQuestion[] = [];

    for (let i = 0; i < count; i++) {
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      const correctAnswer = num1 + num2;

      questions.push({
        id: `fallback_${Date.now()}_${i}`,
        topic: 'arithmetic' as any,
        difficulty: 'intermediate' as DifficultyLevel,
        question: `${num1} + ${num2} = ?`,
        correctAnswer,
        wrongAnswers: [correctAnswer - 1, correctAnswer + 1, correctAnswer + 2],
        grade: 1
      });
    }

    return questions;
  }

  /**
   * Calculate if difficulty should be adjusted
   */
  private _calculateAdjustment(performance: PlayerPerformance): number {
    // Need minimum data
    if (performance.recentAnswers.length < 3) return 0;

    // Check cooldown
    const now = Date.now();
    if (now - performance.lastAdjustment < this._adjustmentCooldown) return 0;

    // Calculate recent accuracy
    const correctCount = performance.recentAnswers.filter(a => a).length;
    const accuracy = correctCount / performance.recentAnswers.length;

    // Calculate average response time
    const avgTime = performance.recentTimes.reduce((a, b) => a + b, 0) / performance.recentTimes.length;

    // Check for adjustment triggers

    // Too easy: High accuracy + fast responses
    if (accuracy > 0.9 && avgTime < this._fastResponseThreshold) {
      return 1; // Increase difficulty
    }

    // Too hard: Low accuracy or slow responses
    if (accuracy < 0.5 || avgTime > this._slowResponseThreshold) {
      return -1; // Decrease difficulty
    }

    // Check for 3 consecutive correct with fast time → increase
    const lastThree = performance.recentAnswers.slice(-3);
    const lastThreeTimes = performance.recentTimes.slice(-3);
    if (lastThree.length === 3 &&
        lastThree.every(a => a) &&
        lastThreeTimes.every(t => t < this._fastResponseThreshold)) {
      return 1;
    }

    // Check for 3 consecutive wrong → decrease
    if (lastThree.length === 3 && lastThree.every(a => !a)) {
      return -1;
    }

    return 0;
  }

  /**
   * Adjust difficulty up or down
   */
  private _adjustDifficulty(performance: PlayerPerformance, direction: number): void {
    const difficulties: Difficulty[] = ['beginner', 'moderate', 'hard'];
    const currentIndex = difficulties.indexOf(performance.currentDifficulty);

    const newIndex = Math.max(0, Math.min(difficulties.length - 1, currentIndex + direction));

    if (newIndex !== currentIndex) {
      const oldDifficulty = performance.currentDifficulty;
      performance.currentDifficulty = difficulties[newIndex];
      performance.difficultyLevel = this._difficultyToLevel(performance.currentDifficulty);
      performance.lastAdjustment = Date.now();

      console.log(`[AdaptiveDifficultySystem] Player ${performance.playerId}: ${oldDifficulty} → ${performance.currentDifficulty}`);
    }
  }

  /**
   * Convert game difficulty to curriculum difficulty level
   */
  private _difficultyToLevel(difficulty: Difficulty): DifficultyLevel {
    switch (difficulty) {
      case 'beginner': return 'beginner' as DifficultyLevel;
      case 'moderate': return 'intermediate' as DifficultyLevel;
      case 'hard': return 'advanced' as DifficultyLevel;
      default: return 'intermediate' as DifficultyLevel;
    }
  }

  /**
   * Get performance stats for a player
   */
  public getPerformanceStats(playerId: string): {
    accuracy: number;
    averageTime: number;
    currentDifficulty: Difficulty;
  } | null {
    const performance = this._playerPerformance.get(playerId);
    if (!performance || performance.recentAnswers.length === 0) {
      return null;
    }

    const correctCount = performance.recentAnswers.filter(a => a).length;
    const accuracy = correctCount / performance.recentAnswers.length;
    const avgTime = performance.recentTimes.reduce((a, b) => a + b, 0) / performance.recentTimes.length;

    return {
      accuracy,
      averageTime: avgTime,
      currentDifficulty: performance.currentDifficulty
    };
  }
}
