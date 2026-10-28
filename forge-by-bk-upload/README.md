# FORGE BY BK — Intelligent Training

Mobile-first PWA for personalised program design, live workout logging and progressive overload.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · shadcn-style components (Radix) · Zustand + IndexedDB · Supabase (optional sync) · Recharts · Vitest.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine + workout-tracking tests
npm run build && npm start   # production build (service worker only registers in production)
```

Node was installed for this machine at `~/.local/node` — add `export PATH=~/.local/node/bin:$PATH` to your shell profile.

## On-device vs cloud mode

With no env vars the app runs fully on-device: data lives in IndexedDB and everything works offline.

To enable accounts and cross-device sync:

1. Create a Supabase project and run the files in `supabase/migrations/` in order (SQL editor or `supabase db push`).
2. Copy `.env.example` to `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (older projects: `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works).
3. Sign in from **Profile → Account & sync**.

Sync is offline-first: every change is written locally and queued in an outbox; the queue is pushed when online (on start, reconnect, app foreground, 2 s after a change, and every minute), then newer rows are pulled. Conflicts resolve last-write-wins on `updatedAt`. Deletes are soft so they propagate. Row-level security restricts every row to its owner.

## Install on your phone

Deploy (e.g. `vercel deploy`) — PWAs need HTTPS. Open the URL on your phone, then *Share → Add to Home Screen* (iOS) or *Install app* (Android). The rest timer, wake lock and in-progress workout all survive the screen locking or the app being closed.

## Architecture

```
src/lib/engine/        Pure, framework-free domain logic (fully unit-tested)
  exercises.ts         134 exercises: pattern, muscles, equipment, difficulty, fatigue, joint stress, cues
  focus.ts             Day focuses → weighted muscle-group slots; sport tilts; environment kits
  generator.ts         Program generation, exercise selection/scoring, volume balancing, alternatives
  prescription.ts      Sets/reps/RIR/rest by objective × role × experience; periodisation (blocks, deloads, peak)
  progression.ts       e1RM, load-from-1RM, double-progression suggestions, warm-up ramps
  workout.ts           Immutable live-logging operations, summaries/PRs, next-session logic
  metrics.ts           Progress analytics
src/lib/nutrition/     Calorie targets (Mifflin–St Jeor), food database, day totals, pre/post-training guidance
src/lib/store/         Zustand store persisted to IndexedDB, Supabase client, sync engine
src/features/          Feature components (generator day editor, program parts, train logger, library picker, profile sections)
  demo/                Animated exercise demos: 2D rig (FK + IK), movement library, SVG athlete and gym scene
src/app/               Routes: / · /programs · /programs/[id] · /generate · /train · /nutrition · /progress · /library · /profile · /onboarding · /login
supabase/migrations/   Schema + RLS
public/                manifest, service worker, icons
```

The engine has no React or browser dependencies, so it can be reused unchanged in a React Native / Expo app.

### How a program is generated

1. Each day's chosen focuses (any combination — e.g. *Chest + Triceps*, *Lower Body*, *Back + Biceps + Core*) are converted to weights per muscle group; priority muscles from the profile get extra weight.
2. Slots are allocated by diminishing weight until the session's time budget is filled. Each group has ordered slot templates (e.g. chest: horizontal press → incline press → fly).
3. Each slot is filled by scoring eligible exercises. Eligibility filters out exercises needing unavailable equipment, disliked exercises, those too technical for your level, and those that heavily load an injured joint. Scoring weighs pattern fit, favourites, objective (barbell for strength, stable machines/cables for hypertrophy), experience, recovery, joint stress, and variety across the week.
4. Exercises are ordered: explosive work first, then heavy compounds, then isolation, then core and conditioning last. Each gets a role (primary/secondary/accessory) and a prescription for that day's objective.
5. Weekly hard sets per muscle are balanced toward goal/experience/recovery-specific targets, without pushing a session much past its time budget.
6. Weeks are periodised into mesocycles (RIR ramps down, volume ramps up for hypertrophy), with deloads and a peak week for strength/power.

Generation is seeded, so the same inputs give the same program and "regenerate" gives a fresh variation.

### Exercise demos

Every exercise has a looping animated demo (Library detail, the exercise picker and the ⓘ button while training) plus numbered how-to steps. The athlete is an illustrated avatar drawn in SVG; poses are keyframes on a small 2D rig (`src/features/demo/rig.ts`) — torso and free limbs are posed by angle, and hands/feet that hold a bar or touch the floor are placed with two-bone IK so contacts stay fixed while the body moves. `tests/demo.test.ts` checks that every exercise has a demo, no joint passes through the floor, and every IK limb reaches its target. Demos start paused when the device prefers reduced motion.

### Nutrition

`/nutrition` has two tabs. **Food log**: set a daily calorie target (or take the suggestion — Mifflin–St Jeor resting energy × an activity factor from training days, −20% to lose fat, +10% to build muscle; protein 2.0–2.2 g/kg, fat ≥0.8 g/kg, carbs fill the rest), then add food as you go from ~60 common foods, recent foods, or a custom entry. Entries are stored per local day and sync through the `food_logs` table. **Pre & post training**: carb, protein and fluid amounts scaled to body weight and how long until the session, meal ideas you can log in one tap, and tips. It's general guidance, not medical advice.
