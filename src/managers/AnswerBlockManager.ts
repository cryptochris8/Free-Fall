/**
 * AnswerBlockManager - Manages answer blocks in the game
 *
 * Handles:
 * - Spawning answer blocks with correct/wrong answers
 * - Collision detection for answers
 * - Block break effects
 * - Clearing blocks between questions
 */

import {
  Entity,
  World,
  RigidBodyType,
  ColliderShape,
  PlayerEntity,
  SceneUI
} from 'hytopia';
import type { BlockType, Vector3Like } from 'hytopia';
import type { MathProblem } from '../types';
import { GAME_CONSTANTS } from '../types';

export interface AnswerBlockCallbacks {
  onCorrectAnswer: (player: PlayerEntity) => void;
  onWrongAnswer: (player: PlayerEntity) => void;
}

export class AnswerBlockManager {
  private _world: World;
  private _blocks: Entity[] = [];
  private _labels: SceneUI[] = [];
  private _currentProblem: MathProblem | null = null;
  private _callbacks: AnswerBlockCallbacks;

  // Block configuration - using standard block textures that are guaranteed to exist
  private static readonly BLOCK_TEXTURES = [
    'blocks/stone.png',      // 0
    'blocks/dirt.png',       // 1
    'blocks/oak-planks.png', // 2
    'blocks/cobblestone.png',// 3
    'blocks/sand.png',       // 4
    'blocks/gravel.png',     // 5
    'blocks/gold-ore.png',   // 6
    'blocks/iron-ore.png',   // 7
    'blocks/coal-ore.png',   // 8
    'blocks/oak-log.png',    // 9
    'blocks/glass.png',      // 10
    'blocks/lapis-block.png',// 11
    'blocks/sandstone.png',  // 12
    'blocks/mossy-cobblestone.png', // 13
    'blocks/obsidian.png',   // 14
    'blocks/diamond-block.png', // 15
  ];
  private static readonly BLOCK_HALF_EXTENTS: Vector3Like = { x: 1.0, y: 1.0, z: 1.0 };
  private static readonly BLOCK_SPACING = 4;
  private static readonly BLOCK_Y = GAME_CONSTANTS.ANSWER_BLOCK_Y;

  constructor(world: World, callbacks: AnswerBlockCallbacks) {
    this._world = world;
    this._callbacks = callbacks;
  }

  /**
   * Get the current problem
   */
  public get currentProblem(): MathProblem | null {
    return this._currentProblem;
  }

  /**
   * Generate and spawn answer blocks for a problem
   */
  public spawnAnswerBlocks(problem: MathProblem): void {
    // Clear any existing blocks first
    this.clearBlocks();

    this._currentProblem = problem;

    // Combine correct and wrong answers
    const answers = [problem.correctAnswer, ...problem.wrongAnswers];

    // Generate positions
    const positions = this._generateBlockPositions(answers.length);

    // Shuffle positions so correct answer isn't always first
    this._shuffleArray(positions);

    // Create blocks
    answers.forEach((answerValue, index) => {
      const position = positions[index];
      const block = this._createAnswerBlock(answerValue, position, problem.correctAnswer);
      this._blocks.push(block);
    });

    console.log(`[AnswerBlockManager] Spawned ${this._blocks.length} answer blocks for problem: ${problem.correctAnswer}`);
  }

  /**
   * Create a single answer block entity
   */
  private _createAnswerBlock(
    answerValue: number,
    position: Vector3Like,
    correctAnswer: number
  ): Entity {
    // Use modulo for texture selection (0-15 available)
    const textureIndex = answerValue > 15 ? answerValue % 16 : Math.max(0, Math.min(answerValue, 15));
    const texturePath = AnswerBlockManager.BLOCK_TEXTURES[textureIndex];

    console.log(`[AnswerBlockManager] Creating block for answer ${answerValue} at position (${position.x}, ${position.y}, ${position.z}) with texture: ${texturePath}`);

    const block = new Entity({
      name: `AnswerBlock_${answerValue}`,
      blockTextureUri: texturePath,
      blockHalfExtents: AnswerBlockManager.BLOCK_HALF_EXTENTS,
      rigidBodyOptions: {
        type: RigidBodyType.FIXED,
        colliders: [{
          shape: ColliderShape.BLOCK,
          halfExtents: AnswerBlockManager.BLOCK_HALF_EXTENTS,
          onCollision: (otherEntity: Entity | BlockType, started: boolean) => {
            this._handleBlockCollision(otherEntity, started, answerValue, correctAnswer, block);
          }
        }]
      }
    });

    block.spawn(this._world, position);

    console.log(`[AnswerBlockManager] Block spawned: isSpawned=${block.isSpawned}, id=${block.id}`);

    // Create floating label above the block
    try {
      const label = new SceneUI({
        templateId: 'floating-number',
        position: {
          x: position.x,
          y: position.y + 2.5,
          z: position.z
        },
        state: { value: answerValue.toString() },
        viewDistance: 50
      });
      label.load(this._world);
      this._labels.push(label);
      console.log(`[AnswerBlockManager] Label created for answer ${answerValue}`);
    } catch (e) {
      console.error(`[AnswerBlockManager] Failed to create label:`, e);
    }

    // Store answer value on block for reference
    (block as any)._answerValue = answerValue;
    (block as any)._isCorrect = answerValue === correctAnswer;

    return block;
  }

  /**
   * Handle collision with an answer block
   */
  private _handleBlockCollision(
    otherEntity: Entity | BlockType,
    started: boolean,
    answerValue: number,
    correctAnswer: number,
    block: Entity
  ): void {
    // Only handle collision start with player entities
    if (!started || !(otherEntity instanceof PlayerEntity)) {
      return;
    }

    const playerEntity = otherEntity as PlayerEntity;
    const isCorrect = answerValue === correctAnswer;

    console.log(`[AnswerBlockManager] Player ${playerEntity.player?.username} hit answer ${answerValue} (correct: ${correctAnswer})`);

    // Spawn break effect
    if (block.isSpawned) {
      this._spawnBreakEffect(block.position, isCorrect);
    }

    // Despawn the hit block
    this._despawnBlock(block);

    // Trigger appropriate callback
    if (isCorrect) {
      this._callbacks.onCorrectAnswer(playerEntity);
    } else {
      this._callbacks.onWrongAnswer(playerEntity);
    }
  }

  /**
   * Clear all answer blocks and labels
   */
  public clearBlocks(): void {
    console.log(`[AnswerBlockManager] Clearing ${this._blocks.length} blocks and ${this._labels.length} labels`);

    this._blocks.forEach(block => {
      if (block.isSpawned) {
        block.despawn();
      }
    });

    this._labels.forEach(label => {
      try {
        label.unload();
      } catch (e) {
        // Label may already be unloaded
      }
    });

    this._blocks = [];
    this._labels = [];
    this._currentProblem = null;
  }

  /**
   * Despawn a single block and remove from tracking
   */
  private _despawnBlock(block: Entity): void {
    if (block.isSpawned) {
      block.despawn();
    }

    const index = this._blocks.indexOf(block);
    if (index > -1) {
      this._blocks.splice(index, 1);
    }
  }

  /**
   * Generate evenly spaced positions for blocks
   */
  private _generateBlockPositions(count: number): Vector3Like[] {
    const positions: Vector3Like[] = [];
    const startX = -(count - 1) * AnswerBlockManager.BLOCK_SPACING / 2;

    for (let i = 0; i < count; i++) {
      positions.push({
        x: startX + i * AnswerBlockManager.BLOCK_SPACING,
        y: AnswerBlockManager.BLOCK_Y,
        z: 0
      });
    }

    return positions;
  }

  /**
   * Get positions for power-up spawning (above answer blocks)
   */
  public getBlockPositions(): Vector3Like[] {
    return this._blocks.map(block => ({
      x: block.position.x,
      y: block.position.y + 10,
      z: block.position.z
    }));
  }

  /**
   * Spawn a break effect when block is hit
   */
  private _spawnBreakEffect(position: Vector3Like, isCorrect: boolean): void {
    const fragmentCount = 4;
    const texture = isCorrect
      ? 'blocks/emerald-block.png'
      : 'blocks/fire/fire_01.png';

    // Create small fragment entities that disperse
    for (let i = 0; i < fragmentCount; i++) {
      const fragment = new Entity({
        blockTextureUri: texture,
        blockHalfExtents: { x: 0.15, y: 0.15, z: 0.15 },
        rigidBodyOptions: {
          type: RigidBodyType.DYNAMIC,
          gravityScale: 0.8,
          colliders: [{
            shape: ColliderShape.BLOCK,
            halfExtents: { x: 0.15, y: 0.15, z: 0.15 },
            isSensor: true // Don't collide with other things
          }]
        }
      });

      // Random offset from center
      const offsetX = (Math.random() - 0.5) * 0.5;
      const offsetY = Math.random() * 0.3;
      const offsetZ = (Math.random() - 0.5) * 0.5;

      fragment.spawn(this._world, {
        x: position.x + offsetX,
        y: position.y + offsetY,
        z: position.z + offsetZ
      });

      // Apply random velocity
      const velocityX = (Math.random() - 0.5) * 6;
      const velocityY = Math.random() * 4 + 2;
      const velocityZ = (Math.random() - 0.5) * 6;

      try {
        fragment.setLinearVelocity({ x: velocityX, y: velocityY, z: velocityZ });
        fragment.setAngularVelocity({
          x: (Math.random() - 0.5) * 4,
          y: (Math.random() - 0.5) * 4,
          z: (Math.random() - 0.5) * 4
        });
      } catch (error) {
        // Velocity methods might not be available, that's ok
      }

      // Remove after delay
      setTimeout(() => {
        if (fragment.isSpawned) {
          fragment.despawn();
        }
      }, 1500);
    }
  }

  /**
   * Shuffle array in place (Fisher-Yates)
   */
  private _shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
