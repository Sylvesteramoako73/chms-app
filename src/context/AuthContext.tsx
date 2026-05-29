import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';
import { isDemoMode, enterDemo, exitDemo } from '@/demo';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  churchId?: string;
  branchId?: string;
  phone?: string;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (name: string, email: string, password: string, role: UserRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  startDemo: () => void;
  allProfiles: UserProfile[];
  updateUserRole: (userId: string, role: UserRole, branchId?: string) => Promise<{ error: string | null }>;
  updateUserProfile: (userId: string, updates: { name?: string; phone?: string; role?: UserRole; branchId?: string }) => Promise<{ error: string | null }>;
  createUser: (name: string, email: string, password: string, role: UserRole, branchId?: string, phone?: string) => Promise<{ error: string | null }>;
  deleteUser: (userId: string) => Promise<{ error: string | null }>;
  refreshProfiles: () => Promise<void>;
}

export const DEMO_EMAIL = 'demo@faithchurchcare.com';
export const DEMO_PASSWORD = 'DemoChurchCare2024!';

const DEMO_PROFILE: UserProfile = {
  id: 'demo-user-id',
  name: 'Demo Admin',
  email: DEMO_EMAIL,
  role: 'Administrator',
};

const AuthContext = createContext<AuthContextValue | null>(null);

const VALID_ROLES: UserRole[] = ['Administrator', 'Branch Pastor', 'Pastor', 'Department Head', 'Data Entry'];
const isValidRole = (v: unknown): v is UserRole => VALID_ROLES.includes(v as UserRole);

/** Build a UserProfile from a Supabase User object using user_metadata as the source of truth. */
function profileFromUser(user: User): UserProfile {
  const meta = user.user_metadata ?? {};
  const role: UserRole = isValidRole(meta.role) ? meta.role : 'Data Entry';
  const name: string = typeof meta.name === 'string' && meta.name ? meta.name : (user.email?.split('@')[0] ?? 'User');
  const churchId: string | undefined = typeof meta.church_id === 'string' && meta.church_id ? meta.church_id : undefined;
  return { id: user.id, name, email: user.email ?? '', role, churchId };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(() => isDemoMode());
  // Tracks the user ID that is already loaded so SIGNED_IN on tab-focus
  // re-validation (same user) doesn't trigger a redundant profile re-fetch.
  const loadedUserIdRef = useRef<string | null>(null);

  /**
   * Fetch the profile for a user.
   * Primary source: profiles table (admin may have changed the role there).
   * Fallback: user_metadata (always available, set during signup).
   */
  const fetchProfile = useCallback(async (currentUser: User) => {
    // Always build a fallback from user_metadata first
    const metaProfile = profileFromUser(currentUser);

    // churchId resolution priority:
    // 1. profiles.church_id (DB — most authoritative after migration)
    // 2. user_metadata.church_id (JWT — set at signup for all new accounts)
    // 3. currentUser.id (own ID — every user has this, used as last resort)
    const resolveChurchId = (dbChurchId: string | null | undefined): string =>
      dbChurchId ?? currentUser.user_metadata?.church_id ?? currentUser.id;

    try {
      // Try with church_id column (post-migration)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, church_id, branch_id, phone')
        .eq('id', currentUser.id)
        .single();

      if (!error && data && isValidRole(data.role)) {
        const churchId = resolveChurchId(data.church_id);
        setProfile({ id: data.id, name: data.name, email: data.email, role: data.role as UserRole, churchId, branchId: data.branch_id ?? undefined, phone: data.phone ?? undefined });
        // Backfill missing church_id so the next load is instant
        if (!data.church_id) {
          supabase.from('profiles').update({ church_id: churchId }).eq('id', data.id).then(() => {});
        }
        return;
      }

      // Fallback: church_id column may not exist (pre-migration)
      const { data: d2, error: e2 } = await supabase
        .from('profiles')
        .select('id, name, email, role, branch_id, phone')
        .eq('id', currentUser.id)
        .single();

      if (!e2 && d2 && isValidRole(d2.role)) {
        const churchId = resolveChurchId(null);
        setProfile({ id: d2.id, name: d2.name, email: d2.email, role: d2.role as UserRole, churchId, branchId: d2.branch_id ?? undefined, phone: d2.phone ?? undefined });
        return;
      }
    } catch (_) { /* profiles table may not exist yet */ }

    // Final fallback: user_metadata only — always resolves to something
    if (!metaProfile.churchId) metaProfile.churchId = resolveChurchId(null);
    setProfile(metaProfile);
  }, []);

  const fetchAllProfiles = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      if (!currentUserId) return;

      // 1. Try church_id from JWT user_metadata (set for all new accounts)
      let churchId: string | undefined = session?.user?.user_metadata?.church_id;

      // 2. Fall back to profiles table (for accounts created before the JWT fix)
      if (!churchId) {
        const { data: me } = await supabase
          .from('profiles').select('church_id').eq('id', currentUserId).single();
        churchId = me?.church_id ?? undefined;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rows: any[] | null = null;
      const run = async (cols: string) => {
        const q = supabase.from('profiles').select(cols).order('created_at');
        const { data } = await (churchId ? q.eq('church_id', churchId) : q);
        return data;
      };

      rows = await run('id, name, email, role, church_id, branch_id, phone');
      if (!rows) rows = await run('id, name, email, role, branch_id, phone');

      if (rows) setAllProfiles(rows.map(r => ({
        id: r.id, name: r.name, email: r.email,
        role: (isValidRole(r.role) ? r.role : 'Data Entry') as UserRole,
        churchId: r.church_id ?? undefined,
        branchId: r.branch_id ?? undefined,
        phone: r.phone ?? undefined,
      })));
    } catch (_) { /* profiles table may not exist */ }
  }, []);

  // ── Demo mode ─────────────────────────────────────────────────────────────
  const startDemo = () => {
    enterDemo();
    setIsDemo(true);
    setProfile(DEMO_PROFILE);
    setLoading(false);
  };

  useEffect(() => {
    // If demo flag is already set (e.g. page refresh in demo), restore immediately
    if (isDemoMode()) {
      setIsDemo(true);
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadedUserIdRef.current = u.id;
        Promise.all([fetchProfile(u), fetchAllProfiles()]).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        // SIGNED_IN fires on tab focus (Supabase re-validates the session).
        // If it's the same user already loaded, skip the re-fetch to prevent
        // the role from briefly flipping to 'Data Entry' during the round-trip.
        if (event === 'SIGNED_IN' && u.id === loadedUserIdRef.current) return;
        // TOKEN_REFRESHED fires every hour — also skip to avoid same role-flip issue.
        if (event === 'TOKEN_REFRESHED') return;
        loadedUserIdRef.current = u.id;
        fetchProfile(u);
        fetchAllProfiles();
      } else {
        loadedUserIdRef.current = null;
        setProfile(null);
        setAllProfiles([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchAllProfiles]);

  // ── Sign In ───────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: error.message };
    if (data.user) {
      await fetchProfile(data.user);
      await fetchAllProfiles();
    }
    return { error: null };
  };

  // ── Sign Up ───────────────────────────────────────────────────────────────
  const signUp = async (name: string, email: string, password: string, role: UserRole): Promise<{ error: string | null }> => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Determine if this is the very first account (becomes Administrator regardless of chosen role).
    // Try the profiles table first; if it doesn't exist, check the auth admin count via a safe query.
    let isFirstUser = false;
    try {
      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      isFirstUser = count === 0;
    } catch (_) {
      // profiles table doesn't exist — assume first user since we can't check
      isFirstUser = true;
    }
    const assignedRole: UserRole = isFirstUser ? 'Administrator' : role;

    // ① Generate a church_id before signup so it's in the JWT regardless of profiles table
    const newChurchId = crypto.randomUUID();

    // ② Create the Supabase Auth user — role, name, church_id travel with the JWT via user_metadata
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: { name: trimmedName, role: assignedRole, church_id: newChurchId },
      },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Sign up failed — please try again.' };

    // ③ Mirror to profiles table + seed church_settings (best-effort)
    try {
      await supabase.from('profiles').upsert(
        { id: data.user.id, name: trimmedName, email: trimmedEmail, role: assignedRole, church_id: newChurchId },
        { onConflict: 'id' },
      );
      // Create the church's settings row with the default plan
      await supabase
        .from('church_settings')
        .insert({ church_id: newChurchId, plan: 'free' })
        .select();
    } catch (_) { /* tables may not exist yet — church_id is already in user_metadata */ }

    // ④ If Supabase auto-confirmed the session, set profile immediately
    if (data.session) {
      await fetchProfile(data.user);
      await fetchAllProfiles();
    }

    return { error: null };
  };

  // ── Sign Out ──────────────────────────────────────────────────────────────
  const signOut = async () => {
    exitDemo();
    setIsDemo(false);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setAllProfiles([]);
  };

  // ── Update Role ───────────────────────────────────────────────────────────
  const updateUserRole = async (userId: string, role: UserRole, branchId?: string): Promise<{ error: string | null }> => {
    let profilesError: string | null = null;
    try {
      const update: Record<string, unknown> = { role };
      update.branch_id = role === 'Branch Pastor' ? (branchId ?? null) : null;
      const { error } = await supabase.from('profiles').update(update).eq('id', userId);
      if (error) profilesError = error.message;
    } catch (_) {
      profilesError = 'profiles table not found';
    }

    // ② If changing the currently logged-in user's OWN role, also update user_metadata
    //    so it takes effect immediately without re-login.
    if (userId === user?.id) {
      await supabase.auth.updateUser({ data: { role } });
      // Re-fetch the refreshed user object to update local state
      const { data: { user: refreshed } } = await supabase.auth.getUser();
      if (refreshed) await fetchProfile(refreshed);
    }

    await fetchAllProfiles();

    if (profilesError) {
      return { error: `Profiles table error: ${profilesError}. Run supabase-profiles.sql in your Supabase dashboard.` };
    }
    return { error: null };
  };

  // ── Update User Profile (admin) ───────────────────────────────────────────
  const updateUserProfile = async (userId: string, updates: { name?: string; phone?: string; role?: UserRole; branchId?: string }): Promise<{ error: string | null }> => {
    try {
      const patch: Record<string, unknown> = {};
      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.phone !== undefined) patch.phone = updates.phone || null;
      if (updates.role !== undefined) {
        patch.role = updates.role;
        patch.branch_id = updates.role === 'Branch Pastor' ? (updates.branchId ?? null) : null;
      }
      const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
      if (error) return { error: error.message };

      // If editing own profile, sync user_metadata too
      if (userId === user?.id && updates.role) {
        await supabase.auth.updateUser({ data: { role: updates.role, ...(updates.name ? { name: updates.name } : {}) } });
        const { data: { user: refreshed } } = await supabase.auth.getUser();
        if (refreshed) await fetchProfile(refreshed);
      }
    } catch (_) {
      return { error: 'Could not update profile.' };
    }
    await fetchAllProfiles();
    return { error: null };
  };

  // ── Create User (admin) ───────────────────────────────────────────────────
  const createUser = async (name: string, email: string, password: string, role: UserRole, branchId?: string, phone?: string): Promise<{ error: string | null }> => {
    // Capture the admin's current session so we can restore it if Supabase
    // auto-signs-in the new user (happens when email confirmation is disabled).
    const { data: { session: adminSession } } = await supabase.auth.getSession();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name.trim(), role, church_id: profile?.churchId } },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Failed to create user — please try again.' };

    // Mirror to profiles table — inherit the admin's church_id
    try {
      await supabase.from('profiles').upsert(
        { id: data.user.id, name: name.trim(), email: email.trim().toLowerCase(), role, church_id: profile?.churchId ?? null, branch_id: role === 'Branch Pastor' ? (branchId ?? null) : null, phone: phone ?? null },
        { onConflict: 'id' },
      );
    } catch (_) { /* profiles table may not exist */ }

    // Restore admin session if it was displaced by auto-sign-in
    if (adminSession && data.session) {
      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });
    }

    await fetchAllProfiles();
    return { error: null };
  };

  // ── Delete User (admin) ───────────────────────────────────────────────────
  const deleteUser = async (userId: string): Promise<{ error: string | null }> => {
    if (userId === user?.id) return { error: 'You cannot delete your own account.' };

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) return { error: error.message };
    } catch (_) {
      return { error: 'Could not remove user from profiles table.' };
    }

    await fetchAllProfiles();
    return { error: null };
  };

  // ── Refresh ───────────────────────────────────────────────────────────────
  const refreshProfiles = async () => {
    await fetchAllProfiles();
    if (user) {
      const { data: { user: fresh } } = await supabase.auth.getUser();
      if (fresh) await fetchProfile(fresh);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isDemo, signIn, signUp, signOut, startDemo, allProfiles, updateUserRole, updateUserProfile, createUser, deleteUser, refreshProfiles }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
