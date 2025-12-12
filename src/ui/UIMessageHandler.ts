/**
 * UIMessageHandler - Central router for all UI messages
 *
 * This is the KEY missing piece that was breaking multiplayer!
 * Routes UI messages to appropriate managers/systems.
 */

import { Player, PlayerUIEvent, World } from 'hytopia';
import type { UIMessage, UIMessageType, AccessibilitySettings } from '../types';

// Manager imports (lazy loaded to avoid circular deps)
let GameManager: any;
let RaceManager: any;
let TeamManager: any;
let LeaderboardSystem: any;
let SocialSystem: any;
let AccessibilitySystem: any;
let PowerUpManager: any;
let CurriculumSystem: any;
let AchievementSystem: any;

export class UIMessageHandler {
  private static _instance: UIMessageHandler;
  private _world: World;
  private _initialized: boolean = false;

  private constructor(world: World) {
    this._world = world;
  }

  public static getInstance(world?: World): UIMessageHandler {
    if (!UIMessageHandler._instance) {
      if (!world) throw new Error('UIMessageHandler requires world on first instantiation');
      UIMessageHandler._instance = new UIMessageHandler(world);
    }
    return UIMessageHandler._instance;
  }

  /**
   * Initialize with manager references
   * Call this after all managers are created
   */
  public initialize(managers: {
    gameManager?: any;
    raceManager?: any;
    teamManager?: any;
    leaderboardSystem?: any;
    socialSystem?: any;
    accessibilitySystem?: any;
    powerUpManager?: any;
    curriculumSystem?: any;
    achievementSystem?: any;
  }): void {
    GameManager = managers.gameManager;
    RaceManager = managers.raceManager;
    TeamManager = managers.teamManager;
    LeaderboardSystem = managers.leaderboardSystem;
    SocialSystem = managers.socialSystem;
    AccessibilitySystem = managers.accessibilitySystem;
    PowerUpManager = managers.powerUpManager;
    CurriculumSystem = managers.curriculumSystem;
    AchievementSystem = managers.achievementSystem;

    this._initialized = true;
    console.log('[UIMessageHandler] Initialized with managers');
  }

  /**
   * Setup UI message handling for a player
   * Call this when a player joins
   */
  public setupPlayerUI(player: Player): void {
    player.ui.on(PlayerUIEvent.DATA, ({ data }) => {
      this.handleMessage(player, data as UIMessage);
    });
  }

  /**
   * Main message router
   */
  public handleMessage(player: Player, message: UIMessage): void {
    console.log(`[UIMessageHandler] Received: ${message.type} from ${player.username}`);

    switch (message.type) {
      // ============ Core Game ============
      case 'start-game':
        this._handleStartGame(player, message);
        break;

      case 'restart-game':
        this._handleRestartGame(player);
        break;

      case 'use-rewind':
        this._handleUseRewind(player);
        break;

      case 'show-progress':
        this._handleShowProgress(player);
        break;

      case 'show-analytics':
        this._handleShowAnalytics(player);
        break;

      // ============ Multiplayer - Race ============
      case 'join-race-lobby':
        this._handleJoinRaceLobby(player);
        break;

      case 'leave-race-lobby':
        this._handleLeaveRaceLobby(player);
        break;

      case 'start-race':
        this._handleStartRace(player);
        break;

      // ============ Multiplayer - Team ============
      case 'join-team-lobby':
        this._handleJoinTeamLobby(player);
        break;

      case 'join-team':
        this._handleJoinTeam(player, message);
        break;

      case 'leave-team-lobby':
        this._handleLeaveTeamLobby(player);
        break;

      case 'start-team-challenge':
        this._handleStartTeamChallenge(player);
        break;

      // ============ Multiplayer - Leaderboard ============
      case 'request-leaderboard-data':
        this._handleRequestLeaderboard(player, message);
        break;

      // ============ Multiplayer - Social ============
      case 'request-friends-list':
        this._handleRequestFriendsList(player);
        break;

      case 'send-friend-request':
        this._handleSendFriendRequest(player, message);
        break;

      case 'accept-friend-request':
        this._handleAcceptFriendRequest(player, message);
        break;

      case 'decline-friend-request':
        this._handleDeclineFriendRequest(player, message);
        break;

      // ============ Accessibility ============
      case 'update-accessibility-settings':
        this._handleUpdateAccessibility(player, message);
        break;

      default:
        console.warn(`[UIMessageHandler] Unknown message type: ${message.type}`);
    }
  }

  // ============ Core Game Handlers ============

  private _handleStartGame(player: Player, message: UIMessage): void {
    if (!GameManager) {
      console.error('[UIMessageHandler] GameManager not initialized');
      return;
    }
    GameManager.startGame(player, message.difficulty || 'moderate');
  }

  private _handleRestartGame(player: Player): void {
    if (!GameManager) return;
    GameManager.restartGame(player);
  }

  private _handleUseRewind(player: Player): void {
    if (!PowerUpManager) {
      console.warn('[UIMessageHandler] PowerUpManager not initialized');
      player.ui.sendData({
        type: 'rewind-failed',
        message: 'Power-up system not available'
      });
      return;
    }

    const success = PowerUpManager.useRewind(player.username);
    if (!success) {
      player.ui.sendData({
        type: 'rewind-failed',
        message: 'No rewinds available or no recent wrong answer'
      });
    }
  }

  private _handleShowProgress(player: Player): void {
    if (!CurriculumSystem) {
      player.ui.sendData({ type: 'progress-data', data: null });
      return;
    }

    const progress = CurriculumSystem.getPlayerProgress(player.id);
    player.ui.sendData({
      type: 'progress-data',
      data: progress
    });
  }

  private _handleShowAnalytics(player: Player): void {
    if (!AchievementSystem) {
      player.ui.sendData({ type: 'analytics-data', data: null });
      return;
    }

    const achievements = AchievementSystem.getPlayerAchievements(player.id);
    player.ui.sendData({
      type: 'analytics-data',
      data: { achievements }
    });
  }

  // ============ Race Handlers ============

  private _handleJoinRaceLobby(player: Player): void {
    if (!RaceManager) {
      console.warn('[UIMessageHandler] RaceManager not initialized');
      player.ui.sendData({
        type: 'race-error',
        message: 'Race mode not available'
      });
      return;
    }

    const sessionId = RaceManager.createOrJoinLobby(player);
    player.ui.sendData({
      type: 'race-lobby-joined',
      sessionId,
      players: RaceManager.getLobbyPlayers(sessionId)
    });
  }

  private _handleLeaveRaceLobby(player: Player): void {
    if (!RaceManager) return;
    RaceManager.leaveLobby(player);
    player.ui.sendData({ type: 'race-lobby-left' });
  }

  private _handleStartRace(player: Player): void {
    if (!RaceManager) return;

    const success = RaceManager.startRace(player);
    if (!success) {
      player.ui.sendData({
        type: 'race-error',
        message: 'Cannot start race - not enough players or not host'
      });
    }
  }

  // ============ Team Handlers ============

  private _handleJoinTeamLobby(player: Player): void {
    if (!TeamManager) {
      console.warn('[UIMessageHandler] TeamManager not initialized');
      player.ui.sendData({
        type: 'team-error',
        message: 'Team mode not available'
      });
      return;
    }

    const challengeId = TeamManager.createOrJoinLobby(player);
    player.ui.sendData({
      type: 'team-lobby-joined',
      challengeId,
      teams: TeamManager.getTeamInfo(challengeId)
    });
  }

  private _handleJoinTeam(player: Player, message: UIMessage): void {
    if (!TeamManager) return;

    const success = TeamManager.joinTeam(player, message.teamId);
    if (success) {
      player.ui.sendData({
        type: 'team-joined',
        teamId: message.teamId
      });
    } else {
      player.ui.sendData({
        type: 'team-error',
        message: 'Could not join team'
      });
    }
  }

  private _handleLeaveTeamLobby(player: Player): void {
    if (!TeamManager) return;
    TeamManager.leaveLobby(player);
    player.ui.sendData({ type: 'team-lobby-left' });
  }

  private _handleStartTeamChallenge(player: Player): void {
    if (!TeamManager) return;

    const success = TeamManager.startChallenge(player);
    if (!success) {
      player.ui.sendData({
        type: 'team-error',
        message: 'Cannot start challenge - teams not balanced or not host'
      });
    }
  }

  // ============ Leaderboard Handlers ============

  private _handleRequestLeaderboard(player: Player, message: UIMessage): void {
    if (!LeaderboardSystem) {
      console.warn('[UIMessageHandler] LeaderboardSystem not initialized');
      player.ui.sendData({
        type: 'leaderboard-data',
        category: message.category || 'all_time_score',
        entries: [],
        playerRank: null
      });
      return;
    }

    const category = message.category || 'all_time_score';
    const entries = LeaderboardSystem.getLeaderboard(category, 20);
    const playerRank = LeaderboardSystem.getPlayerRank(player.id, category);

    player.ui.sendData({
      type: 'leaderboard-data',
      category,
      entries,
      playerRank
    });
  }

  // ============ Social Handlers ============

  private _handleRequestFriendsList(player: Player): void {
    if (!SocialSystem) {
      console.warn('[UIMessageHandler] SocialSystem not initialized');
      player.ui.sendData({
        type: 'friends-list',
        friends: [],
        requests: []
      });
      return;
    }

    const friends = SocialSystem.getFriends(player.id);
    const requests = SocialSystem.getPendingRequests(player.id);

    player.ui.sendData({
      type: 'friends-list',
      friends,
      requests
    });
  }

  private _handleSendFriendRequest(player: Player, message: UIMessage): void {
    if (!SocialSystem) return;

    const success = SocialSystem.sendFriendRequest(player.id, message.targetUsername);
    player.ui.sendData({
      type: 'friend-request-sent',
      success,
      targetUsername: message.targetUsername
    });
  }

  private _handleAcceptFriendRequest(player: Player, message: UIMessage): void {
    if (!SocialSystem) return;

    const success = SocialSystem.acceptFriendRequest(player.id, message.requestId);
    player.ui.sendData({
      type: 'friend-request-accepted',
      success,
      requestId: message.requestId
    });
  }

  private _handleDeclineFriendRequest(player: Player, message: UIMessage): void {
    if (!SocialSystem) return;

    SocialSystem.declineFriendRequest(player.id, message.requestId);
    player.ui.sendData({
      type: 'friend-request-declined',
      requestId: message.requestId
    });
  }

  // ============ Accessibility Handlers ============

  private _handleUpdateAccessibility(player: Player, message: UIMessage): void {
    if (!AccessibilitySystem) {
      console.warn('[UIMessageHandler] AccessibilitySystem not initialized');
      return;
    }

    const settings = message.settings as AccessibilitySettings;
    AccessibilitySystem.updateSettings(player.id, settings);

    player.ui.sendData({
      type: 'accessibility-updated',
      settings
    });
  }
}
