import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    source: z.string(),
    year: z.number(),
    order: z.number(),
  }),
});

export const collections = { notes };
