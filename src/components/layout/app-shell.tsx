
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, WalletCards, Newspaper, UsersRound, Settings2, ShieldAlert, Target, Banknote, PawPrint, LogOut } from 'lucide-react';
import { DebtOverview, type Debt } from '@/components/debt-overview';
import { ExpenseTracking } from '@/components/expense-tracking';
import { ArticleSummarization } from '@/components/article-summarization';
import { CommunityForum } from '@/components/community-forum';
import { PreferencesSetup } from '@/components/preferences-setup';
import { GoalSetting } from '@/components/goal-setting';
import { BankingIntegration } from '@/components/banking-integration';
import { PetDashboard } from '@/components/pet-dashboard';
import { PetProvider } from '@/contexts/pet-context';
import { AppLogo } from '@/components/app-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { addDays, format, isWithinInterval, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const features = [
  { id: "debt", label: "Debt Overview", icon: Landmark, component: <DebtOverview /> },
  { id: "expenses", label: "Expense Tracking", icon: WalletCards, component: <ExpenseTracking /> },
  { id: "articles", label: "Article Summaries", icon: Newspaper, component: <ArticleSummarization /> },
  { id: "community", label: "Community Forum", icon: UsersRound, component: <CommunityForum /> },
  { id: "banking", label: "Banking", icon: Banknote, component: <BankingIntegration /> },
  { id: "goals", label: "Goals", icon: Target, component: <GoalSetting /> },
  { id: "pet", label: "Pet", icon: PawPrint, component: <PetDashboard /> },
  { id: "preferences", label: "Preferences", icon: Settings2, component: <PreferencesSetup /> },
];

const WELCOME_STORAGE_KEY = 'ascendiaWelcomeShown_v2';

export function AppShell() {
  const [activeTab, setActiveTab] = useState(features[0].id);
  const [isMounted, setIsMounted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.push('/login');
    } catch (error) {
      toast({ variant: 'destructive', title: "Sign Out Failed", description: "Could not sign out. Please try again." });
    }
  };


  useEffect(() => {
    setIsMounted(true);
    const welcomeShown = localStorage.getItem(WELCOME_STORAGE_KEY);
    if (!welcomeShown) {
      setShowWelcome(true);
    }
    
    const lastTab = localStorage.getItem('ascendiaActiveTab_v2');
    if (lastTab && features.some(f => f.id === lastTab)) {
      setActiveTab(lastTab);
    }

  }, []);
  
  // Notification Handler
  useEffect(() => {
    if (!isMounted) return;

    const handleNotifications = async () => {
      // 1. Check preferences
      const prefsString = localStorage.getItem("userPreferences");
      if (!prefsString) return;
      const preferences = JSON.parse(prefsString);
      if (!preferences.enableNotifications) return;

      // 2. Check permission
      if (!("Notification" in window)) {
        console.error("This browser does not support desktop notification");
        return;
      }
      if (Notification.permission === 'denied') return;
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
      }
      
      // 3. Get last notification state
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const lastNotifsString = localStorage.getItem('ascendiaLastNotifications');
      const lastNotifications = lastNotifsString ? JSON.parse(lastNotifsString) : { dailyNudge: null, debtReminders: {} };

      // 4. Daily Nudge
      if (lastNotifications.dailyNudge !== todayStr) {
        new Notification('Ascendia Daily Check-in', {
          body: 'Time to update your budget and check on your financial pet!',
          icon: '/logo.png'
        });
        lastNotifications.dailyNudge = todayStr;
      }

      // 5. Debt Reminders
      const debtsString = localStorage.getItem("userDebts");
      if (!debtsString) return;
      const debts: Debt[] = JSON.parse(debtsString);
      const now = new Date();
      const reminderThreshold = addDays(now, 7);

      debts.forEach(debt => {
        if (debt.dueDate) {
          const dueDate = parseISO(debt.dueDate);
          if (isWithinInterval(dueDate, { start: now, end: reminderThreshold })) {
            if (lastNotifications.debtReminders[debt.id] !== todayStr) {
              new Notification('Loan Payment Reminder', {
                body: `Your payment for "${debt.name}" is due on ${format(dueDate, 'PPP')}.`,
                icon: '/logo.png'
              });
              lastNotifications.debtReminders[debt.id] = todayStr;
            }
          }
        }
      });

      // 6. Save updated notification state
      localStorage.setItem('ascendiaLastNotifications', JSON.stringify(lastNotifications));
    };

    const timer = setTimeout(handleNotifications, 5000); // Delay to not be intrusive on load
    return () => clearTimeout(timer);

  }, [isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('ascendiaActiveTab_v2', activeTab);
    }
  }, [activeTab, isMounted]);

  const handleWelcomeDismiss = useCallback(() => {
    setShowWelcome(false);
    localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
  }, []);

  const handleWelcomeOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setShowWelcome(false);
      localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    }
  }, []);


  if (!isMounted) {
    return (
      <div className="flex flex-col min-h-screen animate-pulse">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <div className="h-8 w-36 bg-muted rounded"></div>
            <div className="h-10 w-10 bg-muted rounded-full"></div>
          </div>
        </header>
        <div className="container mx-auto py-4">
          <div className="flex space-x-1 border-b overflow-x-auto no-scrollbar">
            {[...Array(features.length)].map((_,i) => <div key={i} className="h-10 w-24 bg-muted rounded-t-md shrink-0"></div>)}
          </div>
          <div className="p-6 mt-4">
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <PetProvider>
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <AppLogo />
            <div className="flex items-center gap-2">
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Disclaimer">
                          <ShieldAlert className="h-5 w-5 text-yellow-500" />
                      </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-yellow-500"/>Disclaimer</AlertDialogTitle>
                      <AlertDialogDescription>
                          <div>Ascendia is a prototype application for demonstration purposes.</div>
                          <div>Financial data displayed is illustrative and should not be considered real financial advice.</div>
                          <div>The GenAI summarization feature uses a language model and summaries may not be fully accurate or complete.</div>
                          <div>Always consult with a qualified financial advisor for professional advice.</div>
                      </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                      <AlertDialogAction>Understood</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
              <ThemeToggle />
              <Button onClick={handleSignOut} variant="ghost" size="icon" aria-label="Sign Out">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-grow container mx-auto py-4 px-2 sm:px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto no-scrollbar pb-1">
              <TabsList className="grid w-full sm:w-auto grid-cols-[repeat(auto-fit,minmax(100px,1fr))] sm:inline-flex sm:grid-cols-none rounded-lg p-1 h-auto">
                {features.map((feature) => (
                  <TabsTrigger
                    key={feature.id}
                    value={feature.id}
                    className="flex-col sm:flex-row sm:gap-2 h-auto py-2.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 text-xs sm:text-sm"
                    aria-label={feature.label}
                  >
                    <feature.icon className="h-4 w-4 sm:h-5 sm:w-5 mb-1 sm:mb-0" />
                    <span className="whitespace-nowrap">{feature.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {features.map((feature) => (
              <TabsContent key={feature.id} value={feature.id} className="mt-4 rounded-lg shadow-sm data-[state=active]:animate-fade-in">
                {feature.component}
              </TabsContent>
            ))}
          </Tabs>
        </main>
        <footer className="py-6 md:px-8 md:py-0 border-t bg-background">
          <div className="container flex flex-col items-center justify-center gap-4 md:h-20 md:flex-row">
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              A demo project built by Lovette. &copy; {new Date().getFullYear()}. All rights reserved.
            </p>
          </div>
        </footer>
        {isMounted && showWelcome && (
          <AlertDialog open={showWelcome} onOpenChange={handleWelcomeOpenChange}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center"><AppLogo /> Welcome!</AlertDialogTitle>
                  <AlertDialogDescription>
                      <div>Welcome to Ascendia! This app is a prototype designed to help you manage your finances.</div>
                      <div className="font-semibold text-yellow-600 dark:text-yellow-400 flex items-start mt-2">
                          <ShieldAlert className="h-5 w-5 mr-2 mt-0.5 shrink-0" />
                          <span>
                              Please note: This is a demo version. All data is illustrative.
                              The AI summarization feature is for demonstration and may not always be perfectly accurate.
                              Always consult a professional for financial advice.
                          </span>
                      </div>
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                  <AlertDialogAction onClick={handleWelcomeDismiss}>Get Started</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </PetProvider>
  );
}
