/**
 * GeographyQuestionProvider - Geography and world knowledge questions
 *
 * Categories:
 * - World Capitals
 * - Countries & Continents
 * - US States & Capitals
 * - Landmarks & Wonders
 * - Oceans & Rivers
 * - Flags (coming soon - would need visual support)
 */

import {
  BaseQuestionProvider,
  Question,
  QuestionCategory,
  QuestionDifficulty,
  QuestionProviderConfig,
  SubjectType
} from './QuestionProvider';

interface CountryData {
  country: string;
  capital: string;
  continent: string;
  language?: string;
  currency?: string;
  landmark?: string;
}

interface USStateData {
  state: string;
  capital: string;
  region: string;
  nickname?: string;
}

interface LandmarkData {
  name: string;
  location: string;
  country: string;
  type: string;
}

interface GeographyFactData {
  question: string;
  answer: string;
  wrongAnswers: string[];
  category: string;
}

const GEOGRAPHY_CATEGORIES: QuestionCategory[] = [
  {
    id: 'world-capitals',
    name: 'World Capitals',
    description: 'Name the capital cities of countries',
    subject: 'geography',
    gradeLevel: 4,
    icon: '🏛️'
  },
  {
    id: 'continents',
    name: 'Countries & Continents',
    description: 'Match countries to their continents',
    subject: 'geography',
    gradeLevel: 3,
    icon: '🌍'
  },
  {
    id: 'us-states',
    name: 'US States',
    description: 'US states and their capitals',
    subject: 'geography',
    gradeLevel: 4,
    icon: '🇺🇸'
  },
  {
    id: 'landmarks',
    name: 'Famous Landmarks',
    description: 'World-famous landmarks and wonders',
    subject: 'geography',
    gradeLevel: 5,
    icon: '🗽'
  },
  {
    id: 'oceans-rivers',
    name: 'Oceans & Rivers',
    description: 'Bodies of water around the world',
    subject: 'geography',
    gradeLevel: 3,
    icon: '🌊'
  }
];

// Country data organized by difficulty
const COUNTRIES: Record<QuestionDifficulty, CountryData[]> = {
  beginner: [
    { country: 'United States', capital: 'Washington D.C.', continent: 'North America', language: 'English' },
    { country: 'Canada', capital: 'Ottawa', continent: 'North America', language: 'English, French' },
    { country: 'Mexico', capital: 'Mexico City', continent: 'North America', language: 'Spanish' },
    { country: 'United Kingdom', capital: 'London', continent: 'Europe', language: 'English' },
    { country: 'France', capital: 'Paris', continent: 'Europe', language: 'French', landmark: 'Eiffel Tower' },
    { country: 'Germany', capital: 'Berlin', continent: 'Europe', language: 'German' },
    { country: 'Italy', capital: 'Rome', continent: 'Europe', language: 'Italian', landmark: 'Colosseum' },
    { country: 'Spain', capital: 'Madrid', continent: 'Europe', language: 'Spanish' },
    { country: 'China', capital: 'Beijing', continent: 'Asia', language: 'Mandarin', landmark: 'Great Wall' },
    { country: 'Japan', capital: 'Tokyo', continent: 'Asia', language: 'Japanese', landmark: 'Mount Fuji' },
    { country: 'Australia', capital: 'Canberra', continent: 'Oceania', language: 'English', landmark: 'Sydney Opera House' },
    { country: 'Brazil', capital: 'Brasilia', continent: 'South America', language: 'Portuguese' },
  ],
  intermediate: [
    { country: 'India', capital: 'New Delhi', continent: 'Asia', language: 'Hindi, English', landmark: 'Taj Mahal' },
    { country: 'Russia', capital: 'Moscow', continent: 'Europe/Asia', language: 'Russian', landmark: 'Kremlin' },
    { country: 'South Korea', capital: 'Seoul', continent: 'Asia', language: 'Korean' },
    { country: 'Egypt', capital: 'Cairo', continent: 'Africa', language: 'Arabic', landmark: 'Pyramids of Giza' },
    { country: 'South Africa', capital: 'Pretoria', continent: 'Africa', language: 'English, Zulu, Afrikaans' },
    { country: 'Argentina', capital: 'Buenos Aires', continent: 'South America', language: 'Spanish' },
    { country: 'Greece', capital: 'Athens', continent: 'Europe', language: 'Greek', landmark: 'Parthenon' },
    { country: 'Netherlands', capital: 'Amsterdam', continent: 'Europe', language: 'Dutch' },
    { country: 'Sweden', capital: 'Stockholm', continent: 'Europe', language: 'Swedish' },
    { country: 'Norway', capital: 'Oslo', continent: 'Europe', language: 'Norwegian' },
    { country: 'Poland', capital: 'Warsaw', continent: 'Europe', language: 'Polish' },
    { country: 'Turkey', capital: 'Ankara', continent: 'Europe/Asia', language: 'Turkish' },
    { country: 'Thailand', capital: 'Bangkok', continent: 'Asia', language: 'Thai' },
    { country: 'Vietnam', capital: 'Hanoi', continent: 'Asia', language: 'Vietnamese' },
    { country: 'Indonesia', capital: 'Jakarta', continent: 'Asia', language: 'Indonesian' },
  ],
  advanced: [
    { country: 'Kenya', capital: 'Nairobi', continent: 'Africa', language: 'Swahili, English' },
    { country: 'Nigeria', capital: 'Abuja', continent: 'Africa', language: 'English' },
    { country: 'Morocco', capital: 'Rabat', continent: 'Africa', language: 'Arabic, Berber' },
    { country: 'Peru', capital: 'Lima', continent: 'South America', language: 'Spanish', landmark: 'Machu Picchu' },
    { country: 'Chile', capital: 'Santiago', continent: 'South America', language: 'Spanish' },
    { country: 'Colombia', capital: 'Bogota', continent: 'South America', language: 'Spanish' },
    { country: 'Portugal', capital: 'Lisbon', continent: 'Europe', language: 'Portuguese' },
    { country: 'Switzerland', capital: 'Bern', continent: 'Europe', language: 'German, French, Italian' },
    { country: 'Austria', capital: 'Vienna', continent: 'Europe', language: 'German' },
    { country: 'Czech Republic', capital: 'Prague', continent: 'Europe', language: 'Czech' },
    { country: 'Hungary', capital: 'Budapest', continent: 'Europe', language: 'Hungarian' },
    { country: 'Philippines', capital: 'Manila', continent: 'Asia', language: 'Filipino, English' },
    { country: 'Malaysia', capital: 'Kuala Lumpur', continent: 'Asia', language: 'Malay' },
    { country: 'New Zealand', capital: 'Wellington', continent: 'Oceania', language: 'English, Maori' },
    { country: 'Ireland', capital: 'Dublin', continent: 'Europe', language: 'English, Irish' },
  ],
  expert: [
    { country: 'Myanmar', capital: 'Naypyidaw', continent: 'Asia', language: 'Burmese' },
    { country: 'Kazakhstan', capital: 'Astana', continent: 'Asia', language: 'Kazakh, Russian' },
    { country: 'Sri Lanka', capital: 'Sri Jayawardenepura Kotte', continent: 'Asia', language: 'Sinhala, Tamil' },
    { country: 'Tanzania', capital: 'Dodoma', continent: 'Africa', language: 'Swahili, English' },
    { country: 'Bolivia', capital: 'Sucre', continent: 'South America', language: 'Spanish' },
    { country: 'Slovenia', capital: 'Ljubljana', continent: 'Europe', language: 'Slovenian' },
    { country: 'Croatia', capital: 'Zagreb', continent: 'Europe', language: 'Croatian' },
    { country: 'Slovakia', capital: 'Bratislava', continent: 'Europe', language: 'Slovak' },
    { country: 'Lithuania', capital: 'Vilnius', continent: 'Europe', language: 'Lithuanian' },
    { country: 'Latvia', capital: 'Riga', continent: 'Europe', language: 'Latvian' },
    { country: 'Estonia', capital: 'Tallinn', continent: 'Europe', language: 'Estonian' },
    { country: 'Iceland', capital: 'Reykjavik', continent: 'Europe', language: 'Icelandic' },
    { country: 'Mongolia', capital: 'Ulaanbaatar', continent: 'Asia', language: 'Mongolian' },
    { country: 'Nepal', capital: 'Kathmandu', continent: 'Asia', language: 'Nepali' },
    { country: 'Bhutan', capital: 'Thimphu', continent: 'Asia', language: 'Dzongkha' },
  ]
};

// US States data
const US_STATES: USStateData[] = [
  { state: 'Alabama', capital: 'Montgomery', region: 'South', nickname: 'Heart of Dixie' },
  { state: 'Alaska', capital: 'Juneau', region: 'West', nickname: 'The Last Frontier' },
  { state: 'Arizona', capital: 'Phoenix', region: 'Southwest', nickname: 'Grand Canyon State' },
  { state: 'Arkansas', capital: 'Little Rock', region: 'South', nickname: 'Natural State' },
  { state: 'California', capital: 'Sacramento', region: 'West', nickname: 'Golden State' },
  { state: 'Colorado', capital: 'Denver', region: 'West', nickname: 'Centennial State' },
  { state: 'Connecticut', capital: 'Hartford', region: 'Northeast', nickname: 'Constitution State' },
  { state: 'Delaware', capital: 'Dover', region: 'Northeast', nickname: 'First State' },
  { state: 'Florida', capital: 'Tallahassee', region: 'South', nickname: 'Sunshine State' },
  { state: 'Georgia', capital: 'Atlanta', region: 'South', nickname: 'Peach State' },
  { state: 'Hawaii', capital: 'Honolulu', region: 'West', nickname: 'Aloha State' },
  { state: 'Idaho', capital: 'Boise', region: 'West', nickname: 'Gem State' },
  { state: 'Illinois', capital: 'Springfield', region: 'Midwest', nickname: 'Prairie State' },
  { state: 'Indiana', capital: 'Indianapolis', region: 'Midwest', nickname: 'Hoosier State' },
  { state: 'Iowa', capital: 'Des Moines', region: 'Midwest', nickname: 'Hawkeye State' },
  { state: 'Kansas', capital: 'Topeka', region: 'Midwest', nickname: 'Sunflower State' },
  { state: 'Kentucky', capital: 'Frankfort', region: 'South', nickname: 'Bluegrass State' },
  { state: 'Louisiana', capital: 'Baton Rouge', region: 'South', nickname: 'Pelican State' },
  { state: 'Maine', capital: 'Augusta', region: 'Northeast', nickname: 'Pine Tree State' },
  { state: 'Maryland', capital: 'Annapolis', region: 'Northeast', nickname: 'Old Line State' },
  { state: 'Massachusetts', capital: 'Boston', region: 'Northeast', nickname: 'Bay State' },
  { state: 'Michigan', capital: 'Lansing', region: 'Midwest', nickname: 'Great Lakes State' },
  { state: 'Minnesota', capital: 'Saint Paul', region: 'Midwest', nickname: 'Land of 10,000 Lakes' },
  { state: 'Mississippi', capital: 'Jackson', region: 'South', nickname: 'Magnolia State' },
  { state: 'Missouri', capital: 'Jefferson City', region: 'Midwest', nickname: 'Show-Me State' },
  { state: 'Montana', capital: 'Helena', region: 'West', nickname: 'Treasure State' },
  { state: 'Nebraska', capital: 'Lincoln', region: 'Midwest', nickname: 'Cornhusker State' },
  { state: 'Nevada', capital: 'Carson City', region: 'West', nickname: 'Silver State' },
  { state: 'New Hampshire', capital: 'Concord', region: 'Northeast', nickname: 'Granite State' },
  { state: 'New Jersey', capital: 'Trenton', region: 'Northeast', nickname: 'Garden State' },
  { state: 'New Mexico', capital: 'Santa Fe', region: 'Southwest', nickname: 'Land of Enchantment' },
  { state: 'New York', capital: 'Albany', region: 'Northeast', nickname: 'Empire State' },
  { state: 'North Carolina', capital: 'Raleigh', region: 'South', nickname: 'Tar Heel State' },
  { state: 'North Dakota', capital: 'Bismarck', region: 'Midwest', nickname: 'Peace Garden State' },
  { state: 'Ohio', capital: 'Columbus', region: 'Midwest', nickname: 'Buckeye State' },
  { state: 'Oklahoma', capital: 'Oklahoma City', region: 'South', nickname: 'Sooner State' },
  { state: 'Oregon', capital: 'Salem', region: 'West', nickname: 'Beaver State' },
  { state: 'Pennsylvania', capital: 'Harrisburg', region: 'Northeast', nickname: 'Keystone State' },
  { state: 'Rhode Island', capital: 'Providence', region: 'Northeast', nickname: 'Ocean State' },
  { state: 'South Carolina', capital: 'Columbia', region: 'South', nickname: 'Palmetto State' },
  { state: 'South Dakota', capital: 'Pierre', region: 'Midwest', nickname: 'Mount Rushmore State' },
  { state: 'Tennessee', capital: 'Nashville', region: 'South', nickname: 'Volunteer State' },
  { state: 'Texas', capital: 'Austin', region: 'South', nickname: 'Lone Star State' },
  { state: 'Utah', capital: 'Salt Lake City', region: 'West', nickname: 'Beehive State' },
  { state: 'Vermont', capital: 'Montpelier', region: 'Northeast', nickname: 'Green Mountain State' },
  { state: 'Virginia', capital: 'Richmond', region: 'South', nickname: 'Old Dominion' },
  { state: 'Washington', capital: 'Olympia', region: 'West', nickname: 'Evergreen State' },
  { state: 'West Virginia', capital: 'Charleston', region: 'South', nickname: 'Mountain State' },
  { state: 'Wisconsin', capital: 'Madison', region: 'Midwest', nickname: 'Badger State' },
  { state: 'Wyoming', capital: 'Cheyenne', region: 'West', nickname: 'Equality State' },
];

// Famous landmarks
const LANDMARKS: LandmarkData[] = [
  { name: 'Eiffel Tower', location: 'Paris', country: 'France', type: 'Tower' },
  { name: 'Great Wall', location: 'Northern China', country: 'China', type: 'Wall' },
  { name: 'Taj Mahal', location: 'Agra', country: 'India', type: 'Mausoleum' },
  { name: 'Pyramids of Giza', location: 'Giza', country: 'Egypt', type: 'Pyramid' },
  { name: 'Colosseum', location: 'Rome', country: 'Italy', type: 'Amphitheater' },
  { name: 'Statue of Liberty', location: 'New York', country: 'United States', type: 'Statue' },
  { name: 'Big Ben', location: 'London', country: 'United Kingdom', type: 'Clock Tower' },
  { name: 'Sydney Opera House', location: 'Sydney', country: 'Australia', type: 'Opera House' },
  { name: 'Christ the Redeemer', location: 'Rio de Janeiro', country: 'Brazil', type: 'Statue' },
  { name: 'Machu Picchu', location: 'Cusco Region', country: 'Peru', type: 'Ancient City' },
  { name: 'Mount Fuji', location: 'Honshu Island', country: 'Japan', type: 'Mountain' },
  { name: 'Leaning Tower of Pisa', location: 'Pisa', country: 'Italy', type: 'Tower' },
  { name: 'Stonehenge', location: 'Wiltshire', country: 'United Kingdom', type: 'Monument' },
  { name: 'Petra', location: 'Ma\'an Governorate', country: 'Jordan', type: 'Ancient City' },
  { name: 'Acropolis', location: 'Athens', country: 'Greece', type: 'Citadel' },
];

// Oceans and major rivers/lakes
const WATER_BODIES: GeographyFactData[] = [
  { question: 'Which is the largest ocean?', answer: 'Pacific Ocean', wrongAnswers: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'], category: 'oceans-rivers' },
  { question: 'Which ocean is between America and Europe?', answer: 'Atlantic Ocean', wrongAnswers: ['Pacific Ocean', 'Indian Ocean', 'Southern Ocean'], category: 'oceans-rivers' },
  { question: 'Which is the longest river in Africa?', answer: 'Nile River', wrongAnswers: ['Amazon River', 'Congo River', 'Niger River'], category: 'oceans-rivers' },
  { question: 'Which is the longest river in South America?', answer: 'Amazon River', wrongAnswers: ['Nile River', 'Mississippi River', 'Parana River'], category: 'oceans-rivers' },
  { question: 'Which river flows through London?', answer: 'Thames', wrongAnswers: ['Seine', 'Rhine', 'Danube'], category: 'oceans-rivers' },
  { question: 'Which is the largest lake in North America?', answer: 'Lake Superior', wrongAnswers: ['Lake Michigan', 'Lake Huron', 'Lake Ontario'], category: 'oceans-rivers' },
  { question: 'Which sea is between Europe and Africa?', answer: 'Mediterranean Sea', wrongAnswers: ['Red Sea', 'Caribbean Sea', 'Black Sea'], category: 'oceans-rivers' },
  { question: 'Which is the deepest ocean?', answer: 'Pacific Ocean', wrongAnswers: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'], category: 'oceans-rivers' },
  { question: 'Which river flows through Egypt?', answer: 'Nile River', wrongAnswers: ['Tigris River', 'Euphrates River', 'Jordan River'], category: 'oceans-rivers' },
  { question: 'Which is the largest lake in Africa?', answer: 'Lake Victoria', wrongAnswers: ['Lake Tanganyika', 'Lake Malawi', 'Lake Chad'], category: 'oceans-rivers' },
];

export class GeographyQuestionProvider extends BaseQuestionProvider {
  readonly subject: SubjectType = 'geography';
  readonly config: QuestionProviderConfig = {
    subject: 'geography',
    categories: GEOGRAPHY_CATEGORIES,
    supportedDifficulties: ['beginner', 'intermediate', 'advanced', 'expert'],
    defaultDifficulty: 'intermediate'
  };

  generateQuestion(difficulty: QuestionDifficulty, category?: string): Question {
    const questionType = category || this.randomPick([
      'world-capitals',
      'continents',
      'us-states',
      'landmarks',
      'oceans-rivers'
    ]);

    switch (questionType) {
      case 'world-capitals':
        return this._createCapitalQuestion(difficulty);
      case 'continents':
        return this._createContinentQuestion(difficulty);
      case 'us-states':
        return this._createUSStateQuestion(difficulty);
      case 'landmarks':
        return this._createLandmarkQuestion(difficulty);
      case 'oceans-rivers':
        return this._createWaterBodyQuestion(difficulty);
      default:
        return this._createCapitalQuestion(difficulty);
    }
  }

  getStats(): {
    totalQuestions: number;
    questionsPerCategory: Record<string, number>;
    questionsPerDifficulty: Record<QuestionDifficulty, number>;
  } {
    const countriesTotal = Object.values(COUNTRIES).reduce((sum, arr) => sum + arr.length, 0);

    return {
      totalQuestions: countriesTotal * 2 + US_STATES.length * 2 + LANDMARKS.length + WATER_BODIES.length,
      questionsPerCategory: {
        'world-capitals': countriesTotal,
        'continents': countriesTotal,
        'us-states': US_STATES.length * 2,
        'landmarks': LANDMARKS.length,
        'oceans-rivers': WATER_BODIES.length
      },
      questionsPerDifficulty: {
        beginner: COUNTRIES.beginner.length * 2 + 20,
        intermediate: COUNTRIES.intermediate.length * 2 + 20,
        advanced: COUNTRIES.advanced.length * 2 + 20,
        expert: COUNTRIES.expert.length * 2 + 20
      }
    };
  }

  private _createCapitalQuestion(difficulty: QuestionDifficulty): Question {
    const countries = COUNTRIES[difficulty];
    const country = this.randomPick(countries);

    // Get wrong capitals from same difficulty level
    const otherCapitals = countries
      .filter(c => c.capital !== country.capital)
      .map(c => c.capital);
    const wrongAnswers = this.randomPickN(otherCapitals, 3);

    return {
      id: this.generateId(),
      subject: this.subject,
      category: 'world-capitals',
      difficulty,
      questionText: `What is the capital of ${country.country}?`,
      correctAnswer: country.capital,
      wrongAnswers,
      explanation: `${country.capital} is the capital of ${country.country}`,
      tags: ['capitals', country.continent.toLowerCase()]
    };
  }

  private _createContinentQuestion(difficulty: QuestionDifficulty): Question {
    const countries = COUNTRIES[difficulty];
    const country = this.randomPick(countries);

    const allContinents = ['North America', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania', 'Antarctica'];
    const wrongContinents = allContinents
      .filter(c => c !== country.continent && !country.continent.includes(c))
      .slice(0, 3);

    return {
      id: this.generateId(),
      subject: this.subject,
      category: 'continents',
      difficulty,
      questionText: `On which continent is ${country.country} located?`,
      correctAnswer: country.continent,
      wrongAnswers: this.shuffle(wrongContinents).slice(0, 3),
      explanation: `${country.country} is located in ${country.continent}`,
      tags: ['continents', country.continent.toLowerCase()]
    };
  }

  private _createUSStateQuestion(difficulty: QuestionDifficulty): Question {
    const state = this.randomPick(US_STATES);

    // Randomly choose between asking capital or state
    const askCapital = Math.random() > 0.5;

    if (askCapital) {
      const otherCapitals = US_STATES
        .filter(s => s.capital !== state.capital)
        .map(s => s.capital);
      const wrongAnswers = this.randomPickN(otherCapitals, 3);

      return {
        id: this.generateId(),
        subject: this.subject,
        category: 'us-states',
        difficulty,
        questionText: `What is the capital of ${state.state}?`,
        questionSubtext: state.nickname ? `(${state.nickname})` : undefined,
        correctAnswer: state.capital,
        wrongAnswers,
        explanation: `${state.capital} is the capital of ${state.state}`,
        tags: ['us-states', 'capitals', state.region.toLowerCase()]
      };
    } else {
      const otherStates = US_STATES
        .filter(s => s.state !== state.state)
        .map(s => s.state);
      const wrongAnswers = this.randomPickN(otherStates, 3);

      return {
        id: this.generateId(),
        subject: this.subject,
        category: 'us-states',
        difficulty,
        questionText: `${state.capital} is the capital of which US state?`,
        correctAnswer: state.state,
        wrongAnswers,
        explanation: `${state.capital} is the capital of ${state.state}`,
        tags: ['us-states', state.region.toLowerCase()]
      };
    }
  }

  private _createLandmarkQuestion(difficulty: QuestionDifficulty): Question {
    const landmark = this.randomPick(LANDMARKS);

    // Ask where the landmark is located
    const otherCountries = LANDMARKS
      .filter(l => l.country !== landmark.country)
      .map(l => l.country);
    const wrongAnswers = [...new Set(this.randomPickN(otherCountries, 3))];

    // Fill if not enough unique countries
    const extraCountries = ['Germany', 'Spain', 'Canada', 'Mexico', 'Russia'];
    while (wrongAnswers.length < 3) {
      const extra = this.randomPick(extraCountries);
      if (extra !== landmark.country && !wrongAnswers.includes(extra)) {
        wrongAnswers.push(extra);
      }
    }

    return {
      id: this.generateId(),
      subject: this.subject,
      category: 'landmarks',
      difficulty,
      questionText: `In which country is the ${landmark.name} located?`,
      correctAnswer: landmark.country,
      wrongAnswers: wrongAnswers.slice(0, 3),
      explanation: `The ${landmark.name} is located in ${landmark.location}, ${landmark.country}`,
      tags: ['landmarks', landmark.type.toLowerCase()]
    };
  }

  private _createWaterBodyQuestion(difficulty: QuestionDifficulty): Question {
    const fact = this.randomPick(WATER_BODIES);

    return {
      id: this.generateId(),
      subject: this.subject,
      category: 'oceans-rivers',
      difficulty,
      questionText: fact.question,
      correctAnswer: fact.answer,
      wrongAnswers: [...fact.wrongAnswers],
      explanation: `The answer is ${fact.answer}`,
      tags: ['water', 'oceans', 'rivers']
    };
  }
}
