/**
 * Announcement context — 05 §1, 09 §18.
 *
 * 09 §18: "When verification finishes, announce the overall result and issue
 * count" but "Do not move focus unexpectedly". Announcements are deliberate and
 * polite; nothing announces on every keystroke or progress tick.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface AnnouncerValue {
  message: string | null;
  announce: (message: string) => void;
}

const AnnouncerContext = createContext<AnnouncerValue>({
  message: null,
  announce: () => undefined,
});

export function AnnouncerProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [message, setMessage] = useState<string | null>(null);

  const announce = useCallback((next: string) => {
    // Clearing first guarantees the live region re-announces an identical
    // message, e.g. two consecutive saves.
    setMessage(null);
    window.setTimeout(() => setMessage(next), 40);
  }, []);

  const value = useMemo(() => ({ message, announce }), [message, announce]);
  return <AnnouncerContext.Provider value={value}>{children}</AnnouncerContext.Provider>;
}

export function useAnnouncer(): AnnouncerValue {
  return useContext(AnnouncerContext);
}
