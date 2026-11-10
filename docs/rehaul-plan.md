# Portfolio rehaul: plan

## Progress
- [x] Stage 0: plan doc
- [x] Stage 1: infra foundation (API: `https://fb769umpf4.execute-api.ca-central-1.amazonaws.com`)
- [x] Stage 2: auth, write API, seed
  - Cognito pool `ca-central-1_puctf6Zuu`, client `3csaagvn6ld18gnjlbt1eeaq1f`, login `https://ryanlepham-portfolio.auth.ca-central-1.amazoncognito.com`
  - Seeded: profile, 11 projects (ids are title slugs), resume + 23 files under `media/`. The frontend sync now excludes `media/*`.
- [x] Stage 3: public site (`frontend/`), not deployed until Stage 5
  - Vite 8 + React 19 + TS + Tailwind v4 + React Router 8 (v8 was latest, not v7).
  - `VITE_API_URL` is in `frontend/.env`. In dev, `media/` loads from the live site (`.env.development`), and in prod it's same-origin.
- [ ] Stage 4: admin
- [ ] Stage 5: cutover and cleanup

## Context
The site is a CRA React app with its content hardcoded: projects live in `website/src/_data/projects.json`, so any content change means a code deploy. The backend is a single Lambda (`backend/lambda/func.py`) doing a non-atomic get+put view counter on `cloudresume-test`. That table is `id`-keyed with 1 item.

Terraform has no remote state, so CI runs `terraform import` before every apply. That breaks as soon as more resources are added.

Goal:
- A new design (from the Dribbble shot; the user will attach a screenshot).
- Vite + React 19 + TS.
- A Cognito-protected admin with CRUD for **all** content (profile/about, projects, experience, resume PDF) stored in DynamoDB/S3, so content changes need no deploys.
- Public pages:
  - Landing (with view count)
  - About
  - Projects (+ detail)
  - Experience
  - Resume (PDF)

The work is executed in stages. Each stage is shippable, and the old site stays live until cutover.

This is the living doc; tick stages off in **Progress** as they ship.

## Decisions (confirmed)
- Auth: Cognito user pool (just the owner), hosted login with PKCE, and an API Gateway JWT authorizer.
- Stack: Vite + React 19 + TypeScript + Tailwind v4 + react-router v7. CI builds the site; no more committed `build/`.
- CMS scope: everything.
- No contact page or form (not in the requested page list). Email and social links go in the footer. The Web3Forms key in `website/.env` goes away. *(Flag if you want it kept.)*

## DynamoDB: single-table design
New table `portfolio`: on-demand billing, `PK`/`SK` strings, no GSIs.

| Entity | PK | SK | Attributes |
|---|---|---|---|
| Profile/About | `SITE` | `PROFILE` | name, tagline, about (markdown), location, email, socials{}, resumeKey |
| Project | `SITE` | `PROJECT#<ulid>` | title, summary, body, stack[], images[], github, liveUrl, order, featured |
| Experience | `SITE` | `EXPERIENCE#<ulid>` | company, role, start, end, bullets[], tech[], order |
| View counter | `COUNTER` | `VIEWS` | views (number) |

- **All content shares `PK=SITE`.** One `Query(PK=SITE)` returns the whole site in a single request, and `begins_with(SK, "PROJECT#")` gives one type. The total is a few KB, far under the 1 MB page limit.
- The counter is kept on its own partition, so per-visit writes don't touch content items.
- Ordering uses an `order` attribute sorted in code, not the SK. Reordering then never rewrites keys.
- The counter is fixed to be atomic: `UpdateItem ADD views :1, ReturnValues=UPDATED_NEW`.

## API
API Gateway HTTP API, backed by one Lambda `portfolio-api` (python3.14, arm64, boto3 only) that dispatches on route key. CORS is restricted to `https://ryanlepham.com`, `https://www.ryanlepham.com` and `http://localhost:5173`.

| Route | Auth | Action |
|---|---|---|
| `GET /content` | public | Query `PK=SITE` → `{profile, projects[], experience[]}` |
| `POST /views` | public | atomic increment, returns count |
| `PUT /items/{type}/{id}` | JWT | validate type ∈ {profile, project, experience}, then put |
| `DELETE /items/{type}/{id}` | JWT | delete |
| `POST /uploads` | JWT | presigned S3 PUT for `media/<uuid>-<name>` (PDF/images only, size-capped) |

Media (resume and project images) goes in the existing site bucket under `media/`, served by the same CloudFront distribution. Keys are unique per upload, so there are no cache invalidations. The frontend sync gets `--exclude "media/*"` so `--delete` never wipes uploads.

## Stages

### Stage 1: Infra foundation (backend only, old site untouched)
- **Remote state.**
  - Bootstrap once via the AWS CLI: a versioned state bucket in `ca-central-1`.
  - Add `backend "s3"` with `use_lockfile = true` in `backend/provider.tf`.
  - Import the existing resources once, locally.
  - **Delete the `terraform import` steps** from `.github/workflows/back-end-cicd.yml`.
- Terraform: `aws_dynamodb_table.portfolio`, the `portfolio-api` Lambda + IAM (least-privilege on the new table), the HTTP API with `/content` + `/views`, and output `api_url`.
- Move the Lambda source to `backend/api/handler.py` + `test_handler.py`, reusing the mock-table pattern from `backend/lambda/test_func.py`.
- CI IAM user `rpham9` already has IAM, Lambda, DynamoDB and S3. Add `apigateway:*` now and `cognito-idp:*` in Stage 2.

### Stage 2: Auth, write API, content seed
- Terraform: Cognito user pool (self sign-up disabled), app client (public, PKCE, callback `/admin` on prod + localhost), hosted UI domain, JWT authorizer, and the `PUT`/`DELETE`/`uploads` routes.
- Create the admin user via the CLI (not in Terraform, to keep the password out of state).
- `backend/scripts/seed.py` (one-off): reads `website/src/_data/projects.json`, uploads `website/public/projectImages/*` to `media/`, and writes the profile (from `App.jsx` personalDetails), projects and resume PDF items. Experience starts empty and is entered via the admin.

### Stage 3: New public site in `frontend/` (built alongside `website/`)
- Scaffold Vite + React 19 + TS + Tailwind v4 + react-router v7.
- **Design** (from the Dribbble shot "UX/UI Designer & Front End Developer"):
  - Near-black background (`#0d0d0d`) with a sparse, slowly drifting starfield of white dots across the whole site.
  - Name inside a thin 2px white outlined box: "I'M RYAN", bold uppercase, wide letter-spacing.
  - Large bold uppercase role headline, e.g. "CLOUD & FULL STACK DEVELOPER", wide tracking (Montserrat/Archivo-style display font).
  - Intro paragraph in light grey (`#9a9a9a`), a lighter-weight sans, generous line height.
  - Social icons as a monochrome grey row (GitHub, LinkedIn, email, resume), white on hover.
  - **Top nav bar:** About · Projects · Experience · Resume, uppercase small caps with wide tracking; active link underlined.
  - **Hero visual (replaces the stippled portrait):** a *vertical wave field* drawn as particles on a `<canvas>` (`frontend/src/components/WaveField.tsx`).
    - Columns of dots sway sideways in two overlapping slow sine waves, calmer at the edges.
    - Soft bands of brightness drift down each strand, and the field fades out at the top and bottom.
    - The live stats (**site views**, **project count**, **technology count**) are overlaid on the waves with a blurred dark backdrop.
    - Respects `prefers-reduced-motion` with a static render.
    - Earlier volume-profile and golden-spiral versions were replaced at the owner's request.
  - Dark only (the design is dark-native), so there's no light mode.
  - Tokens are defined once as Tailwind v4 `@theme` variables.
- Data: fetch `GET /content` once into a context, and `POST /views` on landing. The API URL comes from `VITE_API_URL`.
- Pages:
  - `/`: hero + view count
  - `/about`
  - `/projects`, `/projects/:id`
  - `/experience`: timeline
  - `/resume`: embedded PDF + download
- Reuse ideas only, not code, from `website/src` (the framer-motion page transitions and the typewriter hero are optional).
- Run locally against the real API.

### Stage 4: Admin (`/admin`)
- `oidc-client-ts` for the Cognito PKCE login. Don't hand-roll auth.
- One generic list + form per type (profile form; project/experience tables with create/edit/delete/reorder). Uploads use presigned PUT, and only the resulting key gets stored.
- The admin route is lazy-loaded, so public visitors never download admin code.

### Stage 5: Cutover and cleanup
- `front-end-cicd.yml`: `npm ci && npm run build` in `frontend/`, sync `frontend/dist` with `--exclude "media/*"`, then invalidate. `VITE_API_URL` and the Cognito IDs come from GitHub repo variables.
- Copy the current view count from `cloudresume-test` into `COUNTER/VIEWS` at the moment of cutover (the old site keeps counting until then).
- Delete `website/`, `backend/lambda/`, the old `myfunc` Lambda/role/policy and the `cloudresume-test` table (after confirming the counter is migrated).
- Upgrade the actions in the frontend workflow (`jakejarvis/s3-sync-action@master` → `aws s3 sync` via `aws-actions/configure-aws-credentials`).
- Update `CLAUDE.md` and `docs/rehaul-plan.md`.

## Critical files
- `backend/main.tf`, `backend/provider.tf`, new `backend/api/handler.py`, `backend/scripts/seed.py`
- `.github/workflows/back-end-cicd.yml`, `.github/workflows/front-end-cicd.yml`
- New `frontend/` app; removed `website/`
- Existing CloudFront `E1EV54Z8ZHZQ1K` (403→`/index.html` already handles SPA routes) and the S3 bucket `ryanpham-cloud-resume`: referenced, not recreated.

## Verification
- **Stage 1:**
  - `pytest backend`.
  - `terraform plan` in CI shows no import steps and no destroy of existing resources.
  - `curl -X POST $API/views` increments.
  - `curl $API/content` returns 200.
- **Stage 2:**
  - Write routes return 401 without a token.
  - Log in via the hosted UI and PUT/DELETE an item with the token.
  - After `seed.py`, `GET /content` returns 11 projects and the profile.
- **Stage 3:**
  - `npm run build` + `npm run preview`: every page renders with live data.
  - Check phone width and `prefers-reduced-motion`.
- **Stage 4:**
  - Create, edit and delete a project in `/admin`, and see the change on `/projects` without a deploy.
  - Upload a new resume PDF, and `/resume` serves it.
- **Stage 5:**
  - Push to `main`, then check that www.ryanlepham.com serves the new app, deep links (e.g. `/projects/x`) load, `media/` files survive the deploy, and the view count still increments.
