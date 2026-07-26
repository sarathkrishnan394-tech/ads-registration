/*
 * Supabase client for the registration form.
 *
 * This is a plain static site (no framework, no bundler), so the
 * @supabase/supabase-js package listed in package.json is not resolved
 * from node_modules in the browser -- there is no build step that could
 * bundle it. Instead we load it from Supabase's official ESM CDN build,
 * which is functionally identical to the npm package.
 *
 * The import is deliberately dynamic (inside getSupabaseClient) rather
 * than a top-level `import`, so that if the CDN is briefly unreachable,
 * only the final submission step fails gracefully -- it can't break
 * navigation or validation on the earlier steps of the form.
 *
 * SUPABASE_URL and SUPABASE_ANON_KEY come from window.__ENV__, which is
 * generated at Vercel build time by scripts/build-env.js from the
 * SUPABASE_URL / SUPABASE_ANON_KEY environment variables (see
 * .env.example). The anon key is meant to be public and safe to ship to
 * the browser -- it only works within the permissions granted by your
 * Supabase Row Level Security policies (see DEPLOYMENT-GUIDE.md).
 */

const SUPABASE_JS_CDN_URL = "https://esm.sh/@supabase/supabase-js@2";

let cachedClientPromise = null;

function getEnv() {
  return window.__ENV__ || {};
}

export function isSupabaseConfigured() {
  const env = getEnv();
  return Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
}

export function getSupabaseClient() {
  if (cachedClientPromise) return cachedClientPromise;

  const attempt = (async () => {
    const env = getEnv();
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      throw new Error(
        "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY " +
        "as environment variables and redeploy (see .env.example)."
      );
    }
    const { createClient } = await import(SUPABASE_JS_CDN_URL);
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  })();

  // Only cache a successful client. A transient failure (e.g. the CDN
  // briefly unreachable) should not permanently poison retries for the
  // rest of the page's lifetime.
  attempt.catch(() => {
    cachedClientPromise = null;
  });

  cachedClientPromise = attempt;
  return cachedClientPromise;
}
