/**
 * EduFall - Multi-Subject Educational Falling Game
 *
 * Enhanced version of Free-Fall with:
 * - Multiple subjects (Math, Spelling, Geography, Science, History)
 * - Enhanced scoring system with bonuses and multipliers
 * - Persistent leaderboards
 * - Player progress tracking
 */

import {
  startServer,
  World,
  Entity,
  RigidBodyType,
  ColliderShape
} from 'hytopia';

// Core game manager
import { EduFallGameManager } from './managers/EduFallGameManager';

// Types
import { GAME_CONSTANTS } from './types';

/**
 * Initialize the game
 */
startServer((world: World) => {
  console.log('='.repeat(50));
  console.log('[EduFall] Starting Educational Falling Game Server');
  console.log('[EduFall] SDK Version: 0.14.20');
  console.log('[EduFall] Assets Version: 0.4.6');
  console.log('='.repeat(50));

  // Initialize the game manager (handles everything)
  const gameManager = EduFallGameManager.getInstance(world);

  // Create world decorations
  createWorldDecorations(world);

  // Log available subjects
  const subjects = gameManager.getAvailableSubjects();
  console.log('[EduFall] Available subjects:', subjects.join(', '));

  console.log('[EduFall] Server started! Waiting for players...');
  console.log('='.repeat(50));
});

/**
 * Create world decorations (tunnel, clouds, etc.)
 */
function createWorldDecorations(world: World): void {
  console.log('[EduFall] Creating world decorations...');

  // Create falling tunnel
  createTunnel(world);

  // Create clouds
  createClouds(world);

  console.log('[EduFall] World decorations created');
}

/**
 * Create the number tunnel - matches original math game
 * Tunnel goes from Y=100 down to Y=-100 with player spawning at Y=50
 */
function createTunnel(world: World): void {
  const TUNNEL_RADIUS = 10;
  const TUNNEL_TOP = 100;     // Top of tunnel
  const TUNNEL_BOTTOM = -100; // Bottom of tunnel
  const RING_SPACING = 5;     // Space between rings vertically
  const BLOCKS_PER_RING = 16;

  // Number textures (0-9) - using colorful blocks for visual variety
  const numberTextures = [
    'blocks/stone-bricks.png',     // 0
    'blocks/cobblestone.png',      // 1
    'blocks/sandstone.png',        // 2
    'blocks/oak-planks.png',       // 3
    'blocks/bricks.png',           // 4
    'blocks/mossy-coblestone.png', // 5
    'blocks/clay.png',             // 6
    'blocks/gravel.png',           // 7
    'blocks/ice.png',              // 8
    'blocks/stone.png'             // 9
  ];

  let blocksCreated = 0;
  let ringIndex = 0;

  // Create rings from top to bottom
  for (let y = TUNNEL_TOP; y >= TUNNEL_BOTTOM; y -= RING_SPACING) {
    for (let i = 0; i < BLOCKS_PER_RING; i++) {
      const angle = (i / BLOCKS_PER_RING) * Math.PI * 2;
      const x = Math.cos(angle) * TUNNEL_RADIUS;
      const z = Math.sin(angle) * TUNNEL_RADIUS;

      // Use number-based texture for visual variety
      const textureIndex = (ringIndex + i) % numberTextures.length;
      const texture = numberTextures[textureIndex];

      const block = new Entity({
        blockTextureUri: texture,
        blockHalfExtents: { x: 0.5, y: 0.5, z: 0.5 },
        rigidBodyOptions: {
          type: RigidBodyType.FIXED,
          colliders: [{
            shape: ColliderShape.BLOCK,
            halfExtents: { x: 0.5, y: 0.5, z: 0.5 },
            isSensor: true // Don't block player - they fall through
          }]
        }
      });

      block.spawn(world, { x, y, z });
      blocksCreated++;
    }
    ringIndex++;
  }

  console.log(`[EduFall] Tunnel created with ${blocksCreated} blocks from Y=${TUNNEL_TOP} to Y=${TUNNEL_BOTTOM}`);
}

/**
 * Create cloud formations
 */
function createClouds(world: World): void {
  const cloudCount = 15;
  const radiusMin = 50;
  const radiusMax = 100;
  const heightMin = -100;
  const heightMax = 220;
  const blocksPerCloud = 10;

  for (let c = 0; c < cloudCount; c++) {
    // Random position in a ring around the center
    const angle = Math.random() * Math.PI * 2;
    const distance = radiusMin + Math.random() * (radiusMax - radiusMin);
    const centerX = Math.cos(angle) * distance;
    const centerZ = Math.sin(angle) * distance;
    const centerY = heightMin + Math.random() * (heightMax - heightMin);

    // Create cloud blocks
    for (let b = 0; b < blocksPerCloud; b++) {
      const offsetX = (Math.random() - 0.5) * 10;
      const offsetY = (Math.random() - 0.5) * 4;
      const offsetZ = (Math.random() - 0.5) * 10;

      const cloud = new Entity({
        blockTextureUri: 'blocks/snow.png',
        blockHalfExtents: { x: 0.5, y: 0.5, z: 0.5 },
        rigidBodyOptions: {
          type: RigidBodyType.FIXED,
          colliders: [{
            shape: ColliderShape.BLOCK,
            halfExtents: { x: 0.5, y: 0.5, z: 0.5 },
            isSensor: true
          }]
        }
      });

      cloud.spawn(world, {
        x: centerX + offsetX,
        y: centerY + offsetY,
        z: centerZ + offsetZ
      });
    }
  }

  console.log('[EduFall] Clouds created');
}
