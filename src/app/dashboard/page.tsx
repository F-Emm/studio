
"use client"
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SplashScreen } from "@/components/splash-screen";

export default function DashboardPage() {
    const { user, firestoreUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        if (user && firestoreUser && !firestoreUser.hasCompletedOnboarding) {
            router.push('/onboarding');
            return;
        }

    }, [user, firestoreUser, loading, router]);

    // Show splash screen while loading or if user data is not yet available for the onboarding check
    if (loading || !user || !firestoreUser) {
        return <SplashScreen />;
    }

    // Only render AppShell if user is logged in and has completed onboarding
    if (firestoreUser.hasCompletedOnboarding) {
        return <AppShell />;
    }

    // This return is a fallback, useEffect should handle the redirect.
    return <SplashScreen />;
}
