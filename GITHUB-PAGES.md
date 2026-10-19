# Publish Órbita on GitHub Pages

The project works as a static website, including its full vocabulary snapshot. The workflow publishes only `dist/` plus data attribution and methodology. Source backups, research scripts, cache files, and browser evidence stay out of the deployed website.

## One-time setup

1. Create a repository on GitHub. A public repository works with GitHub Free. Keep it empty if you are uploading this existing Git project.
2. Push this project, including `.github/workflows/pages.yml`, to its `main` branch.
3. Open **Settings → Pages** and select **GitHub Actions** under **Build and deployment → Source**.
4. In **Actions**, open **Test and deploy GitHub Pages**. If the first attempt ran before Pages was enabled, use **Re-run all jobs**, or **Run workflow** on `main`.
5. Once deployment succeeds, the Pages settings and deployment environment show the live URL, normally `https://OWNER.github.io/REPOSITORY/`.

Official instructions: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Future updates

Edit the local project, run `npm test` and `npm run pages:build`, commit, and push to `main`. GitHub tests the pinned data and game rules before deploying. Pull requests run validation without publishing. No dependencies or secrets need to be installed in Actions.

```powershell
git add .
git commit -m "Update Orbita"
git push
```

`npm run pages:build` recreates `_site/` from the current files, checks relative asset references, includes source attribution, and writes `.nojekyll`. `_site/` is generated and ignored by Git. The upload artifact uses its contents as the website root, so the URL has no `/dist/` suffix. Hash routes such as `#daily` and `#catalog` work on GitHub Pages without server rewrites.

The data is already bundled: deployments do not rerun the external source import or depend on live research APIs. Updating the research snapshot is a separate deliberate step described in README.md.

## Progress and sharing

Browser storage at localhost and at github.io is separate. To transfer progress, export JSON from **Ajustes** on the local version and import it from **Ajustes** on the hosted version. Exported player saves are not part of this repository. Challenge links created on the hosted site use its public URL.

## What is public

The hosted game and its bundled vocabulary are downloadable by visitors. A public repository also exposes its tracked source and documentation. `.cache/`, generated `_site/`, environment files, and local dependency folders are excluded. The game has no server-side credentials or online player accounts.
