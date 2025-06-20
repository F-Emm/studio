
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Landmark, Briefcase, Home, Car, TrendingDown } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, BarChart, Bar } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePet } from '@/contexts/pet-context';
import { isPast, isValid, parseISO } from 'date-fns';

interface Debt {
  id: string;
  name: string;
  category: string;
  totalAmount: number;
  paidAmount: number;
  interestRate: number;
  dueDate?: string;
}

const initialDebts: Debt[] = [
  { id: '1', name: 'Credit Card Loan', category: 'Credit Card', totalAmount: 5000, paidAmount: 1500, interestRate: 18.5 },
  { id: '2', name: 'Student Loan', category: 'Education', totalAmount: 20000, paidAmount: 5000, interestRate: 5.0, dueDate: '2023-12-01' },
  { id: '3', name: 'Mortgage', category: 'Housing', totalAmount: 150000, paidAmount: 30000, interestRate: 3.5, dueDate: '2040-01-15' },
  { id: '4', name: 'Car Loan', category: 'Vehicle', totalAmount: 12000, paidAmount: 6000, interestRate: 7.2, dueDate: '2027-06-30' },
];

const debtCategoryIcons: { [key: string]: React.ElementType } = {
  'Credit Card': Landmark,
  'Education': Briefcase,
  'Housing': Home,
  'Vehicle': Car,
  'Other': TrendingDown,
};

const chartConfig = {
  totalAmount: { label: "Total Debt", color: "hsl(var(--primary))" },
  paidAmount: { label: "Paid Amount", color: "hsl(var(--accent))" },
} satisfies ChartConfig;

export function DebtOverview() {
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [newDebt, setNewDebt] = useState({ name: '', category: 'Other', totalAmount: '', paidAmount: '', interestRate: '', dueDate: '' });
  const [isMounted, setIsMounted] = useState(false);
  const { processFinancialEvent } = usePet();

  useEffect(() => {
    setIsMounted(true);
    const savedDebts = localStorage.getItem("userDebts");
    if (savedDebts) {
        try {
            setDebts(JSON.parse(savedDebts));
        } catch (e) {
            console.error("Error parsing debts from localStorage", e)
        }
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("userDebts", JSON.stringify(debts));
      debts.forEach(debt => {
        if (debt.dueDate) {
            const dueDateObj = parseISO(debt.dueDate);
            if (isValid(dueDateObj) && isPast(dueDateObj)) {
                processFinancialEvent('debtOverdue', { debtId: debt.id, debtName: debt.name });
            }
        }
      });
    }
  }, [debts, isMounted, processFinancialEvent]);


  const handleAddDebt = () => {
    if (newDebt.name && newDebt.totalAmount && newDebt.paidAmount && newDebt.interestRate) {
      const debtToAdd: Debt = {
        id: String(Date.now()),
        name: newDebt.name,
        category: newDebt.category,
        totalAmount: parseFloat(newDebt.totalAmount),
        paidAmount: parseFloat(newDebt.paidAmount),
        interestRate: parseFloat(newDebt.interestRate),
        dueDate: newDebt.dueDate || undefined,
      };
      setDebts([...debts, debtToAdd]);
      setNewDebt({ name: '', category: 'Other', totalAmount: '', paidAmount: '', interestRate: '', dueDate: '' }); 
    }
  };

  const chartData = debts.map(debt => ({
    name: debt.name,
    totalAmount: debt.totalAmount,
    paidAmount: debt.paidAmount,
  }));

  const totalDebtAmount = debts.reduce((sum, debt) => sum + debt.totalAmount, 0);
  const totalPaidAmount = debts.reduce((sum, debt) => sum + debt.paidAmount, 0);
  const overallProgress = totalDebtAmount > 0 ? (totalPaidAmount / totalDebtAmount) * 100 : 0;

  if (!isMounted) {
    return (
      <div className="space-y-6 p-6 animate-pulse">
        <div className="h-10 bg-muted rounded w-1/4"></div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-muted rounded-lg"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 animate-slide-in-up">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <TrendingDown className="mr-2 h-6 w-6 text-primary" />
            Overall Debt Summary
          </CardTitle>
          <CardDescription>
            Total Debt: ${totalDebtAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} | Total Paid: ${totalPaidAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={overallProgress} className="w-full h-4" aria-label={`Overall debt progress: ${overallProgress.toFixed(2)}% paid`} />
          <p className="text-sm text-muted-foreground mt-2 text-center">{overallProgress.toFixed(2)}% of total debt paid</p>
        </CardContent>
      </Card>
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold font-headline">Your Debts</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add New Debt</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Debt</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={newDebt.name} onChange={(e) => setNewDebt({...newDebt, name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">Category</Label>
                <Select value={newDebt.category} onValueChange={(value) => setNewDebt({...newDebt, category: value})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(debtCategoryIcons).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="totalAmount" className="text-right">Total Amount</Label>
                <Input id="totalAmount" type="number" value={newDebt.totalAmount} onChange={(e) => setNewDebt({...newDebt, totalAmount: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paidAmount" className="text-right">Paid Amount</Label>
                <Input id="paidAmount" type="number" value={newDebt.paidAmount} onChange={(e) => setNewDebt({...newDebt, paidAmount: e.target.value})} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="interestRate" className="text-right">Interest Rate (%)</Label>
                <Input id="interestRate" type="number" value={newDebt.interestRate} onChange={(e) => setNewDebt({...newDebt, interestRate: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dueDate" className="text-right">Due Date</Label>
                <Input id="dueDate" type="date" value={newDebt.dueDate} onChange={(e) => setNewDebt({...newDebt, dueDate: e.target.value})} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" onClick={() => { handleAddDebt(); }}>Save Debt</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {debts.map((debt) => {
          const Icon = debtCategoryIcons[debt.category] || TrendingDown;
          const progress = debt.totalAmount > 0 ? (debt.paidAmount / debt.totalAmount) * 100 : 0;
          let isOverdue = false;
          if (debt.dueDate) {
            const dueDateObj = parseISO(debt.dueDate);
            isOverdue = isValid(dueDateObj) && isPast(dueDateObj);
          }
          return (
            <Card key={debt.id} className={`shadow-lg hover:shadow-xl transition-shadow duration-300 ${isOverdue ? 'border-destructive' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-headline flex items-center">
                      <Icon className="mr-2 h-5 w-5 text-primary" />
                      {debt.name}
                    </CardTitle>
                    <CardDescription>{debt.category} - {debt.interestRate}% APR</CardDescription>
                  </div>
                   <Button variant="ghost" size="sm" onClick={() => setDebts(debts.filter(d => d.id !== debt.id))}>✕</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm mb-2">
                  <span className="font-semibold">${debt.paidAmount.toLocaleString()}</span> paid out of ${debt.totalAmount.toLocaleString()}
                </div>
                <Progress value={progress} className="w-full h-2.5" aria-label={`${debt.name} progress: ${progress.toFixed(2)}% paid`} />
                {debt.dueDate && (
                    <p className={`text-xs mt-1 ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                        Due: {new Date(debt.dueDate + 'T00:00:00').toLocaleDateString()} {isOverdue ? '(Overdue!)' : ''}
                    </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {debts.length > 0 && (
        <Card className="shadow-lg mt-6">
          <CardHeader>
            <CardTitle className="text-xl font-headline">Debt Progress Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart accessibilityLayer data={chartData} margin={{left: 10, right: 10}}>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="totalAmount" fill="var(--color-totalAmount)" radius={4} />
                <Bar dataKey="paidAmount" fill="var(--color-paidAmount)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

