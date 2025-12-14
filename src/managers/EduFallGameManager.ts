/**
 * EduFallGameManager - Enhanced game manager with multi-subject support
 *
 * This is the new game manager that integrates:
 * - Multiple educational subjects (Math, Spelling, Geography, Science, History)
 * - Enhanced scoring system with bonuses and multipliers
 * - Native persistence for player progress
 * - Persistent leaderboards
 * - Modular question providers
 * - Fall-to-select lobby system
 * - Tournament system
 */

import {
  World,
  Player,
  PlayerEntity,
  PlayerEvent,
  PlayerUIEvent,
  Audio,
  Entity,
  RigidBodyType,
  ColliderShape,
  PlayerCameraMode,
  SceneUI
} from 'hytopia';

import { FallingPlayerController } from '../controllers/FallingPlayerController';
import type { Difficulty } from '../types';
import { GAME_CONSTANTS } from '../types';

// New systems
import { ScoringSystem, GameScoreSummary, ScoreBreakdown } from '../scoring/ScoringSystem';
import {
  QuestionProviderRegistry,
  Question,
  QuestionDifficulty,
  SubjectType,
  initializeQuestionProviders
} from '../questions';
import { PersistenceManager } from '../persistence/PersistenceManager';
import { LeaderboardManager } from '../persistence/LeaderboardManager';

// Lobby and Tournament systems
import { LobbyManager, GameMode, LobbyState } from '../lobby';
import { TournamentManager } from '../tournament';

// ============ Types ============

export interface EduFallPlayerState {
  // Game state
  gameActive: boolean;
  currentQuestion: Question | null;
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  questionStartTime: number;

  // Settings
  difficulty: QuestionDifficulty;
  subject: SubjectType;
  isPractice?: boolean;

  // Physics
  currentGravityScale: number;
  isFinalFall: boolean;

  // Session tracking
  sessionStartTime: number;
}

export interface EduFallPlayerData {
  player: Player;
  entity: PlayerEntity;
  state: EduFallPlayerState;
}

// Map game difficulty to question difficulty
const DIFFICULTY_MAP: Record<Difficulty, QuestionDifficulty> = {
  beginner: 'beginner',
  moderate: 'intermediate',
  hard: 'advanced'
};

// ============ Game Manager ============

export class EduFallGameManager {
  private static _instance: EduFallGameManager;
  private _world: World;

  // Player tracking
  private _players: Map<string, EduFallPlayerData> = new Map();

  // Systems
  private _scoringSystem: ScoringSystem;
  private _questionRegistry: QuestionProviderRegistry;
  private _persistenceManager: PersistenceManager;
  private _leaderboardManager: LeaderboardManager;
  private _lobbyManager: LobbyManager;
  private _tournamentManager: TournamentManager;

  // Audio
  private _backgroundMusic: Audio | null = null;
  private _isMusicPlaying: boolean = false;

  // Landing platform entities
  private _platformEntities: Entity[] = [];

  // Answer block entities (per player)
  private _answerBlocks: Map<string, Entity[]> = new Map();
  private _answerLabels: Map<string, SceneUI[]> = new Map();

  // Callbacks for external systems
  private _onCorrectAnswerCallbacks: ((player: Player, breakdown: ScoreBreakdown) => void)[] = [];
  private _onWrongAnswerCallbacks: ((player: Player) => void)[] = [];
  private _onGameEndCallbacks: ((player: Player, summary: GameScoreSummary) => void)[] = [];

  private constructor(world: World) {
    this._world = world;

    // Initialize systems
    this._scoringSystem = ScoringSystem.getInstance();
    this._questionRegistry = initializeQuestionProviders();
    this._persistenceManager = PersistenceManager.getInstance();
    this._leaderboardManager = LeaderboardManager.getInstance();
    this._lobbyManager = LobbyManager.getInstance();
    this._tournamentManager = TournamentManager.getInstance();

    // Set world references
    this._lobbyManager.setWorld(world);
    this._tournamentManager.setWorld(world);

    // Create background music
    this._backgroundMusic = new Audio({
      uri: GAME_CONSTANTS.AUDIO_MUSIC,
      loop: true,
      volume: 1.0 // Increased from 0.7
    });

    this._setupEventListeners();
    this._setupLobbyCallbacks();
    this._setupTournamentCallbacks();

    console.log('[EduFallGameManager] Initialized with subjects:', this._questionRegistry.getAvailableSubjects());
  }

  public static getInstance(world?: World): EduFallGameManager {
    if (!EduFallGameManager._instance) {
      if (!world) throw new Error('EduFallGameManager requires world on first instantiation');
      EduFallGameManager._instance = new EduFallGameManager(world);
    }
    return EduFallGameManager._instance;
  }

  // ============ Public API ============

  /**
   * Get player data
   */
  public getPlayerData(playerId: string): EduFallPlayerData | undefined {
    return this._players.get(playerId);
  }

  /**
   * Get available subjects
   */
  public getAvailableSubjects(): SubjectType[] {
    return this._questionRegistry.getAvailableSubjects();
  }

  /**
   * Start a new game for a player
   */
  public async startGame(
    player: Player,
    difficulty: Difficulty,
    subject: SubjectType = 'math',
    isPractice: boolean = false
  ): Promise<void> {
    const playerData = this._players.get(player.id);
    if (!playerData) {
      console.error(`[EduFallGameManager] Cannot start game - player ${player.username} not found`);
      return;
    }

    console.log(`[EduFallGameManager] Starting ${subject} ${isPractice ? 'practice' : 'game'} for ${player.username} (${difficulty})`);

    // Initialize state
    const questionDifficulty = DIFFICULTY_MAP[difficulty];
    playerData.state = {
      gameActive: true,
      currentQuestion: null,
      questionsAnswered: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      questionStartTime: Date.now(),
      difficulty: questionDifficulty,
      subject,
      currentGravityScale: GAME_CONSTANTS.PLAYER_GRAVITY_SCALE,
      isFinalFall: false,
      sessionStartTime: Date.now(),
      isPractice: isPractice
    };

    // Reset player position and controller
    playerData.entity.setPosition(GAME_CONSTANTS.PLAYER_SPAWN_POSITION);
    playerData.entity.setGravityScale(GAME_CONSTANTS.PLAYER_GRAVITY_SCALE);
    (playerData.entity.controller as FallingPlayerController).resetFallState();

    // Start scoring session (only for non-practice)
    if (!isPractice) {
      this._scoringSystem.startSession(player.id);
    }

    // Clear any existing platform
    this._clearPlatform();
    this._clearAnswerBlocks(player.id);

    // Generate first question
    this._generateNewQuestion(player);

    // Start music
    this._playBackgroundMusic();

    // Notify UI
    player.ui.sendData({
      type: 'game-started',
      subject,
      difficulty,
      isPractice
    });
  }

  /**
   * Register callback for correct answers
   */
  public onCorrectAnswer(callback: (player: Player, breakdown: ScoreBreakdown) => void): void {
    this._onCorrectAnswerCallbacks.push(callback);
  }

  /**
   * Register callback for wrong answers
   */
  public onWrongAnswer(callback: (player: Player) => void): void {
    this._onWrongAnswerCallbacks.push(callback);
  }

  /**
   * Register callback for game end
   */
  public onGameEnd(callback: (player: Player, summary: GameScoreSummary) => void): void {
    this._onGameEndCallbacks.push(callback);
  }

  /**
   * Get leaderboard data for UI
   */
  public getLeaderboardData(type: string, limit: number = 10): any[] {
    return this._leaderboardManager.getLeaderboard(type as any, limit);
  }

  /**
   * Get player stats for UI
   */
  public getPlayerStats(playerId: string): any {
    return this._persistenceManager.getPlayerStatsSummary(playerId);
  }

  // ============ Event Handlers ============

  private _setupEventListeners(): void {
    this._world.on(PlayerEvent.JOINED_WORLD, async ({ player }) => {
      await this._handlePlayerJoin(player);
    });

    this._world.on(PlayerEvent.LEFT_WORLD, async ({ player }) => {
      await this._handlePlayerLeave(player);
    });
  }

  private _setupLobbyCallbacks(): void {
    // When player completes selection (solo/practice mode)
    this._lobbyManager.onSelectionComplete((playerId: string, lobbyState: LobbyState) => {
      const playerData = this._players.get(playerId);
      if (!playerData) return;

      console.log(`[EduFallGameManager] Selection complete for ${playerData.player.username}:`, lobbyState);

      // Map QuestionDifficulty to game Difficulty
      const difficultyMap: Record<QuestionDifficulty, Difficulty> = {
        'beginner': 'beginner',
        'intermediate': 'moderate',
        'advanced': 'hard',
        'expert': 'hard'
      };

      const difficulty = difficultyMap[lobbyState.selectedDifficulty || 'intermediate'];
      const subject = lobbyState.selectedSubject || 'math';
      const isPractice = lobbyState.selectedMode === 'practice';

      // Start the game
      this.startGame(playerData.player, difficulty, subject, isPractice);
    });

    // When player selects tournament mode
    this._lobbyManager.onTournamentSelected((playerId: string) => {
      const playerData = this._players.get(playerId);
      if (!playerData) return;

      console.log(`[EduFallGameManager] ${playerData.player.username} selected tournaments`);

      // Send tournament lobby data to UI
      const tournaments = this._tournamentManager.getPublicTournaments();
      playerData.player.ui.sendData({
        type: 'tournament-list',
        tournaments
      });
    });
  }

  private _setupTournamentCallbacks(): void {
    // Tournament update notifications
    this._tournamentManager.onTournamentUpdate((tournament) => {
      // Notify all participants
      for (const [participantId] of tournament.participants) {
        const playerData = this._players.get(participantId);
        if (playerData) {
          playerData.player.ui.sendData({
            type: 'tournament-update',
            tournament: {
              id: tournament.id,
              name: tournament.config.name,
              status: tournament.status,
              participantCount: tournament.participants.size,
              currentRound: tournament.currentRound
            }
          });
        }
      }
    });

    // Quick match updates
    this._tournamentManager.onQuickMatchUpdate((match) => {
      for (const participant of match.players) {
        const playerData = this._players.get(participant.playerId);
        if (playerData) {
          playerData.player.ui.sendData({
            type: 'quick-match-update',
            match: {
              matchId: match.matchId,
              status: match.status,
              currentQuestion: match.currentQuestion,
              totalQuestions: match.totalQuestions,
              players: match.players.map(p => ({
                username: p.username,
                score: p.currentScore,
                isYou: p.playerId === participant.playerId
              })),
              countdown: match.countdownSeconds
            }
          });
        }
      }
    });
  }

  private async _handlePlayerJoin(player: Player): Promise<void> {
    console.log(`[EduFallGameManager] Player ${player.username} joined`);

    // Load persisted data
    await this._persistenceManager.loadPlayerData(player);

    // Create player entity with custom controller
    const controller = new FallingPlayerController(this._world);
    const playerEntity = new PlayerEntity({
      player,
      name: `Player_${player.username}`,
      modelUri: 'models/players/player.gltf',
      modelScale: 0.5,
      modelLoopedAnimations: ['idle'],
      controller,
      rigidBodyOptions: {
        type: RigidBodyType.DYNAMIC,
        gravityScale: GAME_CONSTANTS.PLAYER_GRAVITY_SCALE,
        linearDamping: 0.5,
        colliders: [{
          shape: ColliderShape.CAPSULE,
          halfHeight: 0.5,
          radius: 0.3
        }]
      }
    });

    // Spawn player first (lobby will reposition)
    playerEntity.spawn(this._world, { x: 0, y: 50, z: 0 });

    // Setup camera AFTER spawning and attach to entity
    player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
    player.camera.setAttachedToEntity(playerEntity);
    player.camera.setOffset({ x: 0, y: 1.5, z: 0 });
    player.camera.setForwardOffset(1.0);

    // Setup fall detection callback
    controller.setOnFallPastThreshold((entity) => {
      this._handleFallPastThreshold(entity);
    });

    // Initialize state
    const state: EduFallPlayerState = {
      gameActive: false,
      currentQuestion: null,
      questionsAnswered: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      questionStartTime: 0,
      difficulty: 'intermediate',
      subject: 'math',
      currentGravityScale: GAME_CONSTANTS.PLAYER_GRAVITY_SCALE,
      isFinalFall: false,
      sessionStartTime: Date.now()
    };

    // Store player data
    this._players.set(player.id, {
      player,
      entity: playerEntity,
      state
    });

    // Load UI
    player.ui.load(GAME_CONSTANTS.UI_PATH);

    // Setup UI message handling
    this._setupUIHandling(player);

    // Send available subjects to UI
    player.ui.sendData({
      type: 'subjects-available',
      subjects: this._questionRegistry.getAvailableSubjects()
    });

    // Send player stats (use empty defaults if no stats yet)
    const stats = this._persistenceManager.getPlayerStatsSummary(player.id) || {
      totalScore: 0,
      totalGamesPlayed: 0,
      highScore: 0,
      currentLevel: 1
    };

    player.ui.sendData({
      type: 'player-stats',
      stats
    });

    // Always update lobby stats display (shows lobby screen)
    this._lobbyManager.updateStatsDisplay(player, stats);

    // Spawn player in lobby instead of directly in game
    this._lobbyManager.spawnInLobby(player, playerEntity);

    // Play opening voice after a short delay to ensure audio context is ready
    setTimeout(() => {
      this._playSound(GAME_CONSTANTS.AUDIO_OPENING_VOICE);
    }, 1000);

    console.log(`[EduFallGameManager] Player ${player.username} initialized in lobby`);
  }

  private _setupUIHandling(player: Player): void {
    player.ui.on(PlayerUIEvent.DATA, ({ data }) => {
      this._handleUIMessage(player, data);
    });
  }

  private _handleUIMessage(player: Player, data: any): void {
    console.log(`[EduFallGameManager] UI message from ${player.username}:`, data.type);

    switch (data.type) {
      case 'start-game':
        this.startGame(
          player,
          data.difficulty || 'moderate',
          data.subject || 'math',
          data.isPractice || false
        );
        break;

      case 'restart-game':
        this._restartGame(player);
        break;

      case 'return-to-lobby':
        this._returnToLobby(player);
        break;

      case 'get-leaderboard':
        const leaderboard = this._leaderboardManager.getLeaderboard(data.leaderboardType || 'all-time', 10);
        player.ui.sendData({
          type: 'leaderboard-data',
          leaderboardType: data.leaderboardType,
          entries: leaderboard
        });
        break;

      case 'get-stats':
        const stats = this._persistenceManager.getPlayerStatsSummary(player.id);
        player.ui.sendData({
          type: 'player-stats',
          stats
        });
        break;

      // Tournament UI messages
      case 'create-tournament':
        this._handleCreateTournament(player, data);
        break;

      case 'join-tournament':
        this._handleJoinTournament(player, data);
        break;

      case 'leave-tournament':
        this._tournamentManager.leaveTournament(player);
        break;

      case 'join-quick-match':
        this._handleJoinQuickMatch(player, data);
        break;

      case 'leave-quick-match':
        this._tournamentManager.leaveQuickMatchQueue(player);
        break;

      case 'get-tournaments':
        const tournaments = this._tournamentManager.getPublicTournaments();
        player.ui.sendData({
          type: 'tournament-list',
          tournaments
        });
        break;

      default:
        break;
    }
  }

  private _handleCreateTournament(player: Player, data: any): void {
    const tournament = this._tournamentManager.createTournament(player, {
      name: data.name || `${player.username}'s Tournament`,
      type: data.tournamentType || 'quick-match',
      visibility: data.visibility || 'public',
      subject: data.subject || 'math',
      difficulty: data.difficulty || 'intermediate',
      questionsPerMatch: data.questionsPerMatch || 10,
      minParticipants: data.minParticipants || 2,
      maxParticipants: data.maxParticipants || 4,
      isOfficial: false // Only Hytopia/Ownership can create official tournaments
    });

    if (tournament) {
      player.ui.sendData({
        type: 'tournament-created',
        tournamentId: tournament.id,
        inviteCode: tournament.config.inviteCode
      });
    } else {
      player.ui.sendData({
        type: 'tournament-error',
        message: 'Failed to create tournament'
      });
    }
  }

  private _handleJoinTournament(player: Player, data: any): void {
    const success = this._tournamentManager.joinTournament(
      player,
      data.tournamentId,
      data.inviteCode
    );

    if (!success) {
      player.ui.sendData({
        type: 'tournament-error',
        message: 'Failed to join tournament'
      });
    }
  }

  private _handleJoinQuickMatch(player: Player, data: any): void {
    this._tournamentManager.joinQuickMatchQueue(player, {
      subject: data.subject || 'math',
      difficulty: data.difficulty || 'intermediate',
      playerCount: data.playerCount || 2,
      questionsPerRound: data.questionsPerRound || 10
    });

    player.ui.sendData({
      type: 'quick-match-queued',
      message: 'Looking for opponents...'
    });
  }

  private _returnToLobby(player: Player): void {
    const playerData = this._players.get(player.id);
    if (!playerData) return;

    console.log(`[EduFallGameManager] ${player.username} returning to lobby`);

    // End game if active
    if (playerData.state.gameActive) {
      playerData.state.gameActive = false;
      this._scoringSystem.endSession(player.id, this._getGameDifficulty(playerData.state.difficulty));
    }

    // Clear game blocks
    this._clearAnswerBlocks(player.id);
    this._clearPlatform();

    // Stop music if no other players active
    this._stopBackgroundMusicIfNoActive();

    // Return to lobby
    this._lobbyManager.returnToLobby(player, playerData.entity);
  }

  private async _handlePlayerLeave(player: Player): Promise<void> {
    console.log(`[EduFallGameManager] Player ${player.username} left`);

    const playerData = this._players.get(player.id);
    if (playerData) {
      // End game if active
      if (playerData.state.gameActive) {
        await this._endGame(player, true);
      }

      // Save and cleanup
      await this._persistenceManager.handlePlayerDisconnect(player);

      if (playerData.entity.isSpawned) {
        playerData.entity.despawn();
      }

      this._clearAnswerBlocks(player.id);

      // Clean up lobby state
      this._lobbyManager.handlePlayerLeave(player.id);

      // Leave any tournaments
      this._tournamentManager.leaveTournament(player);
      this._tournamentManager.leaveQuickMatchQueue(player);

      this._players.delete(player.id);
    }

    // Cleanup if last player
    if (this._players.size === 0) {
      this._clearPlatform();
      this._stopBackgroundMusic();
    } else {
      this._stopBackgroundMusicIfNoActive();
    }
  }

  // ============ Game Logic ============

  private _generateNewQuestion(player: Player): void {
    const playerData = this._players.get(player.id);
    if (!playerData || !playerData.state.gameActive) return;

    const { difficulty, subject } = playerData.state;

    // Generate question from provider
    const question = this._questionRegistry.generateQuestion(subject, difficulty);
    if (!question) {
      console.error(`[EduFallGameManager] Failed to generate question for ${subject}`);
      return;
    }

    playerData.state.currentQuestion = question;
    playerData.state.questionStartTime = Date.now();

    // Mark question start for scoring
    this._scoringSystem.startQuestion(player.id);

    // Spawn answer blocks
    this._spawnAnswerBlocks(player, question);

    // Send question to UI
    player.ui.sendData({
      type: 'question',
      questionText: question.questionText,
      questionSubtext: question.questionSubtext,
      subject: question.subject,
      category: question.category
    });

    console.log(`[EduFallGameManager] Generated ${subject} question for ${player.username}: ${question.questionText}`);
  }

  private _spawnAnswerBlocks(player: Player, question: Question): void {
    // Clear existing blocks and labels
    this._clearAnswerBlocks(player.id);

    const blocks: Entity[] = [];
    const labels: SceneUI[] = [];
    const allAnswers = this._shuffleArray([question.correctAnswer, ...question.wrongAnswers]);

    // Position blocks in a row
    const blockY = GAME_CONSTANTS.ANSWER_BLOCK_Y;
    const spacing = 4; // Increased spacing for better label visibility
    const startX = -((allAnswers.length - 1) * spacing) / 2;

    allAnswers.forEach((answer, index) => {
      const isCorrect = answer === question.correctAnswer;
      const x = startX + (index * spacing);

      // Create answer block (neutral color - labels show the answer)
      const block = new Entity({
        blockTextureUri: 'blocks/stone-bricks.png', // Neutral block texture
        blockHalfExtents: { x: 0.5, y: 0.5, z: 0.5 }, // Single block size
        name: `answer_block_${index}`,
        rigidBodyOptions: {
          type: RigidBodyType.FIXED,
          colliders: [{
            shape: ColliderShape.BLOCK,
            halfExtents: { x: 0.5, y: 0.5, z: 0.5 }, // Single block size
            isSensor: true, // Allow player to pass through
            onCollision: (other, started) => {
              if (started && other instanceof PlayerEntity && other.player?.id === player.id) {
                this._handleAnswerCollision(player, answer, isCorrect);
              }
            }
          }]
        }
      });

      block.spawn(this._world, { x, y: blockY, z: 0 });
      blocks.push(block);

      // Create SceneUI label for the answer
      const answerLabel = new SceneUI({
        templateId: 'answer-label',
        attachedToEntity: block,
        offset: { x: 0, y: 10, z: 0 },
        state: {
          text: answer
        }
      });

      answerLabel.load(this._world);
      labels.push(answerLabel);
    });

    this._answerBlocks.set(player.id, blocks);
    this._answerLabels.set(player.id, labels);

    // Send answer options to UI for display
    player.ui.sendData({
      type: 'answer-options',
      answers: allAnswers
    });

    console.log(`[EduFallGameManager] Spawned ${blocks.length} answer blocks with labels`);
  }

  private _handleAnswerCollision(player: Player, answer: string, isCorrect: boolean): void {
    const playerData = this._players.get(player.id);
    if (!playerData || !playerData.state.gameActive || playerData.state.isFinalFall) return;

    if (isCorrect) {
      this._handleCorrectAnswer(player, playerData);
    } else {
      this._handleWrongAnswer(player, playerData);
    }
  }

  private _handleCorrectAnswer(player: Player, playerData: EduFallPlayerData): void {
    console.log(`[EduFallGameManager] Correct answer from ${player.username}`);

    // Record in scoring system
    const gameDifficulty = this._getGameDifficulty(playerData.state.difficulty);
    const breakdown = this._scoringSystem.recordCorrectAnswer(player.id, gameDifficulty);

    // Update state
    playerData.state.questionsAnswered++;
    playerData.state.correctAnswers++;

    // Update category progress
    if (playerData.state.currentQuestion) {
      this._persistenceManager.updateCategoryProgress(
        player.id,
        playerData.state.subject,
        playerData.state.currentQuestion.category,
        true
      );
    }

    // Increase gravity (for non-beginner)
    if (playerData.state.difficulty !== 'beginner') {
      const maxGravity = GAME_CONSTANTS.PLAYER_GRAVITY_SCALE * GAME_CONSTANTS.MAX_GRAVITY_MULTIPLIER;
      playerData.state.currentGravityScale = Math.min(
        playerData.state.currentGravityScale + GAME_CONSTANTS.GRAVITY_INCREASE_PER_CORRECT,
        maxGravity
      );
      playerData.entity.setGravityScale(playerData.state.currentGravityScale);
    }

    // Play sound
    this._playSound(GAME_CONSTANTS.AUDIO_CORRECT, playerData.entity);

    // Send score update to UI
    const stats = this._scoringSystem.getSessionStats(player.id);
    player.ui.sendData({
      type: 'score-update',
      breakdown,
      stats
    });

    // Notify callbacks
    this._onCorrectAnswerCallbacks.forEach(cb => cb(player, breakdown));

    // Next question or end game
    this._scheduleNextQuestion(player, playerData);
  }

  private _handleWrongAnswer(player: Player, playerData: EduFallPlayerData): void {
    console.log(`[EduFallGameManager] Wrong answer from ${player.username}`);

    // Record in scoring system
    this._scoringSystem.recordWrongAnswer(player.id);

    // Update state
    playerData.state.questionsAnswered++;
    playerData.state.wrongAnswers++;

    // Update category progress
    if (playerData.state.currentQuestion) {
      this._persistenceManager.updateCategoryProgress(
        player.id,
        playerData.state.subject,
        playerData.state.currentQuestion.category,
        false
      );
    }

    // Reset gravity
    playerData.state.currentGravityScale = GAME_CONSTANTS.PLAYER_GRAVITY_SCALE;
    playerData.entity.setGravityScale(GAME_CONSTANTS.PLAYER_GRAVITY_SCALE);

    // Play sound
    this._playSound(GAME_CONSTANTS.AUDIO_WRONG, playerData.entity);

    // Send update to UI
    const stats = this._scoringSystem.getSessionStats(player.id);
    player.ui.sendData({
      type: 'wrong-answer',
      stats
    });

    // Notify callbacks
    this._onWrongAnswerCallbacks.forEach(cb => cb(player));

    // Next question or end game
    this._scheduleNextQuestion(player, playerData);
  }

  private _handleFallPastThreshold(playerEntity: PlayerEntity): void {
    const player = playerEntity.player;
    if (!player) return;

    const playerData = this._players.get(player.id);
    if (!playerData || !playerData.state.gameActive || playerData.state.isFinalFall) return;

    console.log(`[EduFallGameManager] Player ${player.username} fell past threshold`);

    // Treat as wrong answer
    this._handleWrongAnswer(player, playerData);
  }

  private _scheduleNextQuestion(player: Player, playerData: EduFallPlayerData): void {
    setTimeout(() => {
      if (!playerData.state.gameActive) return;

      if (playerData.state.questionsAnswered >= GAME_CONSTANTS.MAX_QUESTIONS) {
        this._startFinalFall(player);
      } else {
        // Reset position and generate next question
        playerData.entity.setPosition(GAME_CONSTANTS.PLAYER_RESET_POSITION);
        (playerData.entity.controller as FallingPlayerController).resetFallState();
        this._generateNewQuestion(player);
      }
    }, GAME_CONSTANTS.GAME_RESET_DELAY_MS);
  }

  private _startFinalFall(player: Player): void {
    const playerData = this._players.get(player.id);
    if (!playerData) return;

    console.log(`[EduFallGameManager] Starting final fall for ${player.username}`);

    playerData.state.isFinalFall = true;

    // Clear answer blocks
    this._clearAnswerBlocks(player.id);

    // Create landing platform
    this._createLandingPlatform(player);

    // Reset controller and position player for final fall
    const controller = playerData.entity.controller as FallingPlayerController;
    controller.resetFallState();

    playerData.entity.setPosition({
      x: 0,
      y: GAME_CONSTANTS.ANSWER_BLOCK_Y + 100,
      z: 0
    });
    playerData.entity.setLinearVelocity({ x: 0, y: -20, z: 0 });
  }

  private _createLandingPlatform(player: Player): void {
    this._clearPlatform();

    const platformY = GAME_CONSTANTS.LANDING_PLATFORM_Y;
    const platformSize = 14;
    const halfSize = Math.floor(platformSize / 2);

    const textures = ['blocks/grass', 'blocks/sand.png', 'blocks/water-still.png', 'blocks/dirt.png'];

    for (let i = 0; i < platformSize; i++) {
      for (let j = 0; j < platformSize; j++) {
        const x = -halfSize + i;
        const z = -halfSize + j;

        const distFromCenter = Math.sqrt(x * x + z * z);
        let textureIndex = 0;

        if (distFromCenter > 6) textureIndex = 2;
        else if (distFromCenter > 4) textureIndex = 1;
        else if (distFromCenter > 2) textureIndex = 3;

        const block = new Entity({
          blockTextureUri: textures[textureIndex],
          blockHalfExtents: { x: 0.5, y: 0.5, z: 0.5 },
          rigidBodyOptions: {
            type: RigidBodyType.FIXED,
            colliders: [{
              shape: ColliderShape.BLOCK,
              halfExtents: { x: 0.5, y: 0.5, z: 0.5 },
              onCollision: (other, started) => {
                if (started && other instanceof PlayerEntity) {
                  this._handlePlayerLanded(other);
                }
              }
            }]
          }
        });

        block.spawn(this._world, { x, y: platformY, z });
        this._platformEntities.push(block);
      }
    }
  }

  private async _handlePlayerLanded(playerEntity: PlayerEntity): Promise<void> {
    const player = playerEntity.player;
    if (!player) return;

    const playerData = this._players.get(player.id);
    if (!playerData || !playerData.state.isFinalFall) return;

    console.log(`[EduFallGameManager] Player ${player.username} landed!`);

    // Set landed state
    const controller = playerData.entity.controller as FallingPlayerController;
    controller.setLanded(true);

    // Play landing sound
    this._playSound(GAME_CONSTANTS.AUDIO_LANDING, playerEntity);

    // End game
    await this._endGame(player, false);
  }

  private async _endGame(player: Player, disconnected: boolean): Promise<void> {
    const playerData = this._players.get(player.id);
    if (!playerData) return;

    const isPractice = playerData.state.isPractice || false;

    // End scoring session and get summary (only for non-practice)
    const gameDifficulty = this._getGameDifficulty(playerData.state.difficulty);
    let summary: GameScoreSummary;

    if (!isPractice) {
      summary = this._scoringSystem.endSession(player.id, gameDifficulty);

      // Record in persistence
      await this._persistenceManager.recordGameResult(player, summary, playerData.state.subject);

      // Submit to leaderboards
      const leaderboardResult = this._leaderboardManager.submitScore(
        player,
        summary.totalScore,
        playerData.state.subject,
        {
          streak: summary.bestStreak,
          accuracy: summary.correctAnswers / (summary.correctAnswers + summary.wrongAnswers) * 100,
          grade: summary.grade,
          perfectGameTime: summary.perfectGame ? summary.averageResponseTime * 10 * 1000 : undefined
        }
      );

      console.log(`[EduFallGameManager] Game ended for ${player.username}: Score ${summary.totalScore}, Grade ${summary.grade}`);

      // Play game over voice
      if (!disconnected) {
        this._playSound(GAME_CONSTANTS.AUDIO_GAME_OVER_VOICE);
      }

      // Notify callbacks
      this._onGameEndCallbacks.forEach(cb => cb(player, summary));

      // Send to UI if not disconnected
      if (!disconnected) {
        const playerStats = this._persistenceManager.getPlayerStatsSummary(player.id);

        // Build improvements list
        const improvements = [];
        if (leaderboardResult.improvements?.highScore) {
          improvements.push({ text: 'New High Score!', isNewRecord: true });
        }
        if (leaderboardResult.improvements?.bestStreak) {
          improvements.push({ text: `New Best Streak: ${summary.bestStreak}`, isNewRecord: true });
        }

        player.ui.sendData({
          type: 'game-over',
          summary,
          leaderboardRanks: leaderboardResult.newRanks,
          improvements,
          playerStats
        });
      }
    } else {
      // Practice mode - no scoring, just show completion
      summary = {
        totalScore: 0,
        correctAnswers: playerData.state.correctAnswers,
        wrongAnswers: playerData.state.wrongAnswers,
        totalQuestions: playerData.state.questionsAnswered,
        accuracy: playerData.state.questionsAnswered > 0
          ? (playerData.state.correctAnswers / playerData.state.questionsAnswered) * 100
          : 0,
        bestStreak: 0,
        averageResponseTime: 0,
        grade: 'P', // Practice grade
        perfectGame: false,
        bonusPointsEarned: 0,
        difficultyMultiplier: 1
      } as any;

      console.log(`[EduFallGameManager] Practice ended for ${player.username}`);

      if (!disconnected) {
        player.ui.sendData({
          type: 'game-over',
          summary,
          isPractice: true
        });
      }
    }

    playerData.state.gameActive = false;

    // Schedule return to lobby after showing results
    if (!disconnected) {
      setTimeout(() => {
        this._returnToLobby(player);
      }, 8000); // 8 seconds to view results
    }
  }

  private _restartGame(player: Player): void {
    const playerData = this._players.get(player.id);
    if (!playerData) return;

    console.log(`[EduFallGameManager] Restarting game for ${player.username}`);

    // Reset state
    playerData.state.gameActive = false;
    playerData.state.isFinalFall = false;
    playerData.state.currentGravityScale = GAME_CONSTANTS.PLAYER_GRAVITY_SCALE;

    // Reset player
    playerData.entity.setPosition(GAME_CONSTANTS.PLAYER_SPAWN_POSITION);
    playerData.entity.setGravityScale(GAME_CONSTANTS.PLAYER_GRAVITY_SCALE);
    (playerData.entity.controller as FallingPlayerController).resetFallState();

    // Clear blocks and platform
    this._clearAnswerBlocks(player.id);
    this._clearPlatform();

    // Stop music if no active players
    this._stopBackgroundMusicIfNoActive();

    // Show start screen
    player.ui.sendData({ type: 'show-start' });
  }

  // ============ Helpers ============

  private _getGameDifficulty(questionDifficulty: QuestionDifficulty): Difficulty {
    switch (questionDifficulty) {
      case 'beginner': return 'beginner';
      case 'intermediate': return 'moderate';
      case 'advanced':
      case 'expert': return 'hard';
      default: return 'moderate';
    }
  }

  private _shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private _clearAnswerBlocks(playerId: string): void {
    // Clear answer blocks
    const blocks = this._answerBlocks.get(playerId);
    if (blocks) {
      blocks.forEach(block => {
        if (block.isSpawned) {
          block.despawn();
        }
      });
      this._answerBlocks.delete(playerId);
    }

    // Clear answer labels
    const labels = this._answerLabels.get(playerId);
    if (labels) {
      labels.forEach(label => {
        label.unload();
      });
      this._answerLabels.delete(playerId);
    }
  }

  private _clearPlatform(): void {
    this._platformEntities.forEach(entity => {
      if (entity.isSpawned) {
        entity.despawn();
      }
    });
    this._platformEntities = [];
  }

  private _playSound(uri: string, attachedEntity?: Entity): void {
    try {
      console.log(`[EduFallGameManager] Playing sound: ${uri}`);
      const audio = new Audio({
        uri,
        loop: false,
        volume: 1.0
        // Removed attachedToEntity - plays as global audio instead of positional
      });
      audio.play(this._world);
    } catch (error) {
      console.error(`[EduFallGameManager] Error playing sound ${uri}:`, error);
    }
  }

  private _playBackgroundMusic(): void {
    if (this._isMusicPlaying || !this._backgroundMusic) return;

    setTimeout(() => {
      if (this._backgroundMusic && !this._isMusicPlaying) {
        try {
          this._backgroundMusic.play(this._world);
          this._isMusicPlaying = true;
          console.log('[EduFallGameManager] Background music started');
        } catch (error) {
          console.error('[EduFallGameManager] Error playing background music:', error);
        }
      }
    }, 1000); // Reduced delay from 15s to 1s
  }

  private _stopBackgroundMusic(): void {
    if (!this._isMusicPlaying || !this._backgroundMusic) return;

    try {
      this._backgroundMusic.pause();
      this._isMusicPlaying = false;
      console.log('[EduFallGameManager] Background music stopped');
    } catch (error) {
      console.error('[EduFallGameManager] Error stopping background music:', error);
    }
  }

  private _stopBackgroundMusicIfNoActive(): void {
    const hasActivePlayer = Array.from(this._players.values()).some(p => p.state.gameActive);
    if (!hasActivePlayer) {
      this._stopBackgroundMusic();
    }
  }
}
