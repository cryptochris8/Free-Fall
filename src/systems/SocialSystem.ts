/**
 * SocialSystem - Manages friends and social features
 *
 * Handles friend requests, friends list, and online status.
 * In-memory for now, could be persisted later.
 */

import type { Friend, FriendRequest, PlayerProfile } from '../types';

export class SocialSystem {
  private static _instance: SocialSystem;

  // Player profiles
  private _profiles: Map<string, PlayerProfile> = new Map();

  // Pending friend requests (indexed by recipient)
  private _pendingRequests: Map<string, FriendRequest[]> = new Map();

  // Online players (playerId -> username)
  private _onlinePlayers: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): SocialSystem {
    if (!SocialSystem._instance) {
      SocialSystem._instance = new SocialSystem();
    }
    return SocialSystem._instance;
  }

  /**
   * Register a player coming online
   */
  public playerOnline(playerId: string, username: string): void {
    this._onlinePlayers.set(playerId, username);
    this._ensureProfile(playerId, username);

    // Update online status for friends
    const profile = this._profiles.get(playerId);
    if (profile) {
      profile.friends.forEach((friend, friendId) => {
        const friendProfile = this._profiles.get(friendId);
        if (friendProfile) {
          const friendEntry = friendProfile.friends.get(playerId);
          if (friendEntry) {
            friendEntry.isOnline = true;
          }
        }
      });
    }

    console.log(`[SocialSystem] Player ${username} online`);
  }

  /**
   * Register a player going offline
   */
  public playerOffline(playerId: string): void {
    const username = this._onlinePlayers.get(playerId);
    this._onlinePlayers.delete(playerId);

    // Update offline status and last seen
    const profile = this._profiles.get(playerId);
    if (profile) {
      profile.friends.forEach((friend, friendId) => {
        const friendProfile = this._profiles.get(friendId);
        if (friendProfile) {
          const friendEntry = friendProfile.friends.get(playerId);
          if (friendEntry) {
            friendEntry.isOnline = false;
            friendEntry.lastSeen = Date.now();
          }
        }
      });
    }

    console.log(`[SocialSystem] Player ${username || playerId} offline`);
  }

  /**
   * Get friends list for a player
   */
  public getFriends(playerId: string): Friend[] {
    const profile = this._profiles.get(playerId);
    if (!profile) return [];

    return Array.from(profile.friends.values()).map(friend => ({
      ...friend,
      isOnline: this._onlinePlayers.has(friend.playerId)
    }));
  }

  /**
   * Get pending friend requests for a player
   */
  public getPendingRequests(playerId: string): FriendRequest[] {
    return this._pendingRequests.get(playerId) || [];
  }

  /**
   * Send a friend request
   */
  public sendFriendRequest(fromPlayerId: string, toUsername: string): boolean {
    // Find target player by username
    const targetProfile = this._findProfileByUsername(toUsername);
    if (!targetProfile) {
      console.log(`[SocialSystem] Player ${toUsername} not found`);
      return false;
    }

    const targetId = targetProfile.playerId;
    const fromProfile = this._profiles.get(fromPlayerId);

    // Check if already friends
    if (fromProfile?.friends.has(targetId)) {
      console.log(`[SocialSystem] Already friends with ${toUsername}`);
      return false;
    }

    // Check if blocked
    if (targetProfile.blockedPlayers.has(fromPlayerId)) {
      console.log(`[SocialSystem] Request blocked by ${toUsername}`);
      return false;
    }

    // Create request
    const request: FriendRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromPlayerId,
      fromUsername: fromProfile?.username || 'Unknown',
      toPlayerId: targetId,
      sentTime: Date.now()
    };

    // Add to pending
    const pending = this._pendingRequests.get(targetId) || [];
    pending.push(request);
    this._pendingRequests.set(targetId, pending);

    console.log(`[SocialSystem] Friend request sent from ${fromProfile?.username} to ${toUsername}`);
    return true;
  }

  /**
   * Accept a friend request
   */
  public acceptFriendRequest(playerId: string, requestId: string): boolean {
    const pending = this._pendingRequests.get(playerId);
    if (!pending) return false;

    const requestIndex = pending.findIndex(r => r.id === requestId);
    if (requestIndex < 0) return false;

    const request = pending[requestIndex];
    pending.splice(requestIndex, 1);

    // Add as friends (both ways)
    const playerProfile = this._profiles.get(playerId);
    const senderProfile = this._profiles.get(request.fromPlayerId);

    if (playerProfile && senderProfile) {
      const now = Date.now();

      playerProfile.friends.set(request.fromPlayerId, {
        playerId: request.fromPlayerId,
        username: senderProfile.username,
        addedDate: now,
        isOnline: this._onlinePlayers.has(request.fromPlayerId),
        lastSeen: now
      });

      senderProfile.friends.set(playerId, {
        playerId,
        username: playerProfile.username,
        addedDate: now,
        isOnline: this._onlinePlayers.has(playerId),
        lastSeen: now
      });

      console.log(`[SocialSystem] ${playerProfile.username} and ${senderProfile.username} are now friends`);
      return true;
    }

    return false;
  }

  /**
   * Decline a friend request
   */
  public declineFriendRequest(playerId: string, requestId: string): void {
    const pending = this._pendingRequests.get(playerId);
    if (!pending) return;

    const index = pending.findIndex(r => r.id === requestId);
    if (index >= 0) {
      pending.splice(index, 1);
      console.log(`[SocialSystem] Friend request ${requestId} declined`);
    }
  }

  /**
   * Remove a friend
   */
  public removeFriend(playerId: string, friendId: string): boolean {
    const playerProfile = this._profiles.get(playerId);
    const friendProfile = this._profiles.get(friendId);

    if (playerProfile) {
      playerProfile.friends.delete(friendId);
    }
    if (friendProfile) {
      friendProfile.friends.delete(playerId);
    }

    console.log(`[SocialSystem] Removed friend relationship between ${playerId} and ${friendId}`);
    return true;
  }

  /**
   * Block a player
   */
  public blockPlayer(playerId: string, blockedId: string): void {
    const profile = this._profiles.get(playerId);
    if (profile) {
      profile.blockedPlayers.add(blockedId);
      profile.friends.delete(blockedId); // Remove from friends if present

      // Remove any pending requests
      const pending = this._pendingRequests.get(playerId);
      if (pending) {
        const filtered = pending.filter(r => r.fromPlayerId !== blockedId);
        this._pendingRequests.set(playerId, filtered);
      }

      console.log(`[SocialSystem] Player ${playerId} blocked ${blockedId}`);
    }
  }

  /**
   * Check if a player is online
   */
  public isOnline(playerId: string): boolean {
    return this._onlinePlayers.has(playerId);
  }

  /**
   * Get online friends count
   */
  public getOnlineFriendsCount(playerId: string): number {
    const profile = this._profiles.get(playerId);
    if (!profile) return 0;

    let count = 0;
    profile.friends.forEach((_, friendId) => {
      if (this._onlinePlayers.has(friendId)) count++;
    });
    return count;
  }

  /**
   * Ensure a player profile exists
   */
  private _ensureProfile(playerId: string, username: string): void {
    if (!this._profiles.has(playerId)) {
      this._profiles.set(playerId, {
        playerId,
        username,
        bio: '',
        favoriteSubject: 'Math',
        playStyle: 'casual',
        friends: new Map(),
        blockedPlayers: new Set(),
        visibility: 'public'
      });
    } else {
      // Update username in case it changed
      const profile = this._profiles.get(playerId)!;
      profile.username = username;
    }
  }

  /**
   * Find profile by username
   */
  private _findProfileByUsername(username: string): PlayerProfile | undefined {
    for (const profile of this._profiles.values()) {
      if (profile.username.toLowerCase() === username.toLowerCase()) {
        return profile;
      }
    }
    return undefined;
  }
}
