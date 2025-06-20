
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { PetProfile } from '@/types/pet';
import { PetStage, XP_THRESHOLDS, MAX_STAT_VALUE, MIN_STAT_VALUE, getDefaultPetProfile } from '@/types/pet';
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

const PET_PROFILE_STORAGE_KEY = "ascendiaLitePetProfile_v2"; // Incremented version for new fields

export const PetProvider = ({ children }: { children: ReactNode }) => {
  const [petProfile, setPetProfile] = useState<PetProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [loginToastMessages, setLoginToastMessages] = useState<Array<{title: string, description: string}>>([]);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(PET_PROFILE_STORAGE_KEY);
      let profileToInitialize: PetProfile;

      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile) as PetProfile;
        if (parsedProfile.petId && parsedProfile.hasOwnProperty('consecutiveLoginDays')) {
          profileToInitialize = parsedProfile;
        } else {
          // Migrating from an old structure or invalid one
          profileToInitialize = getDefaultPetProfile(parsedProfile.userId || "defaultUser");
          if(parsedProfile.name) profileToInitialize.name = parsedProfile.name;
          if(parsedProfile.type) profileToInitialize.type = parsedProfile.type;
          // carry over essential old fields if they exist
        }
      } else {
        profileToInitialize = getDefaultPetProfile();
      }

      // Handle login treats
      const today = new Date().toISOString().split('T')[0];
      let newToasts: Array<{title: string, description: string}> = [];

      if (profileToInitialize.lastLoginDate !== today) {
        const dailyTreats = 2;
        profileToInitialize.treats += dailyTreats;
        newToasts.push({ title: "Daily Login!", description: `Welcome back! +${dailyTreats} treats.` });

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
           newToasts.push({ title: "Login Streak Bonus!", description: `${profileToInitialize.consecutiveLoginDays} consecutive days! +${bonusTreats} extra treats!`});
          // Optionally reset: profileToInitialize.consecutiveLoginDays = 0; 
        }
        profileToInitialize.lastLoginDate = today;
      }
      
      setPetProfile(profileToInitialize);
      setLoginToastMessages(newToasts);

    } catch (error) {
      console.error("Failed to load or initialize pet profile:", error);
      setPetProfile(getDefaultPetProfile());
    } finally {
      setIsLoading(false);
    }
  }, []); // Run only on mount

  useEffect(() => {
    if (!isLoading && petProfile && loginToastMessages.length > 0) {
      loginToastMessages.forEach(msg => toast({ title: msg.title, description: `${msg.description} ${petProfile.name} is happy to see you!`}));
      setLoginToastMessages([]); // Clear after showing
    }
  }, [petProfile, isLoading, loginToastMessages, toast]);


  useEffect(() => {
    if (petProfile && !isLoading) {
      try {
        localStorage.setItem(PET_PROFILE_STORAGE_KEY, JSON.stringify(petProfile));
      } catch (error) {
        console.error("Failed to save pet profile to localStorage:", error);
      }
    }
  }, [petProfile, isLoading]);

  const updatePetState = useCallback((updater: (prev: PetProfile) => PetProfile) => {
    setPetProfile(prev => {
      if (!prev) return getDefaultPetProfile();
      const updated = updater(prev);
      
      // Check for evolution after any state update that might change XP
      let newStage = updated.stage;
      if (updated.stage === PetStage.HATCHLING && updated.xp >= XP_THRESHOLDS[PetStage.JUVENILE]) newStage = PetStage.JUVENILE;
      else if (updated.stage === PetStage.JUVENILE && updated.xp >= XP_THRESHOLDS[PetStage.ADULT]) newStage = PetStage.ADULT;
      else if (updated.stage === PetStage.ADULT && updated.xp >= XP_THRESHOLDS[PetStage.WISE_ELDER]) newStage = PetStage.WISE_ELDER;

      if (newStage !== prev.stage && newStage !== updated.stage) { // Check against original prev.stage and current updated.stage before this block
        toast({ title: "Evolution!", description: `${updated.name} evolved to ${newStage}!` });
        return { ...updated, stage: newStage };
      }
      return updated; // return the result of updater if no evolution, or the evolved state.
    });
  }, [toast]);

  const gainXp = useCallback((amount: number, silent: boolean = false) => {
    updatePetState(prev => {
      if (!silent) {
        toast({ title: "XP Gained!", description: `${prev.name} got +${amount} XP!` });
      }
      return { 
        ...prev, 
        xp: prev.xp + amount,
        happiness: Math.min(MAX_STAT_VALUE, prev.happiness + 5), // Small happiness boost with XP
        lastInteraction: new Date().toISOString() 
      };
    });
  }, [updatePetState, toast]);

  const updateStat = useCallback((stat: keyof Pick<PetProfile, 'hunger' | 'happiness' | 'energy'>, amount: number) => {
    updatePetState(prev => {
      const newValue = Math.max(MIN_STAT_VALUE, Math.min(MAX_STAT_VALUE, prev[stat] + amount));
      return { ...prev, [stat]: newValue, lastInteraction: new Date().toISOString() };
    });
  }, [updatePetState]);

  const rewardTreats = useCallback((amount: number, reason?: string) => {
    updatePetState(prev => {
      if (reason) {
        toast({ title: "Treats Rewarded!", description: `${reason} +${amount} treats for ${prev.name}!` });
      }
      return { ...prev, treats: prev.treats + amount };
    });
  }, [updatePetState, toast]);

  const feedPet = useCallback((treatCost: number = 1): boolean => {
    let fedSuccessfully = false;
    updatePetState(prev => {
      if (prev.treats >= treatCost) {
        fedSuccessfully = true;
        toast({ title: "Yum!", description: `${prev.name} enjoyed the treat!` });
        return {
          ...prev,
          hunger: Math.min(MAX_STAT_VALUE, prev.hunger + 20),
          happiness: Math.min(MAX_STAT_VALUE, prev.happiness + 5), // Feeding also slightly boosts happiness
          treats: prev.treats - treatCost,
          lastFed: new Date().toISOString(),
          lastInteraction: new Date().toISOString(),
        };
      }
      toast({ title: "Oh no!", description: `Not enough treats to feed ${prev.name}.`, variant: "destructive" });
      return prev;
    });
    return fedSuccessfully;
  }, [updatePetState, toast]);

  const renamePet = useCallback((newName: string) => {
    if (newName.trim()) {
      updatePetState(prev => ({ ...prev, name: newName.trim() }));
    }
  }, [updatePetState]);
  
  const setPetType = useCallback((newType: PetProfile['type']) => {
     updatePetState(prev => ({ ...prev, type: newType }));
  }, [updatePetState]);

  const processFinancialEvent = useCallback((type: 'goalSet' | 'goalAchieved' | 'budgetSaved' | 'unplannedExpense' | 'debtOverdue', data?: any) => {
    updatePetState(prev => {
        let newTreats = prev.treats;
        let newXp = prev.xp;
        let newHappiness = prev.happiness;
        let newEnergy = prev.energy;
        let eventToast: { title: string, description: string, variant?: "default" | "destructive" } | null = null;

        switch (type) {
            case 'goalSet':
                newTreats += 5;
                newXp += 10;
                eventToast = { title: "Goal Set!", description: `${prev.name} is proud! +5 treats, +10 XP` };
                break;
            case 'goalAchieved':
                newTreats += 20;
                newXp += 50;
                newHappiness = Math.min(MAX_STAT_VALUE, newHappiness + 20);
                eventToast = { title: "Goal Achieved!", description: `Amazing! ${prev.name} is overjoyed! +20 treats, +50 XP, +20 Happiness` };
                break;
            case 'budgetSaved':
                newTreats += 10;
                newXp += 5;
                eventToast = { title: "Preferences Saved!", description: `${prev.name} likes your planning! +10 treats, +5 XP` };
                break;
            case 'unplannedExpense':
                newHappiness = Math.max(MIN_STAT_VALUE, newHappiness - 10);
                eventToast = { title: "Expense Tracked", description: `${prev.name} noticed an expense. Happiness -10`, variant: "destructive" };
                break;
            case 'debtOverdue':
                newHappiness = Math.max(MIN_STAT_VALUE, newHappiness - 15);
                newEnergy = Math.max(MIN_STAT_VALUE, newEnergy - 10);
                eventToast = { title: "Debt Overdue!", description: `${prev.name} is worried. Happiness -15, Energy -10`, variant: "destructive" };
                break;
        }

        if (eventToast) {
            toast({ title: eventToast.title, description: eventToast.description, variant: eventToast.variant });
        }
        
        // Return potentially modified stats, evolution will be checked by updatePetState
        return {
            ...prev,
            treats: newTreats,
            xp: newXp,
            happiness: newHappiness,
            energy: newEnergy,
            lastInteraction: new Date().toISOString(),
        };
    });
  }, [updatePetState, toast]);

  useEffect(() => {
    const decayInterval = setInterval(() => {
      if (petProfile && !isLoading) {
        const now = new Date();
        const lastInteractionTime = new Date(petProfile.lastInteraction);
        // Reduce hunger and energy slightly every 30 minutes of inactivity
        if (now.getTime() - lastInteractionTime.getTime() > 30 * 60 * 1000) {
          updatePetState(prev => ({
            ...prev,
            hunger: Math.max(MIN_STAT_VALUE, prev.hunger - 2),
            energy: Math.max(MIN_STAT_VALUE, prev.energy - 1),
            // Do not update lastInteraction here, or decay will never happen
          }));
        }
      }
    }, 15 * 60 * 1000); // Check every 15 minutes
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
