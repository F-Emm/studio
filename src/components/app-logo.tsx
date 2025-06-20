import { Coins } from 'lucide-react';

export function AppLogo() {
  return (
    <div className="flex items-center gap-2">
      <Coins className="h-8 w-8 text-primary" />
      <h1 className="text-2xl font-bold text-primary font-headline">Ascendia</h1>
    </div>
  );
}
