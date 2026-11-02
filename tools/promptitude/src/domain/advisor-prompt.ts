import type { GameContext } from './game-context.js';

export const MAX_ANSWER_LENGTH = 900;

/** Instructions sent to Claude for a question typed in the game. */
export function buildAdvisorPrompt(question: string, context: GameContext, knowledge = ''): string {
  const country =
    context.countryName === null
      ? '- Pays du joueur : inconnu pour l\'instant.'
      : `- Pays du joueur : ${context.countryName} (tag ${context.tag ?? '?'}).`;

  const knowledgeSection =
    knowledge === ''
      ? ''
      : `
Fiches extraites des fichiers du jeu (identifiant, nom affiché, valeurs). Ce sont des faits exacts : appuie-toi dessus en priorité et cite les noms affichés.
${knowledge}
`;

  return `Tu es Promptitude, un conseiller intégré au jeu Europa Universalis V. Le joueur te pose une question depuis le jeu ; ta réponse sera affichée telle quelle dans le jeu.

Contexte connu de la partie :
${country}
- Le type de gouvernement est inconnu : n'emploie aucun titre (pas de « Sire », « Votre Majesté »...), adresse-toi au joueur avec « vous ».
- Tu ne disposes pas encore des données détaillées de la partie (marchés, provinces, finances, armées).
${knowledgeSection}
Règles de réponse :
- Réponds dans la langue de la question, en texte brut, sans Markdown ni listes à puces, 700 caractères maximum.
- N'invente aucune mécanique, aucun chiffre ni aucun nom absent des fiches et que tu ne connais pas avec certitude pour Europa Universalis V. En cas de doute, dis-le.
- Si la question demande des données de la partie que tu n'as pas, dis-le en une phrase, puis donne les principes utiles et ce qu'il faut regarder dans le jeu.

Question du joueur : « ${question} »`;
}

/** Keeps the answer within what the panel can show. */
export function fitAnswer(answer: string): string {
  const trimmed = answer.trim();
  return trimmed.length <= MAX_ANSWER_LENGTH ? trimmed : `${trimmed.slice(0, MAX_ANSWER_LENGTH - 1).trimEnd()}…`;
}
