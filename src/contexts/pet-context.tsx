
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { PetProfile } from '@/types/pet';
import { PetStage, XP_THRESHOLDS, MAX_STAT_VALUE, MIN_STAT_VALUE, getDefaultPetProfile } from '@/types/pet';

interface PetContextType {
  petProfile: PetProfile | null;
  isLoading: boolean;
  gainXp: (amount: number) => void;
  updateStat: (stat: keyof Pick<PetProfile, 'hunger' | 'happiness' | 'energy'>, amount: number) => void;
  feedPet: (treatCost?: number) => boolean; // Returns true if fed, false if not enough treats
  renamePet: (newName: string) => void;
  setPetType: (newType: PetProfile['type']) => void;
  // Add more actions as needed: spendTreats, addAccessory, etc.
}

const PetContext = createContext<PetContextType | undefined>(undefined);

const PET_PROFILE_STORAGE_KEY = "ascendiaLitePetProfile";

export const PetProvider = ({ children }: { children: ReactNode }) => {
  const [petProfile, setPetProfile] = useState<PetProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(PET_PROFILE_STORAGE_KEY);
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile) as PetProfile;
        // Basic validation or migration could happen here
        if (parsedProfile.petId) {
           setPetProfile(parsedProfile);
        } else {
          setPetProfile(getDefaultPetProfile());
        }
      } else {
        setPetProfile(getDefaultPetProfile());
      }
    } catch (error) {
      console.error("Failed to load pet profile from localStorage:", error);
      setPetProfile(getDefaultPetProfile());
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

  const updatePetState = useCallback((updater: (prev: PetProfile) => PetProfile) => {
    setPetProfile(prev => {
      if (!prev) return getDefaultPetProfile(); // Should not happen if initialized
      return updater(prev);
    });
  }, []);

  const gainXp = useCallback((amount: number) => {
    updatePetState(prev => {
      const newXp = prev.xp + amount;
      let newStage = prev.stage;

      if (prev.stage === PetStage.HATCHLING && newXp >= XP_THRESHOLDS[PetStage.JUVENILE]) {
        newStage = PetStage.JUVENILE;
      } else if (prev.stage === PetStage.JUVENILE && newXp >= XP_THRESHOLDS[PetStage.ADULT]) {
        newStage = PetStage.ADULT;
      } else if (prev.stage === PetStage.ADULT && newXp >= XP_THRESHOLDS[PetStage.WISE_ELDER]) {
        newStage = PetStage.WISE_ELDER;
      }
      // TODO: Trigger evolution animation/notification if newStage !== prev.stage
      return { ...prev, xp: newXp, stage: newStage, lastInteraction: new Date().toISOString() };
    });
  }, [updatePetState]);

  const updateStat = useCallback((stat: keyof Pick<PetProfile, 'hunger' | 'happiness' | 'energy'>, amount: number) => {
    updatePetState(prev => {
      const newValue = Math.max(MIN_STAT_VALUE, Math.min(MAX_STAT_VALUE, prev[stat] + amount));
      return { ...prev, [stat]: newValue, lastInteraction: new Date().toISOString() };
    });
  }, [updatePetState]);

  const feedPet = useCallback((treatCost: number = 1): boolean => {
    let fedSuccessfully = false;
    updatePetState(prev => {
      if (prev.treats >= treatCost) {
        fedSuccessfully = true;
        return {
          ...prev,
          hunger: Math.min(MAX_STAT_VALUE, prev.hunger + 20), // Example: feeding increases hunger stat (reduces actual hunger)
          happiness: Math.min(MAX_STAT_VALUE, prev.happiness + 10),
          treats: prev.treats - treatCost,
          lastFed: new Date().toISOString(),
          lastInteraction: new Date().toISOString(),
        };
      }
      return prev; // Not enough treats
    });
    return fedSuccessfully;
  }, [updatePetState]);

  const renamePet = useCallback((newName: string) => {
    if (newName.trim()) {
      updatePetState(prev => ({ ...prev, name: newName.trim() }));
    }
  }, [updatePetState]);
  
  const setPetType = useCallback((newType: PetProfile['type']) => {
     updatePetState(prev => ({ ...prev, type: newType }));
  }, [updatePetState]);


  // Placeholder for periodic stat decay (e.g., hunger decrease)
  // This would typically be more complex, involving checking time since lastInteraction or using background tasks if possible.
  // For a client-side only prototype, this might be triggered on app load/focus.
  useEffect(() => {
    const interval = setInterval(() => {
      if (petProfile) {
        const now = new Date();
        const lastInteractionTime = new Date(petProfile.lastInteraction);
        // Example: Decrease hunger every hour (3600000 ms)
        if (now.getTime() - lastInteractionTime.getTime() > 3600000) {
           // updateStat('hunger', -5); // This would be the actual call
           // For now, to avoid rapid updates on an inactive tab, we'll keep this logic simpler
           // or trigger it less frequently / on specific user actions.
        }
      }
    }, 60000 * 5); // Check every 5 minutes
    return () => clearInterval(interval);
  }, [petProfile, updateStat]);


  return (
    <PetContext.Provider value={{ petProfile, isLoading, gainXp, updateStat, feedPet, renamePet, setPetType }}>
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
