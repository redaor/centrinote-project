import React, { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { supabase } from '../../lib/supabase';

interface EmailVerificationGuardProps {
  children: ReactNode;
}

/**
 * Guard component that checks if user's email is verified
 * Redirects to /welcome if email is not confirmed
 */
export function EmailVerificationGuard({ children }: EmailVerificationGuardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkEmailVerification();
  }, [user]);

  const checkEmailVerification = async () => {
    if (!user) {
      setChecking(false);
      return;
    }

    try {
      // Get fresh user metadata from Supabase
      const { data: { user: freshUser }, error } = await supabase.auth.getUser();

      if (error || !freshUser) {
        console.warn('Could not fetch user metadata:', error);
        setIsVerified(true); // Default to true to avoid blocking on error
        setChecking(false);
        return;
      }

      // Check if email is verified (native Supabase field only)
      const emailVerified = freshUser.email_confirmed_at !== null;

      setIsVerified(emailVerified);

      // Redirect to welcome page if not verified
      if (!emailVerified) {
        console.log('📧 Email not verified, redirecting to /welcome');
        navigate('/welcome?email=' + encodeURIComponent(user.email), { replace: true });
      }
    } catch (err) {
      console.error('Error checking email verification:', err);
      setIsVerified(true); // Default to true to avoid blocking
    } finally {
      setChecking(false);
    }
  };

  // Show loading state while checking
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Vérification de votre compte...</p>
        </div>
      </div>
    );
  }

  // Only render children if email is verified
  return isVerified ? <>{children}</> : null;
}
