/**
 * RaceManager - Competitive race mode
 *
 * Manages race sessions where players compete to answer questions fastest.
 */

import { World, Player, PlayerEntity } from 'hytopia';
import type { RaceSession, RaceParticipant, CurriculumQuestion } from '../types';
import { MathProblemManager } from '../managers/MathProblemManager';

export class RaceManager {
  private static _instance: RaceManager;
  private _world: World;

  // Active race sessions
  private _sessions: Map<string, RaceSession> = new Map();

  // Player to session mapping
  private _playerSessions: Map<string, string> = new Map();

  // Waiting lobby
  private _lobby: Set<string> = new Set();
  private _lobbyHost: string | null = null;

  // Configuration
  private readonly _questionsPerRace = 10;
  private readonly _minPlayers = 2;
  private readonly _maxPlayers = 4;
  private readonly _countdownSeconds = 3;

  private constructor(world: World) {
    this._world = world;
  }

  public static getInstance(world?: World): RaceManager {
    if (!RaceManager._instance) {
      if (!world) throw new Error('RaceManager requires world on first instantiation');
      RaceManager._instance = new RaceManager(world);
    }
    return RaceManager._instance;
  }

  /**
   * Create or join the race lobby
   */
  public createOrJoinLobby(player: Player): string {
    // Add to lobby
    this._lobby.add(player.id);

    // Set host if none
    if (!this._lobbyHost) {
      this._lobbyHost = player.id;
    }

    // Broadcast lobby update to all in lobby
    this._broadcastLobbyUpdate();

    console.log(`[RaceManager] ${player.username} joined lobby (${this._lobby.size} players)`);
    return 'main_lobby';
  }

  /**
   * Leave the race lobby
   */
  public leaveLobby(player: Player): void {
    this._lobby.delete(player.id);

    // Reassign host if needed
    if (this._lobbyHost === player.id) {
      this._lobbyHost = this._lobby.size > 0 ? Array.from(this._lobby)[0] : null;
    }

    this._broadcastLobbyUpdate();
    console.log(`[RaceManager] ${player.username} left lobby`);
  }

  /**
   * Get players in lobby
   */
  public getLobbyPlayers(sessionId: string): { id: string; username: string; isHost: boolean }[] {
    const players: { id: string; username: string; isHost: boolean }[] = [];

    this._lobby.forEach(playerId => {
      const player = this._findPlayer(playerId);
      if (player) {
        players.push({
          id: playerId,
          username: player.username,
          isHost: playerId === this._lobbyHost
        });
      }
    });

    return players;
  }

  /**
   * Start a race (host only)
   */
  public startRace(player: Player): boolean {
    // Check if host
    if (player.id !== this._lobbyHost) {
      console.log(`[RaceManager] ${player.username} is not the host`);
      return false;
    }

    // Check player count
    if (this._lobby.size < this._minPlayers) {
      console.log(`[RaceManager] Not enough players (${this._lobby.size}/${this._minPlayers})`);
      return false;
    }

    // Create session
    const sessionId = `race_${Date.now()}`;
    const participants = new Map<string, RaceParticipant>();

    // Add all lobby players
    this._lobby.forEach(playerId => {
      const lobbyPlayer = this._findPlayer(playerId);
      const playerEntity = this._findPlayerEntity(playerId);

      if (lobbyPlayer && playerEntity) {
        participants.set(playerId, {
          player: lobbyPlayer,
          playerEntity,
          currentQuestion: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          isFinished: false,
          startTime: Date.now()
        });
        this._playerSessions.set(playerId, sessionId);
      }
    });

    // Generate questions
    const mathManager = MathProblemManager.getInstance();
    const questions: CurriculumQuestion[] = [];
    for (let i = 0; i < this._questionsPerRace; i++) {
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

    // Create session
    const session: RaceSession = {
      id: sessionId,
      hostId: player.id,
      participants,
      questions,
      startTime: Date.now(),
      isActive: true
    };

    this._sessions.set(sessionId, session);

    // Clear lobby
    this._lobby.clear();
    this._lobbyHost = null;

    // Start countdown and race
    this._startCountdown(session);

    console.log(`[RaceManager] Race started with ${participants.size} players`);
    return true;
  }

  /**
   * Start countdown before race begins
   */
  private _startCountdown(session: RaceSession): void {
    let countdown = this._countdownSeconds;

    const countdownInterval = setInterval(() => {
      // Broadcast countdown to all participants
      session.participants.forEach((participant, playerId) => {
        participant.player.ui.sendData({
          type: 'race-countdown',
          seconds: countdown
        });
      });

      countdown--;

      if (countdown < 0) {
        clearInterval(countdownInterval);
        this._beginRace(session);
      }
    }, 1000);
  }

  /**
   * Begin the actual race
   */
  private _beginRace(session: RaceSession): void {
    session.startTime = Date.now();

    // Send first question to all participants
    session.participants.forEach((participant) => {
      this._sendQuestion(session, participant);
    });

    console.log(`[RaceManager] Race ${session.id} begun!`);
  }

  /**
   * Send current question to a participant
   */
  private _sendQuestion(session: RaceSession, participant: RaceParticipant): void {
    const question = session.questions[participant.currentQuestion];
    if (!question) return;

    participant.player.ui.sendData({
      type: 'race-question',
      questionNumber: participant.currentQuestion + 1,
      totalQuestions: session.questions.length,
      question: question.question,
      answers: [question.correctAnswer, ...question.wrongAnswers].sort(() => Math.random() - 0.5)
    });
  }

  /**
   * Submit an answer in a race
   */
  public submitAnswer(playerId: string, answer: number): void {
    const sessionId = this._playerSessions.get(playerId);
    if (!sessionId) return;

    const session = this._sessions.get(sessionId);
    if (!session || !session.isActive) return;

    const participant = session.participants.get(playerId);
    if (!participant || participant.isFinished) return;

    const question = session.questions[participant.currentQuestion];
    const isCorrect = answer === question.correctAnswer;

    if (isCorrect) {
      participant.correctAnswers++;
    } else {
      participant.wrongAnswers++;
    }

    // Advance to next question
    participant.currentQuestion++;

    // Broadcast progress
    this._broadcastProgress(session);

    // Check if finished
    if (participant.currentQuestion >= session.questions.length) {
      participant.isFinished = true;
      participant.completionTime = Date.now() - session.startTime;

      // Check if race is over
      this._checkRaceEnd(session);
    } else {
      // Send next question
      this._sendQuestion(session, participant);
    }
  }

  /**
   * Broadcast race progress to all participants
   */
  private _broadcastProgress(session: RaceSession): void {
    const standings = this._getStandings(session);

    session.participants.forEach((participant) => {
      participant.player.ui.sendData({
        type: 'race-progress',
        standings
      });
    });
  }

  /**
   * Get current standings
   */
  private _getStandings(session: RaceSession): { username: string; progress: number; correctAnswers: number }[] {
    const standings: { username: string; progress: number; correctAnswers: number }[] = [];

    session.participants.forEach((participant) => {
      standings.push({
        username: participant.player.username,
        progress: participant.currentQuestion / session.questions.length,
        correctAnswers: participant.correctAnswers
      });
    });

    // Sort by progress, then by correct answers
    standings.sort((a, b) => {
      if (b.progress !== a.progress) return b.progress - a.progress;
      return b.correctAnswers - a.correctAnswers;
    });

    return standings;
  }

  /**
   * Check if race should end
   */
  private _checkRaceEnd(session: RaceSession): void {
    const allFinished = Array.from(session.participants.values()).every(p => p.isFinished);

    if (allFinished) {
      this._endRace(session);
    }
  }

  /**
   * End the race and determine winner
   */
  private _endRace(session: RaceSession): void {
    session.isActive = false;
    session.endTime = Date.now();

    // Determine winner (most correct, then fastest)
    let winner: RaceParticipant | null = null;
    session.participants.forEach((participant) => {
      if (!winner ||
          participant.correctAnswers > winner.correctAnswers ||
          (participant.correctAnswers === winner.correctAnswers &&
           (participant.completionTime || Infinity) < (winner.completionTime || Infinity))) {
        winner = participant;
      }
    });

    if (winner) {
      session.winner = winner.player.id;

      // Broadcast winner
      session.participants.forEach((participant) => {
        participant.player.ui.sendData({
          type: 'race-winner',
          winner: winner!.player.username,
          results: this._getResults(session)
        });
      });

      console.log(`[RaceManager] Race ${session.id} won by ${winner.player.username}`);
    }

    // Cleanup
    session.participants.forEach((_, playerId) => {
      this._playerSessions.delete(playerId);
    });

    // Remove session after delay
    setTimeout(() => {
      this._sessions.delete(session.id);
    }, 60000);
  }

  /**
   * Get final results
   */
  private _getResults(session: RaceSession): { username: string; correctAnswers: number; time: number }[] {
    const results: { username: string; correctAnswers: number; time: number }[] = [];

    session.participants.forEach((participant) => {
      results.push({
        username: participant.player.username,
        correctAnswers: participant.correctAnswers,
        time: participant.completionTime || 0
      });
    });

    results.sort((a, b) => {
      if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
      return a.time - b.time;
    });

    return results;
  }

  /**
   * Broadcast lobby update to all lobby players
   */
  private _broadcastLobbyUpdate(): void {
    const players = this.getLobbyPlayers('main_lobby');

    this._lobby.forEach(playerId => {
      const player = this._findPlayer(playerId);
      if (player) {
        player.ui.sendData({
          type: 'race-lobby-update',
          players,
          canStart: this._lobby.size >= this._minPlayers,
          isHost: playerId === this._lobbyHost
        });
      }
    });
  }

  /**
   * Find player by ID
   */
  private _findPlayer(playerId: string): Player | undefined {
    const players = this._world.playerManager?.getConnectedPlayers() || [];
    return players.find(p => p.id === playerId);
  }

  /**
   * Find player entity by player ID
   */
  private _findPlayerEntity(playerId: string): PlayerEntity | undefined {
    // This would need to be tracked by GameManager
    // For now return undefined - will be fixed when integrating
    return undefined;
  }
}
