/**
 * ScienceQuestionProvider - Science trivia questions
 *
 * Categories:
 * - Biology (animals, plants, human body)
 * - Chemistry (elements, compounds, reactions)
 * - Physics (forces, energy, motion)
 * - Astronomy (planets, stars, space)
 * - Earth Science (weather, geology, environment)
 */

import {
  BaseQuestionProvider,
  Question,
  QuestionCategory,
  QuestionDifficulty,
  QuestionProviderConfig,
  SubjectType
} from './QuestionProvider';

interface ScienceQuestion {
  question: string;
  answer: string;
  wrongAnswers: string[];
  category: string;
  explanation?: string;
  difficulty: QuestionDifficulty;
}

const SCIENCE_CATEGORIES: QuestionCategory[] = [
  {
    id: 'biology',
    name: 'Biology',
    description: 'Living things, animals, plants, and the human body',
    subject: 'science',
    gradeLevel: 3,
    icon: '🧬'
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    description: 'Elements, compounds, and chemical reactions',
    subject: 'science',
    gradeLevel: 5,
    icon: '⚗️'
  },
  {
    id: 'physics',
    name: 'Physics',
    description: 'Forces, energy, motion, and how things work',
    subject: 'science',
    gradeLevel: 4,
    icon: '⚡'
  },
  {
    id: 'astronomy',
    name: 'Astronomy',
    description: 'Planets, stars, and the universe',
    subject: 'science',
    gradeLevel: 3,
    icon: '🌌'
  },
  {
    id: 'earth-science',
    name: 'Earth Science',
    description: 'Weather, geology, and our planet',
    subject: 'science',
    gradeLevel: 3,
    icon: '🌍'
  }
];

// Science questions organized by category and difficulty
const SCIENCE_QUESTIONS: ScienceQuestion[] = [
  // BIOLOGY - Beginner
  { question: 'What do plants need to make food?', answer: 'Sunlight', wrongAnswers: ['Darkness', 'Music', 'Wind'], category: 'biology', difficulty: 'beginner', explanation: 'Plants use sunlight for photosynthesis to make their food' },
  { question: 'What is the largest organ in the human body?', answer: 'Skin', wrongAnswers: ['Heart', 'Liver', 'Brain'], category: 'biology', difficulty: 'beginner' },
  { question: 'How many legs does a spider have?', answer: '8', wrongAnswers: ['6', '10', '4'], category: 'biology', difficulty: 'beginner' },
  { question: 'What gas do humans breathe out?', answer: 'Carbon dioxide', wrongAnswers: ['Oxygen', 'Nitrogen', 'Helium'], category: 'biology', difficulty: 'beginner' },
  { question: 'What is a baby frog called?', answer: 'Tadpole', wrongAnswers: ['Cub', 'Kitten', 'Chick'], category: 'biology', difficulty: 'beginner' },
  { question: 'What is the fastest land animal?', answer: 'Cheetah', wrongAnswers: ['Lion', 'Horse', 'Tiger'], category: 'biology', difficulty: 'beginner' },
  { question: 'What do bees make?', answer: 'Honey', wrongAnswers: ['Milk', 'Sugar', 'Syrup'], category: 'biology', difficulty: 'beginner' },
  { question: 'How many bones are in the human body?', answer: '206', wrongAnswers: ['106', '306', '156'], category: 'biology', difficulty: 'beginner' },

  // BIOLOGY - Intermediate
  { question: 'What is the powerhouse of the cell?', answer: 'Mitochondria', wrongAnswers: ['Nucleus', 'Ribosome', 'Cytoplasm'], category: 'biology', difficulty: 'intermediate' },
  { question: 'What type of blood cells fight infection?', answer: 'White blood cells', wrongAnswers: ['Red blood cells', 'Platelets', 'Plasma'], category: 'biology', difficulty: 'intermediate' },
  { question: 'What process do plants use to make oxygen?', answer: 'Photosynthesis', wrongAnswers: ['Respiration', 'Digestion', 'Fermentation'], category: 'biology', difficulty: 'intermediate' },
  { question: 'What is the largest mammal?', answer: 'Blue whale', wrongAnswers: ['Elephant', 'Giraffe', 'Hippopotamus'], category: 'biology', difficulty: 'intermediate' },
  { question: 'What carries oxygen in our blood?', answer: 'Hemoglobin', wrongAnswers: ['Plasma', 'Platelets', 'Antibodies'], category: 'biology', difficulty: 'intermediate' },
  { question: 'What is the study of plants called?', answer: 'Botany', wrongAnswers: ['Zoology', 'Geology', 'Astronomy'], category: 'biology', difficulty: 'intermediate' },

  // BIOLOGY - Advanced
  { question: 'What is the basic unit of heredity?', answer: 'Gene', wrongAnswers: ['Cell', 'Atom', 'Protein'], category: 'biology', difficulty: 'advanced' },
  { question: 'What molecule carries genetic information?', answer: 'DNA', wrongAnswers: ['RNA', 'Protein', 'Lipid'], category: 'biology', difficulty: 'advanced' },
  { question: 'What is the study of ecosystems called?', answer: 'Ecology', wrongAnswers: ['Biology', 'Zoology', 'Botany'], category: 'biology', difficulty: 'advanced' },
  { question: 'What organelle contains genetic material?', answer: 'Nucleus', wrongAnswers: ['Mitochondria', 'Ribosome', 'Golgi body'], category: 'biology', difficulty: 'advanced' },

  // CHEMISTRY - Beginner
  { question: 'What is H2O commonly known as?', answer: 'Water', wrongAnswers: ['Oxygen', 'Hydrogen', 'Carbon dioxide'], category: 'chemistry', difficulty: 'beginner' },
  { question: 'What gas do we need to breathe?', answer: 'Oxygen', wrongAnswers: ['Carbon dioxide', 'Nitrogen', 'Helium'], category: 'chemistry', difficulty: 'beginner' },
  { question: 'What are the three states of matter?', answer: 'Solid, liquid, gas', wrongAnswers: ['Hot, cold, warm', 'Big, small, medium', 'Fast, slow, still'], category: 'chemistry', difficulty: 'beginner' },
  { question: 'What happens to water when it freezes?', answer: 'It becomes ice', wrongAnswers: ['It disappears', 'It becomes steam', 'It becomes air'], category: 'chemistry', difficulty: 'beginner' },
  { question: 'What is table salt made of?', answer: 'Sodium and chlorine', wrongAnswers: ['Iron and oxygen', 'Carbon and hydrogen', 'Gold and silver'], category: 'chemistry', difficulty: 'beginner' },

  // CHEMISTRY - Intermediate
  { question: 'What is the chemical symbol for gold?', answer: 'Au', wrongAnswers: ['Go', 'Gd', 'Ag'], category: 'chemistry', difficulty: 'intermediate' },
  { question: 'What is the chemical symbol for iron?', answer: 'Fe', wrongAnswers: ['Ir', 'In', 'Fr'], category: 'chemistry', difficulty: 'intermediate' },
  { question: 'How many elements are in the periodic table?', answer: '118', wrongAnswers: ['100', '92', '150'], category: 'chemistry', difficulty: 'intermediate' },
  { question: 'What is the most abundant gas in Earth\'s atmosphere?', answer: 'Nitrogen', wrongAnswers: ['Oxygen', 'Carbon dioxide', 'Hydrogen'], category: 'chemistry', difficulty: 'intermediate' },
  { question: 'What is the chemical formula for carbon dioxide?', answer: 'CO2', wrongAnswers: ['CO', 'C2O', 'O2C'], category: 'chemistry', difficulty: 'intermediate' },
  { question: 'What pH level is neutral?', answer: '7', wrongAnswers: ['0', '14', '1'], category: 'chemistry', difficulty: 'intermediate' },

  // CHEMISTRY - Advanced
  { question: 'What subatomic particle has a negative charge?', answer: 'Electron', wrongAnswers: ['Proton', 'Neutron', 'Quark'], category: 'chemistry', difficulty: 'advanced' },
  { question: 'What is the atomic number of carbon?', answer: '6', wrongAnswers: ['12', '8', '4'], category: 'chemistry', difficulty: 'advanced' },
  { question: 'What type of bond shares electrons?', answer: 'Covalent bond', wrongAnswers: ['Ionic bond', 'Metallic bond', 'Hydrogen bond'], category: 'chemistry', difficulty: 'advanced' },

  // PHYSICS - Beginner
  { question: 'What force keeps us on the ground?', answer: 'Gravity', wrongAnswers: ['Magnetism', 'Friction', 'Wind'], category: 'physics', difficulty: 'beginner' },
  { question: 'What is the speed of light measured in?', answer: 'Meters per second', wrongAnswers: ['Miles per hour', 'Feet per minute', 'Inches per day'], category: 'physics', difficulty: 'beginner' },
  { question: 'What type of energy is stored in food?', answer: 'Chemical energy', wrongAnswers: ['Heat energy', 'Light energy', 'Sound energy'], category: 'physics', difficulty: 'beginner' },
  { question: 'What do we call the force that opposes motion?', answer: 'Friction', wrongAnswers: ['Gravity', 'Magnetism', 'Inertia'], category: 'physics', difficulty: 'beginner' },
  { question: 'What color is formed when all colors of light combine?', answer: 'White', wrongAnswers: ['Black', 'Gray', 'Brown'], category: 'physics', difficulty: 'beginner' },
  { question: 'What travels faster: light or sound?', answer: 'Light', wrongAnswers: ['Sound', 'They are equal', 'Neither travels'], category: 'physics', difficulty: 'beginner' },

  // PHYSICS - Intermediate
  { question: 'What unit is used to measure force?', answer: 'Newton', wrongAnswers: ['Watt', 'Joule', 'Volt'], category: 'physics', difficulty: 'intermediate' },
  { question: 'What unit is used to measure electrical power?', answer: 'Watt', wrongAnswers: ['Volt', 'Ampere', 'Ohm'], category: 'physics', difficulty: 'intermediate' },
  { question: 'What is the formula for speed?', answer: 'Distance / Time', wrongAnswers: ['Mass x Acceleration', 'Force x Distance', 'Time x Mass'], category: 'physics', difficulty: 'intermediate' },
  { question: 'What type of wave is sound?', answer: 'Longitudinal wave', wrongAnswers: ['Transverse wave', 'Electromagnetic wave', 'Standing wave'], category: 'physics', difficulty: 'intermediate' },
  { question: 'What is absolute zero in Celsius?', answer: '-273.15°C', wrongAnswers: ['0°C', '-100°C', '-459°C'], category: 'physics', difficulty: 'intermediate' },

  // PHYSICS - Advanced
  { question: 'What is Newton\'s first law also known as?', answer: 'Law of Inertia', wrongAnswers: ['Law of Motion', 'Law of Energy', 'Law of Force'], category: 'physics', difficulty: 'advanced' },
  { question: 'What is E=mc² known as?', answer: 'Mass-energy equivalence', wrongAnswers: ['Theory of Relativity', 'Quantum Theory', 'String Theory'], category: 'physics', difficulty: 'advanced' },
  { question: 'What particle carries the electromagnetic force?', answer: 'Photon', wrongAnswers: ['Electron', 'Gluon', 'Graviton'], category: 'physics', difficulty: 'advanced' },

  // ASTRONOMY - Beginner
  { question: 'What is the closest star to Earth?', answer: 'The Sun', wrongAnswers: ['The Moon', 'Mars', 'Polaris'], category: 'astronomy', difficulty: 'beginner' },
  { question: 'How many planets are in our solar system?', answer: '8', wrongAnswers: ['9', '7', '10'], category: 'astronomy', difficulty: 'beginner' },
  { question: 'What is the largest planet in our solar system?', answer: 'Jupiter', wrongAnswers: ['Saturn', 'Neptune', 'Earth'], category: 'astronomy', difficulty: 'beginner' },
  { question: 'What planet is known as the Red Planet?', answer: 'Mars', wrongAnswers: ['Venus', 'Mercury', 'Jupiter'], category: 'astronomy', difficulty: 'beginner' },
  { question: 'What is Earth\'s only natural satellite?', answer: 'The Moon', wrongAnswers: ['The Sun', 'Mars', 'Venus'], category: 'astronomy', difficulty: 'beginner' },
  { question: 'What galaxy do we live in?', answer: 'Milky Way', wrongAnswers: ['Andromeda', 'Triangulum', 'Sombrero'], category: 'astronomy', difficulty: 'beginner' },
  { question: 'What planet has the famous rings?', answer: 'Saturn', wrongAnswers: ['Jupiter', 'Uranus', 'Neptune'], category: 'astronomy', difficulty: 'beginner' },
  { question: 'What is the hottest planet in our solar system?', answer: 'Venus', wrongAnswers: ['Mercury', 'Mars', 'Jupiter'], category: 'astronomy', difficulty: 'beginner' },

  // ASTRONOMY - Intermediate
  { question: 'What is a group of stars that forms a pattern called?', answer: 'Constellation', wrongAnswers: ['Galaxy', 'Nebula', 'Solar system'], category: 'astronomy', difficulty: 'intermediate' },
  { question: 'How long does it take Earth to orbit the Sun?', answer: '365 days', wrongAnswers: ['30 days', '24 hours', '12 months'], category: 'astronomy', difficulty: 'intermediate' },
  { question: 'What causes a solar eclipse?', answer: 'Moon blocking the Sun', wrongAnswers: ['Earth blocking the Sun', 'Sun blocking the Moon', 'Clouds blocking the Sun'], category: 'astronomy', difficulty: 'intermediate' },
  { question: 'What is a shooting star actually made of?', answer: 'Meteor', wrongAnswers: ['Star', 'Comet', 'Asteroid'], category: 'astronomy', difficulty: 'intermediate' },
  { question: 'Which planet rotates on its side?', answer: 'Uranus', wrongAnswers: ['Neptune', 'Saturn', 'Jupiter'], category: 'astronomy', difficulty: 'intermediate' },

  // ASTRONOMY - Advanced
  { question: 'What is a supermassive object at the center of galaxies?', answer: 'Black hole', wrongAnswers: ['Neutron star', 'Pulsar', 'Quasar'], category: 'astronomy', difficulty: 'advanced' },
  { question: 'What is the approximate age of the universe?', answer: '13.8 billion years', wrongAnswers: ['4.6 billion years', '1 billion years', '100 million years'], category: 'astronomy', difficulty: 'advanced' },
  { question: 'What causes the seasons on Earth?', answer: 'Earth\'s tilted axis', wrongAnswers: ['Distance from Sun', 'Moon\'s orbit', 'Solar flares'], category: 'astronomy', difficulty: 'advanced' },

  // EARTH SCIENCE - Beginner
  { question: 'What causes rain?', answer: 'Water evaporation and condensation', wrongAnswers: ['Wind blowing', 'Sun heating', 'Earth spinning'], category: 'earth-science', difficulty: 'beginner' },
  { question: 'What is the outer layer of Earth called?', answer: 'Crust', wrongAnswers: ['Core', 'Mantle', 'Atmosphere'], category: 'earth-science', difficulty: 'beginner' },
  { question: 'What type of rock is formed from cooled lava?', answer: 'Igneous rock', wrongAnswers: ['Sedimentary rock', 'Metamorphic rock', 'Limestone'], category: 'earth-science', difficulty: 'beginner' },
  { question: 'What causes earthquakes?', answer: 'Moving tectonic plates', wrongAnswers: ['Strong winds', 'Heavy rain', 'Volcanic eruptions'], category: 'earth-science', difficulty: 'beginner' },
  { question: 'What layer of the atmosphere do we live in?', answer: 'Troposphere', wrongAnswers: ['Stratosphere', 'Mesosphere', 'Thermosphere'], category: 'earth-science', difficulty: 'beginner' },
  { question: 'What is the water cycle?', answer: 'Evaporation, condensation, precipitation', wrongAnswers: ['Freezing, melting, boiling', 'Sunrise, noon, sunset', 'Spring, summer, fall, winter'], category: 'earth-science', difficulty: 'beginner' },

  // EARTH SCIENCE - Intermediate
  { question: 'What scale measures earthquake strength?', answer: 'Richter scale', wrongAnswers: ['Kelvin scale', 'Decibel scale', 'pH scale'], category: 'earth-science', difficulty: 'intermediate' },
  { question: 'What is the hardest natural mineral?', answer: 'Diamond', wrongAnswers: ['Gold', 'Iron', 'Quartz'], category: 'earth-science', difficulty: 'intermediate' },
  { question: 'What causes tides in the ocean?', answer: 'Moon\'s gravity', wrongAnswers: ['Wind', 'Earth\'s rotation', 'Sun\'s heat'], category: 'earth-science', difficulty: 'intermediate' },
  { question: 'What is the ozone layer made of?', answer: 'O3 molecules', wrongAnswers: ['CO2 molecules', 'H2O molecules', 'N2 molecules'], category: 'earth-science', difficulty: 'intermediate' },
  { question: 'What percentage of Earth\'s surface is covered by water?', answer: '71%', wrongAnswers: ['50%', '30%', '90%'], category: 'earth-science', difficulty: 'intermediate' },

  // EARTH SCIENCE - Advanced
  { question: 'What is the study of weather called?', answer: 'Meteorology', wrongAnswers: ['Geology', 'Oceanography', 'Astronomy'], category: 'earth-science', difficulty: 'advanced' },
  { question: 'What type of plate boundary causes mountains?', answer: 'Convergent boundary', wrongAnswers: ['Divergent boundary', 'Transform boundary', 'Subduction zone'], category: 'earth-science', difficulty: 'advanced' },
  { question: 'What is Earth\'s inner core made of?', answer: 'Iron and nickel', wrongAnswers: ['Rock and magma', 'Water and ice', 'Gold and silver'], category: 'earth-science', difficulty: 'advanced' },
];

export class ScienceQuestionProvider extends BaseQuestionProvider {
  readonly subject: SubjectType = 'science';
  readonly config: QuestionProviderConfig = {
    subject: 'science',
    categories: SCIENCE_CATEGORIES,
    supportedDifficulties: ['beginner', 'intermediate', 'advanced', 'expert'],
    defaultDifficulty: 'intermediate'
  };

  generateQuestion(difficulty: QuestionDifficulty, category?: string): Question {
    // Filter questions by difficulty and optionally by category
    let filtered = SCIENCE_QUESTIONS.filter(q => q.difficulty === difficulty);

    if (category) {
      filtered = filtered.filter(q => q.category === category);
    }

    // If no questions match, fall back to all questions of that difficulty
    if (filtered.length === 0) {
      filtered = SCIENCE_QUESTIONS.filter(q => q.difficulty === difficulty);
    }

    // If still no questions, use all questions
    if (filtered.length === 0) {
      filtered = SCIENCE_QUESTIONS;
    }

    const scienceQ = this.randomPick(filtered);

    return {
      id: this.generateId(),
      subject: this.subject,
      category: scienceQ.category,
      difficulty: scienceQ.difficulty,
      questionText: scienceQ.question,
      correctAnswer: scienceQ.answer,
      wrongAnswers: [...scienceQ.wrongAnswers],
      explanation: scienceQ.explanation || `The answer is ${scienceQ.answer}`,
      tags: ['science', scienceQ.category]
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

    for (const q of SCIENCE_QUESTIONS) {
      perCategory[q.category] = (perCategory[q.category] || 0) + 1;
      perDifficulty[q.difficulty]++;
    }

    return {
      totalQuestions: SCIENCE_QUESTIONS.length,
      questionsPerCategory: perCategory,
      questionsPerDifficulty: perDifficulty
    };
  }
}
