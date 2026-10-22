import type { Diagnostic } from '../diagnostic.js';
import type { ModAnalysis } from '../mod-analysis.js';
import type { Rule } from './rule.js';

const MIN_EVENT_NUMBER = 1;
const MAX_EVENT_NUMBER = 9999;

export const eventIdsRule: Rule = {
  id: 'event-ids',
  description: "Event ids must use a namespace declared in their file, a number in 1..9999, and be unique in the mod.",
  check({ eventFiles }: ModAnalysis): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const firstDefinition = new Map<string, string>();

    for (const { namespaces, events } of eventFiles) {
      for (const event of events) {
        const report = (message: string): void => {
          diagnostics.push({
            ruleId: eventIdsRule.id,
            severity: 'error',
            filePath: event.filePath,
            line: event.line,
            message,
          });
        };

        if (!namespaces.includes(event.namespace)) {
          report(`event '${event.id}' uses namespace '${event.namespace}', which is not declared in this file`);
        }
        if (event.number < MIN_EVENT_NUMBER || event.number > MAX_EVENT_NUMBER) {
          report(`event number ${event.number} is out of range ${MIN_EVENT_NUMBER}..${MAX_EVENT_NUMBER}`);
        }
        const previous = firstDefinition.get(event.id);
        if (previous === undefined) {
          firstDefinition.set(event.id, `${event.filePath}:${event.line}`);
        } else {
          report(`event '${event.id}' is already defined at ${previous}`);
        }
      }
    }

    return diagnostics;
  },
};
