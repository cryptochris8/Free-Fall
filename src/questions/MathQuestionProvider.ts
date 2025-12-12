/**
 * MathQuestionProvider - Math questions for the falling game
 *
 * Categories:
 * - Addition/Subtraction
 * - Multiplication/Division
 * - Mixed Operations
 * - Fractions
 * - Percentages
 */

import {
  BaseQuestionProvider,
  Question,
  QuestionCategory,
  QuestionDifficulty,
  QuestionProviderConfig,
  SubjectType
} from './QuestionProvider';

type MathOperation = '+' | '-' | '*' | '/' | '%';

interface MathDifficultySettings {
  operations: MathOperation[];
  maxValue: number;
  allowNegatives: boolean;
  allowDecimals: boolean;
  wrongAnswerRange: number;
}

const DIFFICULTY_SETTINGS: Record<QuestionDifficulty, MathDifficultySettings> = {
  beginner: {
    operations: ['+', '-'],
    maxValue: 10,
    allowNegatives: false,
    allowDecimals: false,
    wrongAnswerRange: 3
  },
  intermediate: {
    operations: ['+', '-', '*'],
    maxValue: 20,
    allowNegatives: false,
    allowDecimals: false,
    wrongAnswerRange: 5
  },
  advanced: {
    operations: ['+', '-', '*', '/'],
    maxValue: 50,
    allowNegatives: false,
    allowDecimals: false,
    wrongAnswerRange: 10
  },
  expert: {
    operations: ['+', '-', '*', '/', '%'],
    maxValue: 100,
    allowNegatives: true,
    allowDecimals: true,
    wrongAnswerRange: 15
  }
};

const MATH_CATEGORIES: QuestionCategory[] = [
  {
    id: 'addition',
    name: 'Addition',
    description: 'Practice adding numbers',
    subject: 'math',
    gradeLevel: 1,
    icon: '➕'
  },
  {
    id: 'subtraction',
    name: 'Subtraction',
    description: 'Practice subtracting numbers',
    subject: 'math',
    gradeLevel: 1,
    icon: '➖'
  },
  {
    id: 'multiplication',
    name: 'Multiplication',
    description: 'Practice multiplying numbers',
    subject: 'math',
    gradeLevel: 3,
    icon: '✖️'
  },
  {
    id: 'division',
    name: 'Division',
    description: 'Practice dividing numbers',
    subject: 'math',
    gradeLevel: 3,
    icon: '➗'
  },
  {
    id: 'mixed',
    name: 'Mixed Operations',
    description: 'All math operations combined',
    subject: 'math',
    gradeLevel: 4,
    icon: '🔢'
  },
  {
    id: 'percentages',
    name: 'Percentages',
    description: 'Calculate percentages',
    subject: 'math',
    gradeLevel: 6,
    icon: '%'
  }
];

export class MathQuestionProvider extends BaseQuestionProvider {
  readonly subject: SubjectType = 'math';
  readonly config: QuestionProviderConfig = {
    subject: 'math',
    categories: MATH_CATEGORIES,
    supportedDifficulties: ['beginner', 'intermediate', 'advanced', 'expert'],
    defaultDifficulty: 'intermediate'
  };

  generateQuestion(difficulty: QuestionDifficulty, category?: string): Question {
    const settings = DIFFICULTY_SETTINGS[difficulty];

    // Determine operation based on category or random
    let operation: MathOperation;
    if (category) {
      operation = this._getOperationForCategory(category, settings);
    } else {
      operation = this.randomPick(settings.operations);
    }

    // Generate the problem
    const { num1, num2, answer } = this._generateNumbers(operation, settings);

    // Generate wrong answers
    const wrongAnswers = this._generateWrongAnswers(answer, settings.wrongAnswerRange);

    // Format question text
    const operationSymbol = this._getOperationSymbol(operation);
    const questionText = `${num1} ${operationSymbol} ${num2} = ?`;

    return {
      id: this.generateId(),
      subject: this.subject,
      category: category || this._getCategoryForOperation(operation),
      difficulty,
      questionText,
      correctAnswer: answer.toString(),
      wrongAnswers: wrongAnswers.map(a => a.toString()),
      explanation: `${num1} ${operationSymbol} ${num2} = ${answer}`,
      tags: ['arithmetic', operation]
    };
  }

  getStats(): {
    totalQuestions: number;
    questionsPerCategory: Record<string, number>;
    questionsPerDifficulty: Record<QuestionDifficulty, number>;
  } {
    // Math questions are procedurally generated, so we return infinite
    return {
      totalQuestions: Infinity,
      questionsPerCategory: {
        addition: Infinity,
        subtraction: Infinity,
        multiplication: Infinity,
        division: Infinity,
        mixed: Infinity,
        percentages: Infinity
      },
      questionsPerDifficulty: {
        beginner: Infinity,
        intermediate: Infinity,
        advanced: Infinity,
        expert: Infinity
      }
    };
  }

  private _getOperationForCategory(category: string, settings: MathDifficultySettings): MathOperation {
    switch (category) {
      case 'addition': return '+';
      case 'subtraction': return '-';
      case 'multiplication': return '*';
      case 'division': return '/';
      case 'percentages': return '%';
      case 'mixed':
      default:
        return this.randomPick(settings.operations);
    }
  }

  private _getCategoryForOperation(operation: MathOperation): string {
    switch (operation) {
      case '+': return 'addition';
      case '-': return 'subtraction';
      case '*': return 'multiplication';
      case '/': return 'division';
      case '%': return 'percentages';
      default: return 'mixed';
    }
  }

  private _getOperationSymbol(operation: MathOperation): string {
    switch (operation) {
      case '+': return '+';
      case '-': return '-';
      case '*': return '×';
      case '/': return '÷';
      case '%': return '% of';
      default: return operation;
    }
  }

  private _generateNumbers(
    operation: MathOperation,
    settings: MathDifficultySettings
  ): { num1: number; num2: number; answer: number } {
    let num1: number, num2: number, answer: number;

    switch (operation) {
      case '+':
        num1 = Math.floor(Math.random() * settings.maxValue) + 1;
        num2 = Math.floor(Math.random() * settings.maxValue) + 1;
        answer = num1 + num2;
        break;

      case '-':
        num1 = Math.floor(Math.random() * settings.maxValue) + 1;
        num2 = Math.floor(Math.random() * num1) + 1; // Ensure positive result
        if (!settings.allowNegatives && num2 > num1) {
          [num1, num2] = [num2, num1];
        }
        answer = num1 - num2;
        break;

      case '*':
        // Keep factors smaller for reasonable products
        const maxFactor = Math.min(settings.maxValue, 12);
        num1 = Math.floor(Math.random() * maxFactor) + 1;
        num2 = Math.floor(Math.random() * maxFactor) + 1;
        answer = num1 * num2;
        break;

      case '/':
        // Generate clean division (no remainders)
        answer = Math.floor(Math.random() * Math.min(settings.maxValue, 12)) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        num1 = answer * num2;
        break;

      case '%':
        // Simple percentages: 10%, 20%, 25%, 50%, etc.
        const percentages = [10, 20, 25, 50, 75, 100];
        num1 = this.randomPick(percentages);
        // Generate a number that gives a clean result
        const multiplier = num1 === 25 ? 4 : num1 === 75 ? 4 : 100 / num1;
        num2 = Math.floor(Math.random() * 10 + 1) * multiplier;
        answer = (num1 / 100) * num2;
        break;

      default:
        num1 = 1;
        num2 = 1;
        answer = 2;
    }

    return { num1, num2, answer };
  }

  private _generateWrongAnswers(correctAnswer: number, range: number): number[] {
    const wrongAnswers: number[] = [];
    const used = new Set<number>([correctAnswer]);

    // Generate 3 wrong answers
    let attempts = 0;
    while (wrongAnswers.length < 3 && attempts < 50) {
      attempts++;

      // Generate wrong answer within range
      const offset = Math.floor(Math.random() * range * 2) - range;
      if (offset === 0) continue;

      let wrong = correctAnswer + offset;

      // Keep positive for beginner-friendly
      if (wrong < 0) wrong = Math.abs(wrong);

      if (!used.has(wrong)) {
        used.add(wrong);
        wrongAnswers.push(wrong);
      }
    }

    // Fill remaining if needed
    let fill = 1;
    while (wrongAnswers.length < 3) {
      const fallback = correctAnswer + fill;
      if (!used.has(fallback)) {
        wrongAnswers.push(fallback);
        used.add(fallback);
      }
      fill++;
    }

    return wrongAnswers;
  }
}
