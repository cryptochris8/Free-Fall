/**
 * Shared TypeScript interfaces for the Free-Fall game
 */

import type { Player, PlayerEntity, Entity, World } from 'hytopia';

// ============ Core Game Types ============

export type Difficulty = 'beginner' | 'moderate' | 'hard';

export interface PlayerGameState {
  score: number;
  questionsAnswered: number;
  gameActive: boolean;
  currentAnswer: number;
  difficulty: Difficulty;
  isFinalFall: boolean;
  currentGravityScale: number;
  streak: number;
  sessionStartTime: number;
}

export interface PlayerData {
  player: Player;
  entity: PlayerEntity;
  gameState: PlayerGameState;
}

// ============ Math Problem Types ============

export type MathOperation = '+' | '-' | '*' | '/';

export interface MathProblem {
  id: string;
  num1: number;
  num2: number;
  operation: MathOperation;
  correctAnswer: number;
  wrongAnswers: number[];
  topic?: MathTopic;
  difficulty?: DifficultyLevel;
  grade?: number;
}

// ============ Educational System Types ============

export enum MathTopic {
  BASIC_ARITHMETIC = 'arithmetic',
  FRACTIONS = 'fractions',
  DECIMALS = 'decimals',
  WORD_PROBLEMS = 'word_problems',
  GEOMETRY = 'geometry',
  ALGEBRA = 'algebra'
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export interface CurriculumQuestion {
  id: string;
  topic: MathTopic;
  difficulty: DifficultyLevel;
  question: string;
  correctAnswer: number;
  wrongAnswers: number[];
  explanation?: string;
  grade: number;
}

export interface TopicProgress {
  topic: MathTopic;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
  currentStreak: number;
  bestStreak: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  difficultyLevel: DifficultyLevel;
}

export interface PlayerProgress {
  playerId: string;
  currentGrade: number;
  currentTopic: MathTopic;
  topicProgress: Map<MathTopic, TopicProgress>;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  overallAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  averageResponseTime: number;
  lastPlayedDate: Date;
}

// ============ Achievement Types ============

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: number;
  type: 'streak' | 'total_correct' | 'accuracy' | 'speed' | 'games_completed' | 'topic_mastery';
}

export interface PlayerAchievements {
  playerId: string;
  unlockedAchievements: Set<string>;
  progress: Map<string, number>;
}

export interface AchievementNotification {
  achievement: Achievement;
  unlockedAt: Date;
}

// ============ Power-Up Types ============

export type PowerUpType = 'slowmotion' | 'shield' | 'magnet' | 'doublepoints' | 'rewind';

export interface ActivePowerUp {
  type: PowerUpType;
  playerId: string;
  startTime: number;
  duration: number;
  uses?: number;
  data?: any;
}

export interface PowerUpConfig {
  type: PowerUpType;
  name: string;
  description: string;
  duration: number;
  color: { r: number; g: number; b: number };
  icon: string;
  modelUri?: string;
  textureUri?: string;
}

// ============ Multiplayer Types ============

export interface RaceParticipant {
  player: Player;
  playerEntity: PlayerEntity;
  currentQuestion: number;
  correctAnswers: number;
  wrongAnswers: number;
  completionTime?: number;
  isFinished: boolean;
  startTime: number;
}

export interface RaceSession {
  id: string;
  hostId: string;
  participants: Map<string, RaceParticipant>;
  questions: CurriculumQuestion[];
  startTime: number;
  endTime?: number;
  isActive: boolean;
  winner?: string;
}

export interface TeamMember {
  player: Player;
  playerEntity: PlayerEntity;
  correctAnswers: number;
  wrongAnswers: number;
  contributionScore: number;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  members: Map<string, TeamMember>;
  totalScore: number;
  sharedLives: number;
  teamCombo: number;
}

export interface TeamChallenge {
  id: string;
  teams: Map<string, Team>;
  questions: CurriculumQuestion[];
  startTime: number;
  endTime?: number;
  isActive: boolean;
  winningTeam?: string;
  difficulty: Difficulty;
  mode: 'survival' | 'timed' | 'score-attack';
}

// ============ Leaderboard Types ============

export type LeaderboardCategory = 'daily_score' | 'weekly_score' | 'all_time_score' | 'race_wins' | 'accuracy' | 'streak';

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  score: number;
  rank: number;
  additionalData?: any;
}

export interface PlayerStats {
  playerId: string;
  username: string;
  totalGamesPlayed: number;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  bestStreak: number;
  averageAccuracy: number;
  totalScore: number;
  bestSingleGameScore: number;
  racesWon: number;
  racesParticipated: number;
  teamChallengesWon: number;
  lastPlayed: number;
}

// ============ Social Types ============

export interface Friend {
  playerId: string;
  username: string;
  addedDate: number;
  isOnline: boolean;
  lastSeen: number;
}

export interface FriendRequest {
  id: string;
  fromPlayerId: string;
  fromUsername: string;
  toPlayerId: string;
  sentTime: number;
  message?: string;
}

export interface PlayerProfile {
  playerId: string;
  username: string;
  bio: string;
  favoriteSubject: string;
  playStyle: 'competitive' | 'casual' | 'learner';
  friends: Map<string, Friend>;
  blockedPlayers: Set<string>;
  visibility: 'public' | 'friends' | 'private';
}

// ============ Accessibility Types ============

export interface AccessibilitySettings {
  colorBlindFriendly: boolean;
  highContrast: boolean;
  textSize: 'small' | 'medium' | 'large' | 'extra-large';
  reducedMotion: boolean;
  flashReduction: boolean;
  audioDescriptions: boolean;
  soundVolume: number;
  musicVolume: number;
  audioCues: boolean;
  oneHandedMode: boolean;
  extendedTimeouts: boolean;
  hapticFeedback: boolean;
}

// ============ UI Message Types ============

export type UIMessageType =
  // Core game
  | 'start-game'
  | 'restart-game'
  | 'use-rewind'
  | 'show-progress'
  | 'show-analytics'
  // Multiplayer
  | 'join-race-lobby'
  | 'leave-race-lobby'
  | 'start-race'
  | 'join-team-lobby'
  | 'join-team'
  | 'leave-team-lobby'
  | 'start-team-challenge'
  | 'request-leaderboard-data'
  | 'request-friends-list'
  | 'send-friend-request'
  | 'accept-friend-request'
  | 'decline-friend-request'
  // Accessibility
  | 'update-accessibility-settings';

export interface UIMessage {
  type: UIMessageType;
  [key: string]: any;
}

// ============ Constants ============

export const GAME_CONSTANTS = {
  MAX_QUESTIONS: 10,
  PLAYER_SPAWN_POSITION: { x: 0, y: 80, z: 0 },
  PLAYER_RESET_POSITION: { x: 0, y: 80, z: 0 },
  ANSWER_BLOCK_Y: 0,
  LANDING_PLATFORM_Y: -40,
  FALL_THRESHOLD_Y: -5,

  PLAYER_MOVE_SPEED: 5,
  PLAYER_GRAVITY_SCALE: 0.1, // Very slow gravity for assessing labels
  GRAVITY_INCREASE_PER_CORRECT: 0.05,
  MAX_GRAVITY_MULTIPLIER: 3,

  POWERUP_SPAWN_CHANCE: 0.3,
  GAME_RESET_DELAY_MS: 500,

  UI_PATH: 'ui/index.html',
  AUDIO_MUSIC: 'audio/music/Free-fall.mp3',
  AUDIO_CORRECT: 'audio/sfx/correct.mp3',
  AUDIO_WRONG: 'audio/sfx/wrong.mp3',
  AUDIO_LANDING: 'audio/sfx/landing.mp3',
  AUDIO_OPENING_VOICE: 'audio/sfx/ui/opening-voice.mp3',
  AUDIO_GAME_OVER_VOICE: 'audio/sfx/ui/game-over-voice.mp3'
} as const;
