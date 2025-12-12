/**
 * HistoryQuestionProvider - History trivia questions
 *
 * Categories:
 * - Ancient History (Egypt, Rome, Greece)
 * - Medieval History
 * - American History
 * - World History
 * - Famous People
 * - Inventions & Discoveries
 */

import {
  BaseQuestionProvider,
  Question,
  QuestionCategory,
  QuestionDifficulty,
  QuestionProviderConfig,
  SubjectType
} from './QuestionProvider';

interface HistoryQuestion {
  question: string;
  answer: string;
  wrongAnswers: string[];
  category: string;
  explanation?: string;
  difficulty: QuestionDifficulty;
  year?: number;
}

const HISTORY_CATEGORIES: QuestionCategory[] = [
  {
    id: 'ancient',
    name: 'Ancient History',
    description: 'Egypt, Rome, Greece, and early civilizations',
    subject: 'history',
    gradeLevel: 5,
    icon: '🏛️'
  },
  {
    id: 'medieval',
    name: 'Medieval History',
    description: 'The Middle Ages and Renaissance',
    subject: 'history',
    gradeLevel: 6,
    icon: '⚔️'
  },
  {
    id: 'american',
    name: 'American History',
    description: 'US history from founding to present',
    subject: 'history',
    gradeLevel: 4,
    icon: '🇺🇸'
  },
  {
    id: 'world',
    name: 'World History',
    description: 'Major world events and eras',
    subject: 'history',
    gradeLevel: 5,
    icon: '🌍'
  },
  {
    id: 'famous-people',
    name: 'Famous People',
    description: 'Important historical figures',
    subject: 'history',
    gradeLevel: 4,
    icon: '👤'
  },
  {
    id: 'inventions',
    name: 'Inventions & Discoveries',
    description: 'Important inventions throughout history',
    subject: 'history',
    gradeLevel: 4,
    icon: '💡'
  }
];

const HISTORY_QUESTIONS: HistoryQuestion[] = [
  // ANCIENT HISTORY - Beginner
  { question: 'What ancient wonder was built in Egypt?', answer: 'The Pyramids', wrongAnswers: ['The Colosseum', 'The Great Wall', 'The Parthenon'], category: 'ancient', difficulty: 'beginner', explanation: 'The Great Pyramids of Giza were built as tombs for Egyptian pharaohs' },
  { question: 'Who was the king of the Greek gods?', answer: 'Zeus', wrongAnswers: ['Apollo', 'Poseidon', 'Hades'], category: 'ancient', difficulty: 'beginner' },
  { question: 'What was the capital of the Roman Empire?', answer: 'Rome', wrongAnswers: ['Athens', 'Alexandria', 'Carthage'], category: 'ancient', difficulty: 'beginner' },
  { question: 'What did ancient Egyptians use for writing?', answer: 'Hieroglyphics', wrongAnswers: ['The alphabet', 'Numbers', 'Pictures'], category: 'ancient', difficulty: 'beginner' },
  { question: 'What structure did the Romans build for gladiator fights?', answer: 'Colosseum', wrongAnswers: ['Pantheon', 'Aqueduct', 'Forum'], category: 'ancient', difficulty: 'beginner' },
  { question: 'What river was ancient Egypt built around?', answer: 'Nile River', wrongAnswers: ['Amazon River', 'Tigris River', 'Ganges River'], category: 'ancient', difficulty: 'beginner' },

  // ANCIENT HISTORY - Intermediate
  { question: 'Who was the famous queen of Egypt?', answer: 'Cleopatra', wrongAnswers: ['Nefertiti', 'Hatshepsut', 'Isis'], category: 'ancient', difficulty: 'intermediate' },
  { question: 'What Greek philosopher taught Alexander the Great?', answer: 'Aristotle', wrongAnswers: ['Plato', 'Socrates', 'Homer'], category: 'ancient', difficulty: 'intermediate' },
  { question: 'What empire did Julius Caesar rule?', answer: 'Roman Empire', wrongAnswers: ['Greek Empire', 'Persian Empire', 'Egyptian Empire'], category: 'ancient', difficulty: 'intermediate' },
  { question: 'What was the Greek city-state famous for its warriors?', answer: 'Sparta', wrongAnswers: ['Athens', 'Corinth', 'Thebes'], category: 'ancient', difficulty: 'intermediate' },
  { question: 'What did the ancient Greeks invent for government?', answer: 'Democracy', wrongAnswers: ['Monarchy', 'Dictatorship', 'Communism'], category: 'ancient', difficulty: 'intermediate' },

  // ANCIENT HISTORY - Advanced
  { question: 'What year did Rome fall?', answer: '476 AD', wrongAnswers: ['300 AD', '100 AD', '600 AD'], category: 'ancient', difficulty: 'advanced', year: 476 },
  { question: 'Who built the first library in ancient times?', answer: 'Egyptians (Alexandria)', wrongAnswers: ['Greeks', 'Romans', 'Persians'], category: 'ancient', difficulty: 'advanced' },
  { question: 'What was the Rosetta Stone used for?', answer: 'Translating hieroglyphics', wrongAnswers: ['Building pyramids', 'Measuring time', 'Navigation'], category: 'ancient', difficulty: 'advanced' },

  // MEDIEVAL HISTORY - Beginner
  { question: 'What were medieval soldiers in armor called?', answer: 'Knights', wrongAnswers: ['Soldiers', 'Guards', 'Warriors'], category: 'medieval', difficulty: 'beginner' },
  { question: 'Where did kings and queens live in medieval times?', answer: 'Castles', wrongAnswers: ['Houses', 'Tents', 'Caves'], category: 'medieval', difficulty: 'beginner' },
  { question: 'What weapon did archers use?', answer: 'Bow and arrow', wrongAnswers: ['Sword', 'Spear', 'Axe'], category: 'medieval', difficulty: 'beginner' },
  { question: 'What was the Black Death?', answer: 'A deadly plague', wrongAnswers: ['A war', 'A famine', 'An earthquake'], category: 'medieval', difficulty: 'beginner' },

  // MEDIEVAL HISTORY - Intermediate
  { question: 'What were the Crusades?', answer: 'Religious wars', wrongAnswers: ['Trade expeditions', 'Explorations', 'Tournaments'], category: 'medieval', difficulty: 'intermediate' },
  { question: 'What document limited the king\'s power in England (1215)?', answer: 'Magna Carta', wrongAnswers: ['Constitution', 'Declaration', 'Charter of Rights'], category: 'medieval', difficulty: 'intermediate', year: 1215 },
  { question: 'Who invented the printing press?', answer: 'Johannes Gutenberg', wrongAnswers: ['Leonardo da Vinci', 'Galileo Galilei', 'Isaac Newton'], category: 'medieval', difficulty: 'intermediate' },
  { question: 'What was the Renaissance?', answer: 'A period of art and learning', wrongAnswers: ['A war', 'A plague', 'A famine'], category: 'medieval', difficulty: 'intermediate' },

  // MEDIEVAL HISTORY - Advanced
  { question: 'What year did the Black Death reach Europe?', answer: '1347', wrongAnswers: ['1215', '1492', '1066'], category: 'medieval', difficulty: 'advanced', year: 1347 },
  { question: 'Who painted the Mona Lisa?', answer: 'Leonardo da Vinci', wrongAnswers: ['Michelangelo', 'Raphael', 'Botticelli'], category: 'medieval', difficulty: 'advanced' },
  { question: 'What battle did William the Conqueror win in 1066?', answer: 'Battle of Hastings', wrongAnswers: ['Battle of Waterloo', 'Battle of Agincourt', 'Battle of Crecy'], category: 'medieval', difficulty: 'advanced', year: 1066 },

  // AMERICAN HISTORY - Beginner
  { question: 'Who was the first President of the United States?', answer: 'George Washington', wrongAnswers: ['Abraham Lincoln', 'Thomas Jefferson', 'John Adams'], category: 'american', difficulty: 'beginner' },
  { question: 'What country did America declare independence from?', answer: 'Great Britain', wrongAnswers: ['France', 'Spain', 'Germany'], category: 'american', difficulty: 'beginner' },
  { question: 'What year did America declare independence?', answer: '1776', wrongAnswers: ['1492', ' 1865', '1620'], category: 'american', difficulty: 'beginner', year: 1776 },
  { question: 'Who wrote the Declaration of Independence?', answer: 'Thomas Jefferson', wrongAnswers: ['George Washington', 'Benjamin Franklin', 'John Adams'], category: 'american', difficulty: 'beginner' },
  { question: 'What ship brought the Pilgrims to America?', answer: 'Mayflower', wrongAnswers: ['Santa Maria', 'Titanic', 'Constitution'], category: 'american', difficulty: 'beginner' },
  { question: 'Who freed the slaves in America?', answer: 'Abraham Lincoln', wrongAnswers: ['George Washington', 'Thomas Jefferson', 'Theodore Roosevelt'], category: 'american', difficulty: 'beginner' },

  // AMERICAN HISTORY - Intermediate
  { question: 'What was the American Civil War fought over?', answer: 'Slavery and states\' rights', wrongAnswers: ['Territory', 'Taxes', 'Religion'], category: 'american', difficulty: 'intermediate' },
  { question: 'Who gave the "I Have a Dream" speech?', answer: 'Martin Luther King Jr.', wrongAnswers: ['Malcolm X', 'Rosa Parks', 'John F. Kennedy'], category: 'american', difficulty: 'intermediate' },
  { question: 'What event started the Great Depression?', answer: 'Stock Market Crash of 1929', wrongAnswers: ['World War I', 'Civil War', 'Gold Rush'], category: 'american', difficulty: 'intermediate', year: 1929 },
  { question: 'Who was president during World War II?', answer: 'Franklin D. Roosevelt', wrongAnswers: ['Harry Truman', 'Dwight Eisenhower', 'Herbert Hoover'], category: 'american', difficulty: 'intermediate' },
  { question: 'What did the 19th Amendment give women?', answer: 'The right to vote', wrongAnswers: ['The right to work', 'The right to own property', 'The right to education'], category: 'american', difficulty: 'intermediate' },

  // AMERICAN HISTORY - Advanced
  { question: 'What year did the Civil War end?', answer: '1865', wrongAnswers: ['1861', '1870', '1850'], category: 'american', difficulty: 'advanced', year: 1865 },
  { question: 'Who was the first person to walk on the moon?', answer: 'Neil Armstrong', wrongAnswers: ['Buzz Aldrin', 'John Glenn', 'Alan Shepard'], category: 'american', difficulty: 'advanced' },
  { question: 'What Supreme Court case ended school segregation?', answer: 'Brown v. Board of Education', wrongAnswers: ['Roe v. Wade', 'Marbury v. Madison', 'Plessy v. Ferguson'], category: 'american', difficulty: 'advanced' },

  // WORLD HISTORY - Beginner
  { question: 'What wall divided East and West Berlin?', answer: 'Berlin Wall', wrongAnswers: ['Great Wall', 'Hadrian\'s Wall', 'Western Wall'], category: 'world', difficulty: 'beginner' },
  { question: 'What continent was World War I mainly fought on?', answer: 'Europe', wrongAnswers: ['Asia', 'Africa', 'North America'], category: 'world', difficulty: 'beginner' },
  { question: 'Who was the leader of Nazi Germany?', answer: 'Adolf Hitler', wrongAnswers: ['Benito Mussolini', 'Joseph Stalin', 'Winston Churchill'], category: 'world', difficulty: 'beginner' },
  { question: 'What country built the Great Wall?', answer: 'China', wrongAnswers: ['Japan', 'India', 'Mongolia'], category: 'world', difficulty: 'beginner' },

  // WORLD HISTORY - Intermediate
  { question: 'What year did World War I begin?', answer: '1914', wrongAnswers: ['1918', '1939', '1941'], category: 'world', difficulty: 'intermediate', year: 1914 },
  { question: 'What year did World War II end?', answer: '1945', wrongAnswers: ['1939', '1941', '1950'], category: 'world', difficulty: 'intermediate', year: 1945 },
  { question: 'What event started World War I?', answer: 'Assassination of Archduke Franz Ferdinand', wrongAnswers: ['Invasion of Poland', 'Bombing of Pearl Harbor', 'Treaty of Versailles'], category: 'world', difficulty: 'intermediate' },
  { question: 'What was the Cold War?', answer: 'Tension between USA and USSR', wrongAnswers: ['A war in Antarctica', 'A nuclear war', 'A winter war'], category: 'world', difficulty: 'intermediate' },
  { question: 'When did the Berlin Wall fall?', answer: '1989', wrongAnswers: ['1991', '1985', '1979'], category: 'world', difficulty: 'intermediate', year: 1989 },

  // WORLD HISTORY - Advanced
  { question: 'What treaty ended World War I?', answer: 'Treaty of Versailles', wrongAnswers: ['Treaty of Paris', 'Treaty of Ghent', 'Treaty of Vienna'], category: 'world', difficulty: 'advanced' },
  { question: 'What year did the French Revolution begin?', answer: '1789', wrongAnswers: ['1776', '1815', '1848'], category: 'world', difficulty: 'advanced', year: 1789 },
  { question: 'Who led India to independence from Britain?', answer: 'Mahatma Gandhi', wrongAnswers: ['Jawaharlal Nehru', 'Subhas Chandra Bose', 'Muhammad Ali Jinnah'], category: 'world', difficulty: 'advanced' },

  // FAMOUS PEOPLE - Beginner
  { question: 'Who discovered America in 1492?', answer: 'Christopher Columbus', wrongAnswers: ['Amerigo Vespucci', 'Ferdinand Magellan', 'Leif Erikson'], category: 'famous-people', difficulty: 'beginner', year: 1492 },
  { question: 'Who was the famous nurse during the Crimean War?', answer: 'Florence Nightingale', wrongAnswers: ['Clara Barton', 'Mary Seacole', 'Edith Cavell'], category: 'famous-people', difficulty: 'beginner' },
  { question: 'Who invented the light bulb?', answer: 'Thomas Edison', wrongAnswers: ['Nikola Tesla', 'Benjamin Franklin', 'Alexander Graham Bell'], category: 'famous-people', difficulty: 'beginner' },
  { question: 'Who was the first woman to fly solo across the Atlantic?', answer: 'Amelia Earhart', wrongAnswers: ['Harriet Quimby', 'Bessie Coleman', 'Jacqueline Cochran'], category: 'famous-people', difficulty: 'beginner' },

  // FAMOUS PEOPLE - Intermediate
  { question: 'Who developed the theory of relativity?', answer: 'Albert Einstein', wrongAnswers: ['Isaac Newton', 'Niels Bohr', 'Stephen Hawking'], category: 'famous-people', difficulty: 'intermediate' },
  { question: 'Who wrote Romeo and Juliet?', answer: 'William Shakespeare', wrongAnswers: ['Charles Dickens', 'Jane Austen', 'Mark Twain'], category: 'famous-people', difficulty: 'intermediate' },
  { question: 'Who was the first female Prime Minister of the UK?', answer: 'Margaret Thatcher', wrongAnswers: ['Queen Elizabeth II', 'Theresa May', 'Queen Victoria'], category: 'famous-people', difficulty: 'intermediate' },
  { question: 'Who led the French army to victory before being burned at the stake?', answer: 'Joan of Arc', wrongAnswers: ['Marie Antoinette', 'Catherine de Medici', 'Eleanor of Aquitaine'], category: 'famous-people', difficulty: 'intermediate' },

  // INVENTIONS - Beginner
  { question: 'Who invented the telephone?', answer: 'Alexander Graham Bell', wrongAnswers: ['Thomas Edison', 'Nikola Tesla', 'Guglielmo Marconi'], category: 'inventions', difficulty: 'beginner' },
  { question: 'What did the Wright Brothers invent?', answer: 'Airplane', wrongAnswers: ['Car', 'Train', 'Bicycle'], category: 'inventions', difficulty: 'beginner' },
  { question: 'Who invented the World Wide Web?', answer: 'Tim Berners-Lee', wrongAnswers: ['Bill Gates', 'Steve Jobs', 'Mark Zuckerberg'], category: 'inventions', difficulty: 'beginner' },
  { question: 'What did Henry Ford mass produce?', answer: 'Automobiles', wrongAnswers: ['Airplanes', 'Televisions', 'Computers'], category: 'inventions', difficulty: 'beginner' },

  // INVENTIONS - Intermediate
  { question: 'Who discovered penicillin?', answer: 'Alexander Fleming', wrongAnswers: ['Louis Pasteur', 'Jonas Salk', 'Edward Jenner'], category: 'inventions', difficulty: 'intermediate' },
  { question: 'What year was the first iPhone released?', answer: '2007', wrongAnswers: ['2005', '2010', '2003'], category: 'inventions', difficulty: 'intermediate', year: 2007 },
  { question: 'Who invented the steam engine?', answer: 'James Watt', wrongAnswers: ['Thomas Newcomen', 'George Stephenson', 'Richard Trevithick'], category: 'inventions', difficulty: 'intermediate' },
  { question: 'What did Marie Curie discover?', answer: 'Radioactivity (Radium and Polonium)', wrongAnswers: ['X-rays', 'Electricity', 'Penicillin'], category: 'inventions', difficulty: 'intermediate' },

  // INVENTIONS - Advanced
  { question: 'Who is credited with inventing the Internet?', answer: 'Vint Cerf and Bob Kahn', wrongAnswers: ['Tim Berners-Lee', 'Bill Gates', 'Steve Jobs'], category: 'inventions', difficulty: 'advanced' },
  { question: 'What year was the first computer invented?', answer: '1945 (ENIAC)', wrongAnswers: ['1960', '1975', '1930'], category: 'inventions', difficulty: 'advanced', year: 1945 },
  { question: 'Who invented the polio vaccine?', answer: 'Jonas Salk', wrongAnswers: ['Louis Pasteur', 'Alexander Fleming', 'Edward Jenner'], category: 'inventions', difficulty: 'advanced' },
];

export class HistoryQuestionProvider extends BaseQuestionProvider {
  readonly subject: SubjectType = 'history';
  readonly config: QuestionProviderConfig = {
    subject: 'history',
    categories: HISTORY_CATEGORIES,
    supportedDifficulties: ['beginner', 'intermediate', 'advanced', 'expert'],
    defaultDifficulty: 'intermediate'
  };

  generateQuestion(difficulty: QuestionDifficulty, category?: string): Question {
    // Filter questions by difficulty and optionally by category
    let filtered = HISTORY_QUESTIONS.filter(q => q.difficulty === difficulty);

    if (category) {
      filtered = filtered.filter(q => q.category === category);
    }

    // If no questions match, fall back to all questions of that difficulty
    if (filtered.length === 0) {
      filtered = HISTORY_QUESTIONS.filter(q => q.difficulty === difficulty);
    }

    // If still no questions, use all questions
    if (filtered.length === 0) {
      filtered = HISTORY_QUESTIONS;
    }

    const historyQ = this.randomPick(filtered);

    return {
      id: this.generateId(),
      subject: this.subject,
      category: historyQ.category,
      difficulty: historyQ.difficulty,
      questionText: historyQ.question,
      correctAnswer: historyQ.answer,
      wrongAnswers: [...historyQ.wrongAnswers],
      explanation: historyQ.explanation || `The answer is ${historyQ.answer}`,
      tags: ['history', historyQ.category, historyQ.year?.toString() || ''].filter(Boolean)
    };
  }

  getStats(): {
    totalQuestions: number;
    questionsPerCategory: Record<string, number>;
    questionsPerDifficulty: Record<QuestionDifficulty, number>;
  } {
    const perCategory: Record<string, number> = {};
    const perDifficulty: Record<QuestionDifficulty, number> = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
      expert: 0
    };

    for (const q of HISTORY_QUESTIONS) {
      perCategory[q.category] = (perCategory[q.category] || 0) + 1;
      perDifficulty[q.difficulty]++;
    }

    return {
      totalQuestions: HISTORY_QUESTIONS.length,
      questionsPerCategory: perCategory,
      questionsPerDifficulty: perDifficulty
    };
  }
}
