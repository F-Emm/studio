
"use client";

import Image from 'next/image';
import { useEffect, useState } from 'react';

export function AppLogo() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a consistent placeholder to avoid layout shift and flash of unstyled content.
    // This could be a simplified version or a skeleton.
    return (
      <div className="flex items-center gap-2" aria-hidden="true">
        <div className="h-8 w-8 bg-muted rounded-full"></div>
        <div className="h-6 w-28 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Image
        src="/logo.png" // Assumes logo.png is in the public folder
        alt="Ascendia Logo"
        width={40} // Adjust width as needed
        height={40} // Adjust height as needed
        className="h-10 w-auto" // Control size with Tailwind if preferred, matching aspect ratio
        priority // Preload logo if it's LCP
      />
      {/* The text "Ascendia" is part of your logo image, so we might not need the h1 here
          If the image is just the graphic, you'd keep the h1.
          Assuming the image contains "ASCENDIA BY LOVETTE", we can remove the h1.
          If you want the text styled by theme, you might need a version of the logo without text,
          or use an SVG that can have its text color changed.
          For now, removing the h1 as the logo image includes text.
      */}
      {/* <h1 className="text-2xl font-bold text-primary font-headline">Ascendia</h1> */}
    </div>
  );
}
