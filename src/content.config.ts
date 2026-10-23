import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const link = z.object({ label: z.string(), href: z.string() });

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    navTitle: z.string().optional(),
    description: z.string().max(200),
    eyebrow: z.string().optional(),
    lead: z.string().optional(),
    illustration: z.string().default('horizon'),
    draft: z.boolean().default(false),
    template: z.boolean().default(false),
    gate: z.boolean().default(false),
    featuresFirst: z.boolean().default(false),
    cta: z.object({ label: z.string(), href: z.string() }).optional(),
    features: z.array(z.object({ title: z.string(), text: z.string(), image: z.string().optional(), video: z.string().optional(), alt: z.string().optional() })).default([]),
    facts: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    links: z.array(link).default([]),
    pillars: z.array(z.object({ title: z.string(), text: z.string(), to: z.string(), illustration: z.string().default('horizon') })).default([]),
    arc: z.array(z.object({ title: z.string(), text: z.string() })).default([]),
    gallery: z.array(z.object({ image: z.string().optional(), video: z.string().optional(), alt: z.string() })).default([]),
    updated: z.coerce.date().optional(),
  }),
});

const cases = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/cases' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    client: z.string(),
    anonymized: z.boolean().default(true),
    industry: z.string(),
    service: z.string(),
    illustration: z.string().default('horizon'),
    draft: z.boolean().default(true),
    template: z.boolean().default(false),
    challenge: z.string(),
    approach: z.string(),
    result: z.string(),
    stats: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
    stack: z.array(z.string()).default([]),
    date: z.coerce.date(),
  }),
});

const insights = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/insights' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    type: z.enum(['article', 'talk', 'event']).default('article'),
    illustration: z.string().default('horizon'),
    draft: z.boolean().default(true),
    date: z.coerce.date(),
    author: z.string().default('PARADOX CAT'),
  }),
});

const team = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/team' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    draft: z.boolean().default(true),
    order: z.number().default(100),
  }),
});

const jobs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/jobs' }),
  schema: z.object({
    title: z.string(),
    location: z.string(),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN']).default('FULL_TIME'),
    summary: z.string().max(200),
    draft: z.boolean().default(true),
    datePosted: z.coerce.date(),
  }),
});

export const collections = { pages, cases, insights, team, jobs };
