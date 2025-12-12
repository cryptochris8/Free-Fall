/**
 * MathProblemManager - Generates math problems for the game
 *
 * Handles:
 * - Problem generation based on difficulty
 * - Answer validation
 * - Integration with CurriculumSystem (when available)
 */

import type {
  MathProblem,
  MathOperation,
  Difficulty,
  CurriculumQuestion
} from '../types';

export class MathProblemManager {
  private static _instance: MathProblemManager;

  // Difficulty settings
  private readonly _difficultySettings: Record<Difficulty, {
    operations: MathOperation[];
    maxValue: number;
    wrongAnswerRange: number;
    maxAnswer: number;
  }> = {
    beginner: {
      operations: ['+', '-'],
      maxValue: 5,
      wrongAnswerRange: 2,
      maxAnswer: 10
    },
    moderate: {
      operations: ['+', '-', '*'],
      maxValue: 5,
      wrongAnswerRange: 5,
      maxAnswer: 15
    },
    hard: {
      operations: ['+', '-', '*', '/'],
      maxValue: 12,
      wrongAnswerRange: 10,
      maxAnswer: 15
    }
  };

  // External question provider (from CurriculumSystem)
  private _externalQuestionProvider?: () => CurriculumQuestion | null;

  private constructor() {}

  public static getInstance(): MathProblemManager {
    if (!MathProblemManager._instance) {
      MathProblemManager._instance = new MathProblemManager();
    }
    return MathProblemManager._instance;
  }

  /**
   * Set an external question provider (e.g., from CurriculumSystem)
   */
  public setExternalQuestionProvider(provider: () => CurriculumQuestion | null): void {
    this._externalQuestionProvider = provider;
  }

  /**
   * Generate a math problem for the given difficulty
   */
  public generateProblem(difficulty: Difficulty): MathProblem {
    // Try external provider first (curriculum system)
    if (this._externalQuestionProvider) {
      const externalQuestion = this._externalQuestionProvider();
      if (externalQuestion) {
        return this._convertCurriculumQuestion(externalQuestion);
      }
    }

    // Fall back to procedural generation
    return this._generateProceduralProblem(difficulty);
  }

  /**
   * Convert a curriculum question to a MathProblem
   */
  private _convertCurriculumQuestion(question: CurriculumQuestion): MathProblem {
    // Parse the question string to extract components
    // Expected format: "X op Y = ?" or similar
    const parts = question.question.split(' ');
    let num1 = 0;
    let num2 = 0;
    let operation: MathOperation = '+';

    if (parts.length >= 3) {
      num1 = parseInt(parts[0]) || 0;
      operation = (parts[1] as MathOperation) || '+';
      num2 = parseInt(parts[2]) || 0;
    }

    return {
      id: question.id,
      num1,
      num2,
      operation,
      correctAnswer: question.correctAnswer,
      wrongAnswers: question.wrongAnswers,
      topic: question.topic,
      difficulty: question.difficulty,
      grade: question.grade
    };
  }

  /**
   * Generate a problem procedurally based on difficulty
   */
  private _generateProceduralProblem(difficulty: Difficulty): MathProblem {
    const settings = this._difficultySettings[difficulty];
    const operation = settings.operations[Math.floor(Math.random() * settings.operations.length)];

    let num1: number;
    let num2: number;
    let correctAnswer: number;

    // Generate numbers based on operation
    switch (operation) {
      case '+':
        ({ num1, num2, correctAnswer } = this._generateAddition(settings.maxValue, settings.maxAnswer));
        break;
      case '-':
        ({ num1, num2, correctAnswer } = this._generateSubtraction(settings.maxValue));
        break;
      case '*':
        ({ num1, num2, correctAnswer } = this._generateMultiplication(settings.maxValue, settings.maxAnswer));
        break;
      case '/':
        ({ num1, num2, correctAnswer } = this._generateDivision(settings.maxValue, settings.maxAnswer));
        break;
      default:
        num1 = 1;
        num2 = 1;
        correctAnswer = 2;
    }

    // Generate wrong answers
    const wrongAnswers = this._generateWrongAnswers(
      correctAnswer,
      settings.wrongAnswerRange,
      settings.maxAnswer
    );

    return {
      id: `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      num1,
      num2,
      operation,
      correctAnswer,
      wrongAnswers
    };
  }

  /**
   * Generate addition problem
   */
  private _generateAddition(maxValue: number, maxAnswer: number): { num1: number; num2: number; correctAnswer: number } {
    // Ensure answer doesn't exceed maxAnswer
    let num1: number, num2: number, correctAnswer: number;
    do {
      num1 = Math.floor(Math.random() * maxValue) + 1;
      num2 = Math.floor(Math.random() * maxValue) + 1;
      correctAnswer = num1 + num2;
    } while (correctAnswer > maxAnswer);

    return { num1, num2, correctAnswer };
  }

  /**
   * Generate subtraction problem (ensures positive result)
   */
  private _generateSubtraction(maxValue: number): { num1: number; num2: number; correctAnswer: number } {
    let num1 = Math.floor(Math.random() * maxValue) + 1;
    let num2 = Math.floor(Math.random() * maxValue) + 1;

    // Ensure num1 >= num2 for positive result
    if (num2 > num1) {
      [num1, num2] = [num2, num1];
    }

    return { num1, num2, correctAnswer: num1 - num2 };
  }

  /**
   * Generate multiplication problem
   */
  private _generateMultiplication(maxValue: number, maxAnswer: number): { num1: number; num2: number; correctAnswer: number } {
    // Limit factors to keep answer reasonable
    const maxFactor = Math.min(maxValue, Math.floor(Math.sqrt(maxAnswer)));
    let num1: number, num2: number, correctAnswer: number;

    do {
      num1 = Math.floor(Math.random() * maxFactor) + 1;
      num2 = Math.floor(Math.random() * maxFactor) + 1;
      correctAnswer = num1 * num2;
    } while (correctAnswer > maxAnswer);

    return { num1, num2, correctAnswer };
  }

  /**
   * Generate division problem (ensures clean integer result)
   */
  private _generateDivision(maxValue: number, maxAnswer: number): { num1: number; num2: number; correctAnswer: number } {
    // Generate answer first, then divisor, then calculate dividend
    const correctAnswer = Math.floor(Math.random() * Math.min(maxValue, maxAnswer)) + 1;
    const num2 = Math.floor(Math.random() * Math.min(5, maxValue)) + 1; // Divisor
    const num1 = correctAnswer * num2; // Dividend

    return { num1, num2, correctAnswer };
  }

  /**
   * Generate wrong answers that are plausible but incorrect
   */
  private _generateWrongAnswers(correctAnswer: number, range: number, maxValue: number): number[] {
    const wrongAnswers: number[] = [];
    const usedAnswers = new Set<number>([correctAnswer]);

    const maxAttempts = 100;
    let attempts = 0;

    while (wrongAnswers.length < 3 && attempts < maxAttempts) {
      attempts++;

      // Generate wrong answer within range of correct answer
      const offset = Math.floor(Math.random() * range * 2) - range + 1;
      let wrongAnswer = correctAnswer + offset;

      // Ensure within valid range
      wrongAnswer = Math.max(0, Math.min(wrongAnswer, maxValue));

      // Check if unique
      if (!usedAnswers.has(wrongAnswer)) {
        usedAnswers.add(wrongAnswer);
        wrongAnswers.push(wrongAnswer);
      }
    }

    // Fill remaining slots if needed
    while (wrongAnswers.length < 3) {
      const fallback = Math.floor(Math.random() * (maxValue + 1));
      if (!usedAnswers.has(fallback)) {
        usedAnswers.add(fallback);
        wrongAnswers.push(fallback);
      }
    }

    return wrongAnswers;
  }

  /**
   * Get the display text for an operation
   */
  public getOperationDisplay(operation: MathOperation): string {
    switch (operation) {
      case '+': return '+';
      case '-': return '-';
      case '*': return '×';
      case '/': return '÷';
      default: return operation;
    }
  }

  /**
   * Format a problem as a display string
   */
  public formatProblem(problem: MathProblem): string {
    return `${problem.num1} ${this.getOperationDisplay(problem.operation)} ${problem.num2} = ?`;
  }
}
