
"use client";

import { usePet } from "@/contexts/pet-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PetStage, PetType, XP_THRESHOLDS, MAX_STAT_VALUE } from "@/types/pet";
import { PawPrint, Bone, Smile, Zap, Edit2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function PetDashboard() {
  const { petProfile, isLoading, gainXp, updateStat, feedPet, renamePet, setPetType } = usePet();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentPetName, setCurrentPetName] = useState(petProfile?.name || "");

  useEffect(() => {
    setIsMounted(true);
    if (petProfile) {
      setCurrentPetName(petProfile.name);
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
    switch (petProfile.stage) {
      case PetStage.HATCHLING: return XP_THRESHOLDS[PetStage.JUVENILE];
      case PetStage.JUVENILE: return XP_THRESHOLDS[PetStage.ADULT];
      case PetStage.ADULT: return XP_THRESHOLDS[PetStage.WISE_ELDER];
      case PetStage.WISE_ELDER: return petProfile.xp; // Max stage
      default: return 0;
    }
  };

  const currentStageXpBase = () => {
    switch (petProfile.stage) {
      case PetStage.HATCHLING: return 0;
      case PetStage.JUVENILE: return XP_THRESHOLDS[PetStage.JUVENILE];
      case PetStage.ADULT: return XP_THRESHOLDS[PetStage.ADULT];
      case PetStage.WISE_ELDER: return XP_THRESHOLDS[PetStage.WISE_ELDER];
      default: return 0;
    }
  }

  const xpTowardsNextStage = petProfile.xp - currentStageXpBase();
  const xpNeededForNextStage = getXpForNextStage() - currentStageXpBase();
  const xpProgressPercent = xpNeededForNextStage > 0 ? (xpTowardsNextStage / xpNeededForNextStage) * 100 : 100;

  const petImagePlaceholder = () => {
    // In a real app, this would be a Lottie animation or dynamic image
    let emoji = "";
    switch (petProfile.type) {
      case PetType.CAT: emoji = petProfile.stage === PetStage.HATCHLING ? "🐱" : petProfile.stage === PetStage.JUVENILE ? "🐈" : "😼"; break;
      case PetType.DRAGON: emoji = petProfile.stage === PetStage.HATCHLING ? "🐲" : petProfile.stage === PetStage.JUVENILE ? "🐉" : "🔥🐲🔥"; break;
      default: emoji = "🐾";
    }
    if (petProfile.happiness < 30) emoji += "😟";
    else if (petProfile.hunger < 30) emoji += "😩";
    else if (petProfile.happiness > 70 && petProfile.hunger > 70) emoji += "😊";
    
    return <div className="text-6xl md:text-8xl my-4 text-center" aria-label={`A ${petProfile.stage} ${petProfile.type}`}>{emoji}</div>;
  };
  
  const handleFeedPet = () => {
    const success = feedPet(1); // Assuming 1 treat per feed
    if (success) {
      toast({ title: "Yum!", description: `${petProfile.name} enjoyed the treat!`});
    } else {
      toast({ title: "Oh no!", description: `Not enough treats to feed ${petProfile.name}.`, variant: "destructive"});
    }
  };

  return (
    <div className="p-4 md:p-6 animate-slide-in-up">
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
              {isEditingName ? (
                <Input 
                  value={currentPetName} 
                  onChange={handleNameChange}
                  className="text-2xl font-headline h-auto p-0 border-0 focus-visible:ring-0"
                  aria-label="Pet name"
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
          <CardDescription>Your friendly financial companion: A {petProfile.stage} {petProfile.type}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {petImagePlaceholder()}
          
          <div>
            <Label htmlFor="xp" className="text-sm font-medium">XP: {petProfile.xp} / {getXpForNextStage()} (Next Stage: {
              petProfile.stage === PetStage.HATCHLING ? PetStage.JUVENILE :
              petProfile.stage === PetStage.JUVENILE ? PetStage.ADULT :
              petProfile.stage === PetStage.ADULT ? PetStage.WISE_ELDER : "Max"
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
           <p className="text-xs text-muted-foreground text-center">Last Fed: {new Date(petProfile.lastFed).toLocaleString()}</p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-3 pt-4 border-t">
          <Button onClick={handleFeedPet} disabled={petProfile.treats <= 0}>
            <Bone className="mr-2 h-4 w-4" /> Feed ({petProfile.treats} Treats)
          </Button>
          <Button onClick={() => gainXp(20)} variant="secondary">
            Simulate Task (+20 XP)
          </Button>
          <Button onClick={() => updateStat('happiness', 10)} variant="outline">
            Play with Pet (+10 😊)
          </Button>
        </CardFooter>
      </Card>
      
      {/* Placeholder for Reward Shop and Accessories - to be built in next iterations */}
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
