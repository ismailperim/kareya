# Kareya build runner (KAR-46). Build from the REPO ROOT so workspaces resolve:
#   docker build -f apps/runner/Dockerfile -t kareya-runner .
# Run with env (DATABASE_URL + R2_*):
#   docker run --env-file apps/runner/.env kareya-runner
FROM node:22-slim

WORKDIR /repo

# Workspace manifests first for layer caching.
COPY package.json package-lock.json ./
COPY apps/runner/package.json apps/runner/
COPY packages/schemas/package.json packages/schemas/
COPY packages/site-gen/package.json packages/site-gen/

RUN npm install --no-audit --no-fund --workspace @kareya/runner --include-workspace-root=false

# Source.
COPY packages/schemas packages/schemas
COPY packages/site-gen packages/site-gen
COPY apps/runner apps/runner

# Site builds run `npm install` + `astro build` inside a temp dir at job time.
CMD ["npm", "run", "start", "-w", "@kareya/runner"]
