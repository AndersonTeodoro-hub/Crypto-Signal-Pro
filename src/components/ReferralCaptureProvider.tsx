import { useEffect } from 'react';

const REFERRAL_STORAGE_KEY = 'ref_code';
const REFERRAL_EXPIRY_DAYS = 30;

interface StoredReferral {
  code: string;
  expires: number;
}

/**
 * Lightweight component that captures referral codes from URL on app load.
 * Runs globally, does not require auth, does not break routing.
 */
export function ReferralCaptureProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only run once on mount
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode && refCode.length >= 6) {
      // Check if we already have a non-expired referral
      const existingJson = localStorage.getItem(REFERRAL_STORAGE_KEY);
      let shouldStore = true;
      
      if (existingJson) {
        try {
          const existing: StoredReferral = JSON.parse(existingJson);
          // Only overwrite if the existing one is expired
          if (Date.now() <= existing.expires) {
            shouldStore = false;
          }
        } catch {
          // Invalid JSON, proceed to overwrite
        }
      }
      
      if (shouldStore) {
        const stored: StoredReferral = {
          code: refCode.toUpperCase(),
          expires: Date.now() + REFERRAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        };
        localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(stored));
        console.log('Referral code captured:', refCode);
      }

      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  return <>{children}</>;
}