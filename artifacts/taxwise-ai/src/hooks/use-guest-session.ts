import { useState, useEffect, useCallback } from "react";

const GUEST_KEY = "taxwise_guest_session";
const ONBOARDING_KEY = "taxwise_onboarding_complete";
const TRIAL_DAYS = 14;

interface GuestSession {
  startedAt: number;
  expiresAt: number;
  id: string;
}

interface UseGuestSession {
  isGuest: boolean;
  guestSession: GuestSession | null;
  trialDaysRemaining: number;
  trialExpired: boolean;
  startGuestSession: () => void;
  clearGuestSession: () => void;
  isOnboardingComplete: boolean;
  markOnboardingComplete: () => void;
}

function generateGuestId(): string {
  return "guest_" + Math.random().toString(36).substring(2, 11);
}

export function useGuestSession(): UseGuestSession {
  const [guestSession, setGuestSession] = useState<GuestSession | null>(() => {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      if (!raw) return null;
      const parsed: GuestSession = JSON.parse(raw);
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(GUEST_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [isOnboardingComplete, setIsOnboardingComplete] = useState(() => {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  });

  const trialExpired = guestSession ? Date.now() > guestSession.expiresAt : false;
  const trialDaysRemaining = guestSession
    ? Math.max(0, Math.ceil((guestSession.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const startGuestSession = useCallback(() => {
    const now = Date.now();
    const session: GuestSession = {
      id: generateGuestId(),
      startedAt: now,
      expiresAt: now + TRIAL_DAYS * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(GUEST_KEY, JSON.stringify(session));
    setGuestSession(session);
  }, []);

  const clearGuestSession = useCallback(() => {
    localStorage.removeItem(GUEST_KEY);
    localStorage.removeItem(ONBOARDING_KEY);
    setGuestSession(null);
    setIsOnboardingComplete(false);
  }, []);

  const markOnboardingComplete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsOnboardingComplete(true);
  }, []);

  return {
    isGuest: !!guestSession && !trialExpired,
    guestSession,
    trialDaysRemaining,
    trialExpired,
    startGuestSession,
    clearGuestSession,
    isOnboardingComplete,
    markOnboardingComplete,
  };
}
