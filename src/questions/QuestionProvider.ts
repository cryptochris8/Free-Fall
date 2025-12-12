/**
 * QuestionProvider - Base interface and types for modular question systems
 *
 * This architecture allows different educational subjects to plug into
 * the same falling game mechanic. Each subject implements QuestionProvider
 * and can generate questions appropriate for its domain.
 */

export type SubjectType =
  | 'math'
  | 'spelling'
  | 'vocabulary'
  | 'geography'
  | 'science'
  | 'history'
  | 'language'
  | 'typing';

export type QuestionDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface QuestionCategory {
  id: string;
  name: string;
  description: string;
  subject: SubjectType;
  gradeLevel?: number; // K=0, 1-12
  icon?: string;
}

export interface Question {
  id: string;
  subject: SubjectType;
  category: string;
  difficulty: QuestionDifficulty;

  // The question display
  questionText: string;           // Main question text
  questionSubtext?: string;       // Optional hint or context

  // Answer options
  correctAnswer: string;          // The correct answer (as string for flexibility)
  wrongAnswers: string[];         // 3 wrong answers

  // Optional metadata
  explanation?: string;           // Explanation shown after answering
  imageUri?: string;              // Optional image for the question
  audioUri?: string;              // Optional audio (for pronunciation, etc.)
  tags?: string[];                // For filtering/analytics
  gradeLevel?: number;
}

export interface QuestionProviderConfig {
  subject: SubjectType;
  categories: QuestionCategory[];
  supportedDifficulties: QuestionDifficulty[];
  defaultDifficulty: QuestionDifficulty;
}

/**
 * Base interface that all subject question providers must implement
 */
export interface IQuestionProvider {
  readonly subject: SubjectType;
  readonly config: QuestionProviderConfig;

  /**
   * Generate a question for the given difficulty
   */
  generateQuestion(difficulty: QuestionDifficulty, category?: string): Question;

  /**
   * Get available categories for this subject
   */
  getCategories(): QuestionCategory[];

  /**
   * Validate if an answer is correct
   * (Some subjects may need fuzzy matching, e.g., spelling)
   */
  validateAnswer(question: Question, answer: string): boolean;

  /**
   * Get a hint for the question (optional)
   */
  getHint?(question: Question): string;

  /**
   * Get statistics about the question bank
   */
  getStats(): {
    totalQuestions: number;
    questionsPerCategory: Record<string, number>;
    questionsPerDifficulty: Record<QuestionDifficulty, number>;
  };
}

/**
 * Abstract base class providing common functionality
 */
export abstract class BaseQuestionProvider implements IQuestionProvider {
  abstract readonly subject: SubjectType;
  abstract readonly config: QuestionProviderConfig;

  abstract generateQuestion(difficulty: QuestionDifficulty, category?: string): Question;

  getCategories(): QuestionCategory[] {
    return this.config.categories;
  }

  validateAnswer(question: Question, answer: string): boolean {
    // Default: case-insensitive exact match
    return answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
  }

  abstract getStats(): {
    totalQuestions: number;
    questionsPerCategory: Record<string, number>;
    questionsPerDifficulty: Record<QuestionDifficulty, number>;
  };

  /**
   * Utility: Generate a unique question ID
   */
  protected generateId(): string {
    return `${this.subject}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility: Shuffle an array
   */
  protected shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Utility: Pick random item from array
   */
  protected randomPick<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Utility: Pick N random items from array
   */
  protected randomPickN<T>(array: T[], n: number): T[] {
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, n);
  }
}

/**
 * Question Provider Registry - manages all available subject providers
 */
export class QuestionProviderRegistry {
  private static _instance: QuestionProviderRegistry;
  private _providers: Map<SubjectType, IQuestionProvider> = new Map();

  private constructor() {}

  public static getInstance(): QuestionProviderRegistry {
    if (!QuestionProviderRegistry._instance) {
      QuestionProviderRegistry._instance = new QuestionProviderRegistry();
    }
    return QuestionProviderRegistry._instance;
  }

  /**
   * Register a question provider
   */
  public register(provider: IQuestionProvider): void {
    this._providers.set(provider.subject, provider);
    console.log(`[QuestionRegistry] Registered provider: ${provider.subject}`);
  }

  /**
   * Get a specific provider
   */
  public getProvider(subject: SubjectType): IQuestionProvider | undefined {
    return this._providers.get(subject);
  }

  /**
   * Get all registered providers
   */
  public getAllProviders(): IQuestionProvider[] {
    return Array.from(this._providers.values());
  }

  /**
   * Get all available subjects
   */
  public getAvailableSubjects(): SubjectType[] {
    return Array.from(this._providers.keys());
  }

  /**
   * Generate a question from any registered provider
   */
  public generateQuestion(
    subject: SubjectType,
    difficulty: QuestionDifficulty,
    category?: string
  ): Question | null {
    const provider = this._providers.get(subject);
    if (!provider) {
      console.warn(`[QuestionRegistry] No provider for subject: ${subject}`);
      return null;
    }
    return provider.generateQuestion(difficulty, category);
  }

  /**
   * Validate an answer using the appropriate provider
   */
  public validateAnswer(question: Question, answer: string): boolean {
    const provider = this._providers.get(question.subject);
    if (!provider) return false;
    return provider.validateAnswer(question, answer);
  }
}
