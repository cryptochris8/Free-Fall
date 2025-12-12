/**
 * Questions Module - Export all question providers
 */

// Base types and interfaces
export type {
  SubjectType,
  QuestionDifficulty,
  QuestionCategory,
  Question,
  QuestionProviderConfig,
  IQuestionProvider
} from './QuestionProvider';

export {
  BaseQuestionProvider,
  QuestionProviderRegistry
} from './QuestionProvider';

// Subject-specific providers
export { MathQuestionProvider } from './MathQuestionProvider';
export { SpellingQuestionProvider } from './SpellingQuestionProvider';
export { GeographyQuestionProvider } from './GeographyQuestionProvider';
export { ScienceQuestionProvider } from './ScienceQuestionProvider';
export { HistoryQuestionProvider } from './HistoryQuestionProvider';

// Convenience function to register all providers
import { QuestionProviderRegistry } from './QuestionProvider';
import { MathQuestionProvider } from './MathQuestionProvider';
import { SpellingQuestionProvider } from './SpellingQuestionProvider';
import { GeographyQuestionProvider } from './GeographyQuestionProvider';
import { ScienceQuestionProvider } from './ScienceQuestionProvider';
import { HistoryQuestionProvider } from './HistoryQuestionProvider';

/**
 * Initialize and register all question providers
 */
export function initializeQuestionProviders(): QuestionProviderRegistry {
  const registry = QuestionProviderRegistry.getInstance();

  // Register all providers
  registry.register(new MathQuestionProvider());
  registry.register(new SpellingQuestionProvider());
  registry.register(new GeographyQuestionProvider());
  registry.register(new ScienceQuestionProvider());
  registry.register(new HistoryQuestionProvider());

  console.log('[Questions] All providers registered:', registry.getAvailableSubjects());

  return registry;
}
