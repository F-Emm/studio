
"use client";

import { useState, useEffect, useContext } from 'react'; // Added useContext
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Target, PlusCircle, Trash2, CheckCircle2, CalendarIcon, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isValid } from 'date-fns';
import { usePet } from '@/contexts/pet-context'; // Import usePet

export interface Goal { // Exporting Goal interface
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  isComplete: boolean;
}

const initialFormState = {
  id: '',
  name: '',
  targetAmount: '',
  currentAmount: '',
};

export function GoalSetting() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const { processFinancialEvent } = usePet(); // Get pet context function

  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);


  useEffect(() => {
    setIsMounted(true);
    const savedGoals = localStorage.getItem("userGoals");
    if (savedGoals) {
      try {
        const parsedGoals: Goal[] = JSON.parse(savedGoals).map((goal: any) => ({
          ...goal,
          targetDate: goal.targetDate ? new Date(goal.targetDate) : undefined,
        }));
        setGoals(parsedGoals);
      } catch (error) {
        console.error("Error parsing goals from localStorage", error);
        toast({ title: "Error", description: "Could not load saved goals.", variant: "destructive" });
      }
    }
  }, [toast]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("userGoals", JSON.stringify(goals));
    }
  }, [goals, isMounted]);

  const resetForm = () => {
    setGoalName('');
    setTargetAmount('');
    setCurrentAmount('');
    setTargetDate(undefined);
    setEditingGoalId(null);
  };

  const handleAddOrUpdateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim() || !targetAmount) {
      toast({ title: "Input Error", description: "Goal name and target amount are required.", variant: "destructive" });
      return;
    }

    const parsedTargetAmount = parseFloat(targetAmount);
    const parsedCurrentAmount = currentAmount ? parseFloat(currentAmount) : 0;

    if (isNaN(parsedTargetAmount) || parsedTargetAmount <= 0) {
      toast({ title: "Input Error", description: "Target amount must be a positive number.", variant: "destructive" });
      return;
    }
    if (isNaN(parsedCurrentAmount) || parsedCurrentAmount < 0) {
      toast({ title: "Input Error", description: "Current amount must be a non-negative number.", variant: "destructive" });
      return;
    }
    if (parsedCurrentAmount > parsedTargetAmount) {
        toast({ title: "Input Error", description: "Current amount cannot exceed target amount.", variant: "destructive" });
        return;
    }


    if (editingGoalId) {
      // Update existing goal
      setGoals(goals.map(g => g.id === editingGoalId ? {
        ...g,
        name: goalName,
        targetAmount: parsedTargetAmount,
        currentAmount: parsedCurrentAmount,
        targetDate: targetDate,
        isComplete: parsedCurrentAmount >= parsedTargetAmount,
      } : g));
      toast({ title: "Goal Updated", description: `"${goalName}" has been updated.` });
      if(parsedCurrentAmount >= parsedTargetAmount && !goals.find(g => g.id === editingGoalId)?.isComplete){
        processFinancialEvent('goalAchieved');
      }
    } else {
      // Add new goal
      const newGoal: Goal = {
        id: String(Date.now()),
        name: goalName,
        targetAmount: parsedTargetAmount,
        currentAmount: parsedCurrentAmount,
        targetDate: targetDate,
        isComplete: parsedCurrentAmount >= parsedTargetAmount,
      };
      setGoals([newGoal, ...goals]);
      toast({ title: "Goal Added", description: `"${goalName}" has been added.` });
      processFinancialEvent('goalSet');
      if(newGoal.isComplete){
        processFinancialEvent('goalAchieved');
      }
    }
    resetForm();
  };
  
  const handleEditGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setGoalName(goal.name);
    setTargetAmount(String(goal.targetAmount));
    setCurrentAmount(String(goal.currentAmount));
    setTargetDate(goal.targetDate);
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(goals.filter(goal => goal.id !== id));
    toast({ title: "Goal Deleted", description: "The goal has been removed." });
  };

  const handleToggleComplete = (id: string) => {
    let goalAchievedJustNow = false;
    setGoals(goals.map(goal => {
      if (goal.id === id) {
        const newCompleteStatus = !goal.isComplete;
        if (newCompleteStatus && !goal.isComplete) { // Was not complete, now is
            goalAchievedJustNow = true;
        }
        return {
          ...goal,
          isComplete: newCompleteStatus,
          currentAmount: newCompleteStatus ? goal.targetAmount : goal.currentAmount 
        };
      }
      return goal;
    }));

    if (goalAchievedJustNow) {
        processFinancialEvent('goalAchieved');
    }
  };

  if (!isMounted) {
    return (
      <div className="space-y-6 p-6 animate-pulse">
        <div className="h-10 bg-muted rounded w-1/3"></div>
        <div className="h-64 bg-muted rounded-lg"></div>
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="h-40 bg-muted rounded-lg"></div>
          <div className="h-40 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 animate-slide-in-up">
      <Card className="w-full max-w-2xl mx-auto shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <PlusCircle className="mr-2 h-6 w-6 text-primary" />
            {editingGoalId ? 'Edit Goal' : 'Add New Goal'}
          </CardTitle>
          <CardDescription>
            {editingGoalId ? 'Update the details of your financial goal.' : 'Set a new financial goal to work towards.'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAddOrUpdateGoal}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="goalName">Goal Name</Label>
              <Input id="goalName" value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="e.g., Save for Vacation" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="targetAmount">Target Amount ($)</Label>
                <Input id="targetAmount" type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="e.g., 1000" required step="0.01" />
              </div>
              <div>
                <Label htmlFor="currentAmount">Current Amount ($)</Label>
                <Input id="currentAmount" type="number" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} placeholder="e.g., 100" step="0.01" />
              </div>
            </div>
            <div>
              <Label htmlFor="targetDate">Target Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={`w-full justify-start text-left font-normal ${!targetDate && "text-muted-foreground"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {targetDate && isValid(targetDate) ? format(targetDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {editingGoalId && <Button type="button" variant="outline" onClick={resetForm}>Cancel Edit</Button>}
            <Button type="submit">
              {editingGoalId ? 'Update Goal' : 'Add Goal'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <Target className="mr-2 h-5 w-5 text-primary" />
            Your Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <p className="text-muted-foreground text-center">No goals set yet. Add one above to get started!</p>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => {
                const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                return (
                  <Card key={goal.id} className={`shadow-sm ${goal.isComplete ? 'bg-green-50 dark:bg-green-900/30' : ''}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{goal.name}</CardTitle>
                        <div className="flex gap-1">
                           <Button variant="ghost" size="icon" onClick={() => handleEditGoal(goal)} aria-label="Edit goal">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteGoal(goal.id)} aria-label="Delete goal">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        Target: ${goal.targetAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        {goal.targetDate && isValid(goal.targetDate) ? ` | Due: ${format(goal.targetDate, "PPP")}` : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-2">
                        <span className="font-semibold">${goal.currentAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span> saved
                        ({progress.toFixed(1)}%)
                      </div>
                      <Progress value={progress} className="w-full h-2.5" aria-label={`${goal.name} progress: ${progress.toFixed(1)}% complete`} />
                    </CardContent>
                    <CardFooter>
                       <Button variant={goal.isComplete ? "outline" : "default"} size="sm" onClick={() => handleToggleComplete(goal.id)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {goal.isComplete ? 'Mark as Incomplete' : 'Mark as Complete'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
