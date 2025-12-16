/**
 * PowerUpManager - Manages all power-ups in the game
 *
 * Handles:
 * - Power-up spawning (30% chance above answer blocks)
 * - Collision detection for pickup
 * - Active effect tracking and expiration
 * - All 5 power-up types
 */

import {
  World,
  Entity,
  PlayerEntity,
  RigidBodyType,
  ColliderShape,
  Audio
} from 'hytopia';
import type { Vector3Like } from 'hytopia';
import type { PowerUpType, ActivePowerUp, PowerUpConfig } from '../types';
import { GAME_CONSTANTS } from '../types';

export class PowerUpManager {
  private static _instance: PowerUpManager;
  private _world: World;

  // Active power-ups per player
  private _activePowerUps: Map<string, ActivePowerUp[]> = new Map();

  // Spawned power-up entities
  private _spawnedPowerUps: Entity[] = [];

  // Rewind data per player (for undo functionality)
  private _rewindData: Map<string, { position: Vector3Like; score: number; question: number }> = new Map();

  // Power-up configurations - using Free-fall numbered textures that are confirmed to work
  private readonly _powerUpConfigs: Map<PowerUpType, PowerUpConfig> = new Map([
    ['slowmotion', {
      type: 'slowmotion',
      name: 'Slow Motion',
      description: 'Reduces gravity for 8 seconds',
      duration: 8000,
      color: { r: 0, g: 150, b: 255 },
      icon: 'clock',
      textureUri: 'blocks/Free-fall/0.png'  // Blue-tinted number block
    }],
    ['shield', {
      type: 'shield',
      name: 'Shield',
      description: 'Blocks one wrong answer',
      duration: -1, // Until used
      color: { r: 255, g: 200, b: 0 },
      icon: 'shield',
      textureUri: 'blocks/Free-fall/5.png'  // Yellow-tinted number block
    }],
    ['magnet', {
      type: 'magnet',
      name: 'Magnet',
      description: 'Attracts correct answer for 5 seconds',
      duration: 5000,
      color: { r: 255, g: 0, b: 100 },
      icon: 'magnet',
      textureUri: 'blocks/Free-fall/3.png'  // Red-tinted number block
    }],
    ['doublepoints', {
      type: 'doublepoints',
      name: 'Double Points',
      description: '2x points on next correct answer',
      duration: -1, // Until used
      color: { r: 0, g: 255, b: 100 },
      icon: 'star',
      textureUri: 'blocks/Free-fall/2.png'  // Green-tinted number block
    }],
    ['rewind', {
      type: 'rewind',
      name: 'Rewind',
      description: 'Undo your last wrong answer',
      duration: -1, // Until used
      color: { r: 150, g: 0, b: 255 },
      icon: 'rewind',
      textureUri: 'blocks/Free-fall/7.png'  // Purple-tinted number block
    }]
  ]);

  private constructor(world: World) {
    this._world = world;
  }

  public static getInstance(world?: World): PowerUpManager {
    if (!PowerUpManager._instance) {
      if (!world) throw new Error('PowerUpManager requires world on first instantiation');
      PowerUpManager._instance = new PowerUpManager(world);
    }
    return PowerUpManager._instance;
  }

  /**
   * Attempt to spawn power-ups above answer block positions
   */
  public trySpawnPowerUps(blockPositions: Vector3Like[]): void {
    // Clear any existing power-ups
    this.clearPowerUps();

    blockPositions.forEach(pos => {
      // 30% chance to spawn
      if (Math.random() < GAME_CONSTANTS.POWERUP_SPAWN_CHANCE) {
        this._spawnPowerUp(pos);
      }
    });
  }

  /**
   * Spawn a random power-up at position
   */
  private _spawnPowerUp(blockPosition: Vector3Like): void {
    // Random power-up type
    const types: PowerUpType[] = ['slowmotion', 'shield', 'magnet', 'doublepoints', 'rewind'];
    const type = types[Math.floor(Math.random() * types.length)];
    const config = this._powerUpConfigs.get(type)!;

    // Position above block
    const position: Vector3Like = {
      x: blockPosition.x,
      y: blockPosition.y + 5,
      z: blockPosition.z
    };

    const powerUp = new Entity({
      name: `PowerUp_${type}`,
      blockTextureUri: config.textureUri,
      blockHalfExtents: { x: 0.3, y: 0.3, z: 0.3 },
      rigidBodyOptions: {
        type: RigidBodyType.KINEMATIC_POSITION,
        colliders: [{
          shape: ColliderShape.BALL,
          radius: 0.5,
          isSensor: true,
          onCollision: (other, started) => {
            if (started && other instanceof PlayerEntity) {
              this._collectPowerUp(other, type, powerUp);
            }
          }
        }]
      }
    });

    powerUp.spawn(this._world, position);
    this._spawnedPowerUps.push(powerUp);

    // Add floating animation
    this._animatePowerUp(powerUp, position);

    console.log(`[PowerUpManager] Spawned ${type} power-up at (${position.x}, ${position.y}, ${position.z})`);
  }

  /**
   * Animate power-up (bob up and down)
   */
  private _animatePowerUp(powerUp: Entity, basePosition: Vector3Like): void {
    let time = 0;
    const bobSpeed = 0.002;
    const bobHeight = 0.5;

    const animate = () => {
      if (!powerUp.isSpawned) return;

      time += 16; // ~60fps
      const yOffset = Math.sin(time * bobSpeed) * bobHeight;

      try {
        powerUp.setPosition({
          x: basePosition.x,
          y: basePosition.y + yOffset,
          z: basePosition.z
        });
      } catch (e) {
        // Entity might have been despawned
        return;
      }

      setTimeout(animate, 16);
    };

    animate();
  }

  /**
   * Handle power-up collection
   */
  private _collectPowerUp(playerEntity: PlayerEntity, type: PowerUpType, entity: Entity): void {
    const player = playerEntity.player;
    if (!player) return;

    // Despawn the power-up entity
    if (entity.isSpawned) {
      entity.despawn();
      const index = this._spawnedPowerUps.indexOf(entity);
      if (index > -1) this._spawnedPowerUps.splice(index, 1);
    }

    // Play collection sound
    this._playCollectionSound();

    // Apply the power-up
    this._applyPowerUp(player.id, player.username, type, playerEntity);

    console.log(`[PowerUpManager] ${player.username} collected ${type}`);
  }

  /**
   * Play sound when collecting a power-up
   */
  private _playCollectionSound(): void {
    try {
      const audio = new Audio({
        uri: GAME_CONSTANTS.AUDIO_POWERUP,
        loop: false,
        volume: 1.0
      });
      audio.play(this._world);
    } catch (error) {
      console.error('[PowerUpManager] Error playing collection sound:', error);
    }
  }

  /**
   * Apply a power-up to a player
   */
  private _applyPowerUp(
    playerId: string,
    username: string,
    type: PowerUpType,
    playerEntity: PlayerEntity
  ): void {
    const config = this._powerUpConfigs.get(type)!;

    const activePowerUp: ActivePowerUp = {
      type,
      playerId,
      startTime: Date.now(),
      duration: config.duration
    };

    // Add to active power-ups
    const playerPowerUps = this._activePowerUps.get(playerId) || [];
    playerPowerUps.push(activePowerUp);
    this._activePowerUps.set(playerId, playerPowerUps);

    // Apply immediate effects
    switch (type) {
      case 'slowmotion':
        playerEntity.setGravityScale(0.03); // Very low gravity
        this._scheduleExpiration(playerId, type, config.duration, () => {
          // Restore gravity (GameManager will handle exact value)
          playerEntity.setGravityScale(0.1);
        });
        break;

      case 'magnet':
        // Magnet effect handled by game logic
        this._scheduleExpiration(playerId, type, config.duration, () => {});
        break;

      case 'shield':
      case 'doublepoints':
      case 'rewind':
        // These are used on events, not timed
        break;
    }

    // Notify UI
    playerEntity.player?.ui.sendData({
      type: 'powerup-collected',
      powerUp: {
        type,
        name: config.name,
        description: config.description,
        duration: config.duration
      }
    });
  }

  /**
   * Schedule power-up expiration
   */
  private _scheduleExpiration(
    playerId: string,
    type: PowerUpType,
    duration: number,
    onExpire: () => void
  ): void {
    if (duration <= 0) return; // Doesn't expire

    setTimeout(() => {
      this._removePowerUp(playerId, type);
      onExpire();
    }, duration);
  }

  /**
   * Remove a power-up from a player
   */
  private _removePowerUp(playerId: string, type: PowerUpType): void {
    const playerPowerUps = this._activePowerUps.get(playerId);
    if (!playerPowerUps) return;

    const index = playerPowerUps.findIndex(p => p.type === type);
    if (index > -1) {
      playerPowerUps.splice(index, 1);
      console.log(`[PowerUpManager] Removed ${type} from player ${playerId}`);
    }
  }

  /**
   * Check if player has a specific power-up
   */
  public hasPowerUp(playerId: string, type: PowerUpType): boolean {
    const playerPowerUps = this._activePowerUps.get(playerId) || [];
    return playerPowerUps.some(p => p.type === type);
  }

  /**
   * Use shield power-up (blocks wrong answer)
   * Returns true if shield was used
   */
  public useShield(playerId: string): boolean {
    if (!this.hasPowerUp(playerId, 'shield')) return false;

    this._removePowerUp(playerId, 'shield');
    console.log(`[PowerUpManager] Shield used by ${playerId}`);
    return true;
  }

  /**
   * Check and consume double points
   * Returns multiplier (2 if active, 1 otherwise)
   */
  public getPointsMultiplier(playerId: string): number {
    if (!this.hasPowerUp(playerId, 'doublepoints')) return 1;

    this._removePowerUp(playerId, 'doublepoints');
    console.log(`[PowerUpManager] Double points used by ${playerId}`);
    return 2;
  }

  /**
   * Store rewind data before answering
   */
  public storeRewindData(
    playerId: string,
    position: Vector3Like,
    score: number,
    question: number
  ): void {
    this._rewindData.set(playerId, { position, score, question });
  }

  /**
   * Use rewind power-up
   * Returns the saved state or null if unavailable
   */
  public useRewind(playerId: string): { position: Vector3Like; score: number; question: number } | null {
    if (!this.hasPowerUp(playerId, 'rewind')) {
      console.log(`[PowerUpManager] No rewind available for ${playerId}`);
      return null;
    }

    const data = this._rewindData.get(playerId);
    if (!data) {
      console.log(`[PowerUpManager] No rewind data stored for ${playerId}`);
      return null;
    }

    this._removePowerUp(playerId, 'rewind');
    this._rewindData.delete(playerId);

    console.log(`[PowerUpManager] Rewind used by ${playerId}`);
    return data;
  }

  /**
   * Check if magnet is active (for answer block attraction)
   */
  public isMagnetActive(playerId: string): boolean {
    return this.hasPowerUp(playerId, 'magnet');
  }

  /**
   * Get all active power-ups for a player
   */
  public getActivePowerUps(playerId: string): ActivePowerUp[] {
    return this._activePowerUps.get(playerId) || [];
  }

  /**
   * Clear all spawned power-ups
   */
  public clearPowerUps(): void {
    this._spawnedPowerUps.forEach(entity => {
      if (entity.isSpawned) {
        entity.despawn();
      }
    });
    this._spawnedPowerUps = [];
  }

  /**
   * Clear all power-ups for a player (e.g., on game restart)
   */
  public clearPlayerPowerUps(playerId: string): void {
    this._activePowerUps.delete(playerId);
    this._rewindData.delete(playerId);
  }
}
