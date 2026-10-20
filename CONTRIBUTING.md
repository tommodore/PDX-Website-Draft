# Contributing

- Work on a branch, open a PR to `main`. `main` is protected: the `quality` check must pass.
- Content-only changes can go through the CMS.
- Run `npm run check && npm run build` before pushing. For UI changes also `npm run test:a11y` and `npm run test:lhci` against `npm run preview`.
- New routes go into `src/lib/routes.ts` with both EN and DE slugs.
- Use tokens, not literal values. Update `DESIGN.md` and `/design-system/` when adding components.
- Public repo: never commit secrets, internal documents, customer names under NDA or licensed fonts. Mark generated imagery as illustrative.
- Copy style: direct, "we", short sentences, no personal contact data.
