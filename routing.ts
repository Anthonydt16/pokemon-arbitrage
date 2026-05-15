export const routing = {
  locales: ['en', 'fr'],
  defaultLocale: 'fr',
} as const;

export type Locale = (typeof routing.locales)[number];
