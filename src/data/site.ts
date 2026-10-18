/** Language-independent facts about the site and its owner. */
export const site = {
  name: 'Jan Podzimek',
  email: 'podzimek.jan@seznam.cz',
  linkedin: 'https://www.linkedin.com/in/podzimekjan/',
  github: 'https://github.com/JanPodzimek',
  repo: 'https://github.com/JanPodzimek/portfolio',
  cv: '/cv/Jan-Podzimek-CV-EN.pdf',
} as const;

/** Link to a file in the public repository (used by "view source" links). */
export function repoFileUrl(path: string): string {
  return `${site.repo}/blob/main/${path}`;
}
