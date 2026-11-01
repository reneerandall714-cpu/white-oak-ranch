import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type StaffAuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  isStaff: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<boolean>;
};

const StaffAuthContext = createContext<StaffAuthContextValue | undefined>(
  undefined
);

async function verifyActiveStaff(session: Session) {
  const { data, error } = await supabase
    .from('ranch_staff')
    .select('active')
    .eq('user_id', session.user.id)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    throw new Error('Staff access could not be verified.');
  }

  return data?.active === true;
}

export function StaffAuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const applySession = async (nextSession: Session | null) => {
      if (!mounted) return;

      setSession(nextSession);
      setError(null);

      if (!nextSession) {
        setIsStaff(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const allowed = await verifyActiveStaff(nextSession);

        if (!mounted) return;

        if (!allowed) {
          setSession(null);
          setIsStaff(false);
          setError('This account is not authorized for active staff access.');
          void supabase.auth.signOut();
          return;
        }

        setIsStaff(true);
      } catch {
        if (!mounted) return;
        setSession(null);
        setIsStaff(false);
        setError('Staff access could not be verified.');
        void supabase.auth.signOut();
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) {
        if (mounted) {
          setError('The sign-in session could not be loaded.');
          setIsLoading(false);
        }
        return;
      }

      void applySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'TOKEN_REFRESHED'
      ) {
        void applySession(nextSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      {
        email: email.trim(),
        password,
      }
    );

    if (signInError || !data.session) {
      setIsLoading(false);
      setIsStaff(false);
      setError('Email or password was not accepted.');
      return false;
    }

    try {
      const allowed = await verifyActiveStaff(data.session);

      if (!allowed) {
        await supabase.auth.signOut();
        setSession(null);
        setIsStaff(false);
        setIsLoading(false);
        setError('This account is not authorized for active staff access.');
        return false;
      }

      setSession(data.session);
      setIsStaff(true);
      setIsLoading(false);
      return true;
    } catch {
      await supabase.auth.signOut();
      setSession(null);
      setIsStaff(false);
      setIsLoading(false);
      setError('Staff access could not be verified.');
      return false;
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setIsLoading(false);
      setError('You could not be signed out. Please try again.');
      return false;
    }

    setSession(null);
    setIsStaff(false);
    setError(null);
    setIsLoading(false);
    return true;
  };

  return (
    <StaffAuthContext.Provider
      value={{ session, isLoading, isStaff, error, signIn, signOut }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext);

  if (!context) {
    throw new Error('useStaffAuth must be used inside StaffAuthProvider.');
  }

  return context;
}
