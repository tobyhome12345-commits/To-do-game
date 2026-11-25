import { useEffect, useState } from 'react';
import { todayStr } from '../model/dates';

/** Today's local date, refreshed when the day rolls over or the app comes back to the foreground. */
export function useToday(): string {
  const [today, setToday] = useState(todayStr);
  useEffect(() => {
    const check = () => setToday((prev) => {
      const t = todayStr();
      return t === prev ? prev : t;
    });
    const id = setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return today;
}
