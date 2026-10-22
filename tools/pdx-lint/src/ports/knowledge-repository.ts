import type { ScriptKnowledge } from '../domain/knowledge/script-knowledge.js';

export interface KnowledgeRepository {
  /** Null when the game documentation is not available (e.g. in CI). */
  load(): Promise<ScriptKnowledge | null>;
}
