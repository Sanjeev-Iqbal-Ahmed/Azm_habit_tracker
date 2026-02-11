import { useEffect, useState } from 'react';

import { useTheme } from '@/hooks/use-theme';

/**
 * Web needs to defer to client-side hydration; we still honor the theme provider.
 */
export function useColorScheme() {
  const { colorScheme } = useTheme();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
