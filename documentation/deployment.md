# Deployment

The grigson documentation website is deployed to GitHub Pages automatically on every push to `main`.

## How it works

The workflow at `.github/workflows/deploy.yml` has two jobs:

1. **build** — checks out the repo, installs dependencies in `website/`, runs `npm run build`, and uploads `website/_site/` as a Pages artifact.
2. **deploy** — takes the uploaded artifact and deploys it to GitHub Pages.

## Prerequisites

The GitHub repository must be configured to use GitHub Actions as the Pages source:

> Settings → Pages → Source → **GitHub Actions**

Without this setting the deploy job will fail with a permissions error.

## Permissions

The workflow requests the minimum permissions required:

| Permission | Purpose |
|---|---|
| `contents: read` | Checkout the repository |
| `pages: write` | Upload and deploy Pages artifacts |
| `id-token: write` | OIDC token for trusted deployment |

## Local preview

To preview the site locally before pushing:

```sh
cd website
npm install
npm run serve
```

Eleventy starts a local server (default `http://localhost:8080`) with live reload.
