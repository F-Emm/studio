
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { PetProfile } from '@/types/pet';
import { PetStage, XP_THRESHOLDS, MAX_STAT_VALUE, MIN_STAT_VALUE, getDefaultPetProfile, PetType } from '@/types/pet';
import { useToast } from "@/hooks/use-toast";

interface PetContextType {
  petProfile: PetProfile | null;
  isLoading: boolean;
  gainXp: (amount: number, silent?: boolean) => void;
  updateStat: (stat: keyof Pick<PetProfile, 'hunger' | 'happiness' | 'energy'>, amount: number) => void;
  feedPet: (treatCost?: number) => boolean;
  renamePet: (newName: string) => void;
  setPetType: (newType: PetProfile['type']) => void;
  processFinancialEvent: (type: 'goalSet' | 'goalAchieved' | 'budgetSaved' | 'unplannedExpense' | 'debtOverdue', data?: any) => void;
  rewardTreats: (amount: number, reason?: string) => void;
}

const PetContext = createContext<PetContextType | undefined>(undefined);

const PET_PROFILE_STORAGE_KEY = "ascendiaPetProfile_v3"; // Updated key due to app name change

interface ToastMessage {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

export const PetProvider = ({ children }: { children: ReactNode }) => {
  const [petProfile, setPetProfile] = useState<PetProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast(); // toast function reference is stable
  const [toastQueue, setToastQueue] = useState<ToastMessage[]>([]);

  useEffect(() => {
    let profileToInitialize: PetProfile;
    const initialToastsForLoginQueue: ToastMessage[] = [];

    try {
      const savedProfileString = localStorage.getItem(PET_PROFILE_STORAGE_KEY);
      if (savedProfileString) {
        const parsedProfile = JSON.parse(savedProfileString) as PetProfile;
        // Basic validation for critical fields
        if (parsedProfile.petId && parsedProfile.hasOwnProperty('consecutiveLoginDays') && parsedProfile.type && parsedProfile.stage) {
          profileToInitialize = parsedProfile;
        } else {
          // Attempt to salvage some info if structure is old/corrupted
          profileToInitialize = getDefaultPetProfile(parsedProfile.userId || "defaultUser");
          if(parsedProfile.name) profileToInitialize.name = parsedProfile.name;
          // Ensure type and stage are valid enum values before assigning
          if (parsedProfile.type && Object.values(PetType).includes(parsedProfile.type as PetType)) {
            profileToInitialize.type = parsedProfile.type as PetType;
          }
           if (parsedProfile.stage && Object.values(PetStage).includes(parsedProfile.stage as PetStage)) {
            profileToInitialize.stage = parsedProfile.stage as PetStage;
          }
          // Other fields will take defaults
        }
      } else {
        profileToInitialize = getDefaultPetProfile();
      }

      // Daily login and streak logic
      const today = new Date().toISOString().split('T')[0];
      if (profileToInitialize.lastLoginDate !== today) {
        const dailyTreats = 2;
        profileToInitialize.treats = (profileToInitialize.treats || 0) + dailyTreats; // Ensure treats is a number
        initialToastsForLoginQueue.push({ title: "Daily Login!", description: `Welcome back! +${dailyTreats} treats for ${profileToInitialize.name}!` });

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (profileToInitialize.lastLoginDate === yesterdayStr) {
          profileToInitialize.consecutiveLoginDays = (profileToInitialize.consecutiveLoginDays || 0) + 1;
        } else {
          profileToInitialize.consecutiveLoginDays = 1; // Reset streak
        }

        if (profileToInitialize.consecutiveLoginDays >= 5) {
          const bonusTreats = 10;
          profileToInitialize.treats += bonusTreats;
          initialToastsForLoginQueue.push({ title: "Login Streak Bonus!", description: `${profileToInitialize.consecutiveLoginDays} consecutive days! +${bonusTreats} extra treats for ${profileToInitialize.name}!`});
        }
        profileToInitialize.lastLoginDate = today;
      }
      
      setPetProfile(profileToInitialize);
      if (initialToastsForLoginQueue.length > 0) {
        // Add to queue instead of calling toast directly
        setToastQueue(q => [...q, ...initialToastsForLoginQueue]);
      }

    } catch (error) {
      console.error("Failed to load or initialize pet profile:", error);
      const defaultProfile = getDefaultPetProfile();
      setPetProfile(defaultProfile); // Fallback to default
      // Queue error toast
      setToastQueue(q => [...q, { title: "Profile Error", description: "Could not load pet's profile. Starting fresh.", variant: "destructive" }]);
    } finally {
      setIsLoading(false);
    }
  }, []); // Runs once on mount


  useEffect(() => {
    if (petProfile && !isLoading) {
      try {
        localStorage.setItem(PET_PROFILE_STORAGE_KEY, JSON.stringify(petProfile));
      } catch (error) {
        console.error("Failed to save pet profile to localStorage:", error);
        // Optionally queue a toast here if saving fails, but be mindful of loops
      }
    }
  }, [petProfile, isLoading]);

  // Process toast queue
  useEffect(() => {
    if (toastQueue.length > 0) {
      setTimeout(() => {
        toastQueue.forEach(msg => toast({ title: msg.title, description: msg.description, variant: msg.variant }));
        setToastQueue([]); // Clear the queue after processing
      }, 0);
    }
  }, [toastQueue, toast]); // Re-run when toastQueue or toast function changes (toast is stable)


  const updatePetState = useCallback((updater: (prev: PetProfile) => PetProfile) => {
    setPetProfile(prev => {
      if (!prev) return getDefaultPetProfile(); 
      
      const currentPet = {...prev}; 
      const updated = updater(currentPet);
      
      let newStage = updated.stage;
      let evolvedThisUpdate = false;

      if (updated.stage === PetStage.HATCHLING && updated.xp >= XP_THRESHOLDS[PetStage.JUVENILE]) {
        newStage = PetStage.JUVENILE;
        evolvedThisUpdate = true;
      } else if (updated.stage === PetStage.JUVENILE && updated.xp >= XP_THRESHOLDS[PetStage.ADULT]) {
        newStage = PetStage.ADULT;
        evolvedThisUpdate = true;
      } else if (updated.stage === PetStage.ADULT && updated.xp >= XP_THRESHOLDS[PetStage.WISE_ELDER]) {
        newStage = PetStage.WISE_ELDER;
        evolvedThisUpdate = true;
      }

      if (evolvedThisUpdate) {
        setToastQueue(q => [...q, { title: "Evolution!", description: `${updated.name} evolved to ${newStage}!` }]);
        return { ...updated, stage: newStage };
      }
      return updated;
    });
  }, [setToastQueue]); // setToastQueue is stable

  const gainXp = useCallback((amount: number, silent: boolean = false) => {
    if (!silent && petProfile) { // Check petProfile before accessing its name
      setToastQueue(q => [...q, { title: "XP Gained!", description: `${petProfile.name} got +${amount} XP!` }]);
    }
    updatePetState(prev => {
      return { 
        ...prev, 
        xp: prev.xp + amount,
        happiness: Math.min(MAX_STAT_VALUE, prev.happiness + 5), // Small happiness boost with XP
        lastInteraction: new Date().toISOString() 
      };
    });
  }, [updatePetState, setToastQueue, petProfile]); // Added petProfile dependency

  const updateStat = useCallback((stat: keyof Pick<PetProfile, 'hunger' | 'happiness' | 'energy'>, amount: number) => {
    updatePetState(prev => {
      const newValue = Math.max(MIN_STAT_VALUE, Math.min(MAX_STAT_VALUE, prev[stat] + amount));
      return { ...prev, [stat]: newValue, lastInteraction: new Date().toISOString() };
    });
  }, [updatePetState]);

  const rewardTreats = useCallback((amount: number, reason?: string) => {
    updatePetState(prev => {
      if (reason && petProfile) { // Check petProfile
         setToastQueue(q => [...q, { title: "Treats Rewarded!", description: `${reason} +${amount} treats for ${petProfile.name}!` }]);
      }
      return { ...prev, treats: prev.treats + amount };
    });
  }, [updatePetState, setToastQueue, petProfile]); // Added petProfile dependency

  const feedPet = useCallback((treatCost: number = 1): boolean => {
    let fedSuccessfully = false;
    // Access petProfile directly here for the name and current treats for the toast.
    const currentPetName = petProfile?.name || "Your pet"; // Use optional chaining
    
    updatePetState(prev => {
      if (prev.treats >= treatCost) {
        fedSuccessfully = true;
        setToastQueue(q => [...q, { title: "Yum!", description: `${prev.name} enjoyed the treat!` }]);
        return {
          ...prev,
          hunger: Math.min(MAX_STAT_VALUE, prev.hunger + 20),
          happiness: Math.min(MAX_STAT_VALUE, prev.happiness + 5), // Feeding also slightly increases happiness
          treats: prev.treats - treatCost,
          lastFed: new Date().toISOString(),
          lastInteraction: new Date().toISOString(),
        };
      }
      setToastQueue(q => [...q, { title: "Oh no!", description: `Not enough treats to feed ${prev.name}.`, variant: "destructive" }]);
      return prev;
    });
    return fedSuccessfully;
  }, [updatePetState, setToastQueue, petProfile]); // Added petProfile dependency

  const renamePet = useCallback((newName: string) => {
    if (newName.trim()) {
      updatePetState(prev => ({ ...prev, name: newName.trim() }));
    }
  }, [updatePetState]);
  
  const setPetType = useCallback((newType: PetProfile['type']) => {
     updatePetState(prev => ({ ...prev, type: newType }));
  }, [updatePetState]);

  const processFinancialEvent = useCallback((type: 'goalSet' | 'goalAchieved' | 'budgetSaved' | 'unplannedExpense' | 'debtOverdue', data?: any) => {
    const currentPetName = petProfile?.name || "Your pet"; // Use optional chaining

    updatePetState(prev => {
        let newTreats = prev.treats;
        let newXp = prev.xp;
        let newHappiness = prev.happiness;
        let newEnergy = prev.energy;
        let eventToastMessage: ToastMessage | null = null;

        switch (type) {
            case 'goalSet':
                newTreats += 5;
                newXp += 10;
                eventToastMessage = { title: "Goal Set!", description: `${prev.name} is proud! +5 treats, +10 XP` };
                break;
            case 'goalAchieved':
                newTreats += 20;
                newXp += 50;
                newHappiness = Math.min(MAX_STAT_VALUE, newHappiness + 20);
                eventToastMessage = { title: "Goal Achieved!", description: `Amazing! ${prev.name} is overjoyed! +20 treats, +50 XP, +20 Happiness` };
                break;
            case 'budgetSaved': // Triggered from PreferencesSetup
                newTreats += 10;
                newXp += 5; // Small XP for good financial habit
                eventToastMessage = { title: "Preferences Saved!", description: `${prev.name} likes your planning! +10 treats, +5 XP` };
                break;
            case 'unplannedExpense': // Triggered from ExpenseTracking for any expense
                newHappiness = Math.max(MIN_STAT_VALUE, newHappiness - 10);
                eventToastMessage = { title: "Expense Tracked", description: `${prev.name} noticed an expense. Happiness -10`, variant: "default" };
                break;
            case 'debtOverdue':
                newHappiness = Math.max(MIN_STAT_VALUE, newHappiness - 15);
                newEnergy = Math.max(MIN_STAT_VALUE, newEnergy - 10); // Stress can be tiring!
                eventToastMessage = { title: "Debt Overdue!", description: `${data?.debtName ? `Overdue: ${data.debtName}. ` : ''}${prev.name} is worried. Happiness -15, Energy -10`, variant: "destructive" };
                break;
        }

        if (eventToastMessage) {
            setToastQueue(q => [...q, eventToastMessage]);
        }
        
        return {
            ...prev,
            treats: newTreats,
            xp: newXp,
            happiness: newHappiness,
            energy: newEnergy,
            lastInteraction: new Date().toISOString(),
        };
    });
  }, [updatePetState, setToastQueue, petProfile]); // Added petProfile dependency

  // Stat decay over time
  useEffect(() => {
    const decayInterval = setInterval(() => {
      if (petProfile && !isLoading) { // Ensure profile is loaded
        const now = new Date();
        const lastInteractionTime = new Date(petProfile.lastInteraction);
        // Decay if no interaction for, e.g., 30 minutes
        if (now.getTime() - lastInteractionTime.getTime() > 30 * 60 * 1000) { 
          updatePetState(prev => ({
            ...prev,
            hunger: Math.max(MIN_STAT_VALUE, prev.hunger - 2), // Gets hungrier slowly
            energy: Math.max(MIN_STAT_VALUE, prev.energy - 1), // Loses energy slowly
            // Happiness decays slower or based on other factors like hunger
            happiness: prev.hunger < 20 ? Math.max(MIN_STAT_VALUE, prev.happiness -1) : prev.happiness,
          }));
        }
      }
    }, 15 * 60 * 1000); // Check every 15 minutes for decay
    return () => clearInterval(decayInterval);
  }, [petProfile, isLoading, updatePetState]);


  return (
    <PetContext.Provider value={{ petProfile, isLoading, gainXp, updateStat, feedPet, renamePet, setPetType, processFinancialEvent, rewardTreats }}>
      {children}
    </PetContext.Provider>
  );
};

export const usePet = (): PetContextType => {
  const context = useContext(PetContext);
  if (context === undefined) {
    throw new Error('usePet must be used within a PetProvider');
  }
  return context;
};

