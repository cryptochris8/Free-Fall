/**
 * GameManager - Core game state and flow management
 *
 * Handles:
 * - Player game state (score, questions, difficulty)
 * - Game flow (start, answer, end, restart)
 * - Player entity management
 * - Coordination between managers
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
  PlayerCameraMode
} from 'hytopia';
import type { Vector3Like } from 'hytopia';

import { FallingPlayerController } from '../controllers/FallingPlayerController';
import { MathProblemManager } from './MathProblemManager';
import { AnswerBlockManager } from './AnswerBlockManager';
import type { PlayerGameState, PlayerData, Difficulty, MathProblem } from '../types';
import { GAME_CONSTANTS } from '../types';

export class GameManager {
  private static _instance: GameManager;
  private _world: World;

  // Player tracking
  private _players: Map<string, PlayerData> = new Map();

  // Sub-managers
  private _mathProblemManager: MathProblemManager;
  private _answerBlockManager: AnswerBlockManager;

  // Audio
  private _backgroundMusic: Audio | null = null;
  private _isMusicPlaying: boolean = false;

  // Landing platform entities
  private _platformEntities: Entity[] = [];

  // Callbacks for external systems
  private _onCorrectAnswerCallbacks: ((player: Player, state: PlayerGameState) => void)[] = [];
  private _onWrongAnswerCallbacks: ((player: Player, state: PlayerGameState) => void)[] = [];
  private _onGameEndCallbacks: ((player: Player, state: PlayerGameState) => void)[] = [];

  private constructor(world: World) {
    this._world = world;
    this._mathProblemManager = MathProblemManager.getInstance();
    this._answerBlockManager = new AnswerBlockManager(world, {
      onCorrectAnswer: (playerEntity) => this._handleCorrectAnswer(playerEntity),
      onWrongAnswer: (playerEntity) => this._handleWrongAnswer(playerEntity)
    });

    // Create background music
    this._backgroundMusic = new Audio({
      uri: GAME_CONSTANTS.AUDIO_MUSIC,
      loop: true,
      volume: 0.7
    });

    this._setupEventListeners();
  }

  public static getInstance(world?: World): GameManager {
    if (!GameManager._instance) {
      if (!world) throw new Error('GameManager requires world on first instantiation');
      GameManager._instance = new GameManager(world);
    }
    return GameManager._instance;
  }

  /**
   * Get player data by username
   */
  public getPlayerData(username: string): PlayerData | undefined {
    return this._players.get(username);
  }

  /**
   * Get all players
   */
  public getAllPlayers(): Map<string, PlayerData> {
    return this._players;
  }

  /**
   * Register callback for correct answers (for external systems)
   */
  public onCorrectAnswer(callback: (player: Player, state: PlayerGameState) => void): void {
    this._onCorrectAnswerCallbacks.push(callback);
  }

  /**
   * Register callback for wrong answers (for external systems)
   */
  public onWrongAnswer(callback: (player: Player, state: PlayerGameState) => void): void {
    this._onWrongAnswerCallbacks.push(callback);
  }

  /**
   * Register callback for game end (for external systems)
   */
  public onGameEnd(callback: (player: Player, state: PlayerGameState) => void): void {
    this._onGameEndCallbacks.push(callback);
  }

  /**
   * Setup world event listeners
   */
  private _setupEventListeners(): void {
    // Player joined
    this._world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
      this._handlePlayerJoin(player);
    });

    // Player left
    this._world.on(PlayerEvent.LEFT_WORLD, ({ player }) => {
      this._handlePlayerLeave(player);
    });
  }

  /**
   * Handle player joining the world
   */
  private _handlePlayerJoin(player: Player): void {
    console.log(`[GameManager] Player ${player.username} joined`);

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

    // Setup camera
    player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
    player.camera.setOffset({ x: 0, y: 1.5, z: 0 });
    player.camera.setForwardOffset(1.0);

    // Spawn player
    playerEntity.spawn(this._world, GAME_CONSTANTS.PLAYER_SPAWN_POSITION);

    // Setup fall detection callback
    controller.setOnFallPastThreshold((entity) => {
      this._handleFallPastThreshold(entity);
    });

    // Initialize game state
    const gameState: PlayerGameState = {
      score: 0,
      questionsAnswered: 0,
      gameActive: false,
      currentAnswer: 0,
      difficulty: 'moderate',
      isFinalFall: false,
      currentGravityScale: GAME_CONSTANTS.PLAYER_GRAVITY_SCALE,
      streak: 0,
      sessionStartTime: Date.now()
    };

    // Store player data
    this._players.set(player.username, {
      player,
      entity: playerEntity,
      gameState
    });

    // Load UI
    player.ui.load(GAME_CONSTANTS.UI_PATH);

    // Setup UI message handling
    this._setupUIHandling(player);

    console.log(`[GameManager] Player ${player.username} initialized`);
  }

  /**
   * Setup UI message handling for a player
   */
  private _setupUIHandling(player: Player): void {
    player.ui.on(PlayerUIEvent.DATA, ({ data }) => {
      this._handleUIMessage(player, data);
    });
  }

  /**
   * Handle UI messages from player
   */
  private _handleUIMessage(player: Player, data: any): void {
    console.log(`[GameManager] UI message from ${player.username}:`, data.type);

    switch (data.type) {
      case 'start-game':
        this.startGame(player, data.difficulty || 'moderate');
        break;

      case 'restart-game':
        this.restartGame(player);
        break;

      case 'use-rewind':
        // Will be handled by PowerUpManager
        break;

      default:
        // Other messages handled by UIMessageHandler
        break;
    }
  }

  /**
   * Start a new game for a player
   */
  public startGame(player: Player, difficulty: Difficulty): void {
    const playerData = this._players.get(player.username);
    if (!playerData) {
      console.error(`[GameManager] Cannot start game - player ${player.username} not found`);
      return;
    }

    console.log(`[GameManager] Starting game for ${player.username} with difficulty: ${difficulty}`);

    // Reset game state
    playerData.gameState = {
      score: 0,
      questionsAnswered: 0,
      gameActive: true,
      currentAnswer: 0,
      difficulty,
      isFinalFall: false,
      currentGravityScale: GAME_CONSTANTS.PLAYER_GRAVITY_SCALE,
      streak: 0,
      sessionStartTime: Date.now()
    };

    // Reset player position and controller
    playerData.entity.setPosition(GAME_CONSTANTS.PLAYER_SPAWN_POSITION);
    playerData.entity.setGravityScale(GAME_CONSTANTS.PLAYER_GRAVITY_SCALE);
    (playerData.entity.controller as FallingPlayerController).resetFallState();

    // Clear any existing platform
    this._clearPlatform();

    // Generate first problem
    this._generateNewProblem(player);

    // Start music (with delay for mobile)
    this._playBackgroundMusic();
  }

  /**
   * Restart the game (return to start screen)
   */
  public restartGame(player: Player): void {
    const playerData = this._players.get(player.username);
    if (!playerData) return;

    console.log(`[GameManager] Restarting game for ${player.username}`);

    // Reset state
    playerData.gameState.gameActive = false;
    playerData.gameState.isFinalFall = false;
    playerData.gameState.currentGravityScale = GAME_CONSTANTS.PLAYER_GRAVITY_SCALE;

    // Reset player
    playerData.entity.setPosition(GAME_CONSTANTS.PLAYER_SPAWN_POSITION);
    playerData.entity.setGravityScale(GAME_CONSTANTS.PLAYER_GRAVITY_SCALE);
    (playerData.entity.controller as FallingPlayerController).resetFallState();

    // Clear blocks and platform
    this._answerBlockManager.clearBlocks();
    this._clearPlatform();

    // Stop music if no active players
    this._stopBackgroundMusicIfNoActive();

    // Show start screen
    player.ui.sendData({ type: 'show-start' });
  }

  /**
   * Generate a new math problem for a player
   */
  private _generateNewProblem(player: Player): void {
    const playerData = this._players.get(player.username);
    if (!playerData || !playerData.gameState.gameActive) return;

    const problem = this._mathProblemManager.generateProblem(playerData.gameState.difficulty);

    // Store correct answer
    playerData.gameState.currentAnswer = problem.correctAnswer;

    // Spawn answer blocks
    this._answerBlockManager.spawnAnswerBlocks(problem);

    // Send problem to UI
    player.ui.sendData({
      type: 'problem',
      num1: problem.num1.toString(),
      operation: this._mathProblemManager.getOperationDisplay(problem.operation),
      num2: problem.num2.toString()
    });

    console.log(`[GameManager] Generated problem for ${player.username}: ${this._mathProblemManager.formatProblem(problem)}`);
  }

  /**
   * Handle correct answer
   */
  private _handleCorrectAnswer(playerEntity: PlayerEntity): void {
    const player = playerEntity.player;
    if (!player) return;

    const playerData = this._players.get(player.username);
    if (!playerData || !playerData.gameState.gameActive) return;

    console.log(`[GameManager] Correct answer from ${player.username}`);

    // Update state
    playerData.gameState.score++;
    playerData.gameState.questionsAnswered++;
    playerData.gameState.streak++;

    // Increase gravity (for moderate/hard)
    if (playerData.gameState.difficulty !== 'beginner') {
      const maxGravity = GAME_CONSTANTS.PLAYER_GRAVITY_SCALE * GAME_CONSTANTS.MAX_GRAVITY_MULTIPLIER;
      playerData.gameState.currentGravityScale = Math.min(
        playerData.gameState.currentGravityScale + GAME_CONSTANTS.GRAVITY_INCREASE_PER_CORRECT,
        maxGravity
      );
      playerEntity.setGravityScale(playerData.gameState.currentGravityScale);
    }

    // Play sound
    this._playSound(GAME_CONSTANTS.AUDIO_CORRECT, playerEntity);

    // Send score update
    player.ui.sendData({ type: 'score', score: playerData.gameState.score });

    // Notify external systems
    this._onCorrectAnswerCallbacks.forEach(cb => cb(player, playerData.gameState));

    // Check for game end or next question
    setTimeout(() => {
      if (!playerData.gameState.gameActive) return;

      if (playerData.gameState.questionsAnswered >= GAME_CONSTANTS.MAX_QUESTIONS) {
        this._startFinalFall(player);
      } else {
        // Reset position and generate next problem
        playerData.entity.setPosition(GAME_CONSTANTS.PLAYER_RESET_POSITION);
        (playerData.entity.controller as FallingPlayerController).resetFallState();
        this._generateNewProblem(player);
      }
    }, GAME_CONSTANTS.GAME_RESET_DELAY_MS);
  }

  /**
   * Handle wrong answer
   */
  private _handleWrongAnswer(playerEntity: PlayerEntity): void {
    const player = playerEntity.player;
    if (!player) return;

    const playerData = this._players.get(player.username);
    if (!playerData || !playerData.gameState.gameActive || playerData.gameState.isFinalFall) return;

    console.log(`[GameManager] Wrong answer from ${player.username}`);

    // Update state
    playerData.gameState.questionsAnswered++;
    playerData.gameState.streak = 0;

    // Reset gravity
    playerData.gameState.currentGravityScale = GAME_CONSTANTS.PLAYER_GRAVITY_SCALE;
    playerEntity.setGravityScale(GAME_CONSTANTS.PLAYER_GRAVITY_SCALE);

    // Play sound
    this._playSound(GAME_CONSTANTS.AUDIO_WRONG, playerEntity);

    // Notify external systems
    this._onWrongAnswerCallbacks.forEach(cb => cb(player, playerData.gameState));

    // Check for game end or next question
    setTimeout(() => {
      if (!playerData.gameState.gameActive) return;

      if (playerData.gameState.questionsAnswered >= GAME_CONSTANTS.MAX_QUESTIONS) {
        this._startFinalFall(player);
      } else {
        // Reset position and generate next problem
        playerData.entity.setPosition(GAME_CONSTANTS.PLAYER_RESET_POSITION);
        (playerData.entity.controller as FallingPlayerController).resetFallState();
        this._generateNewProblem(player);
      }
    }, GAME_CONSTANTS.GAME_RESET_DELAY_MS);
  }

  /**
   * Handle player falling past the answer threshold without hitting a block
   */
  private _handleFallPastThreshold(playerEntity: PlayerEntity): void {
    const player = playerEntity.player;
    if (!player) return;

    const playerData = this._players.get(player.username);
    if (!playerData || !playerData.gameState.gameActive || playerData.gameState.isFinalFall) return;

    console.log(`[GameManager] Player ${player.username} fell past threshold`);

    // Treat as wrong answer
    this._handleWrongAnswer(playerEntity);
  }

  /**
   * Start the final fall sequence after completing all questions
   */
  private _startFinalFall(player: Player): void {
    const playerData = this._players.get(player.username);
    if (!playerData) return;

    console.log(`[GameManager] Starting final fall for ${player.username}`);

    playerData.gameState.isFinalFall = true;

    // Clear answer blocks
    this._answerBlockManager.clearBlocks();

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

  /**
   * Create landing platform
   */
  private _createLandingPlatform(player: Player): void {
    this._clearPlatform();

    const platformY = GAME_CONSTANTS.LANDING_PLATFORM_Y;
    const platformSize = 14;
    const halfSize = Math.floor(platformSize / 2);

    // Simple island pattern
    const textures = ['blocks/grass', 'blocks/sand.png', 'blocks/water-still.png', 'blocks/dirt.png'];

    for (let i = 0; i < platformSize; i++) {
      for (let j = 0; j < platformSize; j++) {
        const x = -halfSize + i;
        const z = -halfSize + j;

        // Distance from center for texture selection
        const distFromCenter = Math.sqrt(x * x + z * z);
        let textureIndex = 0;

        if (distFromCenter > 6) textureIndex = 2; // Water
        else if (distFromCenter > 4) textureIndex = 1; // Sand
        else if (distFromCenter > 2) textureIndex = 3; // Dirt
        // else grass (0)

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

    console.log(`[GameManager] Created landing platform with ${this._platformEntities.length} blocks`);
  }

  /**
   * Handle player landing on platform
   */
  private _handlePlayerLanded(playerEntity: PlayerEntity): void {
    const player = playerEntity.player;
    if (!player) return;

    const playerData = this._players.get(player.username);
    if (!playerData || !playerData.gameState.isFinalFall) return;

    console.log(`[GameManager] Player ${player.username} landed! Final score: ${playerData.gameState.score}`);

    // Set landed state
    const controller = playerData.entity.controller as FallingPlayerController;
    controller.setLanded(true);

    // End game
    playerData.gameState.gameActive = false;

    // Play landing sound
    this._playSound(GAME_CONSTANTS.AUDIO_LANDING, playerEntity);

    // Notify external systems
    this._onGameEndCallbacks.forEach(cb => cb(player, playerData.gameState));

    // Send final score to UI
    player.ui.sendData({
      type: 'game-over',
      finalScore: playerData.gameState.score
    });
  }

  /**
   * Clear landing platform
   */
  private _clearPlatform(): void {
    this._platformEntities.forEach(entity => {
      if (entity.isSpawned) {
        entity.despawn();
      }
    });
    this._platformEntities = [];
  }

  /**
   * Handle player leaving
   */
  private _handlePlayerLeave(player: Player): void {
    console.log(`[GameManager] Player ${player.username} left`);

    const playerData = this._players.get(player.username);
    if (playerData) {
      if (playerData.entity.isSpawned) {
        playerData.entity.despawn();
      }
      this._players.delete(player.username);
    }

    // Cleanup if last player
    if (this._players.size === 0) {
      this._answerBlockManager.clearBlocks();
      this._clearPlatform();
      this._stopBackgroundMusic();
    } else {
      this._stopBackgroundMusicIfNoActive();
    }
  }

  /**
   * Play a sound effect
   */
  private _playSound(uri: string, attachedEntity?: Entity): void {
    try {
      const audio = new Audio({
        uri,
        loop: false,
        volume: 1.0,
        attachedToEntity: attachedEntity,
        referenceDistance: 15
      });
      audio.play(this._world);
    } catch (error) {
      console.error(`[GameManager] Error playing sound ${uri}:`, error);
    }
  }

  /**
   * Play background music
   */
  private _playBackgroundMusic(): void {
    if (this._isMusicPlaying || !this._backgroundMusic) return;

    // Delay for mobile autoplay
    setTimeout(() => {
      if (this._backgroundMusic && !this._isMusicPlaying) {
        try {
          this._backgroundMusic.play(this._world);
          this._isMusicPlaying = true;
          console.log('[GameManager] Background music started');
        } catch (error) {
          console.error('[GameManager] Error playing background music:', error);
        }
      }
    }, 15000);
  }

  /**
   * Stop background music
   */
  private _stopBackgroundMusic(): void {
    if (!this._isMusicPlaying || !this._backgroundMusic) return;

    try {
      this._backgroundMusic.pause();
      this._isMusicPlaying = false;
      console.log('[GameManager] Background music stopped');
    } catch (error) {
      console.error('[GameManager] Error stopping background music:', error);
    }
  }

  /**
   * Stop music if no players have active games
   */
  private _stopBackgroundMusicIfNoActive(): void {
    const hasActivePlayer = Array.from(this._players.values())
      .some(p => p.gameState.gameActive);

    if (!hasActivePlayer) {
      this._stopBackgroundMusic();
    }
  }
}
