/**
 * CurriculumSystem - Educational content and progression
 *
 * Provides grade-based math curriculum with topic progression.
 * Tracks player progress and adapts content accordingly.
 */

import type {
  CurriculumQuestion,
  MathTopic,
  DifficultyLevel,
  PlayerProgress,
  TopicProgress
} from '../types';

export class CurriculumSystem {
  private static _instance: CurriculumSystem;

  // Question bank organized by topic
  private _questionBank: Map<MathTopic, CurriculumQuestion[]> = new Map();

  // Player progress tracking
  private _playerProgress: Map<string, PlayerProgress> = new Map();

  private constructor() {
    this._initializeQuestionBank();
  }

  public static getInstance(): CurriculumSystem {
    if (!CurriculumSystem._instance) {
      CurriculumSystem._instance = new CurriculumSystem();
    }
    return CurriculumSystem._instance;
  }

  /**
   * Get player progress
   */
  public getPlayerProgress(playerId: string): PlayerProgress | undefined {
    return this._playerProgress.get(playerId);
  }

  /**
   * Initialize player progress (call when player joins)
   */
  public initializePlayerProgress(playerId: string): void {
    if (this._playerProgress.has(playerId)) return;

    const progress: PlayerProgress = {
      playerId,
      currentGrade: 1,
      currentTopic: 'arithmetic' as MathTopic,
      topicProgress: new Map(),
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      overallAccuracy: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageResponseTime: 0,
      lastPlayedDate: new Date()
    };

    // Initialize topic progress for each topic
    const topics: MathTopic[] = [
      'arithmetic' as MathTopic,
      'fractions' as MathTopic,
      'decimals' as MathTopic,
      'word_problems' as MathTopic,
      'geometry' as MathTopic,
      'algebra' as MathTopic
    ];

    topics.forEach((topic, index) => {
      progress.topicProgress.set(topic, {
        topic,
        questionsAnswered: 0,
        correctAnswers: 0,
        accuracy: 0,
        averageTime: 0,
        currentStreak: 0,
        bestStreak: 0,
        isUnlocked: index === 0, // Only first topic unlocked initially
        isCompleted: false,
        difficultyLevel: 'beginner' as DifficultyLevel
      });
    });

    this._playerProgress.set(playerId, progress);
    console.log(`[CurriculumSystem] Initialized progress for player ${playerId}`);
  }

  /**
   * Get questions for a player based on their progress
   * FIX: Always returns questions, even for new players (fallback to basic arithmetic)
   */
  public getQuestionsForPlayer(playerId: string, count: number = 5): CurriculumQuestion[] {
    let progress = this._playerProgress.get(playerId);

    // Initialize progress if not exists (FIX for empty returns)
    if (!progress) {
      this.initializePlayerProgress(playerId);
      progress = this._playerProgress.get(playerId)!;
    }

    const currentTopic = progress.currentTopic;
    const topicQuestions = this._questionBank.get(currentTopic) || [];

    // If no questions for current topic, fall back to basic arithmetic
    if (topicQuestions.length === 0) {
      const fallbackQuestions = this._questionBank.get('arithmetic' as MathTopic) || [];
      return this._selectQuestions(fallbackQuestions, count, progress);
    }

    return this._selectQuestions(topicQuestions, count, progress);
  }

  /**
   * Select appropriate questions based on player level
   */
  private _selectQuestions(
    questions: CurriculumQuestion[],
    count: number,
    progress: PlayerProgress
  ): CurriculumQuestion[] {
    // Filter by grade and difficulty
    const eligible = questions.filter(q =>
      q.grade <= progress.currentGrade + 1 &&
      q.grade >= Math.max(1, progress.currentGrade - 1)
    );

    // Shuffle and take requested count
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Record an answer and update progress
   */
  public recordAnswer(
    playerId: string,
    questionId: string,
    correct: boolean,
    responseTimeMs: number
  ): void {
    const progress = this._playerProgress.get(playerId);
    if (!progress) return;

    progress.totalQuestionsAnswered++;
    if (correct) {
      progress.totalCorrectAnswers++;
      progress.currentStreak++;
      progress.longestStreak = Math.max(progress.longestStreak, progress.currentStreak);
    } else {
      progress.currentStreak = 0;
    }

    progress.overallAccuracy = progress.totalCorrectAnswers / progress.totalQuestionsAnswered;
    progress.lastPlayedDate = new Date();

    // Update topic progress
    const topicProgress = progress.topicProgress.get(progress.currentTopic);
    if (topicProgress) {
      topicProgress.questionsAnswered++;
      if (correct) {
        topicProgress.correctAnswers++;
        topicProgress.currentStreak++;
        topicProgress.bestStreak = Math.max(topicProgress.bestStreak, topicProgress.currentStreak);
      } else {
        topicProgress.currentStreak = 0;
      }
      topicProgress.accuracy = topicProgress.correctAnswers / topicProgress.questionsAnswered;

      // Check for topic completion (80% accuracy over 20+ questions)
      if (topicProgress.questionsAnswered >= 20 && topicProgress.accuracy >= 0.8) {
        topicProgress.isCompleted = true;
        this._unlockNextTopic(progress);
      }
    }

    console.log(`[CurriculumSystem] Player ${playerId}: ${correct ? 'correct' : 'wrong'}, streak: ${progress.currentStreak}`);
  }

  /**
   * Unlock the next topic when current is mastered
   */
  private _unlockNextTopic(progress: PlayerProgress): void {
    const topics: MathTopic[] = [
      'arithmetic' as MathTopic,
      'fractions' as MathTopic,
      'decimals' as MathTopic,
      'word_problems' as MathTopic,
      'geometry' as MathTopic,
      'algebra' as MathTopic
    ];

    const currentIndex = topics.indexOf(progress.currentTopic);
    if (currentIndex < topics.length - 1) {
      const nextTopic = topics[currentIndex + 1];
      const nextProgress = progress.topicProgress.get(nextTopic);
      if (nextProgress) {
        nextProgress.isUnlocked = true;
        progress.currentTopic = nextTopic;
        console.log(`[CurriculumSystem] Unlocked topic: ${nextTopic}`);
      }
    }
  }

  /**
   * Initialize question bank with curriculum content
   */
  private _initializeQuestionBank(): void {
    // Basic Arithmetic (Grade 1-2)
    const arithmeticQuestions: CurriculumQuestion[] = [
      // Addition
      { id: 'arith_add_1', topic: 'arithmetic' as MathTopic, difficulty: 'beginner' as DifficultyLevel, question: '2 + 3 = ?', correctAnswer: 5, wrongAnswers: [4, 6, 7], grade: 1 },
      { id: 'arith_add_2', topic: 'arithmetic' as MathTopic, difficulty: 'beginner' as DifficultyLevel, question: '4 + 5 = ?', correctAnswer: 9, wrongAnswers: [8, 10, 7], grade: 1 },
      { id: 'arith_add_3', topic: 'arithmetic' as MathTopic, difficulty: 'beginner' as DifficultyLevel, question: '7 + 2 = ?', correctAnswer: 9, wrongAnswers: [8, 10, 11], grade: 1 },
      { id: 'arith_add_4', topic: 'arithmetic' as MathTopic, difficulty: 'intermediate' as DifficultyLevel, question: '8 + 7 = ?', correctAnswer: 15, wrongAnswers: [14, 16, 13], grade: 2 },
      { id: 'arith_add_5', topic: 'arithmetic' as MathTopic, difficulty: 'intermediate' as DifficultyLevel, question: '9 + 6 = ?', correctAnswer: 15, wrongAnswers: [14, 16, 17], grade: 2 },

      // Subtraction
      { id: 'arith_sub_1', topic: 'arithmetic' as MathTopic, difficulty: 'beginner' as DifficultyLevel, question: '5 - 2 = ?', correctAnswer: 3, wrongAnswers: [2, 4, 5], grade: 1 },
      { id: 'arith_sub_2', topic: 'arithmetic' as MathTopic, difficulty: 'beginner' as DifficultyLevel, question: '8 - 3 = ?', correctAnswer: 5, wrongAnswers: [4, 6, 7], grade: 1 },
      { id: 'arith_sub_3', topic: 'arithmetic' as MathTopic, difficulty: 'intermediate' as DifficultyLevel, question: '12 - 5 = ?', correctAnswer: 7, wrongAnswers: [6, 8, 5], grade: 2 },
      { id: 'arith_sub_4', topic: 'arithmetic' as MathTopic, difficulty: 'intermediate' as DifficultyLevel, question: '15 - 8 = ?', correctAnswer: 7, wrongAnswers: [6, 8, 9], grade: 2 },

      // Multiplication
      { id: 'arith_mul_1', topic: 'arithmetic' as MathTopic, difficulty: 'intermediate' as DifficultyLevel, question: '3 * 4 = ?', correctAnswer: 12, wrongAnswers: [10, 14, 8], grade: 2 },
      { id: 'arith_mul_2', topic: 'arithmetic' as MathTopic, difficulty: 'intermediate' as DifficultyLevel, question: '5 * 3 = ?', correctAnswer: 15, wrongAnswers: [12, 18, 10], grade: 2 },
      { id: 'arith_mul_3', topic: 'arithmetic' as MathTopic, difficulty: 'advanced' as DifficultyLevel, question: '6 * 7 = ?', correctAnswer: 42, wrongAnswers: [36, 48, 35], grade: 3 },
      { id: 'arith_mul_4', topic: 'arithmetic' as MathTopic, difficulty: 'advanced' as DifficultyLevel, question: '8 * 9 = ?', correctAnswer: 72, wrongAnswers: [63, 81, 64], grade: 3 },

      // Division
      { id: 'arith_div_1', topic: 'arithmetic' as MathTopic, difficulty: 'intermediate' as DifficultyLevel, question: '10 / 2 = ?', correctAnswer: 5, wrongAnswers: [4, 6, 8], grade: 2 },
      { id: 'arith_div_2', topic: 'arithmetic' as MathTopic, difficulty: 'intermediate' as DifficultyLevel, question: '12 / 3 = ?', correctAnswer: 4, wrongAnswers: [3, 5, 6], grade: 2 },
      { id: 'arith_div_3', topic: 'arithmetic' as MathTopic, difficulty: 'advanced' as DifficultyLevel, question: '24 / 6 = ?', correctAnswer: 4, wrongAnswers: [3, 5, 6], grade: 3 },
      { id: 'arith_div_4', topic: 'arithmetic' as MathTopic, difficulty: 'advanced' as DifficultyLevel, question: '45 / 9 = ?', correctAnswer: 5, wrongAnswers: [4, 6, 7], grade: 3 },
    ];
    this._questionBank.set('arithmetic' as MathTopic, arithmeticQuestions);

    // Fractions (Grade 3-4)
    const fractionQuestions: CurriculumQuestion[] = [
      { id: 'frac_1', topic: 'fractions' as MathTopic, difficulty: 'intermediate' as DifficultyLevel, question: '1/2 + 1/2 = ?', correctAnswer: 1, wrongAnswers: [2, 0, 4], explanation: 'Two halves make a whole', grade: 3 },
      { id: 'frac_2', topic: 'fractions' as MathTopic, difficulty: 'intermediate' as DifficultyLevel, question: '1/4 + 1/4 = ?', correctAnswer: 2, wrongAnswers: [1, 4, 8], explanation: 'Expressed as 2/4 or 1/2', grade: 3 },
      { id: 'frac_3', topic: 'fractions' as MathTopic, difficulty: 'advanced' as DifficultyLevel, question: '3/4 - 1/4 = ?', correctAnswer: 2, wrongAnswers: [1, 3, 4], explanation: 'Expressed as 2/4 or 1/2', grade: 4 },
    ];
    this._questionBank.set('fractions' as MathTopic, fractionQuestions);

    // Decimals (Grade 4-5)
    const decimalQuestions: CurriculumQuestion[] = [
      { id: 'dec_1', topic: 'decimals' as MathTopic, difficulty: 'advanced' as DifficultyLevel, question: '0.5 + 0.5 = ?', correctAnswer: 1, wrongAnswers: [0, 5, 10], grade: 4 },
      { id: 'dec_2', topic: 'decimals' as MathTopic, difficulty: 'advanced' as DifficultyLevel, question: '1.5 + 0.5 = ?', correctAnswer: 2, wrongAnswers: [1, 6, 15], grade: 4 },
    ];
    this._questionBank.set('decimals' as MathTopic, decimalQuestions);

    // Word Problems (Grade 2-4)
    const wordProblems: CurriculumQuestion[] = [
      { id: 'word_1', topic: 'word_problems' as MathTopic, difficulty: 'intermediate' as DifficultyLevel, question: 'If you have 3 apples and get 2 more, how many do you have?', correctAnswer: 5, wrongAnswers: [4, 6, 3], grade: 2 },
      { id: 'word_2', topic: 'word_problems' as MathTopic, difficulty: 'intermediate' as DifficultyLevel, question: 'You have 10 cookies and eat 4. How many are left?', correctAnswer: 6, wrongAnswers: [4, 5, 7], grade: 2 },
    ];
    this._questionBank.set('word_problems' as MathTopic, wordProblems);

    // Geometry (Grade 3-5)
    const geometryQuestions: CurriculumQuestion[] = [
      { id: 'geo_1', topic: 'geometry' as MathTopic, difficulty: 'intermediate' as DifficultyLevel, question: 'How many sides does a triangle have?', correctAnswer: 3, wrongAnswers: [2, 4, 5], grade: 3 },
      { id: 'geo_2', topic: 'geometry' as MathTopic, difficulty: 'intermediate' as DifficultyLevel, question: 'How many sides does a square have?', correctAnswer: 4, wrongAnswers: [3, 5, 6], grade: 3 },
      { id: 'geo_3', topic: 'geometry' as MathTopic, difficulty: 'advanced' as DifficultyLevel, question: 'Area of rectangle 3x4 = ?', correctAnswer: 12, wrongAnswers: [7, 14, 10], grade: 4 },
    ];
    this._questionBank.set('geometry' as MathTopic, geometryQuestions);

    // Algebra (Grade 5-8)
    const algebraQuestions: CurriculumQuestion[] = [
      { id: 'alg_1', topic: 'algebra' as MathTopic, difficulty: 'advanced' as DifficultyLevel, question: 'If x + 3 = 7, what is x?', correctAnswer: 4, wrongAnswers: [3, 5, 10], grade: 5 },
      { id: 'alg_2', topic: 'algebra' as MathTopic, difficulty: 'advanced' as DifficultyLevel, question: 'If 2x = 10, what is x?', correctAnswer: 5, wrongAnswers: [4, 8, 20], grade: 5 },
      { id: 'alg_3', topic: 'algebra' as MathTopic, difficulty: 'expert' as DifficultyLevel, question: 'If x - 5 = 12, what is x?', correctAnswer: 17, wrongAnswers: [7, 15, 60], grade: 6 },
    ];
    this._questionBank.set('algebra' as MathTopic, algebraQuestions);

    console.log('[CurriculumSystem] Question bank initialized with', this._getTotalQuestions(), 'questions');
  }

  private _getTotalQuestions(): number {
    let total = 0;
    this._questionBank.forEach(questions => total += questions.length);
    return total;
  }
}
