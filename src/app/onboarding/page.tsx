
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { SplashScreen } from "@/components/splash-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLogo } from "@/components/app-logo";
import { Check, Landmark, WalletCards, Target, UsersRound } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const features = [
    { icon: Landmark, title: "Debt Management", description: "Track and manage your loans in one place." },
    { icon: WalletCards, title: "Expense Tracking", description: "Monitor your spending habits." },
    { icon: Target, title: "Financial Goals", description: "Set and work towards your savings goals." },
    { icon: UsersRound, title: "Community Forum", description: "Connect and share with others." },
];

export default function OnboardingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (loading) {
        return <SplashScreen />;
    }

    if (!user) {
        router.push('/login');
        return <SplashScreen />;
    }

    const handleCompleteOnboarding = async () => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                hasCompletedOnboarding: true,
            });
            toast({
                title: "Setup Complete!",
                description: "You're all set to explore Ascendia.",
            });
            router.push('/dashboard');
        } catch (error) {
            console.error("Failed to complete onboarding:", error);
            toast({
                variant: "destructive",
                title: "Onboarding Error",
                description: "Could not complete your setup. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <main className="min-h-screen flex items-center justify-center p-4 bg-background animate-fade-in">
            <Card className="w-full max-w-2xl shadow-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4">
                        <AppLogo />
                    </div>
                    <CardTitle className="text-3xl font-headline">Welcome to Ascendia, {user.displayName}!</CardTitle>
                    <CardDescription className="text-lg">Your journey to financial clarity starts now.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center p-4 border bg-muted/50 rounded-lg">
                        <p className="text-lg italic text-muted-foreground">"Budgeting is telling your money where to go instead of wondering where it went."</p>
                        <p className="text-sm">- Dave Ramsey</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {features.map((feature) => (
                            <div key={feature.title} className="flex items-start gap-3">
                                <div className="p-1.5 bg-primary/20 text-primary rounded-full mt-1">
                                    <feature.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">{feature.title}</h3>
                                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleCompleteOnboarding} className="w-full" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : "Let's Get Started!"}
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
}
