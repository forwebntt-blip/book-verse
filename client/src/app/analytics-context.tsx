import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { identifyAnalyticsSession, sendAnalyticsEvents } from "../lib/api";
import { useAuth } from "./auth-context";
import { useCart } from "./cart-context";

type AnalyticsContextValue = {
  consentGranted: boolean;
  setConsentGranted: (value: boolean) => void;
  track: (eventName: string, payload?: Record<string, unknown>) => Promise<void>;
};

const STORAGE_KEY = "bookverse.analytics.consent";
const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

function detectDeviceType() {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|iphone|android/.test(ua)) return "mobile";
  if (/ipad|tablet/.test(ua)) return "tablet";
  return "desktop";
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { cart } = useCart();
  const [consentGranted, setConsentGrantedState] = useState(false);
  const identifiedRef = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setConsentGrantedState(stored === "granted");
  }, []);

  useEffect(() => {
    if (!consentGranted || identifiedRef.current) {
      return;
    }

    identifiedRef.current = true;
    void identifyAnalyticsSession({
      consentGranted: true,
      isLoggedIn: isAuthenticated,
      deviceType: detectDeviceType(),
      landingPath: window.location.pathname,
      referrer: document.referrer || undefined,
    }).catch(() => {
      identifiedRef.current = false;
    });
  }, [consentGranted, isAuthenticated]);

  const value = useMemo<AnalyticsContextValue>(
    () => ({
      consentGranted,
      setConsentGranted: (nextValue: boolean) => {
        setConsentGrantedState(nextValue);
        window.localStorage.setItem(STORAGE_KEY, nextValue ? "granted" : "denied");
      },
      track: async (eventName: string, payload?: Record<string, unknown>) => {
        if (!consentGranted) {
          return;
        }

        await sendAnalyticsEvents({
          consentGranted: true,
          cartId: cart?.id,
          pagePath: window.location.pathname + window.location.search,
          deviceType: detectDeviceType(),
          events: [
            {
              eventName,
              occurredAt: new Date().toISOString(),
              payload: payload ?? {},
            },
          ],
        });
      },
    }),
    [cart?.id, consentGranted],
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);

  if (!context) {
    throw new Error("useAnalytics must be used within AnalyticsProvider.");
  }

  return context;
}
