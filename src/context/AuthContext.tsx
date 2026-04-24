import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (name: string, email: string, password: string, role: UserRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  allProfiles: UserProfile[];
  updateUserRole: (userId: string, role: UserRole) => Promise<{ error: string | null }>;
  createUser: (name: string, email: string, password: string, role: UserRole) => Promise<{ error: string | null }>;
  deleteUser: (userId: string) => Promise<{ error: string | null }>;
  refreshProfiles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const VALID_ROLES: UserRole[] = ['Administrator', 'Pastor', 'Department Head', 'Data Entry'];
const isValidRole = (v: unknown): v is UserRole => VALID_ROLES.includes(v as UserRole);

/** Build a UserProfile from a Supabase User object using user_metadata as the source of truth. */
function profileFromUser(user: User): UserProfile {
  const meta = user.user_metadata ?? {};
  const role: UserRole = isValidRole(meta.role) ? meta.role : 'Data Entry';
  const name: string = typeof meta.name === 'string' && meta.name ? meta.name : (user.email?.split('@')[0] ?? 'User');
  return { id: user.id, name, email: user.email ?? '', role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch the profile for a user.
   * Primary source: profiles table (admin may have changed the role there).
   * Fallback: user_metadata (always available, set during signup).
   */
  const fetchProfile = useCallback(async (currentUser: User) => {
    // Always build a fallback from user_metadata first
    const metaProfile = profileFromUser(currentUser);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('id', currentUser.id)
        .single();

      if (!error && data && isValidRole(data.role)) {
        // Profiles table exists and has a row — use it (admin may have updated the role here)
        setProfile({ id: data.id, name: data.name, email: data.email, role: data.role as UserRole });
        return;
      }
    } catch (_) { /* profiles table may not exist yet */ }

    // Fallback: user_metadata embedded in the JWT
    setProfile(metaProfile);
  }, []);

  const fetchAllProfiles = useCallback(async () => {
    try {
      const { data } = await supabase.from('profiles').select('id, name, email, role').order('created_at');
      if (data) setAllProfiles(data.map(r => ({ id: r.id, name: r.name, email: r.email, role: (isValidRole(r.role) ? r.role : 'Data Entry') as UserRole })));
    } catch (_) { /* profiles table may not exist */ }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        Promise.all([fetchProfile(u), fetchAllProfiles()]).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u);
        fetchAllProfiles();
      } else {
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

    // ① Create the Supabase Auth user — role & name travel with the JWT via user_metadata
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: { name: trimmedName, role: assignedRole },   // ← stored in user_metadata
      },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Sign up failed — please try again.' };

    // ② Mirror to profiles table (best-effort — doesn't block login if table is missing)
    try {
      await supabase.from('profiles').upsert(
        { id: data.user.id, name: trimmedName, email: trimmedEmail, role: assignedRole },
        { onConflict: 'id' },
      );
    } catch (_) { /* profiles table may not exist — role is already safe in user_metadata */ }

    // ③ If Supabase auto-confirmed the session, set profile immediately
    if (data.session) {
      await fetchProfile(data.user);
      await fetchAllProfiles();
    }

    return { error: null };
  };

  // ── Sign Out ──────────────────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setAllProfiles([]);
  };

  // ── Update Role ───────────────────────────────────────────────────────────
  const updateUserRole = async (userId: string, role: UserRole): Promise<{ error: string | null }> => {
    // ① Update the profiles table (the app reads from here preferentially)
    let profilesError: string | null = null;
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
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

  // ── Create User (admin) ───────────────────────────────────────────────────
  const createUser = async (name: string, email: string, password: string, role: UserRole): Promise<{ error: string | null }> => {
    // Capture the admin's current session so we can restore it if Supabase
    // auto-signs-in the new user (happens when email confirmation is disabled).
    const { data: { session: adminSession } } = await supabase.auth.getSession();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name.trim(), role } },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Failed to create user — please try again.' };

    // Mirror to profiles table
    try {
      await supabase.from('profiles').upsert(
        { id: data.user.id, name: name.trim(), email: email.trim().toLowerCase(), role },
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
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, allProfiles, updateUserRole, createUser, deleteUser, refreshProfiles }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
