
import { AppLogo } from "@/components/app-logo";
import { Loader2 } from "lucide-react";

export function SplashScreen() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-4">
      <AppLogo />
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
