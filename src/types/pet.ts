
export enum PetType {
  CAT = "Cat",
  DRAGON = "Dragon",
  // Add more types as needed
}

export enum PetStage {
  HATCHLING = "Hatchling",
  JUVENILE = "Juvenile",
  ADULT = "Adult",
  WISE_ELDER = "Wise Elder",
}

export interface PetAccessory {
  id: string;
  name: string;
  type: "hat" | "background"; // Example types
  assetUrl: string; // URL to the image/Lottie file
}

export interface PetProfile {
  userId: string; // For future backend integration
  petId: string;
  name: string;
  type: PetType;
  stage: PetStage;
  xp: number;
  hunger: number; // 0-100
  happiness: number; // 0-100
  energy: number; // 0-100
  lastFed: string; // ISO string date
  lastInteraction: string; // ISO string date for general interaction
  treats: number; // In-app currency for feeding/shop
  accessories: PetAccessory[]; // Equipped accessories
  lastLoginDate: string; // YYYY-MM-DD
  consecutiveLoginDays: number;
  goalsSet: number;
  goalsCompleted: number;
  processedOverdueDebtsToday: Record<string, string>; // Key: debtId, Value: YYYY-MM-DD
}

export const XP_THRESHOLDS = {
  [PetStage.JUVENILE]: 100,
  [PetStage.ADULT]: 300,
  [PetStage.WISE_ELDER]: 600,
};

export const MAX_STAT_VALUE = 100;
export const MIN_STAT_VALUE = 0;

export const getDefaultPetProfile = (userId: string = "defaultUser"): PetProfile => ({
  userId,
  petId: `pet-${Date.now()}`,
  name: "Buddy",
  type: PetType.CAT,
  stage: PetStage.HATCHLING,
  xp: 0,
  hunger: 80,
  happiness: 70,
  energy: 90,
  lastFed: new Date().toISOString(),
  lastInteraction: new Date().toISOString(),
  treats: 10,
  accessories: [],
  lastLoginDate: "1970-01-01", // Ensures first login gives treats
  consecutiveLoginDays: 0,
  goalsSet: 0,
  goalsCompleted: 0,
  processedOverdueDebtsToday: {},
});

