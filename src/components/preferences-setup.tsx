
"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Settings, DollarSign, Target, ListChecks, User, Image as ImageIcon, Loader2 } from "lucide-react";
import { usePet } from '@/contexts/pet-context';
import { useAuth } from '@/contexts/auth-context';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { db, storage, auth } from '@/lib/firebase';
import Image from 'next/image';

const preferencesSchema = z.object({
  monthlyIncome: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({invalid_type_error: "Monthly income must be a number"}).positive({ message: "Monthly income must be positive" }).optional()
  ),
  savingsGoalPercentage: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({invalid_type_error: "Savings goal must be a number"}).min(0).max(100, { message: "Savings goal must be between 0 and 100" }).optional()
  ),
  trackedCategories: z.object({
    food: z.boolean().default(false),
    transport: z.boolean().default(false),
    housing: z.boolean().default(false),
    utilities: z.boolean().default(false),
    entertainment: z.boolean().default(false),
  }).default({ food: true, transport: true, housing: false, utilities: false, entertainment: true}),
  enableNotifications: z.boolean().default(true),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

const spendingCategories = [
  { id: "food", label: "Food & Groceries" },
  { id: "transport", label: "Transportation" },
  { id: "housing", label: "Housing & Rent" },
  { id: "utilities", label: "Utilities" },
  { id: "entertainment", label: "Entertainment" },
] as const;

export function PreferencesSetup() {
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const { processFinancialEvent } = usePet();
  const { user } = useAuth();
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting: isSubmittingPrefs } } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      monthlyIncome: undefined,
      savingsGoalPercentage: undefined,
      trackedCategories: {
        food: true,
        transport: true,
        housing: false,
        utilities: false,
        entertainment: true,
      },
      enableNotifications: true,
    }
  });

  useEffect(() => {
    setIsMounted(true);
    if (user) {
      setDisplayName(user.displayName || '');
      setProfileImagePreview(user.photoURL);
    }
    const savedPrefs = localStorage.getItem("userPreferences");
    if (savedPrefs) {
      try {
        const parsedPrefs = JSON.parse(savedPrefs);
        const validationResult = preferencesSchema.safeParse(parsedPrefs);
        if (validationResult.success) {
          reset(validationResult.data);
        }
      } catch (error) {
        console.error("Error parsing preferences from localStorage", error);
      }
    }
  }, [reset, user]);

  const onImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auth.currentUser) return;
    setIsSavingProfile(true);

    try {
      let photoURL = user.photoURL;

      if (profileImageFile) {
        const storageRef = ref(storage, `users/${user.uid}/profilePicture`);
        await uploadBytes(storageRef, profileImageFile);
        photoURL = await getDownloadURL(storageRef);
      }

      await updateProfile(auth.currentUser, { displayName: displayName || 'Anonymous', photoURL });
      await updateDoc(doc(db, "users", user.uid), { displayName, photoURL });

      toast({ title: "Profile Updated", description: "Your profile information has been saved." });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Update Failed", description: `Could not save your profile. ${error.message}`, variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onBudgetSubmit = (data: PreferencesFormData) => {
    localStorage.setItem("userPreferences", JSON.stringify(data));
    toast({
      title: "Preferences Saved",
      description: "Your budgeting preferences have been updated.",
    });
    processFinancialEvent('budgetSaved');
  };

  if (!isMounted) {
    return (
      <div className="max-w-xl mx-auto p-4 md:p-6 space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded w-1/3"></div>
        <div className="h-64 bg-muted rounded-lg"></div>
        <div className="h-10 bg-primary rounded w-1/4 self-end"></div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 space-y-8 animate-slide-in-up">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <User className="mr-2 h-6 w-6 text-primary" />
            Profile Settings
          </CardTitle>
          <CardDescription>
            Update your public profile information.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleProfileUpdate}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4">
                {profileImagePreview ? (
                  <Image src={profileImagePreview} alt="Profile preview" width={64} height={64} className="rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <Input id="profileImage" type="file" accept="image/png, image/jpeg" onChange={onImageFileChange} className="max-w-xs" />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? <Loader2 className="animate-spin" /> : "Save Profile"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Settings className="mr-2 h-6 w-6 text-primary" />
            Budgeting Preferences
          </CardTitle>
          <CardDescription>
            Set up your financial preferences to personalize your Ascendia experience.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onBudgetSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="monthlyIncome" className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />Monthly Income (XAF, Optional)</Label>
              <Controller
                name="monthlyIncome"
                control={control}
                render={({ field }) => <Input id="monthlyIncome" type="number" placeholder="e.g., 300000" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} value={field.value ?? ""} />}
              />
              {errors.monthlyIncome && <p className="text-sm text-destructive">{errors.monthlyIncome.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="savingsGoalPercentage" className="flex items-center"><Target className="mr-2 h-4 w-4 text-muted-foreground" />Savings Goal (% of Income, Optional)</Label>
               <Controller
                name="savingsGoalPercentage"
                control={control}
                render={({ field }) => <Input id="savingsGoalPercentage" type="number" placeholder="e.g., 20" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} value={field.value ?? ""} />}
              />
              {errors.savingsGoalPercentage && <p className="text-sm text-destructive">{errors.savingsGoalPercentage.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center"><ListChecks className="mr-2 h-4 w-4 text-muted-foreground" />Tracked Spending Categories</Label>
              <div className="space-y-2 rounded-md border p-4 shadow-sm bg-background">
                {spendingCategories.map((category) => (
                  <Controller
                    key={category.id}
                    name={`trackedCategories.${category.id}`}
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor={`category-${category.id}`} className="font-normal">{category.label}</Label>
                      </div>
                    )}
                  />
                ))}
              </div>
            </div>
            
            <Controller
                name="enableNotifications"
                control={control}
                render={({ field }) => (
                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                        id="enableNotifications"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="enableNotifications" className="font-normal">Enable payment reminders and goal updates</Label>
                    </div>
                )}
            />

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmittingPrefs}>
              {isSubmittingPrefs ? "Saving..." : "Save Preferences"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
