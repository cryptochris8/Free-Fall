/**
 * Tournament Types - Data structures for the tournament system
 *
 * Supports:
 * - Quick Match (2-4 players, instant)
 * - Bracket Tournaments (8-32 players)
 * - Leagues (ongoing competitions)
 * - Challenges (1v1 direct challenges)
 */

import type { Player } from 'hytopia';
import type { SubjectType, QuestionDifficulty } from '../questions/QuestionProvider';

// ============ Tournament Type Enums ============

export type TournamentType = 'quick-match' | 'bracket' | 'league' | 'challenge';
export type TournamentStatus = 'waiting' | 'starting' | 'in-progress' | 'completed' | 'cancelled';
export type TournamentVisibility = 'public' | 'private';

// ============ Participant Types ============

export interface TournamentParticipant {
  playerId: string;
  username: string;
  joinedAt: number;

  // Match stats
  currentScore: number;
  correctAnswers: number;
  wrongAnswers: number;
  averageResponseTime: number;
  streak: number;
  bestStreak: number;

  // Tournament progress
  matchesPlayed: number;
  matchesWon: number;
  eliminated: boolean;
  finalPlacement?: number;

  // Connection state
  isConnected: boolean;
  lastActiveAt: number;
}

// ============ Match Types ============

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  roundNumber: number;
  matchNumber: number;

  // Participants
  participant1Id: string | null;
  participant2Id: string | null;

  // Match state
  status: 'pending' | 'in-progress' | 'completed';
  winnerId: string | null;

  // Scores
  participant1Score: number;
  participant2Score: number;

  // Questions
  currentQuestionIndex: number;
  totalQuestions: number;

  // Timing
  startedAt?: number;
  completedAt?: number;
}

// ============ Round Types ============

export interface TournamentRound {
  roundNumber: number;
  matches: TournamentMatch[];
  status: 'pending' | 'in-progress' | 'completed';
  startedAt?: number;
  completedAt?: number;
}

// ============ Tournament Configuration ============

export interface TournamentConfig {
  // Basic settings
  name: string;
  description?: string;
  type: TournamentType;
  visibility: TournamentVisibility;

  // Game settings
  subject: SubjectType;
  difficulty: QuestionDifficulty;
  category?: string; // Optional specific category

  // Match settings
  questionsPerMatch: number;
  timePerQuestion?: number; // Seconds, optional time limit

  // Participant settings
  minParticipants: number;
  maxParticipants: number;

  // Timing
  startDelay?: number; // Seconds to wait after min participants join
  registrationDeadline?: number; // Timestamp

  // Private tournament settings
  inviteCode?: string;

  // Official tournament (rewards enabled)
  isOfficial: boolean;

  // Rewards (only for official tournaments)
  rewards?: TournamentReward[];
}

// ============ Reward Types ============

export interface TournamentReward {
  placement: number; // 1st, 2nd, 3rd, etc.
  type: 'cosmetic' | 'title' | 'badge' | 'xp' | 'currency';
  itemId?: string;
  amount?: number;
  description: string;
}

// ============ Main Tournament Interface ============

export interface Tournament {
  // Identity
  id: string;
  config: TournamentConfig;

  // Host/Creator
  creatorId: string;
  creatorUsername: string;

  // State
  status: TournamentStatus;

  // Participants
  participants: Map<string, TournamentParticipant>;

  // Bracket/Rounds (for bracket tournaments)
  rounds: TournamentRound[];
  currentRound: number;

  // Current match (for quick match / single match)
  currentMatch?: TournamentMatch;

  // Timing
  createdAt: number;
  startedAt?: number;
  completedAt?: number;

  // Results
  winnerId?: string;
  finalPlacements?: Map<string, number>; // playerId -> placement
}

// ============ Quick Match Types ============

export interface QuickMatchConfig {
  subject: SubjectType;
  difficulty: QuestionDifficulty;
  category?: string;
  playerCount: 2 | 3 | 4;
  questionsPerRound: number;
}

export interface QuickMatchState {
  matchId: string;
  players: TournamentParticipant[];
  currentQuestion: number;
  totalQuestions: number;
  status: 'waiting' | 'countdown' | 'playing' | 'results';
  countdownSeconds?: number;
  questionStartTime?: number;
}

// ============ League Types ============

export interface LeagueSeason {
  id: string;
  name: string;
  startDate: number;
  endDate: number;
  subject: SubjectType;
  isActive: boolean;
}

export interface LeagueStanding {
  playerId: string;
  username: string;
  points: number;
  matchesPlayed: number;
  matchesWon: number;
  totalCorrect: number;
  totalWrong: number;
  averageScore: number;
  rank: number;
}

// ============ Challenge Types ============

export interface DirectChallenge {
  id: string;
  challengerId: string;
  challengerUsername: string;
  challengedId: string;
  challengedUsername: string;

  config: {
    subject: SubjectType;
    difficulty: QuestionDifficulty;
    questionsPerMatch: number;
  };

  status: 'pending' | 'accepted' | 'declined' | 'in-progress' | 'completed' | 'expired';

  createdAt: number;
  expiresAt: number;
  matchId?: string;
}

// ============ Persistence Types ============

export interface PersistedTournament {
  id: string;
  config: TournamentConfig;
  creatorId: string;
  creatorUsername: string;
  status: TournamentStatus;

  // Serialized participants (Map -> Array)
  participants: Array<{
    id: string;
    data: TournamentParticipant;
  }>;

  rounds: TournamentRound[];
  currentRound: number;

  createdAt: number;
  startedAt?: number;
  completedAt?: number;

  winnerId?: string;
  finalPlacements?: Array<{
    playerId: string;
    placement: number;
  }>;
}

// ============ Event Types ============

export type TournamentEventType =
  | 'tournament-created'
  | 'player-joined'
  | 'player-left'
  | 'tournament-started'
  | 'round-started'
  | 'match-started'
  | 'question-started'
  | 'answer-submitted'
  | 'match-completed'
  | 'round-completed'
  | 'tournament-completed'
  | 'tournament-cancelled';

export interface TournamentEvent {
  type: TournamentEventType;
  tournamentId: string;
  timestamp: number;
  data?: any;
}

// ============ UI Message Types ============

export interface TournamentUIMessage {
  type: string;
  tournamentId?: string;
  [key: string]: any;
}

// ============ Lobby Display Types ============

export interface TournamentLobbyInfo {
  id: string;
  name: string;
  type: TournamentType;
  subject: SubjectType;
  difficulty: QuestionDifficulty;
  participantCount: number;
  maxParticipants: number;
  status: TournamentStatus;
  isOfficial: boolean;
  creatorUsername: string;
}
