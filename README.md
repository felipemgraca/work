# work

Personal site for Felipe Graca, built with Astro and hosted on GitHub Pages.

Content is generated from the Obsidian vault (Writing, Notes, highlighted Books, resume) by `npm run sync`, which writes `src/data/site.json`. Commit that file and push; GitHub Actions builds and deploys.

```
npm install
npm run sync     # read the vault
npm run dev
```
