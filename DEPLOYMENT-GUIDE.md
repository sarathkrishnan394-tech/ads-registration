# Deployment Guide
## UAE E-Invoicing Awareness Session — Registration Website
### ADS International Auditors LLC

This folder contains a static website with one small Node build step used only
to inject Supabase credentials from environment variables at deploy time:

```
ADS-EInvoicing-Registration/
├── index.html
├── styles.css
├── script.js               (ES module — imports supabaseClient.js)
├── supabaseClient.js        (loads @supabase/supabase-js from CDN, reads window.__ENV__)
├── env-config.js            (committed placeholder; regenerated at build time)
├── scripts/build-env.js     (build script: env vars -> env-config.js)
├── package.json             ("build" script + @supabase/supabase-js dependency)
├── vercel.json               (tells Vercel to run `npm run build`, serve repo root)
├── .env.example              (env var names to set in Vercel)
├── .gitignore
├── serve.ps1                 (optional — local preview helper, Windows only)
└── DEPLOYMENT-GUIDE.md        (this file)
```

There's still no framework and no bundler for the actual page — `index.html`,
`styles.css`, and `script.js` are plain, hand-written files. The only build
step is `scripts/build-env.js`, which runs on Vercel and writes your Supabase
URL/key (from environment variables) into `env-config.js` so the browser can
read them. This is necessary because a plain static site has no other way to
receive Vercel environment variables client-side — see section 3.

---

## 1. Where to place the ADS logo

The logo appears twice in `index.html`, both currently pointing to the literal
placeholder text `ADS_LOGO_PLACEHOLDER`:

- Introduction screen (large logo): `<img class="ads-logo" src="ADS_LOGO_PLACEHOLDER" ...>`
- Registration screen (compact header logo): `<img class="ads-logo-small" src="ADS_LOGO_PLACEHOLDER" ...>`

**Steps:**

1. Add your logo file to the project folder — e.g. `assets/ads-logo.png` (transparent PNG or SVG recommended).
2. In `index.html`, replace **both** occurrences of `ADS_LOGO_PLACEHOLDER` with the path, e.g. `assets/ads-logo.png`.
3. The logo keeps its natural aspect ratio automatically (`object-fit: contain` is not stretched); it is capped at a fixed height (52px on the intro screen, 30px in the compact header) so it never overwhelms the layout on any device.

Until you do this, the site gracefully hides the broken-image icon and the layout still looks clean (see `script.js`, the "Placeholder-image fallback" section).

---

## 2. Where to place the event banner

The banner image is referenced as `EVENT_BANNER_IMAGE_PLACEHOLDER` in two places in `index.html`:

- The visual banner behind the hero heading: `<img class="event-banner-img" src="EVENT_BANNER_IMAGE_PLACEHOLDER" ...>`
- The Open Graph / Twitter social-sharing image meta tags (`<meta property="og:image" ...>`, `<meta name="twitter:image" ...>`)

**Steps:**

1. Add a landscape banner image (recommended 1200×630px for best social-preview cropping) to the project, e.g. `assets/event-banner.jpg`.
2. Replace all occurrences of `EVENT_BANNER_IMAGE_PLACEHOLDER` in `index.html` with the path or, for social sharing, the **full public URL** once deployed (e.g. `https://your-domain.com/assets/event-banner.jpg`) — social platforms like WhatsApp and LinkedIn require an absolute URL, not a relative path, to render link previews correctly.
3. The banner already has a dark gradient overlay so heading text stays readable over any image.

---

## 3. Supabase setup (database + credentials)

Submissions are inserted directly from the browser into a Supabase table
called `responses`, using the public **anon** key. This is the standard,
supported way to use Supabase from a static site — safety comes from Row
Level Security (RLS) policies on the table, not from hiding the key (the
anon key is designed to be public).

### 3.1 Create the table

In your Supabase project, open the SQL Editor and run:

```sql
create table responses (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  mobile text not null,
  email text not null,
  company_name text not null,
  designation text not null,
  turnover text not null,
  erp text not null,
  erp_other_specify text,
  attendees int2 not null,
  hear_about text not null,
  hear_about_other_specify text,
  question text,
  created_at timestamptz not null default now()
);

alter table responses enable row level security;

create policy "Allow public inserts"
on responses
for insert
to anon
with check (true);
```

That last policy is important: it allows anonymous visitors to **insert**
rows (submit the form) but grants no `select`/`update`/`delete` permission,
so nobody can read or tamper with other people's registrations using the
public key. View submissions yourself via the Supabase Table Editor (logged
in as the project owner), or the SQL Editor.

| Form field (label) | Column | Type | Notes |
|---|---|---|---|
| Full Name | `full_name` | `text` | required |
| Mobile / WhatsApp Number | `mobile` | `text` | required |
| Email ID | `email` | `text` | required |
| Company Name | `company_name` | `text` | required |
| Designation | `designation` | `text` | required |
| Approximate Annual Turnover | `turnover` | `text` | required |
| Current Accounting / ERP Software Used | `erp` | `text` | required |
| — "Other" specify (conditional) | `erp_other_specify` | `text` | nullable |
| Number of Attendees | `attendees` | `int2` | required |
| How Did You Hear About This Event? | `hear_about` | `text` | required |
| — "Other" specify (conditional) | `hear_about_other_specify` | `text` | nullable |
| Specific Question | `question` | `text` | nullable |
| *(automatic)* | `created_at` | `timestamptz` | defaults to `now()`, not sent by the client |
| *(automatic)* | `id` | `uuid` | primary key, auto-generated |

If you'd rather create the table by hand in the Table Editor UI instead of
SQL, use this same column list and types.

### 3.2 Get your API credentials

In the Supabase dashboard: **Project Settings → API**.

- **Project URL** → this is `SUPABASE_URL`
- **Project API keys → `anon` `public`** → this is `SUPABASE_ANON_KEY`

Do **not** use the `service_role` key anywhere in this project — that key
bypasses RLS entirely and must never be shipped to a browser.

### 3.3 Set the environment variables in Vercel

In your Vercel project: **Settings → Environment Variables**, add:

```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
```

(`.env.example` in this folder lists the exact names to use — copy them, not
the `NEXT_PUBLIC_...` versions, since this is a plain static site, not
Next.js.) Add both to all three environments (Production, Preview,
Development) if you plan to use Preview deployments too.

### How the pieces connect (for reference, no action needed)

1. Vercel runs `npm run build`, which runs `scripts/build-env.js`.
2. That script reads `SUPABASE_URL` / `SUPABASE_ANON_KEY` from the Vercel
   environment and writes them into `env-config.js` as `window.__ENV__`.
3. `index.html` loads `env-config.js` first, then `script.js` as a module.
4. `script.js` imports `supabaseClient.js`, which reads `window.__ENV__` and
   lazily loads `@supabase/supabase-js` from Supabase's CDN only when the
   user actually submits the form.
5. On submit, the form calls `supabase.from("responses").insert([...])`. On
   success it shows the success screen; on failure it shows the inline error
   message "We could not submit your registration..." without losing any of
   the user's entered data.

If you ever need to test locally without running the Vercel build, open
`env-config.js` and temporarily fill in real values by hand (don't commit
them) — see section 4.

---

## 4. How to test the registration form

### Testing the UI/UX without a real submission
Double-click `index.html`, or run the included Windows helper:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

then open `http://localhost:8532`. Without real Supabase values in
`env-config.js`, every step and validation rule works normally; only the
final submit will show the inline error message (since Supabase isn't
configured), which is expected.

### Testing a real Supabase submission locally
1. Complete section 3 (create the table, get your API credentials).
2. Open `env-config.js` and temporarily replace the empty strings with your
   real `SUPABASE_URL` and `SUPABASE_ANON_KEY` values.
3. Reload the page and submit the form.
4. Check the Supabase Table Editor — a new row should appear in `responses`.
5. **Revert `env-config.js` back to empty strings before committing to git**
   (or just don't commit that change) — real values belong in Vercel's
   environment variables, not in the repo.

### What to test end-to-end
- Complete each of the 4 steps with valid data and confirm the Continue button only enables once all required fields in that step are valid.
- Leave a required field empty and confirm a clear inline error message appears.
- Select "Other" under ERP software and under "How did you hear about this event" and confirm the conditional text field appears and is required.
- Go back a step and confirm previously entered data is still there.
- Reach the final review screen and confirm the summary reflects everything you entered.
- Submit and confirm the button shows "Submitting Your Registration…" briefly, then the success screen appears, and a row lands in Supabase.
- Disconnect from the internet and submit, to confirm the error message appears and your entered data is preserved (nothing is cleared).
- Resize the browser (or use dev tools device toolbar) at 360px, 390px, 430px, 768px, 1024px, 1366px, and 1440px widths to confirm no overlapping text, no horizontal scrolling, and the progress indicator stays visible.

---

## 5. How to deploy the website (Vercel)

1. Push this folder to a GitHub (or GitLab/Bitbucket) repository. From inside
   the folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. In the [Vercel dashboard](https://vercel.com/new), import that repository.
3. Vercel will detect `package.json`. Framework preset can be left as
   "Other" — `vercel.json` already tells it to run `npm run build` and serve
   the repository root as the output directory, so no manual build
   configuration is needed.
4. Before the first deploy (or right after, then redeploy), add the two
   environment variables from section 3.3 (`SUPABASE_URL`,
   `SUPABASE_ANON_KEY`) under **Settings → Environment Variables**.
5. Deploy. Vercel gives you a live `https://your-project.vercel.app` URL
   (and you can attach a custom domain under Settings → Domains).

Other static hosts (Netlify, GitHub Pages, Cloudflare Pages) can also run
`npm run build` and serve the root as a static site, but Vercel is the one
this project's `vercel.json` is written for.

Before going live, double-check you have:
- [ ] Replaced both logo placeholders
- [ ] Replaced both banner placeholders (including the absolute URL for social meta tags)
- [ ] Created the `responses` table and RLS insert policy in Supabase (section 3.1)
- [ ] Added `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel's Environment Variables (section 3.3)
- [ ] Triggered a redeploy after adding/changing environment variables (Vercel does not retroactively apply them to an already-built deployment)
- [ ] Tested a full submission end-to-end on the live URL and confirmed a row appears in Supabase

---

## 6. How to generate a QR code for the published link

Once deployed, you'll have a final URL (e.g. `https://ads-einvoicing.netlify.app`).

1. Use any reliable QR generator — for example [qrcode-monkey.com](https://www.qrcode-monkey.com) or Google's built-in QR tool in Chrome (right-click the address bar → "Create QR Code for this page").
2. Paste the exact live registration URL (not a shortened link that expires, and not `localhost`).
3. Generate a high-resolution PNG/SVG QR code suitable for print (business cards, event banners, invitations).
4. Test the QR code yourself with a phone camera before distributing it, to confirm it opens the correct live page.
5. The same URL can be shared directly via WhatsApp, email, and LinkedIn — the Open Graph tags in `index.html` (once the banner placeholder is replaced with an absolute URL) will automatically generate a rich preview card with the event name, description, and banner image on those platforms.

---

## Notes on what was intentionally left out

Per the project requirements, this site does not include: an Emirate field, a countdown timer, speaker/agenda sections, testimonials, payment fields, newsletter/marketing consent, a chatbot, or any field beyond the ten specified. If any of these are needed later, they should be added as a deliberate scope change rather than folded in silently.
