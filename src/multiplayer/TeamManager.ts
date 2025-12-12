/**
 * TeamManager - Team-based challenge mode
 *
 * Manages team challenges where players work together.
 */

import { World, Player, PlayerEntity } from 'hytopia';
import type { Team, TeamMember, TeamChallenge, CurriculumQuestion, Difficulty } from '../types';
import { MathProblemManager } from '../managers/MathProblemManager';

export class TeamManager {
  private static _instance: TeamManager;
  private _world: World;

  // Active challenges
  private _challenges: Map<string, TeamChallenge> = new Map();

  // Player to challenge mapping
  private _playerChallenges: Map<string, string> = new Map();

  // Waiting lobby
  private _lobby: {
    players: Map<string, { player: Player; team: string | null }>;
    hostId: string | null;
  } = {
    players: new Map(),
    hostId: null
  };

  // Team definitions
  private readonly _teamColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
  private readonly _teamNames = ['Red', 'Cyan', 'Blue', 'Green'];

  // Configuration
  private readonly _questionsPerChallenge = 20;
  private readonly _startingLives = 3;
  private readonly _minPlayersPerTeam = 1;

  private constructor(world: World) {
    this._world = world;
  }

  public static getInstance(world?: World): TeamManager {
    if (!TeamManager._instance) {
      if (!world) throw new Error('TeamManager requires world on first instantiation');
      TeamManager._instance = new TeamManager(world);
    }
    return TeamManager._instance;
  }

  /**
   * Create or join team lobby
   */
  public createOrJoinLobby(player: Player): string {
    this._lobby.players.set(player.id, { player, team: null });

    if (!this._lobby.hostId) {
      this._lobby.hostId = player.id;
    }

    this._broadcastLobbyUpdate();
    console.log(`[TeamManager] ${player.username} joined team lobby`);
    return 'team_lobby';
  }

  /**
   * Leave team lobby
   */
  public leaveLobby(player: Player): void {
    this._lobby.players.delete(player.id);

    if (this._lobby.hostId === player.id) {
      const remaining = Array.from(this._lobby.players.keys());
      this._lobby.hostId = remaining.length > 0 ? remaining[0] : null;
    }

    this._broadcastLobbyUpdate();
    console.log(`[TeamManager] ${player.username} left team lobby`);
  }

  /**
   * Join a specific team
   */
  public joinTeam(player: Player, teamId: string): boolean {
    const lobbyPlayer = this._lobby.players.get(player.id);
    if (!lobbyPlayer) return false;

    // Validate team ID (0-3)
    const teamIndex = parseInt(teamId);
    if (isNaN(teamIndex) || teamIndex < 0 || teamIndex >= this._teamNames.length) {
      return false;
    }

    lobbyPlayer.team = teamId;
    this._broadcastLobbyUpdate();

    console.log(`[TeamManager] ${player.username} joined team ${this._teamNames[teamIndex]}`);
    return true;
  }

  /**
   * Get team info for lobby
   */
  public getTeamInfo(challengeId: string): {
    teams: { id: string; name: string; color: string; members: string[] }[];
    unassigned: string[];
  } {
    const teams: { id: string; name: string; color: string; members: string[] }[] = [];
    const unassigned: string[] = [];

    // Create team slots
    for (let i = 0; i < this._teamNames.length; i++) {
      teams.push({
        id: i.toString(),
        name: this._teamNames[i],
        color: this._teamColors[i],
        members: []
      });
    }

    // Assign players
    this._lobby.players.forEach((data, playerId) => {
      if (data.team !== null) {
        const teamIndex = parseInt(data.team);
        if (teams[teamIndex]) {
          teams[teamIndex].members.push(data.player.username);
        }
      } else {
        unassigned.push(data.player.username);
      }
    });

    return { teams, unassigned };
  }

  /**
   * Start team challenge (host only)
   */
  public startChallenge(player: Player): boolean {
    if (player.id !== this._lobby.hostId) {
      console.log(`[TeamManager] ${player.username} is not the host`);
      return false;
    }

    // Check that we have at least 2 teams with players
    const teamCounts = new Map<string, number>();
    this._lobby.players.forEach((data) => {
      if (data.team !== null) {
        teamCounts.set(data.team, (teamCounts.get(data.team) || 0) + 1);
      }
    });

    const activeTeams = Array.from(teamCounts.entries()).filter(([_, count]) => count >= this._minPlayersPerTeam);
    if (activeTeams.length < 2) {
      console.log(`[TeamManager] Need at least 2 teams with players`);
      return false;
    }

    // Create challenge
    const challengeId = `team_${Date.now()}`;
    const teams = new Map<string, Team>();

    // Create teams
    activeTeams.forEach(([teamId]) => {
      const teamIndex = parseInt(teamId);
      teams.set(teamId, {
        id: teamId,
        name: this._teamNames[teamIndex],
        color: this._teamColors[teamIndex],
        members: new Map(),
        totalScore: 0,
        sharedLives: this._startingLives,
        teamCombo: 0
      });
    });

    // Add players to teams
    this._lobby.players.forEach((data, playerId) => {
      if (data.team !== null && teams.has(data.team)) {
        const team = teams.get(data.team)!;
        team.members.set(playerId, {
          player: data.player,
          playerEntity: undefined as any, // Would be set by GameManager
          correctAnswers: 0,
          wrongAnswers: 0,
          contributionScore: 0,
          isActive: true
        });
        this._playerChallenges.set(playerId, challengeId);
      }
    });

    // Generate questions
    const mathManager = MathProblemManager.getInstance();
    const questions: CurriculumQuestion[] = [];
    for (let i = 0; i < this._questionsPerChallenge; i++) {
      const problem = mathManager.generateProblem('moderate');
      questions.push({
        id: problem.id,
        topic: 'arithmetic' as any,
        difficulty: 'intermediate' as any,
        question: `${problem.num1} ${mathManager.getOperationDisplay(problem.operation)} ${problem.num2} = ?`,
        correctAnswer: problem.correctAnswer,
        wrongAnswers: problem.wrongAnswers,
        grade: 2
      });
    }

    const challenge: TeamChallenge = {
      id: challengeId,
      teams,
      questions,
      startTime: Date.now(),
      isActive: true,
      difficulty: 'moderate',
      mode: 'survival'
    };

    this._challenges.set(challengeId, challenge);

    // Clear lobby
    this._lobby.players.clear();
    this._lobby.hostId = null;

    // Notify all players
    this._broadcastChallengeStart(challenge);

    console.log(`[TeamManager] Team challenge started with ${activeTeams.length} teams`);
    return true;
  }

  /**
   * Record an answer from a team member
   */
  public recordAnswer(playerId: string, correct: boolean): void {
    const challengeId = this._playerChallenges.get(playerId);
    if (!challengeId) return;

    const challenge = this._challenges.get(challengeId);
    if (!challenge || !challenge.isActive) return;

    // Find player's team
    let playerTeam: Team | null = null;
    let member: TeamMember | null = null;

    challenge.teams.forEach((team) => {
      const teamMember = team.members.get(playerId);
      if (teamMember) {
        playerTeam = team;
        member = teamMember;
      }
    });

    if (!playerTeam || !member) return;

    if (correct) {
      member.correctAnswers++;
      playerTeam.teamCombo++;

      // Score with combo bonus
      const comboMultiplier = Math.min(1 + (playerTeam.teamCombo * 0.1), 2.0);
      const points = Math.round(10 * comboMultiplier);
      playerTeam.totalScore += points;
      member.contributionScore += points;
    } else {
      member.wrongAnswers++;
      playerTeam.teamCombo = 0;
      playerTeam.sharedLives--;

      // Check for team elimination
      if (playerTeam.sharedLives <= 0) {
        this._eliminateTeam(challenge, playerTeam);
      }
    }

    // Broadcast progress
    this._broadcastChallengeProgress(challenge);

    // Check for challenge end
    this._checkChallengeEnd(challenge);
  }

  /**
   * Eliminate a team
   */
  private _eliminateTeam(challenge: TeamChallenge, team: Team): void {
    // Mark all members as inactive
    team.members.forEach((member) => {
      member.isActive = false;
      member.player.ui.sendData({
        type: 'team-eliminated',
        teamName: team.name
      });
    });

    console.log(`[TeamManager] Team ${team.name} eliminated`);
  }

  /**
   * Check if challenge should end
   */
  private _checkChallengeEnd(challenge: TeamChallenge): void {
    // Count active teams
    let activeTeams = 0;
    let lastActiveTeam: Team | null = null;

    challenge.teams.forEach((team) => {
      if (team.sharedLives > 0) {
        activeTeams++;
        lastActiveTeam = team;
      }
    });

    // End if only one team left
    if (activeTeams <= 1) {
      this._endChallenge(challenge, lastActiveTeam);
    }
  }

  /**
   * End the team challenge
   */
  private _endChallenge(challenge: TeamChallenge, winner: Team | null): void {
    challenge.isActive = false;
    challenge.endTime = Date.now();

    if (winner) {
      challenge.winningTeam = winner.id;
    }

    // Notify all players
    const results = this._getChallengeResults(challenge);

    challenge.teams.forEach((team) => {
      team.members.forEach((member) => {
        member.player.ui.sendData({
          type: 'team-challenge-end',
          winner: winner?.name || 'No winner',
          results
        });
      });
    });

    // Cleanup
    challenge.teams.forEach((team) => {
      team.members.forEach((_, playerId) => {
        this._playerChallenges.delete(playerId);
      });
    });

    // Remove challenge after delay
    setTimeout(() => {
      this._challenges.delete(challenge.id);
    }, 60000);

    console.log(`[TeamManager] Challenge ended, winner: ${winner?.name || 'none'}`);
  }

  /**
   * Get challenge results
   */
  private _getChallengeResults(challenge: TeamChallenge): { teamName: string; score: number; lives: number }[] {
    const results: { teamName: string; score: number; lives: number }[] = [];

    challenge.teams.forEach((team) => {
      results.push({
        teamName: team.name,
        score: team.totalScore,
        lives: team.sharedLives
      });
    });

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * Broadcast lobby update
   */
  private _broadcastLobbyUpdate(): void {
    const teamInfo = this.getTeamInfo('team_lobby');

    this._lobby.players.forEach((data) => {
      data.player.ui.sendData({
        type: 'team-lobby-update',
        ...teamInfo,
        isHost: data.player.id === this._lobby.hostId,
        canStart: this._canStartChallenge()
      });
    });
  }

  /**
   * Check if challenge can start
   */
  private _canStartChallenge(): boolean {
    const teamCounts = new Map<string, number>();
    this._lobby.players.forEach((data) => {
      if (data.team !== null) {
        teamCounts.set(data.team, (teamCounts.get(data.team) || 0) + 1);
      }
    });

    const activeTeams = Array.from(teamCounts.values()).filter(count => count >= this._minPlayersPerTeam);
    return activeTeams.length >= 2;
  }

  /**
   * Broadcast challenge start
   */
  private _broadcastChallengeStart(challenge: TeamChallenge): void {
    challenge.teams.forEach((team) => {
      team.members.forEach((member) => {
        member.player.ui.sendData({
          type: 'team-challenge-start',
          teamName: team.name,
          teamColor: team.color,
          startingLives: team.sharedLives,
          totalQuestions: challenge.questions.length
        });
      });
    });
  }

  /**
   * Broadcast challenge progress
   */
  private _broadcastChallengeProgress(challenge: TeamChallenge): void {
    const standings = this._getChallengeResults(challenge);

    challenge.teams.forEach((team) => {
      team.members.forEach((member) => {
        member.player.ui.sendData({
          type: 'team-progress',
          myTeam: {
            name: team.name,
            score: team.totalScore,
            lives: team.sharedLives,
            combo: team.teamCombo
          },
          standings
        });
      });
    });
  }
}
