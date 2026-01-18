import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const REFERRAL_STORAGE_KEY = 'ref_code';
const REFERRAL_EXPIRY_DAYS = 30;

interface StoredReferral {
  code: string;
  expires: number;
}

export function useReferralCapture() {
  const { user } = useAuth();

  // Capture referral code from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode && refCode.length >= 6) {
      const stored: StoredReferral = {
        code: refCode.toUpperCase(),
        expires: Date.now() + REFERRAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      };
      localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(stored));
      console.log('Referral code captured:', refCode);

      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Process referral after registration
  const processReferral = useCallback(async () => {
    if (!user) return { success: false, error: 'No user' };

    const storedJson = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!storedJson) return { success: false, error: 'No referral code' };

    try {
      const stored: StoredReferral = JSON.parse(storedJson);

      // Check if expired
      if (Date.now() > stored.expires) {
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
        return { success: false, error: 'Referral code expired' };
      }

      console.log('Processing referral code:', stored.code);

      // Call edge function to create referral
      const { data, error } = await supabase.functions.invoke('create-referral', {
        body: { refCode: stored.code }
      });

      if (error) {
        console.error('Error processing referral:', error);
        return { success: false, error: error.message };
      }

      if (data?.success) {
        // Clear stored referral code on success
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
        console.log('Referral processed successfully');
        return { success: true };
      }

      return { success: false, error: data?.error || 'Unknown error' };
    } catch (err) {
      console.error('Error parsing referral:', err);
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      return { success: false, error: 'Invalid referral data' };
    }
  }, [user]);

  // Check if there's a pending referral
  const hasPendingReferral = useCallback(() => {
    const storedJson = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!storedJson) return false;

    try {
      const stored: StoredReferral = JSON.parse(storedJson);
      return Date.now() <= stored.expires;
    } catch {
      return false;
    }
  }, []);

  return {
    processReferral,
    hasPendingReferral
  };
}
