/**
 * FallingPlayerController - Custom controller for the falling math game
 *
 * Handles:
 * - WASD horizontal movement (no vertical control during fall)
 * - Camera locked to look straight down (-90 degrees pitch)
 * - Fall state tracking
 * - Landing detection
 */

import {
  BaseEntityController,
  PlayerEntity,
  World
} from 'hytopia';
import type { PlayerInput, PlayerCameraOrientation } from 'hytopia';
import { GAME_CONSTANTS } from '../types';

export class FallingPlayerController extends BaseEntityController {
  private _world: World;
  private _moveSpeed: number = GAME_CONSTANTS.PLAYER_MOVE_SPEED;

  // State tracking
  private _isMoving: boolean = false;
  private _isFalling: boolean = false;
  private _hasLanded: boolean = false;
  private _hasFallenPastThreshold: boolean = false;

  // Callbacks
  private _onFallPastThreshold?: (entity: PlayerEntity) => void;

  // Animation names
  private static readonly ANIM_IDLE = 'idle';
  private static readonly ANIM_WALK = 'walk';
  private static readonly ANIM_FALL = 'jump_loop';
  private static readonly ANIM_LAND = 'jump_post_light';

  // Rotation for facing down (quaternion for -90 degrees on X axis)
  private static readonly FACING_DOWN_ROTATION = {
    x: -0.7071068,
    y: 0,
    z: 0,
    w: 0.7071068
  };

  constructor(world: World) {
    super();
    this._world = world;
  }

  /**
   * Set callback for when player falls past the answer threshold
   */
  public setOnFallPastThreshold(callback: (entity: PlayerEntity) => void): void {
    this._onFallPastThreshold = callback;
  }

  /**
   * Main tick method called every frame with player input
   */
  public override tickWithPlayerInput(
    entity: PlayerEntity,
    input: PlayerInput,
    cameraOrientation: PlayerCameraOrientation,
    deltaTimeMs: number
  ): void {
    // Call super for any base functionality
    super.tickWithPlayerInput(entity, input, cameraOrientation, deltaTimeMs);

    if (!entity.isSpawned) return;

    // Lock camera to look straight down
    cameraOrientation.pitch = -Math.PI / 2; // -90 degrees
    cameraOrientation.yaw = 0;

    // Set player rotation to face down (unless landed)
    if (!this._hasLanded) {
      try {
        entity.setRotation(FallingPlayerController.FACING_DOWN_ROTATION);
      } catch (error) {
        console.error('[FallingPlayerController] Error setting rotation:', error);
      }
    }

    // Get current position for movement and fall detection
    const currentPos = entity.position;

    // --- Fall Detection ---
    if (currentPos.y < GAME_CONSTANTS.FALL_THRESHOLD_Y && !this._hasFallenPastThreshold) {
      this._hasFallenPastThreshold = true;
      console.log(`[FallingPlayerController] Player fell past threshold Y=${GAME_CONSTANTS.FALL_THRESHOLD_Y}`);

      if (this._onFallPastThreshold) {
        this._onFallPastThreshold(entity);
      }
    }

    // --- Animation State Management ---
    this._updateAnimationState(entity);

    // --- Movement Handling ---
    this._handleMovement(entity, input, deltaTimeMs, currentPos);
  }

  /**
   * Handle WASD movement (horizontal only)
   * Uses velocity-based movement to not interfere with gravity
   */
  private _handleMovement(
    entity: PlayerEntity,
    input: PlayerInput,
    deltaTimeMs: number,
    currentPos: { x: number; y: number; z: number }
  ): void {
    let vx = 0;
    let vz = 0;

    // WASD input (camera-relative would need yaw, but we're fixed looking down)
    // So we use absolute directions: W=forward(-Z), S=back(+Z), A=left(-X), D=right(+X)
    if (input.w) vz -= this._moveSpeed;
    if (input.s) vz += this._moveSpeed;
    if (input.a) vx -= this._moveSpeed;
    if (input.d) vx += this._moveSpeed;

    const wantsToMove = input.w || input.s || input.a || input.d;

    // Get current velocity to preserve Y (falling) velocity
    try {
      const currentVel = entity.linearVelocity || { x: 0, y: 0, z: 0 };

      // Set horizontal velocity while preserving vertical (gravity) velocity
      entity.setLinearVelocity({
        x: vx,
        y: currentVel.y, // Preserve gravity-based Y velocity
        z: vz
      });
    } catch (error) {
      console.error('[FallingPlayerController] Error setting velocity:', error);
    }

    // Track movement state for animation (only if not falling)
    if (!this._isFalling) {
      if (wantsToMove && !this._isMoving) {
        this._isMoving = true;
        this._switchAnimation(entity, FallingPlayerController.ANIM_IDLE, FallingPlayerController.ANIM_WALK);
      } else if (!wantsToMove && this._isMoving) {
        this._isMoving = false;
        this._switchAnimation(entity, FallingPlayerController.ANIM_WALK, FallingPlayerController.ANIM_IDLE);
      }
    }
  }

  /**
   * Update animation based on vertical velocity
   */
  private _updateAnimationState(entity: PlayerEntity): void {
    try {
      const velocity = entity.linearVelocity || { x: 0, y: 0, z: 0 };
      const isFastFalling = velocity.y < -5;

      if (isFastFalling && !this._isFalling) {
        // Transition to falling animation
        this._isFalling = true;
        this._isMoving = false;
        this._switchAnimation(
          entity,
          [FallingPlayerController.ANIM_IDLE, FallingPlayerController.ANIM_WALK],
          FallingPlayerController.ANIM_FALL
        );
        console.log('[FallingPlayerController] Started falling animation');
      } else if (!isFastFalling && this._isFalling && !this._hasLanded) {
        // Transition from falling to idle
        this._isFalling = false;
        this._switchAnimation(entity, FallingPlayerController.ANIM_FALL, FallingPlayerController.ANIM_IDLE);
        console.log('[FallingPlayerController] Stopped falling animation');
      }
    } catch (error) {
      console.error('[FallingPlayerController] Error updating animation state:', error);
    }
  }

  /**
   * Helper to switch animations
   */
  private _switchAnimation(
    entity: PlayerEntity,
    stopAnims: string | string[],
    startAnim: string
  ): void {
    try {
      const stopArray = Array.isArray(stopAnims) ? stopAnims : [stopAnims];
      entity.stopModelAnimations(stopArray);
      entity.startModelLoopedAnimations([startAnim]);
    } catch (error) {
      console.error('[FallingPlayerController] Error switching animation:', error);
    }
  }

  /**
   * Reset all fall-related state (call when resetting player position)
   */
  public resetFallState(): void {
    this._hasFallenPastThreshold = false;
    this._isFalling = false;
    this._hasLanded = false;
    this._isMoving = false;
    console.log('[FallingPlayerController] Fall state reset');
  }

  /**
   * Set landed state (call when player lands on platform)
   */
  public setLanded(landed: boolean): void {
    this._hasLanded = landed;
    console.log(`[FallingPlayerController] Landing state set to: ${landed}`);
  }

  /**
   * Check if player has landed
   */
  public get hasLanded(): boolean {
    return this._hasLanded;
  }

  /**
   * Check if player is currently falling
   */
  public get isFalling(): boolean {
    return this._isFalling;
  }
}
