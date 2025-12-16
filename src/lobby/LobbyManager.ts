/**
 * LobbyManager - Manages the lobby/spawn area
 *
 * The lobby is the starting point where players:
 * - Spawn and see their stats
 * - View leaderboards
 * - Choose to play solo, tournaments, or practice
 *
 * Uses the fall-to-select mechanic for menu navigation
 */

import {
  World,
  Player,
  PlayerEntity,
  Entity,
  RigidBodyType,
  ColliderShape,
  SceneUI
} from 'hytopia';

import type { SubjectType, QuestionDifficulty } from '../questions/QuestionProvider';
import { GAME_CONSTANTS } from '../types';

// ============ Types ============

export type GameMode = 'solo' | 'tournament' | 'practice';

export interface LobbyState {
  playerId: string;
  isInLobby: boolean;
  selectionPhase: SelectionPhase;

  // Current selections
  selectedMode?: GameMode;
  selectedSubject?: SubjectType;
  selectedDifficulty?: QuestionDifficulty;
  selectedCategory?: string;
}

export type SelectionPhase =
  | 'mode'           // Choose: Solo, Tournament, Practice
  | 'subject'        // Choose: Math, Spelling, etc.
  | 'difficulty'     // Choose: Beginner, Moderate, Hard
  | 'category'       // Choose: Subject-specific categories
  | 'ready';         // Ready to start

// ============ Constants ============

// Position blocks at Y=0 like working answer blocks
// Player will spawn higher and fall down to them
const LOBBY_SPAWN_Y = 80;  // Where player spawns (higher for more fall time)
const SELECTION_BLOCK_Y = 0;  // Same as working ANSWER_BLOCK_Y
const SELECTION_BLOCK_SPACING = 3;  // Spacing between selection blocks
const BLOCK_HALF_EXTENTS = { x: 0.5, y: 0.5, z: 0.5 };  // Single block size

// Block textures for different selections (using available textures)
const MODE_TEXTURES: Record<GameMode, string> = {
  'solo': 'blocks/emerald-block.png',
  'tournament': 'blocks/gold-ore.png',
  'practice': 'blocks/diamond-block.png'
};

const SUBJECT_TEXTURES: Record<SubjectType, string> = {
  'math': 'blocks/iron-ore.png',
  'spelling': 'blocks/diamond-block.png',
  'vocabulary': 'blocks/diamond-block.png',
  'geography': 'blocks/emerald-block.png',
  'science': 'blocks/coal-ore.png',
  'history': 'blocks/gold-ore.png',
  'language': 'blocks/diamond-ore.png',
  'typing': 'blocks/stone-bricks.png'
};

const DIFFICULTY_TEXTURES: Record<QuestionDifficulty, string> = {
  'beginner': 'blocks/emerald-block.png',
  'intermediate': 'blocks/gold-ore.png',
  'advanced': 'blocks/iron-ore.png',
  'expert': 'blocks/diamond-ore.png'
};

// ============ LobbyManager ============

export class LobbyManager {
  private static _instance: LobbyManager;
  private _world: World | null = null;

  // Player states
  private _playerStates: Map<string, LobbyState> = new Map();

  // Lobby platform entities
  private _lobbyPlatform: Entity[] = [];

  // Selection blocks per player
  private _selectionBlocks: Map<string, Entity[]> = new Map();

  // Text labels per player
  private _textLabels: Map<string, SceneUI[]> = new Map();

  // Callbacks
  private _onSelectionComplete: ((playerId: string, state: LobbyState) => void)[] = [];
  private _onTournamentSelected: ((playerId: string) => void)[] = [];

  private constructor() {
    console.log('[LobbyManager] Initialized');
  }

  public static getInstance(): LobbyManager {
    if (!LobbyManager._instance) {
      LobbyManager._instance = new LobbyManager();
    }
    return LobbyManager._instance;
  }

  public setWorld(world: World): void {
    this._world = world;
    console.log('[LobbyManager] World set');
    // No lobby platform needed - player falls through tunnel to selection blocks
  }

  // ============ Public API ============

  /**
   * Spawn player in lobby
   */
  public spawnInLobby(player: Player, playerEntity: PlayerEntity): void {
    if (!this._world) {
      console.error('[LobbyManager] Cannot spawn - world not set!');
      return;
    }

    console.log(`[LobbyManager] Spawning ${player.username} in lobby at Y=${LOBBY_SPAWN_Y}`);

    // Initialize lobby state
    const state: LobbyState = {
      playerId: player.id,
      isInLobby: true,
      selectionPhase: 'mode'
    };

    this._playerStates.set(player.id, state);

    // Position player above selection blocks (same as game reset position)
    playerEntity.setPosition({
      x: 0,
      y: LOBBY_SPAWN_Y,
      z: 0
    });

    // Use game gravity for falling
    playerEntity.setGravityScale(GAME_CONSTANTS.PLAYER_GRAVITY_SCALE);

    // Show mode selection blocks
    this._showModeSelection(player, playerEntity);

    console.log(`[LobbyManager] Player ${player.username} spawned in lobby, selection blocks at Y=${SELECTION_BLOCK_Y}`);
  }

  /**
   * Return player to lobby
   */
  public returnToLobby(player: Player, playerEntity: PlayerEntity): void {
    this._clearSelectionBlocks(player.id);

    const state = this._playerStates.get(player.id);
    if (state) {
      state.isInLobby = true;
      state.selectionPhase = 'mode';
      state.selectedMode = undefined;
      state.selectedSubject = undefined;
      state.selectedDifficulty = undefined;
      state.selectedCategory = undefined;
    }

    // Respawn in lobby
    this.spawnInLobby(player, playerEntity);
  }

  /**
   * Get player's current lobby state
   */
  public getPlayerState(playerId: string): LobbyState | undefined {
    return this._playerStates.get(playerId);
  }

  /**
   * Check if player is in lobby
   */
  public isInLobby(playerId: string): boolean {
    return this._playerStates.get(playerId)?.isInLobby ?? false;
  }

  /**
   * Handle player leaving
   */
  public handlePlayerLeave(playerId: string): void {
    this._clearSelectionBlocks(playerId);
    this._playerStates.delete(playerId);
  }

  /**
   * Update stats display for player
   */
  public updateStatsDisplay(player: Player, stats: any): void {
    // Send stats to the player's UI
    player.ui.sendData({
      type: 'lobby-stats',
      username: player.username,
      totalScore: stats?.totalScore ?? 0,
      gamesPlayed: stats?.totalGamesPlayed ?? 0,
      highScore: stats?.highScore ?? 0,
      level: stats?.currentLevel ?? 1
    });
  }

  // ============ Callbacks ============

  public onSelectionComplete(callback: (playerId: string, state: LobbyState) => void): void {
    this._onSelectionComplete.push(callback);
  }

  public onTournamentSelected(callback: (playerId: string) => void): void {
    this._onTournamentSelected.push(callback);
  }

  // ============ Selection Flow ============

  private _showModeSelection(player: Player, playerEntity: PlayerEntity): void {
    if (!this._world) {
      console.error('[LobbyManager] _showModeSelection: world not set!');
      return;
    }

    console.log(`[LobbyManager] Creating mode selection blocks for ${player.username}`);

    this._clearSelectionBlocks(player.id);

    const modes: { mode: GameMode; label: string; description: string }[] = [
      { mode: 'solo', label: 'SOLO PLAY', description: 'Play alone and improve your skills' },
      { mode: 'tournament', label: 'TOURNAMENTS', description: 'Compete against other players' },
      { mode: 'practice', label: 'PRACTICE', description: 'No score, just learn' }
    ];

    const blocks: Entity[] = [];
    const labels: Entity[] = [];

    const startX = -((modes.length - 1) * SELECTION_BLOCK_SPACING) / 2;

    modes.forEach((modeInfo, index) => {
      const x = startX + (index * SELECTION_BLOCK_SPACING);

      console.log(`[LobbyManager] Creating block for ${modeInfo.mode} at x=${x}, y=${SELECTION_BLOCK_Y}`);

      const block = new Entity({
        blockTextureUri: MODE_TEXTURES[modeInfo.mode],
        blockHalfExtents: BLOCK_HALF_EXTENTS,
        name: `mode_${modeInfo.mode}`,
        rigidBodyOptions: {
          type: RigidBodyType.FIXED,
          colliders: [{
            shape: ColliderShape.BLOCK,
            halfExtents: BLOCK_HALF_EXTENTS,
            isSensor: true, // Player falls through but collision is still detected
            onCollision: (other, started) => {
              if (started && other instanceof PlayerEntity && other.player?.id === player.id) {
                console.log(`[LobbyManager] Player fell through ${modeInfo.mode} block!`);
                this._handleModeSelection(player, playerEntity, modeInfo.mode);
              }
            }
          }]
        }
      });

      block.spawn(this._world!, { x, y: SELECTION_BLOCK_Y, z: 0 });
      console.log(`[LobbyManager] Spawned ${modeInfo.mode} block, isSpawned: ${block.isSpawned}`);
      blocks.push(block);

      // Create text label using SceneUI attached to the block
      const textLabel = new SceneUI({
        templateId: 'selection-label',
        attachedToEntity: block,
        offset: { x: 0, y: 10, z: 0 },
        state: {
          text: modeInfo.label
        }
      });

      textLabel.load(this._world!);
      labels.push(textLabel);
    });

    this._selectionBlocks.set(player.id, blocks);
    this._textLabels.set(player.id, labels);
    console.log(`[LobbyManager] Created ${blocks.length} mode selection blocks`);
  }

  private _handleModeSelection(player: Player, playerEntity: PlayerEntity, mode: GameMode): void {
    const state = this._playerStates.get(player.id);
    if (!state || state.selectionPhase !== 'mode') return;

    state.selectedMode = mode;

    console.log(`[LobbyManager] ${player.username} selected mode: ${mode}`);

    // Reset player position above the next set of selection blocks
    playerEntity.setPosition({ x: 0, y: LOBBY_SPAWN_Y, z: 0 });

    if (mode === 'tournament') {
      // Go to tournament selection
      state.selectionPhase = 'ready';
      this._clearSelectionBlocks(player.id);
      this._onTournamentSelected.forEach(cb => cb(player.id));

      player.ui.sendData({
        type: 'show-tournament-lobby'
      });
    } else {
      // Show subject selection for solo/practice
      state.selectionPhase = 'subject';

      setTimeout(() => {
        this._showSubjectSelection(player, playerEntity);
      }, 500);
    }
  }

  private _showSubjectSelection(player: Player, playerEntity: PlayerEntity): void {
    if (!this._world) return;

    this._clearSelectionBlocks(player.id);

    const subjects: { subject: SubjectType; label: string }[] = [
      { subject: 'math', label: 'MATH' },
      { subject: 'spelling', label: 'SPELLING' },
      { subject: 'geography', label: 'GEOGRAPHY' },
      { subject: 'science', label: 'SCIENCE' },
      { subject: 'history', label: 'HISTORY' }
    ];

    const blocks: Entity[] = [];
    const labels: Entity[] = [];

    const startX = -((subjects.length - 1) * SELECTION_BLOCK_SPACING) / 2;

    subjects.forEach((subjectInfo, index) => {
      const x = startX + (index * SELECTION_BLOCK_SPACING);

      const block = new Entity({
        blockTextureUri: SUBJECT_TEXTURES[subjectInfo.subject],
        blockHalfExtents: BLOCK_HALF_EXTENTS,
        name: `subject_${subjectInfo.subject}`,
        rigidBodyOptions: {
          type: RigidBodyType.FIXED,
          colliders: [{
            shape: ColliderShape.BLOCK,
            halfExtents: BLOCK_HALF_EXTENTS,
            isSensor: true, // Player falls through but collision is still detected
            onCollision: (other, started) => {
              if (started && other instanceof PlayerEntity && other.player?.id === player.id) {
                this._handleSubjectSelection(player, playerEntity, subjectInfo.subject);
              }
            }
          }]
        }
      });

      block.spawn(this._world!, { x, y: SELECTION_BLOCK_Y, z: 0 });
      blocks.push(block);

      // Create text label using SceneUI attached to the block
      const textLabel = new SceneUI({
        templateId: 'selection-label',
        attachedToEntity: block,
        offset: { x: 0, y: 10, z: 0 },
        state: {
          text: subjectInfo.label
        }
      });

      textLabel.load(this._world!);
      labels.push(textLabel);
    });

    this._selectionBlocks.set(player.id, blocks);
    this._textLabels.set(player.id, labels);
  }

  private _handleSubjectSelection(player: Player, playerEntity: PlayerEntity, subject: SubjectType): void {
    const state = this._playerStates.get(player.id);
    if (!state || state.selectionPhase !== 'subject') return;

    state.selectedSubject = subject;
    state.selectionPhase = 'difficulty';

    console.log(`[LobbyManager] ${player.username} selected subject: ${subject}`);

    playerEntity.setPosition({ x: 0, y: LOBBY_SPAWN_Y, z: 0 });

    setTimeout(() => {
      this._showDifficultySelection(player, playerEntity);
    }, 500);
  }

  private _showDifficultySelection(player: Player, playerEntity: PlayerEntity): void {
    if (!this._world) return;

    this._clearSelectionBlocks(player.id);

    const difficulties: { difficulty: QuestionDifficulty; label: string }[] = [
      { difficulty: 'beginner', label: 'BEGINNER' },
      { difficulty: 'intermediate', label: 'MODERATE' },
      { difficulty: 'advanced', label: 'HARD' }
    ];

    const blocks: Entity[] = [];
    const labels: Entity[] = [];

    const startX = -((difficulties.length - 1) * SELECTION_BLOCK_SPACING) / 2;

    difficulties.forEach((diffInfo, index) => {
      const x = startX + (index * SELECTION_BLOCK_SPACING);

      const block = new Entity({
        blockTextureUri: DIFFICULTY_TEXTURES[diffInfo.difficulty],
        blockHalfExtents: BLOCK_HALF_EXTENTS,
        name: `difficulty_${diffInfo.difficulty}`,
        rigidBodyOptions: {
          type: RigidBodyType.FIXED,
          colliders: [{
            shape: ColliderShape.BLOCK,
            halfExtents: BLOCK_HALF_EXTENTS,
            isSensor: true, // Player falls through but collision is still detected
            onCollision: (other, started) => {
              if (started && other instanceof PlayerEntity && other.player?.id === player.id) {
                this._handleDifficultySelection(player, playerEntity, diffInfo.difficulty);
              }
            }
          }]
        }
      });

      block.spawn(this._world!, { x, y: SELECTION_BLOCK_Y, z: 0 });
      blocks.push(block);

      // Create text label using SceneUI attached to the block
      const textLabel = new SceneUI({
        templateId: 'selection-label',
        attachedToEntity: block,
        offset: { x: 0, y: 10, z: 0 },
        state: {
          text: diffInfo.label
        }
      });

      textLabel.load(this._world!);
      labels.push(textLabel);
    });

    this._selectionBlocks.set(player.id, blocks);
    this._textLabels.set(player.id, labels);
  }

  private _handleDifficultySelection(
    player: Player,
    playerEntity: PlayerEntity,
    difficulty: QuestionDifficulty
  ): void {
    const state = this._playerStates.get(player.id);
    if (!state || state.selectionPhase !== 'difficulty') return;

    state.selectedDifficulty = difficulty;
    state.selectionPhase = 'ready';
    state.isInLobby = false;

    console.log(`[LobbyManager] ${player.username} selected difficulty: ${difficulty}`);

    this._clearSelectionBlocks(player.id);

    // Notify that selection is complete
    this._onSelectionComplete.forEach(cb => cb(player.id, state));

    player.ui.sendData({
      type: 'selection-complete',
      mode: state.selectedMode,
      subject: state.selectedSubject,
      difficulty: state.selectedDifficulty
    });
  }

  // ============ Lobby Platform ============

  private _createLobbyPlatform(): void {
    if (!this._world) return;

    // Clear existing platform
    this._lobbyPlatform.forEach(e => {
      if (e.isSpawned) e.despawn();
    });
    this._lobbyPlatform = [];

    const halfSize = Math.floor(LOBBY_PLATFORM_SIZE / 2);

    // Create platform blocks
    for (let x = -halfSize; x <= halfSize; x++) {
      for (let z = -halfSize; z <= halfSize; z++) {
        // Circular platform
        const dist = Math.sqrt(x * x + z * z);
        if (dist > halfSize) continue;

        // Choose texture based on distance from center
        let texture = 'blocks/quartz-block.png';
        if (dist < 3) texture = 'blocks/gold-block.png';
        else if (dist < 6) texture = 'blocks/white-wool.png';

        const block = new Entity({
          blockTextureUri: texture,
          blockHalfExtents: { x: 0.5, y: 0.5, z: 0.5 },
          rigidBodyOptions: {
            type: RigidBodyType.FIXED,
            colliders: [{
              shape: ColliderShape.BLOCK,
              halfExtents: { x: 0.5, y: 0.5, z: 0.5 }
            }]
          }
        });

        block.spawn(this._world, { x, y: LOBBY_PLATFORM_Y, z });
        this._lobbyPlatform.push(block);
      }
    }

    console.log(`[LobbyManager] Created lobby platform with ${this._lobbyPlatform.length} blocks`);
  }

  // ============ Cleanup ============

  private _clearSelectionBlocks(playerId: string): void {
    // Clear blocks
    const blocks = this._selectionBlocks.get(playerId);
    if (blocks) {
      blocks.forEach(block => {
        if (block.isSpawned) block.despawn();
      });
      this._selectionBlocks.delete(playerId);
    }

    // Clear text labels
    const labels = this._textLabels.get(playerId);
    if (labels) {
      labels.forEach(label => {
        label.unload();
      });
      this._textLabels.delete(playerId);
    }
  }
}
