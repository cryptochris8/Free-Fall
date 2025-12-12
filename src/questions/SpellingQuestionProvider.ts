/**
 * SpellingQuestionProvider - Spelling and vocabulary questions
 *
 * Question Types:
 * - Missing letter(s) in a word
 * - Choose the correct spelling
 * - Vocabulary definitions
 * - Synonyms/Antonyms
 * - Word completion
 */

import {
  BaseQuestionProvider,
  Question,
  QuestionCategory,
  QuestionDifficulty,
  QuestionProviderConfig,
  SubjectType
} from './QuestionProvider';

interface WordEntry {
  word: string;
  definition: string;
  synonyms?: string[];
  antonyms?: string[];
  partOfSpeech: string;
  grade: number;
}

const SPELLING_CATEGORIES: QuestionCategory[] = [
  {
    id: 'correct-spelling',
    name: 'Correct Spelling',
    description: 'Choose the correctly spelled word',
    subject: 'spelling',
    gradeLevel: 2,
    icon: '📝'
  },
  {
    id: 'missing-letter',
    name: 'Missing Letter',
    description: 'Fill in the missing letter',
    subject: 'spelling',
    gradeLevel: 1,
    icon: '🔤'
  },
  {
    id: 'definitions',
    name: 'Definitions',
    description: 'Match words to their meanings',
    subject: 'spelling',
    gradeLevel: 3,
    icon: '📖'
  },
  {
    id: 'synonyms',
    name: 'Synonyms',
    description: 'Find words with similar meanings',
    subject: 'spelling',
    gradeLevel: 4,
    icon: '🔄'
  },
  {
    id: 'antonyms',
    name: 'Antonyms',
    description: 'Find words with opposite meanings',
    subject: 'spelling',
    gradeLevel: 4,
    icon: '↔️'
  }
];

// Word bank organized by grade level
const WORD_BANK: Record<QuestionDifficulty, WordEntry[]> = {
  beginner: [
    { word: 'cat', definition: 'A small furry pet that meows', partOfSpeech: 'noun', grade: 1, synonyms: ['kitten', 'feline'] },
    { word: 'dog', definition: 'A loyal pet that barks', partOfSpeech: 'noun', grade: 1, synonyms: ['puppy', 'canine'] },
    { word: 'big', definition: 'Large in size', partOfSpeech: 'adjective', grade: 1, antonyms: ['small', 'tiny', 'little'] },
    { word: 'run', definition: 'To move quickly on foot', partOfSpeech: 'verb', grade: 1, synonyms: ['sprint', 'jog', 'dash'] },
    { word: 'happy', definition: 'Feeling joy or pleasure', partOfSpeech: 'adjective', grade: 1, antonyms: ['sad', 'unhappy', 'upset'] },
    { word: 'book', definition: 'Pages with words to read', partOfSpeech: 'noun', grade: 1 },
    { word: 'play', definition: 'To have fun with toys or games', partOfSpeech: 'verb', grade: 1 },
    { word: 'tree', definition: 'A tall plant with leaves', partOfSpeech: 'noun', grade: 1 },
    { word: 'fish', definition: 'An animal that lives in water', partOfSpeech: 'noun', grade: 1 },
    { word: 'bird', definition: 'An animal with wings that flies', partOfSpeech: 'noun', grade: 1 },
    { word: 'sun', definition: 'The bright star in the sky', partOfSpeech: 'noun', grade: 1 },
    { word: 'moon', definition: 'The round object in the night sky', partOfSpeech: 'noun', grade: 1 },
    { word: 'ball', definition: 'A round toy you can throw', partOfSpeech: 'noun', grade: 1 },
    { word: 'fast', definition: 'Moving with speed', partOfSpeech: 'adjective', grade: 1, antonyms: ['slow'] },
    { word: 'cold', definition: 'Low temperature', partOfSpeech: 'adjective', grade: 1, antonyms: ['hot', 'warm'] },
  ],
  intermediate: [
    { word: 'beautiful', definition: 'Very pretty or attractive', partOfSpeech: 'adjective', grade: 3, synonyms: ['pretty', 'lovely', 'gorgeous'] },
    { word: 'friend', definition: 'Someone you like and trust', partOfSpeech: 'noun', grade: 2, synonyms: ['buddy', 'pal', 'companion'] },
    { word: 'because', definition: 'For the reason that', partOfSpeech: 'conjunction', grade: 2 },
    { word: 'different', definition: 'Not the same', partOfSpeech: 'adjective', grade: 3, antonyms: ['same', 'similar', 'alike'] },
    { word: 'believe', definition: 'To think something is true', partOfSpeech: 'verb', grade: 3 },
    { word: 'through', definition: 'Moving in one side and out another', partOfSpeech: 'preposition', grade: 3 },
    { word: 'enough', definition: 'As much as needed', partOfSpeech: 'adjective', grade: 3 },
    { word: 'thought', definition: 'An idea in your mind', partOfSpeech: 'noun', grade: 3, synonyms: ['idea', 'notion'] },
    { word: 'should', definition: 'Ought to do something', partOfSpeech: 'verb', grade: 2 },
    { word: 'would', definition: 'Past tense of will', partOfSpeech: 'verb', grade: 2 },
    { word: 'special', definition: 'Different from normal, unique', partOfSpeech: 'adjective', grade: 3, synonyms: ['unique', 'extraordinary'] },
    { word: 'together', definition: 'With each other', partOfSpeech: 'adverb', grade: 2, antonyms: ['apart', 'separate'] },
    { word: 'important', definition: 'Having great value or meaning', partOfSpeech: 'adjective', grade: 3, synonyms: ['significant', 'crucial'] },
    { word: 'always', definition: 'At all times', partOfSpeech: 'adverb', grade: 2, antonyms: ['never'] },
    { word: 'answer', definition: 'A reply to a question', partOfSpeech: 'noun', grade: 2, synonyms: ['response', 'reply'] },
  ],
  advanced: [
    { word: 'necessary', definition: 'Required or essential', partOfSpeech: 'adjective', grade: 5, synonyms: ['essential', 'required', 'needed'] },
    { word: 'separate', definition: 'Set apart from others', partOfSpeech: 'adjective', grade: 5, antonyms: ['together', 'joined', 'united'] },
    { word: 'environment', definition: 'The surroundings or conditions', partOfSpeech: 'noun', grade: 5, synonyms: ['surroundings', 'habitat'] },
    { word: 'government', definition: 'The group that rules a country', partOfSpeech: 'noun', grade: 5 },
    { word: 'immediately', definition: 'Right away, without delay', partOfSpeech: 'adverb', grade: 5, synonyms: ['instantly', 'promptly'] },
    { word: 'recognize', definition: 'To identify or remember', partOfSpeech: 'verb', grade: 5, synonyms: ['identify', 'recall'] },
    { word: 'temperature', definition: 'How hot or cold something is', partOfSpeech: 'noun', grade: 4 },
    { word: 'accomplish', definition: 'To complete or achieve', partOfSpeech: 'verb', grade: 5, synonyms: ['achieve', 'complete', 'succeed'] },
    { word: 'knowledge', definition: 'Information and understanding', partOfSpeech: 'noun', grade: 4, synonyms: ['wisdom', 'understanding'] },
    { word: 'experience', definition: 'Something you have done or lived through', partOfSpeech: 'noun', grade: 5 },
    { word: 'especially', definition: 'More than usually', partOfSpeech: 'adverb', grade: 5, synonyms: ['particularly', 'specifically'] },
    { word: 'definitely', definition: 'Without any doubt', partOfSpeech: 'adverb', grade: 5, synonyms: ['certainly', 'absolutely'] },
    { word: 'occurrence', definition: 'Something that happens', partOfSpeech: 'noun', grade: 6, synonyms: ['event', 'incident'] },
    { word: 'recommend', definition: 'To suggest as good', partOfSpeech: 'verb', grade: 5, synonyms: ['suggest', 'advise'] },
    { word: 'rhythm', definition: 'A regular pattern of sounds', partOfSpeech: 'noun', grade: 5 },
  ],
  expert: [
    { word: 'accommodate', definition: 'To provide space or adjust to fit', partOfSpeech: 'verb', grade: 7, synonyms: ['house', 'adapt'] },
    { word: 'conscientious', definition: 'Careful and thorough', partOfSpeech: 'adjective', grade: 8, synonyms: ['diligent', 'meticulous'] },
    { word: 'entrepreneur', definition: 'Someone who starts a business', partOfSpeech: 'noun', grade: 8 },
    { word: 'exaggerate', definition: 'To make something seem bigger than it is', partOfSpeech: 'verb', grade: 7, synonyms: ['overstate', 'amplify'] },
    { word: 'mischievous', definition: 'Playfully causing trouble', partOfSpeech: 'adjective', grade: 7, synonyms: ['naughty', 'playful'] },
    { word: 'pronunciation', definition: 'The way a word is spoken', partOfSpeech: 'noun', grade: 7 },
    { word: 'questionnaire', definition: 'A list of questions for a survey', partOfSpeech: 'noun', grade: 8 },
    { word: 'perseverance', definition: 'Continuing despite difficulties', partOfSpeech: 'noun', grade: 7, synonyms: ['persistence', 'determination'] },
    { word: 'surveillance', definition: 'Close observation or monitoring', partOfSpeech: 'noun', grade: 8, synonyms: ['observation', 'monitoring'] },
    { word: 'maintenance', definition: 'The process of keeping something working', partOfSpeech: 'noun', grade: 7, synonyms: ['upkeep', 'preservation'] },
    { word: 'miscellaneous', definition: 'Various different things', partOfSpeech: 'adjective', grade: 8, synonyms: ['various', 'assorted'] },
    { word: 'occasionally', definition: 'From time to time', partOfSpeech: 'adverb', grade: 6, synonyms: ['sometimes', 'periodically'] },
    { word: 'vacuum', definition: 'Empty space or a cleaning device', partOfSpeech: 'noun', grade: 6 },
    { word: 'embarrass', definition: 'To make someone feel awkward', partOfSpeech: 'verb', grade: 6, synonyms: ['shame', 'humiliate'] },
    { word: 'guarantee', definition: 'A promise that something will happen', partOfSpeech: 'noun', grade: 7, synonyms: ['promise', 'assurance'] },
  ]
};

// Common misspellings for generating wrong answers
const COMMON_MISSPELLINGS: Record<string, string[]> = {
  'beautiful': ['beatiful', 'beutiful', 'beautifull'],
  'because': ['becuase', 'beacuse', 'becouse'],
  'friend': ['freind', 'frend', 'fiend'],
  'believe': ['beleive', 'belive', 'beleave'],
  'separate': ['seperate', 'seperete', 'separete'],
  'necessary': ['neccessary', 'necesary', 'neccesary'],
  'environment': ['enviroment', 'enviornment', 'envirnoment'],
  'government': ['goverment', 'govenment', 'govermnent'],
  'definitely': ['definately', 'defintely', 'definetly'],
  'accommodate': ['accomodate', 'acommodate', 'accomadate'],
  'occurrence': ['occurence', 'occurrance', 'ocurrence'],
  'rhythm': ['rythm', 'rhythym', 'rythym'],
};

export class SpellingQuestionProvider extends BaseQuestionProvider {
  readonly subject: SubjectType = 'spelling';
  readonly config: QuestionProviderConfig = {
    subject: 'spelling',
    categories: SPELLING_CATEGORIES,
    supportedDifficulties: ['beginner', 'intermediate', 'advanced', 'expert'],
    defaultDifficulty: 'intermediate'
  };

  generateQuestion(difficulty: QuestionDifficulty, category?: string): Question {
    const words = WORD_BANK[difficulty];
    const wordEntry = this.randomPick(words);

    // Choose question type based on category
    const questionType = category || this.randomPick([
      'correct-spelling',
      'missing-letter',
      'definitions',
      'synonyms',
      'antonyms'
    ]);

    switch (questionType) {
      case 'correct-spelling':
        return this._createSpellingQuestion(wordEntry, difficulty);
      case 'missing-letter':
        return this._createMissingLetterQuestion(wordEntry, difficulty);
      case 'definitions':
        return this._createDefinitionQuestion(wordEntry, difficulty);
      case 'synonyms':
        return this._createSynonymQuestion(wordEntry, difficulty);
      case 'antonyms':
        return this._createAntonymQuestion(wordEntry, difficulty);
      default:
        return this._createSpellingQuestion(wordEntry, difficulty);
    }
  }

  validateAnswer(question: Question, answer: string): boolean {
    // Case-insensitive comparison
    return answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
  }

  getStats(): {
    totalQuestions: number;
    questionsPerCategory: Record<string, number>;
    questionsPerDifficulty: Record<QuestionDifficulty, number>;
  } {
    const total = Object.values(WORD_BANK).reduce((sum, words) => sum + words.length, 0);

    return {
      totalQuestions: total * 5, // 5 question types per word
      questionsPerCategory: {
        'correct-spelling': total,
        'missing-letter': total,
        'definitions': total,
        'synonyms': Math.floor(total * 0.6),
        'antonyms': Math.floor(total * 0.4)
      },
      questionsPerDifficulty: {
        beginner: WORD_BANK.beginner.length * 5,
        intermediate: WORD_BANK.intermediate.length * 5,
        advanced: WORD_BANK.advanced.length * 5,
        expert: WORD_BANK.expert.length * 5
      }
    };
  }

  private _createSpellingQuestion(entry: WordEntry, difficulty: QuestionDifficulty): Question {
    const wrongSpellings = this._generateWrongSpellings(entry.word);

    return {
      id: this.generateId(),
      subject: this.subject,
      category: 'correct-spelling',
      difficulty,
      questionText: 'Which word is spelled correctly?',
      questionSubtext: `(${entry.definition})`,
      correctAnswer: entry.word,
      wrongAnswers: wrongSpellings,
      explanation: `The correct spelling is "${entry.word}"`,
      tags: ['spelling', entry.partOfSpeech]
    };
  }

  private _createMissingLetterQuestion(entry: WordEntry, difficulty: QuestionDifficulty): Question {
    const word = entry.word;
    const letterIndex = Math.floor(Math.random() * word.length);
    const missingLetter = word[letterIndex];
    const wordWithBlank = word.substring(0, letterIndex) + '_' + word.substring(letterIndex + 1);

    // Generate wrong letters
    const wrongLetters = this._generateWrongLetters(missingLetter, word, letterIndex);

    return {
      id: this.generateId(),
      subject: this.subject,
      category: 'missing-letter',
      difficulty,
      questionText: `Fill in the missing letter: ${wordWithBlank}`,
      questionSubtext: entry.definition,
      correctAnswer: missingLetter,
      wrongAnswers: wrongLetters,
      explanation: `The complete word is "${word}"`,
      tags: ['spelling', 'missing-letter']
    };
  }

  private _createDefinitionQuestion(entry: WordEntry, difficulty: QuestionDifficulty): Question {
    // Get other words for wrong answers
    const words = WORD_BANK[difficulty];
    const otherWords = words.filter(w => w.word !== entry.word);
    const wrongWords = this.randomPickN(otherWords, 3).map(w => w.word);

    return {
      id: this.generateId(),
      subject: this.subject,
      category: 'definitions',
      difficulty,
      questionText: `Which word means: "${entry.definition}"?`,
      correctAnswer: entry.word,
      wrongAnswers: wrongWords,
      explanation: `"${entry.word}" means ${entry.definition}`,
      tags: ['vocabulary', 'definitions', entry.partOfSpeech]
    };
  }

  private _createSynonymQuestion(entry: WordEntry, difficulty: QuestionDifficulty): Question {
    if (!entry.synonyms || entry.synonyms.length === 0) {
      // Fallback to spelling question if no synonyms
      return this._createSpellingQuestion(entry, difficulty);
    }

    const correctSynonym = this.randomPick(entry.synonyms);

    // Get random words as wrong answers
    const words = WORD_BANK[difficulty];
    const wrongWords = words
      .filter(w => w.word !== entry.word && !entry.synonyms?.includes(w.word))
      .map(w => w.word);
    const wrongAnswers = this.randomPickN(wrongWords, 3);

    return {
      id: this.generateId(),
      subject: this.subject,
      category: 'synonyms',
      difficulty,
      questionText: `Which word is a synonym for "${entry.word}"?`,
      questionSubtext: `(A word with similar meaning)`,
      correctAnswer: correctSynonym,
      wrongAnswers: wrongAnswers,
      explanation: `"${correctSynonym}" means the same as "${entry.word}"`,
      tags: ['vocabulary', 'synonyms']
    };
  }

  private _createAntonymQuestion(entry: WordEntry, difficulty: QuestionDifficulty): Question {
    if (!entry.antonyms || entry.antonyms.length === 0) {
      // Fallback to spelling question if no antonyms
      return this._createSpellingQuestion(entry, difficulty);
    }

    const correctAntonym = this.randomPick(entry.antonyms);

    // Use synonyms and similar words as wrong answers
    const wrongWords: string[] = [];
    if (entry.synonyms) {
      wrongWords.push(...entry.synonyms.slice(0, 2));
    }

    // Add random words to fill remaining spots
    const words = WORD_BANK[difficulty];
    const additionalWrong = words
      .filter(w =>
        w.word !== entry.word &&
        !entry.antonyms?.includes(w.word) &&
        !wrongWords.includes(w.word)
      )
      .map(w => w.word);

    while (wrongWords.length < 3 && additionalWrong.length > 0) {
      const idx = Math.floor(Math.random() * additionalWrong.length);
      wrongWords.push(additionalWrong.splice(idx, 1)[0]);
    }

    return {
      id: this.generateId(),
      subject: this.subject,
      category: 'antonyms',
      difficulty,
      questionText: `Which word is an antonym for "${entry.word}"?`,
      questionSubtext: `(A word with opposite meaning)`,
      correctAnswer: correctAntonym,
      wrongAnswers: wrongWords.slice(0, 3),
      explanation: `"${correctAntonym}" is the opposite of "${entry.word}"`,
      tags: ['vocabulary', 'antonyms']
    };
  }

  private _generateWrongSpellings(word: string): string[] {
    // Check if we have pre-defined misspellings
    if (COMMON_MISSPELLINGS[word]) {
      return this.shuffle(COMMON_MISSPELLINGS[word]).slice(0, 3);
    }

    // Generate plausible misspellings
    const wrong: string[] = [];
    const letters = word.split('');

    // Swap two adjacent letters
    if (letters.length > 2) {
      const idx = Math.floor(Math.random() * (letters.length - 1));
      const swapped = [...letters];
      [swapped[idx], swapped[idx + 1]] = [swapped[idx + 1], swapped[idx]];
      wrong.push(swapped.join(''));
    }

    // Double a letter
    if (letters.length > 2) {
      const idx = Math.floor(Math.random() * letters.length);
      const doubled = [...letters];
      doubled.splice(idx, 0, letters[idx]);
      wrong.push(doubled.join(''));
    }

    // Remove a letter
    if (letters.length > 3) {
      const idx = Math.floor(Math.random() * letters.length);
      const removed = letters.filter((_, i) => i !== idx);
      wrong.push(removed.join(''));
    }

    // Change a vowel
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    const vowelIndices = letters.map((l, i) => vowels.includes(l.toLowerCase()) ? i : -1).filter(i => i >= 0);
    if (vowelIndices.length > 0) {
      const idx = this.randomPick(vowelIndices);
      const changed = [...letters];
      const currentVowel = changed[idx].toLowerCase();
      const otherVowels = vowels.filter(v => v !== currentVowel);
      changed[idx] = this.randomPick(otherVowels);
      wrong.push(changed.join(''));
    }

    // Ensure we have 3 unique wrong answers
    const unique = [...new Set(wrong)].filter(w => w !== word);
    while (unique.length < 3) {
      // Add a random character somewhere
      const idx = Math.floor(Math.random() * word.length);
      const char = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      const modified = word.slice(0, idx) + char + word.slice(idx);
      if (!unique.includes(modified) && modified !== word) {
        unique.push(modified);
      }
    }

    return unique.slice(0, 3);
  }

  private _generateWrongLetters(correct: string, word: string, position: number): string[] {
    const wrong: string[] = [];
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';

    // Similar-looking or sounding letters
    const similarLetters: Record<string, string[]> = {
      'a': ['e', 'o', 'u'],
      'b': ['d', 'p', 'g'],
      'c': ['k', 's', 'g'],
      'd': ['b', 'p', 't'],
      'e': ['a', 'i', 'o'],
      'i': ['e', 'y', 'l'],
      'o': ['a', 'u', 'e'],
      'p': ['b', 'd', 'q'],
      's': ['c', 'z', 'x'],
      'u': ['o', 'a', 'v'],
    };

    const lowerCorrect = correct.toLowerCase();

    // Add similar letters first
    if (similarLetters[lowerCorrect]) {
      wrong.push(...similarLetters[lowerCorrect]);
    }

    // Add random letters to fill
    while (wrong.length < 3) {
      const randomLetter = alphabet[Math.floor(Math.random() * 26)];
      if (randomLetter !== lowerCorrect && !wrong.includes(randomLetter)) {
        wrong.push(randomLetter);
      }
    }

    return wrong.slice(0, 3);
  }
}
