import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Case studies, one Markdown file per study and language:
 * src/content/case-studies/<locale>/<slug>.md. Same slugs must exist in every locale.
 */
const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/case-studies' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number().int(),
    stack: z.array(z.string()).min(1),
    problem: z.string(),
    approach: z.array(z.string()).min(1),
    result: z.array(z.string()).min(1),
  }),
});

export const collections = { caseStudies };
