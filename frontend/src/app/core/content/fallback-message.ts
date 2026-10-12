/**
 * The single hard-coded UI text allowed in this app (constitution, Principle II).
 *
 * It is shown only when Contentful cannot be reached, because an outage cannot supply its own error
 * text. It holds the whole message in English and French, including the wording of the retry button.
 * Never use it for any other state, screen or error: every other string comes from Contentful.
 */
export const CONTENT_UNAVAILABLE_FALLBACK = {
  en: {
    message: 'The content is unavailable right now. Please try again.',
    retry: 'Try again',
  },
  fr: {
    message: 'Le contenu est indisponible pour le moment. Veuillez réessayer.',
    retry: 'Réessayer',
  },
} as const;
