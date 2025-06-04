
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthState } from './types';
import { send2FACodeToUser, ensureUserProfile } from './authOperations';

export const useAuthState = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    pending2FA: false,
    userEmail: null,
    tempPassword: null,
  });

  const updateAuthState = (updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
  };

  return { authState, updateAuthState };
};

export const useAuthOperations = (authState: AuthState, updateAuthState: (updates: Partial<AuthState>) => void) => {
  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email);
    
    try {
      // First verify password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('Sign in error:', error);
        return { error };
      }

      console.log('Password verified, starting 2FA flow');
      
      // Sign out to prevent session conflicts
      await supabase.auth.signOut();
      
      // Set pending 2FA state after signout is complete
      updateAuthState({
        pending2FA: true,
        userEmail: email,
        tempPassword: password
      });
      
      // Send 2FA code
      const codeResult = await send2FACodeToUser(email);
      if (codeResult.error) {
        // If sending code fails, reset state
        updateAuthState({
          pending2FA: false,
          userEmail: null,
          tempPassword: null
        });
        return codeResult;
      }
      
      console.log('Password verified, 2FA code sent');
      return { error: null };
    } catch (error) {
      console.error('Unexpected error during sign in:', error);
      updateAuthState({
        pending2FA: false,
        userEmail: null,
        tempPassword: null
      });
      return { error: error as Error };
    }
  };

  const verify2FACode = async (email: string, code: string) => {
    try {
      const { error } = await supabase.functions.invoke('verify-2fa-code', {
        body: { email, code }
      });

      if (error) {
        console.error('Error verifying 2FA code:', error);
        return { error };
      }

      // If verification successful, complete the sign-in using stored password
      if (authState.tempPassword) {
        console.log('2FA verified, completing sign-in...');
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: authState.tempPassword,
        });

        if (signInError) {
          console.error('Error completing sign-in after 2FA:', signInError);
          return { error: signInError };
        }

        // Ensure the user profile exists and check if user is admin
        let isAdmin = false;
        if (data?.user?.id) {
          const { profile } = await ensureUserProfile(data.user.id, email);
          isAdmin = profile?.role === 'admin' || false;
          console.log('Profile ensured, isAdmin:', isAdmin);
        }

        console.log('Sign-in completed successfully after 2FA');
        return { error: null, isAdmin };
      }

      return { error: null };
    } catch (error) {
      console.error('Failed to verify 2FA code:', error);
      return { error: error as Error };
    } finally {
      // Always clear 2FA state after verification attempt
      updateAuthState({
        pending2FA: false,
        userEmail: null,
        tempPassword: null
      });
    }
  };

  const resend2FACode = async () => {
    if (!authState.userEmail) {
      return { error: new Error('No email available for resend') };
    }
    return await send2FACodeToUser(authState.userEmail);
  };

  return {
    signIn,
    verify2FACode,
    resend2FACode,
  };
};
