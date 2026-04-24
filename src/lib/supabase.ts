import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !key) {
  document.body.innerHTML = `
    <div style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0b1120;color:#fff;padding:2rem;text-align:center">
      <div>
        <h2 style="color:#c9a84c;margin-bottom:1rem">Missing environment variables</h2>
        <p style="color:#aaa;max-width:420px">
          <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> are not set.<br/><br/>
          In Netlify: go to <em>Site settings → Environment variables</em> and add both keys, then trigger a new deploy.
        </p>
      </div>
    </div>`;
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.');
}

export const supabase = createClient(url, key);
