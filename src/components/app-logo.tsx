
"use client";

import { Coins, MoonStar } from 'lucide-react'; // Coins for light, MoonStar for dark
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function AppLogo() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // While not mounted, or if theme is not yet resolved, render a generic placeholder.
  // This helps avoid hydration mismatch or flash of incorrect theme.
  if (!mounted) {
    // Render a consistent placeholder to avoid layout shift and flash of unstyled content.
    // Using the light theme icon with a muted color is a safe default.
    return (
      <div className="flex items-center gap-2" aria-hidden="true">
        <Coins className="h-8 w-8 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-muted-foreground font-headline">Ascendia</h1>
      </div>
    );
  }

  const IconToRender = resolvedTheme === 'dark' ? MoonStar : Coins;

  return (
    <div className="flex items-center gap-2">
      <IconToRender className="h-8 w-8 text-primary" /> {/* text-primary will adapt via CSS variables */}
      <h1 className="text-2xl font-bold text-primary font-headline">Ascendia</h1>
    </div>
  );
}
