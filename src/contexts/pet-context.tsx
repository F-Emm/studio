
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

const PET_PROFILE_STORAGE_KEY = "ascendiaLitePetProfile_v2";

interface ToastMessage {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

export const PetProvider = ({ children }: { children: ReactNode }) => {
  const [petProfile, setPetProfile] = useState<PetProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [toastQueue, setToastQueue] = useState<ToastMessage[]>([]);

  useEffect(() => {
    let profileToInitialize: PetProfile;
    const initialToastsForLoginQueue: ToastMessage[] = [];

    try {
      const savedProfileString = localStorage.getItem(PET_PROFILE_STORAGE_KEY);
      if (savedProfileString) {
        const parsedProfile = JSON.parse(savedProfileString) as PetProfile;
        if (parsedProfile.petId && parsedProfile.hasOwnProperty('consecutiveLoginDays') && parsedProfile.type && parsedProfile.stage) {
          profileToInitialize = parsedProfile;
        } else {
          profileToInitialize = getDefaultPetProfile(parsedProfile.userId || "defaultUser");
          if(parsedProfile.name) profileToInitialize.name = parsedProfile.name;
          if (parsedProfile.type && Object.values(PetType).includes(parsedProfile.type as PetType)) {
            profileToInitialize.type = parsedProfile.type as PetType;
          }
           if (parsedProfile.stage && Object.values(PetStage).includes(parsedProfile.stage as PetStage)) {
            profileToInitialize.stage = parsedProfile.stage as PetStage;
          }
        }
      } else {
        profileToInitialize = getDefaultPetProfile();
      }

      const today = new Date().toISOString().split('T')[0];
      if (profileToInitialize.lastLoginDate !== today) {
        const dailyTreats = 2;
        profileToInitialize.treats = (profileToInitialize.treats || 0) + dailyTreats;
        initialToastsForLoginQueue.push({ title: "Daily Login!", description: `Welcome back! +${dailyTreats} treats for ${profileToInitialize.name}!` });

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (profileToInitialize.lastLoginDate === yesterdayStr) {
          profileToInitialize.consecutiveLoginDays = (profileToInitialize.consecutiveLoginDays || 0) + 1;
        } else {
          profileToInitialize.consecutiveLoginDays = 1;
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
        setToastQueue(q => [...q, ...initialToastsForLoginQueue]);
      }

    } catch (error) {
      console.error("Failed to load or initialize pet profile:", error);
      const defaultProfile = getDefaultPetProfile();
      setPetProfile(defaultProfile);
      setToastQueue(q => [...q, { title: "Profile Error", description: "Could not load pet's profile. Starting fresh.", variant: "destructive" }]);
    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    if (petProfile && !isLoading) {
      try {
        localStorage.setItem(PET_PROFILE_STORAGE_KEY, JSON.stringify(petProfile));
      } catch (error) {
        console.error("Failed to save pet profile to localStorage:", error);
      }
    }
  }, [petProfile, isLoading]);

  useEffect(() => {
    if (toastQueue.length > 0) {
      toastQueue.forEach(msg => toast({ title: msg.title, description: msg.description, variant: msg.variant }));
      setToastQueue([]); // Clear the queue
    }
  }, [toastQueue, toast]);


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
  }, [setToastQueue]);

  const gainXp = useCallback((amount: number, silent: boolean = false) => {
    if (!silent && petProfile) {
      setToastQueue(q => [...q, { title: "XP Gained!", description: `${petProfile.name} got +${amount} XP!` }]);
    }
    updatePetState(prev => {
      return { 
        ...prev, 
        xp: prev.xp + amount,
        happiness: Math.min(MAX_STAT_VALUE, prev.happiness + 5),
        lastInteraction: new Date().toISOString() 
      };
    });
  }, [updatePetState, setToastQueue, petProfile]);

  const updateStat = useCallback((stat: keyof Pick<PetProfile, 'hunger' | 'happiness' | 'energy'>, amount: number) => {
    updatePetState(prev => {
      const newValue = Math.max(MIN_STAT_VALUE, Math.min(MAX_STAT_VALUE, prev[stat] + amount));
      return { ...prev, [stat]: newValue, lastInteraction: new Date().toISOString() };
    });
  }, [updatePetState]);

  const rewardTreats = useCallback((amount: number, reason?: string) => {
    updatePetState(prev => {
      if (reason && petProfile) {
         setToastQueue(q => [...q, { title: "Treats Rewarded!", description: `${reason} +${amount} treats for ${petProfile.name}!` }]);
      }
      return { ...prev, treats: prev.treats + amount };
    });
  }, [updatePetState, setToastQueue, petProfile]);

  const feedPet = useCallback((treatCost: number = 1): boolean => {
    let fedSuccessfully = false;
    // Access petProfile directly here for the name and current treats for the toast.
    const currentPetName = petProfile?.name || "Your pet"; 
    
    updatePetState(prev => {
      if (prev.treats >= treatCost) {
        fedSuccessfully = true;
        setToastQueue(q => [...q, { title: "Yum!", description: `${prev.name} enjoyed the treat!` }]);
        return {
          ...prev,
          hunger: Math.min(MAX_STAT_VALUE, prev.hunger + 20),
          happiness: Math.min(MAX_STAT_VALUE, prev.happiness + 5),
          treats: prev.treats - treatCost,
          lastFed: new Date().toISOString(),
          lastInteraction: new Date().toISOString(),
        };
      }
      setToastQueue(q => [...q, { title: "Oh no!", description: `Not enough treats to feed ${prev.name}.`, variant: "destructive" }]);
      return prev;
    });
    return fedSuccessfully;
  }, [updatePetState, setToastQueue, petProfile]); // Added petProfile dependency for name access

  const renamePet = useCallback((newName: string) => {
    if (newName.trim()) {
      updatePetState(prev => ({ ...prev, name: newName.trim() }));
    }
  }, [updatePetState]);
  
  const setPetType = useCallback((newType: PetProfile['type']) => {
     updatePetState(prev => ({ ...prev, type: newType }));
  }, [updatePetState]);

  const processFinancialEvent = useCallback((type: 'goalSet' | 'goalAchieved' | 'budgetSaved' | 'unplannedExpense' | 'debtOverdue', data?: any) => {
    // Access petProfile directly for current name in toast messages.
    const currentPetName = petProfile?.name || "Your pet";

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
            case 'budgetSaved':
                newTreats += 10;
                newXp += 5;
                eventToastMessage = { title: "Preferences Saved!", description: `${prev.name} likes your planning! +10 treats, +5 XP` };
                break;
            case 'unplannedExpense':
                newHappiness = Math.max(MIN_STAT_VALUE, newHappiness - 10);
                eventToastMessage = { title: "Expense Tracked", description: `${prev.name} noticed an expense. Happiness -10`, variant: "default" };
                break;
            case 'debtOverdue':
                newHappiness = Math.max(MIN_STAT_VALUE, newHappiness - 15);
                newEnergy = Math.max(MIN_STAT_VALUE, newEnergy - 10);
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
  }, [updatePetState, setToastQueue, petProfile]); // Added petProfile for name access

  useEffect(() => {
    const decayInterval = setInterval(() => {
      if (petProfile && !isLoading) {
        const now = new Date();
        const lastInteractionTime = new Date(petProfile.lastInteraction);
        if (now.getTime() - lastInteractionTime.getTime() > 30 * 60 * 1000) { 
          updatePetState(prev => ({
            ...prev,
            hunger: Math.max(MIN_STAT_VALUE, prev.hunger - 2), 
            energy: Math.max(MIN_STAT_VALUE, prev.energy - 1), 
          }));
        }
      }
    }, 15 * 60 * 1000); 
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

