
"use client";

import { usePet } from "@/contexts/pet-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PetStage, PetType, XP_THRESHOLDS, MAX_STAT_VALUE } from "@/types/pet";
import type { Goal } from "@/components/goal-setting"; // Assuming Goal type is exported
import { PawPrint, Bone, Smile, Zap, Edit2, Save, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, isValid, isPast } from 'date-fns';


export function PetDashboard() {
  const { petProfile, isLoading, gainXp, updateStat, feedPet, renamePet, setPetType } = usePet();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentPetName, setCurrentPetName] = useState(petProfile?.name || "");
  const [overdueGoals, setOverdueGoals] = useState<Goal[]>([]);

  useEffect(() => {
    setIsMounted(true);
    if (petProfile) {
      setCurrentPetName(petProfile.name);
    }
    // Check for overdue goals
    const savedGoalsString = localStorage.getItem("userGoals");
    if (savedGoalsString) {
      try {
        const savedGoals: Goal[] = JSON.parse(savedGoalsString).map((g: any) => ({
            ...g,
            targetDate: g.targetDate ? new Date(g.targetDate) : undefined
        }));
        const now = new Date();
        const overdue = savedGoals.filter(goal => 
          !goal.isComplete && goal.targetDate && isValid(goal.targetDate) && isPast(goal.targetDate)
        );
        setOverdueGoals(overdue);
      } catch (e) {
        console.error("Error parsing goals for pet dashboard", e);
      }
    }
  }, [petProfile]);

  if (isLoading || !isMounted) {
    return (
      <div className="space-y-6 p-6 animate-pulse">
        <Card className="shadow-lg">
          <CardHeader><div className="h-8 bg-muted rounded w-1/2"></div></CardHeader>
          <CardContent className="space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted rounded"></div>)}
          </CardContent>
          <CardFooter className="flex gap-2">
            <div className="h-10 bg-primary/50 rounded w-24"></div>
            <div className="h-10 bg-primary/50 rounded w-24"></div>
            <div className="h-10 bg-primary/50 rounded w-24"></div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!petProfile) {
    return <div className="p-6">Error loading pet profile. Please try refreshing.</div>;
  }
  
  const handleRename = () => {
    if (isEditingName) {
      if (currentPetName.trim() !== petProfile.name && currentPetName.trim() !== "") {
        renamePet(currentPetName.trim());
        toast({ title: "Pet Renamed", description: `Your pet is now called ${currentPetName.trim()}!` });
      }
      setIsEditingName(false);
    } else {
      setIsEditingName(true);
    }
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPetName(e.target.value);
  };

  const getXpForNextStage = () => {
    if (!petProfile) return 0;
    switch (petProfile.stage) {
      case PetStage.HATCHLING: return XP_THRESHOLDS[PetStage.JUVENILE];
      case PetStage.JUVENILE: return XP_THRESHOLDS[PetStage.ADULT];
      case PetStage.ADULT: return XP_THRESHOLDS[PetStage.WISE_ELDER];
      case PetStage.WISE_ELDER: return petProfile.xp; 
      default: return 0;
    }
  };

  const currentStageXpBase = () => {
    if (!petProfile) return 0;
    switch (petProfile.stage) {
      case PetStage.HATCHLING: return 0;
      case PetStage.JUVENILE: return XP_THRESHOLDS[PetStage.JUVENILE]; // XP needed to reach this stage
      case PetStage.ADULT: return XP_THRESHOLDS[PetStage.ADULT];
      case PetStage.WISE_ELDER: return XP_THRESHOLDS[PetStage.WISE_ELDER];
      default: return 0;
    }
  }

  const xpTowardsNextStage = petProfile.xp - currentStageXpBase();
  const xpNeededForThisStageToEvolve = getXpForNextStage() - currentStageXpBase();
  const xpProgressPercent = xpNeededForThisStageToEvolve > 0 ? (xpTowardsNextStage / xpNeededForThisStageToEvolve) * 100 : (petProfile.stage === PetStage.WISE_ELDER ? 100 : 0);


  const petImagePlaceholder = () => {
    let emoji = "";
    switch (petProfile.type) {
      case PetType.CAT: emoji = petProfile.stage === PetStage.HATCHLING ? "🐱" : petProfile.stage === PetStage.JUVENILE ? "🐈" : petProfile.stage === PetStage.ADULT ? "😼" : "👑🐱"; break;
      case PetType.DRAGON: emoji = petProfile.stage === PetStage.HATCHLING ? "🥚" : petProfile.stage === PetStage.JUVENILE ? "🐲" : petProfile.stage === PetStage.ADULT ? "🐉" : "🔥🐲🔥"; break;
      default: emoji = "🐾";
    }
    if (petProfile.hunger < 30) emoji += "😩"; // Hungry
    else if (petProfile.happiness < 30) emoji += "😟"; // Unhappy
    else if (petProfile.energy < 20) emoji += "😴"; // Sleepy
    else if (petProfile.happiness > 70 && petProfile.hunger > 70) emoji += "😊"; // Happy and fed
    
    return <div className="text-6xl md:text-8xl my-4 text-center" aria-label={`A ${petProfile.stage} ${petProfile.type} named ${petProfile.name}`}>{emoji}</div>;
  };
  
  const handlePlayWithPet = () => {
    if (petProfile.energy >= 10) {
      updateStat('happiness', 15);
      updateStat('energy', -10);
      toast({ title: "Playtime!", description: `${petProfile.name} had fun playing! +15 Happiness, -10 Energy.` });
    } else {
      toast({ title: "Too Tired", description: `${petProfile.name} is too tired to play right now.`, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 md:p-6 animate-slide-in-up">
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-start">
             <div className="flex items-center gap-2">
              {isEditingName ? (
                <Input 
                  value={currentPetName} 
                  onChange={handleNameChange}
                  className="text-2xl font-headline h-auto p-0 border-0 focus-visible:ring-0"
                  aria-label="Pet name"
                  onBlur={handleRename} // Save on blur
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
                />
              ) : (
                <CardTitle className="text-2xl font-headline flex items-center">
                  <PawPrint className="mr-2 h-6 w-6 text-primary" />
                  {petProfile.name}
                </CardTitle>
              )}
              <Button variant="ghost" size="icon" onClick={handleRename} aria-label={isEditingName ? "Save name" : "Edit name"}>
                {isEditingName ? <Save className="h-5 w-5"/> : <Edit2 className="h-5 w-5"/>}
              </Button>
            </div>
             <Select value={petProfile.type} onValueChange={(value) => setPetType(value as PetType)}>
                <SelectTrigger className="w-[120px] text-xs h-8">
                    <SelectValue placeholder="Pet Type" />
                </SelectTrigger>
                <SelectContent>
                    {Object.values(PetType).map(type => (
                        <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <CardDescription>Your friendly financial companion: A {petProfile.stage} {petProfile.type}. Treats: {petProfile.treats}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {petImagePlaceholder()}
          
          <div>
            <Label htmlFor="xp" className="text-sm font-medium">XP: {petProfile.xp} / {getXpForNextStage()} (Next Stage: {
              petProfile.stage === PetStage.HATCHLING ? PetStage.JUVENILE :
              petProfile.stage === PetStage.JUVENILE ? PetStage.ADULT :
              petProfile.stage === PetStage.ADULT ? PetStage.WISE_ELDER : "Max Stage"
            })</Label>
            <Progress value={xpProgressPercent} id="xp" className="h-3 mt-1" aria-label={`Experience points: ${xpProgressPercent.toFixed(0)}% to next stage`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="hunger" className="text-sm flex items-center"><Bone className="mr-1.5 h-4 w-4 text-orange-500" />Hunger: {petProfile.hunger}/{MAX_STAT_VALUE}</Label>
              <Progress value={petProfile.hunger} id="hunger" className="h-2.5 mt-1 [&>div]:bg-orange-500" aria-label={`Hunger level: ${petProfile.hunger}%`} />
            </div>
            <div>
              <Label htmlFor="happiness" className="text-sm flex items-center"><Smile className="mr-1.5 h-4 w-4 text-green-500" />Happiness: {petProfile.happiness}/{MAX_STAT_VALUE}</Label>
              <Progress value={petProfile.happiness} id="happiness" className="h-2.5 mt-1 [&>div]:bg-green-500" aria-label={`Happiness level: ${petProfile.happiness}%`} />
            </div>
            <div>
              <Label htmlFor="energy" className="text-sm flex items-center"><Zap className="mr-1.5 h-4 w-4 text-yellow-500" />Energy: {petProfile.energy}/{MAX_STAT_VALUE}</Label>
              <Progress value={petProfile.energy} id="energy" className="h-2.5 mt-1 [&>div]:bg-yellow-500" aria-label={`Energy level: ${petProfile.energy}%`} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">Last Fed: {new Date(petProfile.lastFed).toLocaleString()} | Last Interaction: {new Date(petProfile.lastInteraction).toLocaleString()}</p>
          
          {overdueGoals.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-md">
              <h4 className="font-semibold text-yellow-700 dark:text-yellow-300 flex items-center mb-1">
                <AlertCircle className="h-5 w-5 mr-2"/>
                {petProfile.name} reminds you!
              </h4>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">You have overdue goals. Let's get back on track!</p>
              <ul className="list-disc list-inside text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                {overdueGoals.slice(0,2).map(g => <li key={g.id}>{g.name} (Due: {format(g.targetDate!, "PPP")})</li>)}
                {overdueGoals.length > 2 && <li>And {overdueGoals.length-2} more...</li>}
              </ul>
            </div>
          )}

        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-3 pt-4 border-t">
          <Button onClick={() => feedPet(1)} disabled={petProfile.treats <= 0 || petProfile.hunger >= MAX_STAT_VALUE}>
            <Bone className="mr-2 h-4 w-4" /> Feed ({petProfile.treats})
          </Button>
          <Button onClick={() => gainXp(20)} variant="secondary">
            Simulate Task (+20 XP)
          </Button>
          <Button onClick={handlePlayWithPet} variant="outline" disabled={petProfile.energy < 10}>
            Play with Pet
          </Button>
        </CardFooter>
      </Card>
      
      <Card className="w-full max-w-2xl mx-auto shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="text-xl">Reward Shop & Accessories</CardTitle>
          <CardDescription>Coming Soon: Customize your pet!</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Unlock hats, backgrounds, and more for your pet by earning treats!</p>
        </CardContent>
      </Card>

    </div>
  );
}
