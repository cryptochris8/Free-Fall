# EduFall - Educational Falling Game

## Project Overview

**EduFall** is an educational falling game built on the Hytopia SDK. Players fall through the air, answering questions by landing on the correct answer block. It supports 5 subjects, 4 difficulty levels, multiplayer modes, and comprehensive progression tracking.

### Core Game Concept
- **3D Physics-Based Gameplay**: Players free-fall through a tunnel environment
- **Multi-Subject Education**: Math, Spelling, Geography, Science, History
- **Progressive Challenge**: Gravity increases as players answer correctly
- **Fall-to-Select Menus**: Choose options by falling onto selection blocks
- **Multiplayer Ready**: Races, team challenges, tournaments, quick matches

---

## Directory Structure

```
Free-Fall-New/
├── src/
│   ├── index.ts                    # Legacy entry point
│   ├── edufall.ts                  # Main entry point
│   ├── controllers/
│   │   └── FallingPlayerController.ts    # Player falling mechanics
│   ├── managers/
│   │   ├── EduFallGameManager.ts   # Main game orchestrator (1,200+ lines)
│   │   ├── GameManager.ts          # Legacy game manager
│   │   ├── MathProblemManager.ts   # Math question generation
│   │   ├── AnswerBlockManager.ts   # Answer block spawning
│   │   └── PowerUpManager.ts       # Power-up system
│   ├── questions/                  # Multi-subject question system
│   │   ├── QuestionProvider.ts     # Base interface and registry
│   │   ├── MathQuestionProvider.ts
│   │   ├── SpellingQuestionProvider.ts
│   │   ├── GeographyQuestionProvider.ts
│   │   ├── ScienceQuestionProvider.ts
│   │   └── HistoryQuestionProvider.ts
│   ├── scoring/
│   │   └── ScoringSystem.ts        # Scoring with multipliers
│   ├── persistence/
│   │   ├── PersistenceManager.ts   # Player data saving
│   │   └── LeaderboardManager.ts   # Multi-category leaderboards
│   ├── lobby/
│   │   └── LobbyManager.ts         # Fall-to-select menu system
│   ├── tournament/
│   │   └── TournamentManager.ts    # Tournaments and quick match
│   ├── multiplayer/
│   │   ├── RaceManager.ts          # Competitive races
│   │   └── TeamManager.ts          # Team challenges
│   └── types/
│       └── index.ts                # Shared types and constants
├── powerups/                       # Power-up implementations
├── assets/
│   ├── audio/music/                # Background music
│   ├── audio/sfx/                  # Sound effects
│   ├── blocks/                     # Block textures
│   └── models/                     # 3D models
└── ui/
    └── index.html                  # Main game UI
```

---

## Core Systems

| System | File | Purpose |
|--------|------|---------|
| Game Manager | EduFallGameManager.ts | Main orchestrator - player lifecycle, questions, scoring |
| Question Provider | questions/*.ts | Multi-subject question generation (5 subjects) |
| Lobby | LobbyManager.ts | Fall-to-select menu navigation |
| Scoring | ScoringSystem.ts | Points, streaks, multipliers, grades |
| Persistence | PersistenceManager.ts | Player data saving to Hytopia |
| Leaderboards | LeaderboardManager.ts | Daily/weekly/all-time rankings |
| Tournament | TournamentManager.ts | Tournaments and quick matches |
| Controller | FallingPlayerController.ts | WASD movement, falling physics |

---

## Game Flow

1. Player Joins -> Spawn in Lobby (Y=80)
2. Select Mode/Subject/Difficulty (fall onto blocks)
3. Game Starts - 10 Questions
4. Fall and Land on Answer Block
   - Correct: +Points, Increase Gravity
   - Wrong: Reset Gravity, Continue
5. After 10 Questions - Final Fall
6. Land on Platform (Y=-40)
7. Results Screen - Leaderboard Submission
8. Return to Lobby

---

## Key Constants (src/types/index.ts)

| Constant | Value | Description |
|----------|-------|-------------|
| MAX_QUESTIONS | 10 | Questions per game |
| PLAYER_SPAWN_POSITION.y | 80 | Spawn/reset height |
| ANSWER_BLOCK_Y | 0 | Answer block row |
| LANDING_PLATFORM_Y | -40 | Final landing platform |
| PLAYER_GRAVITY_SCALE | 0.1 | Base fall speed (slow) |
| GRAVITY_INCREASE_PER_CORRECT | 0.05 | Speed increase per correct |
| MAX_GRAVITY_MULTIPLIER | 3 | Maximum gravity multiplier |
| PLAYER_MOVE_SPEED | 5 | Horizontal movement speed |

---

## Subjects and Difficulties

### Subjects
- Math - Addition, Subtraction, Multiplication, Division, Fractions, Percentages
- Spelling - Vocabulary and spelling challenges
- Geography - Geography facts and capitals
- Science - Science concepts and facts
- History - Historical facts and timelines

### Difficulties
- Beginner: Simple problems, small numbers
- Intermediate: Medium complexity
- Advanced: Harder problems, larger numbers
- Expert: Most challenging, complex operations

---

## Scoring System

Formula: Score = BasePoints(100) x DifficultyMultiplier x StreakMultiplier + SpeedBonus

- Difficulty Multiplier: 1.0 (Beginner) to 3.0 (Hard)
- Streak Multiplier: 1.0 to 2.0 (increases with consecutive correct)
- Perfect Game Bonus: +500 points (all 10 correct)
- XP Conversion: 0.1 XP per point earned
- Grades: F, D, C, B, A, S (based on accuracy, speed, streak)

---

## Persistence System

Player data automatically saved includes:
- Profile: Username, play time, current level
- Statistics: Games played, accuracy, high score, best streak
- Per-Subject Stats: Games, accuracy, category mastery per subject
- Leaderboards: Daily/weekly high scores, all-time rankings

---

## Power-Ups

| Power-Up | Effect |
|----------|--------|
| SlowMotion | Reduces gravity temporarily |
| Shield | Forgives one wrong answer |
| DoublePoints | 2x points for next answers |
| Magnet | Auto-collect nearby blocks |
| Rewind | Undo wrong answer |

---

## Multiplayer Modes

- Race Mode: 2-4 players compete, same questions, first to finish wins
- Team Challenge: Collaborative, shared lives, combined scoring
- Quick Match: Automatic matchmaking, 60-second timeout
- Tournaments: Bracket, round-robin, ladder, public/private

---

## Leaderboard Categories

- Daily: Resets midnight UTC
- Weekly: Resets Sunday
- All-Time: Best score ever
- Streak: Best consecutive correct
- Speed-Run: Fastest perfect game
- Per-Subject: Separate boards for each subject

---

## Development Setup

Requirements:
- Bun: Runtime and package manager
- TypeScript: Primary language
- Hytopia SDK: v0.14.20+

Quick Start:
```
bun install
bun run start:edufall
```

---

## Tech Stack

- Runtime: Bun
- Language: TypeScript
- Engine: Hytopia SDK v0.14.20
- Assets: @hytopia.com/assets v0.4.6
- Persistence: Hytopia Native

---

## License

Built with Hytopia SDK for the Hytopia platform.
