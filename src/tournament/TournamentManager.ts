/**
 * TournamentManager - Handles all tournament logic
 *
 * Features:
 * - Create/join tournaments
 * - Quick match matchmaking
 * - Bracket tournament progression
 * - Persistent tournament storage
 * - Official vs community tournaments
 */

import type { Player, World } from 'hytopia';
import type {
  Tournament,
  TournamentConfig,
  TournamentParticipant,
  TournamentMatch,
  TournamentRound,
  TournamentType,
  TournamentStatus,
  QuickMatchConfig,
  QuickMatchState,
  DirectChallenge,
  PersistedTournament,
  TournamentLobbyInfo
} from './TournamentTypes';
import type { SubjectType, QuestionDifficulty, Question } from '../questions/QuestionProvider';
import { QuestionProviderRegistry } from '../questions/QuestionProvider';

// ============ Constants ============

const QUICK_MATCH_TIMEOUT = 60000; // 60 seconds to find a match
const MATCH_START_COUNTDOWN = 5; // 5 second countdown
const QUESTION_TIME_LIMIT = 15000; // 15 seconds per question (default)
const BRACKET_ROUND_DELAY = 10000; // 10 seconds between rounds
const CHALLENGE_EXPIRY = 300000; // 5 minutes to accept challenge

// ============ TournamentManager ============

export class TournamentManager {
  private static _instance: TournamentManager;
  private _world: World | null = null;
  private _questionRegistry: QuestionProviderRegistry;

  // Active tournaments
  private _tournaments: Map<string, Tournament> = new Map();

  // Quick match queues (by subject+difficulty+playerCount)
  private _quickMatchQueues: Map<string, Set<string>> = new Map();

  // Active quick matches
  private _quickMatches: Map<string, QuickMatchState> = new Map();

  // Player -> their current tournament/match
  private _playerTournaments: Map<string, string> = new Map();
  private _playerQuickMatches: Map<string, string> = new Map();

  // Pending challenges
  private _pendingChallenges: Map<string, DirectChallenge> = new Map();

  // Callbacks
  private _onTournamentUpdate: ((tournament: Tournament) => void)[] = [];
  private _onQuickMatchUpdate: ((match: QuickMatchState) => void)[] = [];

  private constructor() {
    this._questionRegistry = QuestionProviderRegistry.getInstance();
    console.log('[TournamentManager] Initialized');
  }

  public static getInstance(): TournamentManager {
    if (!TournamentManager._instance) {
      TournamentManager._instance = new TournamentManager();
    }
    return TournamentManager._instance;
  }

  public setWorld(world: World): void {
    this._world = world;
  }

  // ============ Tournament Creation ============

  /**
   * Create a new tournament
   */
  public createTournament(creator: Player, config: TournamentConfig): Tournament | null {
    // Validate config
    if (!this._validateTournamentConfig(config)) {
      console.error('[TournamentManager] Invalid tournament config');
      return null;
    }

    // Check if player is already in a tournament
    if (this._playerTournaments.has(creator.id)) {
      console.warn(`[TournamentManager] Player ${creator.username} already in a tournament`);
      return null;
    }

    const tournament: Tournament = {
      id: this._generateId(),
      config,
      creatorId: creator.id,
      creatorUsername: creator.username,
      status: 'waiting',
      participants: new Map(),
      rounds: [],
      currentRound: 0,
      createdAt: Date.now()
    };

    // Auto-join creator
    this._addParticipant(tournament, creator);

    // Generate invite code for private tournaments
    if (config.visibility === 'private' && !config.inviteCode) {
      tournament.config.inviteCode = this._generateInviteCode();
    }

    this._tournaments.set(tournament.id, tournament);
    this._playerTournaments.set(creator.id, tournament.id);

    console.log(`[TournamentManager] Created ${config.type} tournament: ${tournament.id} by ${creator.username}`);

    return tournament;
  }

  /**
   * Join an existing tournament
   */
  public joinTournament(player: Player, tournamentId: string, inviteCode?: string): boolean {
    const tournament = this._tournaments.get(tournamentId);
    if (!tournament) {
      console.warn(`[TournamentManager] Tournament not found: ${tournamentId}`);
      return false;
    }

    // Check if already in a tournament
    if (this._playerTournaments.has(player.id)) {
      console.warn(`[TournamentManager] Player ${player.username} already in a tournament`);
      return false;
    }

    // Check tournament status
    if (tournament.status !== 'waiting') {
      console.warn(`[TournamentManager] Tournament ${tournamentId} is not accepting participants`);
      return false;
    }

    // Check capacity
    if (tournament.participants.size >= tournament.config.maxParticipants) {
      console.warn(`[TournamentManager] Tournament ${tournamentId} is full`);
      return false;
    }

    // Check invite code for private tournaments
    if (tournament.config.visibility === 'private') {
      if (!inviteCode || inviteCode !== tournament.config.inviteCode) {
        console.warn(`[TournamentManager] Invalid invite code for tournament ${tournamentId}`);
        return false;
      }
    }

    this._addParticipant(tournament, player);
    this._playerTournaments.set(player.id, tournamentId);

    console.log(`[TournamentManager] ${player.username} joined tournament ${tournamentId}`);

    // Check if we should auto-start
    this._checkAutoStart(tournament);

    this._notifyTournamentUpdate(tournament);
    return true;
  }

  /**
   * Leave a tournament
   */
  public leaveTournament(player: Player): boolean {
    const tournamentId = this._playerTournaments.get(player.id);
    if (!tournamentId) return false;

    const tournament = this._tournaments.get(tournamentId);
    if (!tournament) return false;

    // Can only leave if waiting
    if (tournament.status !== 'waiting') {
      // Mark as disconnected instead
      const participant = tournament.participants.get(player.id);
      if (participant) {
        participant.isConnected = false;
        participant.lastActiveAt = Date.now();
      }
      return false;
    }

    tournament.participants.delete(player.id);
    this._playerTournaments.delete(player.id);

    console.log(`[TournamentManager] ${player.username} left tournament ${tournamentId}`);

    // Cancel if no participants left
    if (tournament.participants.size === 0) {
      this._cancelTournament(tournament, 'All participants left');
    } else {
      this._notifyTournamentUpdate(tournament);
    }

    return true;
  }

  // ============ Quick Match ============

  /**
   * Join quick match queue
   */
  public joinQuickMatchQueue(player: Player, config: QuickMatchConfig): boolean {
    // Check if already in queue or match
    if (this._playerQuickMatches.has(player.id)) {
      console.warn(`[TournamentManager] Player ${player.username} already in a quick match`);
      return false;
    }

    const queueKey = this._getQuickMatchQueueKey(config);

    // Get or create queue
    let queue = this._quickMatchQueues.get(queueKey);
    if (!queue) {
      queue = new Set();
      this._quickMatchQueues.set(queueKey, queue);
    }

    queue.add(player.id);
    console.log(`[TournamentManager] ${player.username} joined quick match queue (${queueKey}), queue size: ${queue.size}`);

    // Check if we have enough players
    if (queue.size >= config.playerCount) {
      this._startQuickMatch(queueKey, config);
    } else {
      // Set timeout for matchmaking
      setTimeout(() => {
        this._checkQuickMatchTimeout(player.id, queueKey);
      }, QUICK_MATCH_TIMEOUT);
    }

    return true;
  }

  /**
   * Leave quick match queue
   */
  public leaveQuickMatchQueue(player: Player): boolean {
    // Remove from all queues
    for (const [key, queue] of this._quickMatchQueues) {
      if (queue.has(player.id)) {
        queue.delete(player.id);
        console.log(`[TournamentManager] ${player.username} left quick match queue (${key})`);
        return true;
      }
    }
    return false;
  }

  /**
   * Submit answer in quick match
   */
  public submitQuickMatchAnswer(player: Player, answer: string): boolean {
    const matchId = this._playerQuickMatches.get(player.id);
    if (!matchId) return false;

    const match = this._quickMatches.get(matchId);
    if (!match || match.status !== 'playing') return false;

    // Find participant
    const participant = match.players.find(p => p.playerId === player.id);
    if (!participant) return false;

    // Get current question
    const question = this._getCurrentQuickMatchQuestion(match);
    if (!question) return false;

    // Calculate response time
    const responseTime = match.questionStartTime
      ? (Date.now() - match.questionStartTime) / 1000
      : 0;

    // Validate answer
    const isCorrect = this._questionRegistry.validateAnswer(question, answer);

    if (isCorrect) {
      participant.correctAnswers++;
      participant.currentScore += this._calculateQuickMatchPoints(responseTime);
      participant.streak++;
      if (participant.streak > participant.bestStreak) {
        participant.bestStreak = participant.streak;
      }
    } else {
      participant.wrongAnswers++;
      participant.streak = 0;
    }

    // Update average response time
    const totalAnswers = participant.correctAnswers + participant.wrongAnswers;
    participant.averageResponseTime =
      ((participant.averageResponseTime * (totalAnswers - 1)) + responseTime) / totalAnswers;

    this._notifyQuickMatchUpdate(match);

    return isCorrect;
  }

  // ============ Direct Challenges ============

  /**
   * Create a direct challenge to another player
   */
  public createChallenge(
    challenger: Player,
    challengedId: string,
    challengedUsername: string,
    config: { subject: SubjectType; difficulty: QuestionDifficulty; questionsPerMatch: number }
  ): DirectChallenge | null {
    // Check if challenger is available
    if (this._playerTournaments.has(challenger.id) || this._playerQuickMatches.has(challenger.id)) {
      console.warn(`[TournamentManager] Challenger ${challenger.username} is not available`);
      return null;
    }

    const challenge: DirectChallenge = {
      id: this._generateId(),
      challengerId: challenger.id,
      challengerUsername: challenger.username,
      challengedId,
      challengedUsername,
      config,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + CHALLENGE_EXPIRY
    };

    this._pendingChallenges.set(challenge.id, challenge);

    console.log(`[TournamentManager] Challenge created: ${challenger.username} vs ${challengedUsername}`);

    // Set expiry timeout
    setTimeout(() => {
      this._expireChallenge(challenge.id);
    }, CHALLENGE_EXPIRY);

    return challenge;
  }

  /**
   * Accept a challenge
   */
  public acceptChallenge(player: Player, challengeId: string): boolean {
    const challenge = this._pendingChallenges.get(challengeId);
    if (!challenge) return false;

    if (challenge.challengedId !== player.id) {
      console.warn(`[TournamentManager] Player ${player.username} cannot accept this challenge`);
      return false;
    }

    if (challenge.status !== 'pending') return false;

    // Check availability
    if (this._playerTournaments.has(player.id) || this._playerQuickMatches.has(player.id)) {
      return false;
    }

    challenge.status = 'accepted';

    // Create a quick match for the challenge
    const matchConfig: QuickMatchConfig = {
      subject: challenge.config.subject,
      difficulty: challenge.config.difficulty,
      playerCount: 2,
      questionsPerRound: challenge.config.questionsPerMatch
    };

    // Start the match directly
    this._startChallengeMatch(challenge, matchConfig);

    return true;
  }

  /**
   * Decline a challenge
   */
  public declineChallenge(player: Player, challengeId: string): boolean {
    const challenge = this._pendingChallenges.get(challengeId);
    if (!challenge) return false;

    if (challenge.challengedId !== player.id) return false;
    if (challenge.status !== 'pending') return false;

    challenge.status = 'declined';
    this._pendingChallenges.delete(challengeId);

    console.log(`[TournamentManager] Challenge declined by ${player.username}`);

    return true;
  }

  // ============ Tournament Queries ============

  /**
   * Get list of public tournaments for lobby display
   */
  public getPublicTournaments(): TournamentLobbyInfo[] {
    const publicTournaments: TournamentLobbyInfo[] = [];

    for (const tournament of this._tournaments.values()) {
      if (tournament.config.visibility === 'public' && tournament.status === 'waiting') {
        publicTournaments.push({
          id: tournament.id,
          name: tournament.config.name,
          type: tournament.config.type,
          subject: tournament.config.subject,
          difficulty: tournament.config.difficulty,
          participantCount: tournament.participants.size,
          maxParticipants: tournament.config.maxParticipants,
          status: tournament.status,
          isOfficial: tournament.config.isOfficial,
          creatorUsername: tournament.creatorUsername
        });
      }
    }

    return publicTournaments;
  }

  /**
   * Get tournament by ID
   */
  public getTournament(tournamentId: string): Tournament | undefined {
    return this._tournaments.get(tournamentId);
  }

  /**
   * Get player's current tournament
   */
  public getPlayerTournament(playerId: string): Tournament | undefined {
    const tournamentId = this._playerTournaments.get(playerId);
    if (!tournamentId) return undefined;
    return this._tournaments.get(tournamentId);
  }

  /**
   * Get player's current quick match
   */
  public getPlayerQuickMatch(playerId: string): QuickMatchState | undefined {
    const matchId = this._playerQuickMatches.get(playerId);
    if (!matchId) return undefined;
    return this._quickMatches.get(matchId);
  }

  /**
   * Get pending challenges for a player
   */
  public getPendingChallenges(playerId: string): DirectChallenge[] {
    const challenges: DirectChallenge[] = [];
    for (const challenge of this._pendingChallenges.values()) {
      if (challenge.challengedId === playerId && challenge.status === 'pending') {
        challenges.push(challenge);
      }
    }
    return challenges;
  }

  // ============ Callbacks ============

  public onTournamentUpdate(callback: (tournament: Tournament) => void): void {
    this._onTournamentUpdate.push(callback);
  }

  public onQuickMatchUpdate(callback: (match: QuickMatchState) => void): void {
    this._onQuickMatchUpdate.push(callback);
  }

  // ============ Private Methods ============

  private _validateTournamentConfig(config: TournamentConfig): boolean {
    // Validate basic requirements
    if (!config.name || config.name.length < 3) return false;
    if (!config.subject) return false;
    if (!config.difficulty) return false;
    if (config.minParticipants < 2) return false;
    if (config.maxParticipants < config.minParticipants) return false;
    if (config.questionsPerMatch < 1) return false;

    // Validate participant counts by type
    switch (config.type) {
      case 'quick-match':
        if (config.maxParticipants > 4) return false;
        break;
      case 'bracket':
        // Bracket tournaments should have power-of-2 participants
        const validSizes = [4, 8, 16, 32];
        if (!validSizes.includes(config.maxParticipants)) return false;
        break;
      case 'league':
        if (config.maxParticipants < 4) return false;
        break;
      case 'challenge':
        if (config.maxParticipants !== 2) return false;
        break;
    }

    // Only official tournaments can have rewards
    if (config.rewards && config.rewards.length > 0 && !config.isOfficial) {
      console.warn('[TournamentManager] Only official tournaments can have rewards');
      return false;
    }

    return true;
  }

  private _addParticipant(tournament: Tournament, player: Player): void {
    const participant: TournamentParticipant = {
      playerId: player.id,
      username: player.username,
      joinedAt: Date.now(),
      currentScore: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      averageResponseTime: 0,
      streak: 0,
      bestStreak: 0,
      matchesPlayed: 0,
      matchesWon: 0,
      eliminated: false,
      isConnected: true,
      lastActiveAt: Date.now()
    };

    tournament.participants.set(player.id, participant);
  }

  private _checkAutoStart(tournament: Tournament): void {
    // Start when we have enough participants
    if (tournament.participants.size >= tournament.config.minParticipants) {
      // For quick matches, start immediately at max
      if (tournament.config.type === 'quick-match' &&
        tournament.participants.size >= tournament.config.maxParticipants) {
        this._startTournament(tournament);
        return;
      }

      // For other types, set a delay or wait for max
      if (tournament.config.startDelay) {
        setTimeout(() => {
          if (tournament.status === 'waiting') {
            this._startTournament(tournament);
          }
        }, tournament.config.startDelay * 1000);
      }
    }
  }

  private _startTournament(tournament: Tournament): void {
    if (tournament.status !== 'waiting') return;

    tournament.status = 'starting';
    tournament.startedAt = Date.now();

    console.log(`[TournamentManager] Starting tournament ${tournament.id} with ${tournament.participants.size} participants`);

    // Generate bracket/matches based on type
    switch (tournament.config.type) {
      case 'quick-match':
        this._setupQuickMatchTournament(tournament);
        break;
      case 'bracket':
        this._setupBracketTournament(tournament);
        break;
      case 'league':
        this._setupLeagueTournament(tournament);
        break;
      case 'challenge':
        this._setupChallengeTournament(tournament);
        break;
    }

    tournament.status = 'in-progress';
    this._notifyTournamentUpdate(tournament);
  }

  private _setupQuickMatchTournament(tournament: Tournament): void {
    // Single match with all participants
    const participants = Array.from(tournament.participants.keys());

    tournament.currentMatch = {
      id: this._generateId(),
      tournamentId: tournament.id,
      roundNumber: 1,
      matchNumber: 1,
      participant1Id: participants[0] || null,
      participant2Id: participants[1] || null,
      status: 'pending',
      winnerId: null,
      participant1Score: 0,
      participant2Score: 0,
      currentQuestionIndex: 0,
      totalQuestions: tournament.config.questionsPerMatch
    };

    // Start match after countdown
    setTimeout(() => {
      this._startMatch(tournament, tournament.currentMatch!);
    }, MATCH_START_COUNTDOWN * 1000);
  }

  private _setupBracketTournament(tournament: Tournament): void {
    const participants = this._shuffleArray(Array.from(tournament.participants.keys()));
    const totalRounds = Math.log2(participants.length);

    // Create first round matches
    const firstRound: TournamentRound = {
      roundNumber: 1,
      matches: [],
      status: 'pending'
    };

    for (let i = 0; i < participants.length; i += 2) {
      const match: TournamentMatch = {
        id: this._generateId(),
        tournamentId: tournament.id,
        roundNumber: 1,
        matchNumber: Math.floor(i / 2) + 1,
        participant1Id: participants[i],
        participant2Id: participants[i + 1] || null,
        status: 'pending',
        winnerId: null,
        participant1Score: 0,
        participant2Score: 0,
        currentQuestionIndex: 0,
        totalQuestions: tournament.config.questionsPerMatch
      };

      // Handle bye (odd participant)
      if (!match.participant2Id) {
        match.status = 'completed';
        match.winnerId = match.participant1Id;
      }

      firstRound.matches.push(match);
    }

    tournament.rounds.push(firstRound);
    tournament.currentRound = 1;

    // Create placeholder rounds
    let matchesInRound = firstRound.matches.length / 2;
    for (let r = 2; r <= totalRounds; r++) {
      const round: TournamentRound = {
        roundNumber: r,
        matches: [],
        status: 'pending'
      };

      for (let m = 0; m < matchesInRound; m++) {
        round.matches.push({
          id: this._generateId(),
          tournamentId: tournament.id,
          roundNumber: r,
          matchNumber: m + 1,
          participant1Id: null,
          participant2Id: null,
          status: 'pending',
          winnerId: null,
          participant1Score: 0,
          participant2Score: 0,
          currentQuestionIndex: 0,
          totalQuestions: tournament.config.questionsPerMatch
        });
      }

      tournament.rounds.push(round);
      matchesInRound = Math.ceil(matchesInRound / 2);
    }

    // Start first round
    this._startRound(tournament, firstRound);
  }

  private _setupLeagueTournament(tournament: Tournament): void {
    // League: everyone plays everyone
    // Implementation simplified - just track standings
    tournament.rounds = [];
    tournament.currentRound = 1;
  }

  private _setupChallengeTournament(tournament: Tournament): void {
    // Same as quick match - single match
    this._setupQuickMatchTournament(tournament);
  }

  private _startRound(tournament: Tournament, round: TournamentRound): void {
    round.status = 'in-progress';
    round.startedAt = Date.now();

    console.log(`[TournamentManager] Starting round ${round.roundNumber} of tournament ${tournament.id}`);

    // Start all matches in this round
    for (const match of round.matches) {
      if (match.status === 'pending' && match.participant1Id && match.participant2Id) {
        setTimeout(() => {
          this._startMatch(tournament, match);
        }, MATCH_START_COUNTDOWN * 1000);
      }
    }
  }

  private _startMatch(tournament: Tournament, match: TournamentMatch): void {
    if (match.status !== 'pending') return;

    match.status = 'in-progress';
    match.startedAt = Date.now();

    console.log(`[TournamentManager] Starting match ${match.id}`);

    // Start first question
    this._startMatchQuestion(tournament, match);
  }

  private _startMatchQuestion(tournament: Tournament, match: TournamentMatch): void {
    // Generate question
    const question = this._questionRegistry.generateQuestion(
      tournament.config.subject,
      tournament.config.difficulty,
      tournament.config.category
    );

    if (!question) {
      console.error('[TournamentManager] Failed to generate question');
      return;
    }

    // Store question for validation (simplified - in real impl would store per-match)
    (match as any)._currentQuestion = question;

    // Notify participants
    this._notifyTournamentUpdate(tournament);

    // Set time limit
    const timeLimit = (tournament.config.timePerQuestion || 15) * 1000;
    setTimeout(() => {
      this._endMatchQuestion(tournament, match);
    }, timeLimit);
  }

  private _endMatchQuestion(tournament: Tournament, match: TournamentMatch): void {
    match.currentQuestionIndex++;

    if (match.currentQuestionIndex >= match.totalQuestions) {
      this._endMatch(tournament, match);
    } else {
      // Next question
      setTimeout(() => {
        this._startMatchQuestion(tournament, match);
      }, 2000); // 2 second delay between questions
    }
  }

  private _endMatch(tournament: Tournament, match: TournamentMatch): void {
    match.status = 'completed';
    match.completedAt = Date.now();

    // Determine winner
    if (match.participant1Score > match.participant2Score) {
      match.winnerId = match.participant1Id;
    } else if (match.participant2Score > match.participant1Score) {
      match.winnerId = match.participant2Id;
    } else {
      // Tie - random or use response time
      match.winnerId = Math.random() > 0.5 ? match.participant1Id : match.participant2Id;
    }

    // Update participant stats
    if (match.winnerId) {
      const winner = tournament.participants.get(match.winnerId);
      if (winner) {
        winner.matchesWon++;
      }
    }

    // Update loser
    const loserId = match.winnerId === match.participant1Id ? match.participant2Id : match.participant1Id;
    if (loserId) {
      const loser = tournament.participants.get(loserId);
      if (loser && tournament.config.type === 'bracket') {
        loser.eliminated = true;
      }
    }

    console.log(`[TournamentManager] Match ${match.id} completed. Winner: ${match.winnerId}`);

    // Check round/tournament completion
    this._checkRoundCompletion(tournament);
    this._notifyTournamentUpdate(tournament);
  }

  private _checkRoundCompletion(tournament: Tournament): void {
    const currentRound = tournament.rounds[tournament.currentRound - 1];
    if (!currentRound) return;

    const allComplete = currentRound.matches.every(m => m.status === 'completed');
    if (!allComplete) return;

    currentRound.status = 'completed';
    currentRound.completedAt = Date.now();

    console.log(`[TournamentManager] Round ${currentRound.roundNumber} completed`);

    // Check if tournament is complete
    if (tournament.currentRound >= tournament.rounds.length) {
      this._completeTournament(tournament);
      return;
    }

    // Advance winners to next round
    const nextRound = tournament.rounds[tournament.currentRound];
    if (nextRound) {
      // Populate next round with winners
      const winners = currentRound.matches.map(m => m.winnerId).filter(Boolean);

      for (let i = 0; i < nextRound.matches.length; i++) {
        const match = nextRound.matches[i];
        match.participant1Id = winners[i * 2] || null;
        match.participant2Id = winners[i * 2 + 1] || null;
      }

      tournament.currentRound++;

      // Start next round after delay
      setTimeout(() => {
        this._startRound(tournament, nextRound);
      }, BRACKET_ROUND_DELAY);
    }
  }

  private _completeTournament(tournament: Tournament): void {
    tournament.status = 'completed';
    tournament.completedAt = Date.now();

    // Determine final winner
    const lastRound = tournament.rounds[tournament.rounds.length - 1];
    const finalMatch = lastRound?.matches[0];

    if (finalMatch?.winnerId) {
      tournament.winnerId = finalMatch.winnerId;
    }

    // Calculate placements
    tournament.finalPlacements = new Map();
    if (tournament.winnerId) {
      tournament.finalPlacements.set(tournament.winnerId, 1);
    }

    // Award second place to final loser
    if (finalMatch) {
      const secondPlace = finalMatch.winnerId === finalMatch.participant1Id
        ? finalMatch.participant2Id
        : finalMatch.participant1Id;
      if (secondPlace) {
        tournament.finalPlacements.set(secondPlace, 2);
      }
    }

    console.log(`[TournamentManager] Tournament ${tournament.id} completed! Winner: ${tournament.winnerId}`);

    // Cleanup
    for (const participant of tournament.participants.values()) {
      this._playerTournaments.delete(participant.playerId);
    }

    // Distribute rewards (for official tournaments)
    if (tournament.config.isOfficial && tournament.config.rewards) {
      this._distributeRewards(tournament);
    }

    this._notifyTournamentUpdate(tournament);
  }

  private _cancelTournament(tournament: Tournament, reason: string): void {
    tournament.status = 'cancelled';
    console.log(`[TournamentManager] Tournament ${tournament.id} cancelled: ${reason}`);

    // Cleanup
    for (const participant of tournament.participants.values()) {
      this._playerTournaments.delete(participant.playerId);
    }

    this._notifyTournamentUpdate(tournament);
    this._tournaments.delete(tournament.id);
  }

  private _distributeRewards(tournament: Tournament): void {
    if (!tournament.config.rewards || !tournament.finalPlacements) return;

    for (const reward of tournament.config.rewards) {
      for (const [playerId, placement] of tournament.finalPlacements) {
        if (placement === reward.placement) {
          console.log(`[TournamentManager] Awarding ${reward.description} to player ${playerId}`);
          // TODO: Integration with persistence/reward system
        }
      }
    }
  }

  // ============ Quick Match Private Methods ============

  private _getQuickMatchQueueKey(config: QuickMatchConfig): string {
    return `${config.subject}_${config.difficulty}_${config.playerCount}`;
  }

  private _startQuickMatch(queueKey: string, config: QuickMatchConfig): void {
    const queue = this._quickMatchQueues.get(queueKey);
    if (!queue || queue.size < config.playerCount) return;

    // Get players from queue
    const playerIds = Array.from(queue).slice(0, config.playerCount);

    // Remove from queue
    playerIds.forEach(id => queue.delete(id));

    // Create match
    const matchId = this._generateId();
    const players: TournamentParticipant[] = playerIds.map(id => ({
      playerId: id,
      username: `Player_${id.substring(0, 6)}`, // TODO: Get actual username
      joinedAt: Date.now(),
      currentScore: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      averageResponseTime: 0,
      streak: 0,
      bestStreak: 0,
      matchesPlayed: 0,
      matchesWon: 0,
      eliminated: false,
      isConnected: true,
      lastActiveAt: Date.now()
    }));

    const match: QuickMatchState = {
      matchId,
      players,
      currentQuestion: 0,
      totalQuestions: config.questionsPerRound,
      status: 'countdown',
      countdownSeconds: MATCH_START_COUNTDOWN
    };

    this._quickMatches.set(matchId, match);

    // Map players to match
    playerIds.forEach(id => this._playerQuickMatches.set(id, matchId));

    console.log(`[TournamentManager] Quick match ${matchId} starting with ${playerIds.length} players`);

    // Start countdown
    this._runQuickMatchCountdown(match, config);
  }

  private _runQuickMatchCountdown(match: QuickMatchState, config: QuickMatchConfig): void {
    if (match.countdownSeconds && match.countdownSeconds > 0) {
      this._notifyQuickMatchUpdate(match);
      match.countdownSeconds--;

      setTimeout(() => {
        this._runQuickMatchCountdown(match, config);
      }, 1000);
    } else {
      // Start match
      match.status = 'playing';
      this._startQuickMatchQuestion(match, config);
    }
  }

  private _startQuickMatchQuestion(match: QuickMatchState, config: QuickMatchConfig): void {
    match.currentQuestion++;
    match.questionStartTime = Date.now();

    // Generate question
    const question = this._questionRegistry.generateQuestion(
      config.subject,
      config.difficulty,
      config.category
    );

    if (!question) {
      console.error('[TournamentManager] Failed to generate quick match question');
      return;
    }

    // Store for validation
    (match as any)._currentQuestion = question;

    this._notifyQuickMatchUpdate(match);

    // Set time limit
    setTimeout(() => {
      this._endQuickMatchQuestion(match, config);
    }, QUESTION_TIME_LIMIT);
  }

  private _endQuickMatchQuestion(match: QuickMatchState, config: QuickMatchConfig): void {
    if (match.currentQuestion >= match.totalQuestions) {
      this._endQuickMatch(match);
    } else {
      setTimeout(() => {
        this._startQuickMatchQuestion(match, config);
      }, 2000);
    }
  }

  private _endQuickMatch(match: QuickMatchState): void {
    match.status = 'results';

    // Determine winner
    match.players.sort((a, b) => b.currentScore - a.currentScore);

    console.log(`[TournamentManager] Quick match ${match.matchId} completed`);

    this._notifyQuickMatchUpdate(match);

    // Cleanup after delay
    setTimeout(() => {
      match.players.forEach(p => this._playerQuickMatches.delete(p.playerId));
      this._quickMatches.delete(match.matchId);
    }, 10000);
  }

  private _getCurrentQuickMatchQuestion(match: QuickMatchState): Question | null {
    return (match as any)._currentQuestion || null;
  }

  private _calculateQuickMatchPoints(responseTime: number): number {
    // Base 100 points, bonus for speed
    let points = 100;
    if (responseTime < 2) points += 50;
    else if (responseTime < 5) points += 25;
    else if (responseTime < 8) points += 10;
    return points;
  }

  private _checkQuickMatchTimeout(playerId: string, queueKey: string): void {
    const queue = this._quickMatchQueues.get(queueKey);
    if (queue?.has(playerId)) {
      queue.delete(playerId);
      console.log(`[TournamentManager] Player ${playerId} quick match queue timeout`);
    }
  }

  private _startChallengeMatch(challenge: DirectChallenge, config: QuickMatchConfig): void {
    const matchId = this._generateId();
    challenge.matchId = matchId;
    challenge.status = 'in-progress';

    const players: TournamentParticipant[] = [
      {
        playerId: challenge.challengerId,
        username: challenge.challengerUsername,
        joinedAt: Date.now(),
        currentScore: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        averageResponseTime: 0,
        streak: 0,
        bestStreak: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        eliminated: false,
        isConnected: true,
        lastActiveAt: Date.now()
      },
      {
        playerId: challenge.challengedId,
        username: challenge.challengedUsername,
        joinedAt: Date.now(),
        currentScore: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        averageResponseTime: 0,
        streak: 0,
        bestStreak: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        eliminated: false,
        isConnected: true,
        lastActiveAt: Date.now()
      }
    ];

    const match: QuickMatchState = {
      matchId,
      players,
      currentQuestion: 0,
      totalQuestions: config.questionsPerRound,
      status: 'countdown',
      countdownSeconds: MATCH_START_COUNTDOWN
    };

    this._quickMatches.set(matchId, match);
    this._playerQuickMatches.set(challenge.challengerId, matchId);
    this._playerQuickMatches.set(challenge.challengedId, matchId);

    this._runQuickMatchCountdown(match, config);
  }

  private _expireChallenge(challengeId: string): void {
    const challenge = this._pendingChallenges.get(challengeId);
    if (challenge && challenge.status === 'pending') {
      challenge.status = 'expired';
      this._pendingChallenges.delete(challengeId);
      console.log(`[TournamentManager] Challenge ${challengeId} expired`);
    }
  }

  // ============ Utilities ============

  private _generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private _generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private _shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private _notifyTournamentUpdate(tournament: Tournament): void {
    this._onTournamentUpdate.forEach(cb => cb(tournament));
  }

  private _notifyQuickMatchUpdate(match: QuickMatchState): void {
    this._onQuickMatchUpdate.forEach(cb => cb(match));
  }

  // ============ Persistence ============

  /**
   * Serialize tournament for persistence
   */
  public serializeTournament(tournament: Tournament): PersistedTournament {
    return {
      id: tournament.id,
      config: tournament.config,
      creatorId: tournament.creatorId,
      creatorUsername: tournament.creatorUsername,
      status: tournament.status,
      participants: Array.from(tournament.participants.entries()).map(([id, data]) => ({
        id,
        data
      })),
      rounds: tournament.rounds,
      currentRound: tournament.currentRound,
      createdAt: tournament.createdAt,
      startedAt: tournament.startedAt,
      completedAt: tournament.completedAt,
      winnerId: tournament.winnerId,
      finalPlacements: tournament.finalPlacements
        ? Array.from(tournament.finalPlacements.entries()).map(([playerId, placement]) => ({
          playerId,
          placement
        }))
        : undefined
    };
  }

  /**
   * Deserialize tournament from persistence
   */
  public deserializeTournament(data: PersistedTournament): Tournament {
    const tournament: Tournament = {
      id: data.id,
      config: data.config,
      creatorId: data.creatorId,
      creatorUsername: data.creatorUsername,
      status: data.status,
      participants: new Map(data.participants.map(p => [p.id, p.data])),
      rounds: data.rounds,
      currentRound: data.currentRound,
      createdAt: data.createdAt,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      winnerId: data.winnerId,
      finalPlacements: data.finalPlacements
        ? new Map(data.finalPlacements.map(p => [p.playerId, p.placement]))
        : undefined
    };

    return tournament;
  }

  /**
   * Load persistent tournaments (call on server start)
   */
  public loadPersistedTournaments(data: PersistedTournament[]): void {
    for (const tournamentData of data) {
      // Only load ongoing tournaments
      if (tournamentData.status === 'waiting' || tournamentData.status === 'in-progress') {
        const tournament = this.deserializeTournament(tournamentData);
        this._tournaments.set(tournament.id, tournament);

        // Re-map participants
        for (const [playerId] of tournament.participants) {
          this._playerTournaments.set(playerId, tournament.id);
        }

        console.log(`[TournamentManager] Loaded tournament: ${tournament.id}`);
      }
    }
  }

  /**
   * Get all tournaments for persistence
   */
  public getAllTournamentsForPersistence(): PersistedTournament[] {
    return Array.from(this._tournaments.values()).map(t => this.serializeTournament(t));
  }
}
