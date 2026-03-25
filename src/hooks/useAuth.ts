import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { apiFetch } from '../utils/api';
import { getToken, setToken, setUser as storeUser, clearAuth } from '../utils/storage';

interface AddonAuthState {
  status: 'loading' | 'not_linked' | 'linked';
  user: User | null;
  credits: number;
  error: string;
}

const ADOBE_ID_KEY = 'soundsnap_adobe_id';

export function useAddonAuth(addOnUISdk: any) {
  const [state, setState] = useState<AddonAuthState>({
    status: 'loading',
    user: null,
    credits: 0,
    error: '',
  });

  useEffect(() => { init(); }, []);

  const getAdobeId = async (): Promise<string> => {
    try {
      const id = await addOnUISdk.app.currentUser.userId();
      if (id) { localStorage.setItem(ADOBE_ID_KEY, id); return id; }
    } catch {}
    return localStorage.getItem(ADOBE_ID_KEY) || 'dev_' + Math.random().toString(36).substring(7);
  };

  const init = async () => {
    console.log('[Auth] Initializing...');
    try {
      const adobeId = await getAdobeId();
      console.log('[Auth] Adobe userId:', adobeId.substring(0, 12) + '...');

      // Check cached token
      const cachedToken = getToken();
      if (cachedToken) {
        console.log('[Auth] Found cached token, verifying...');
        try {
          const res = await apiFetch('/api/auth/me');
          if (res.ok) {
            const data = await res.json();
            console.log('[Auth] Linked! User:', data.user.email, 'credits:', data.user.credits);
            storeUser(data.user);
            setState({ status: 'linked', user: data.user, credits: data.user.credits, error: '' });
            return;
          }
        } catch {}
        clearAuth();
      }

      // Check if Adobe ID is already linked
      try {
        const res = await apiFetch(`/api/addon/check?adobeId=${encodeURIComponent(adobeId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.linked) {
            console.log('[Auth] Adobe ID linked! User:', data.user.email);
            setToken(data.token);
            storeUser(data.user);
            setState({ status: 'linked', user: data.user, credits: data.user.credits, error: '' });
            return;
          }
        }
      } catch {}

      console.log('[Auth] Status: not_linked');
      setState(s => ({ ...s, status: 'not_linked' }));
    } catch (err) {
      console.error('[Auth] Init error:', err);
      setState(s => ({ ...s, status: 'not_linked' }));
    }
  };

  // Activate with key
  const activate = useCallback(async (key: string) => {
    console.log('[Auth] Activating with key...');
    setState(s => ({ ...s, error: '' }));
    try {
      const adobeId = await getAdobeId();
      const res = await apiFetch('/api/addon/activate', {
        method: 'POST',
        body: JSON.stringify({ key: key.trim(), adobeId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setState(s => ({ ...s, error: data.error || 'Invalid key' }));
        return { success: false, error: data.error };
      }

      console.log('[Auth] Activated! User:', data.user.email, 'credits:', data.user.credits);
      setToken(data.token);
      storeUser(data.user);
      setState({ status: 'linked', user: data.user, credits: data.user.credits, error: '' });
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Activation failed';
      console.error('[Auth] Activation error:', msg);
      setState(s => ({ ...s, error: msg }));
      return { success: false, error: msg };
    }
  }, []);

  const refreshCredits = useCallback(async () => {
    try {
      const res = await apiFetch('/api/credits');
      if (!res.ok) return;
      const data = await res.json();
      setState(s => ({ ...s, credits: data.credits }));
      return data.credits;
    } catch {}
  }, []);

  const disconnect = useCallback(() => {
    clearAuth();
    setState({ status: 'not_linked', user: null, credits: 0, error: '' });
  }, []);

  return { ...state, activate, refreshCredits, disconnect };
}
