
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Utensils, Home, Car, TrendingUp, CircleDollarSign } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, PieChart, Pie, Cell } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { usePet } from '@/contexts/pet-context'; // Import usePet

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

const initialExpenses: Expense[] = [
  { id: '1', description: 'Groceries', amount: 75.50, category: 'Food', date: new Date().toISOString().split('T')[0] },
  { id: '2', description: 'Gasoline', amount: 40.00, category: 'Transport', date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
  { id: '3', description: 'Online Subscription', amount: 15.00, category: 'Shopping', date: new Date(Date.now() - 2*86400000).toISOString().split('T')[0] },
];

const expenseCategories = ['Food', 'Transport', 'Shopping', 'Housing', 'Utilities', 'Entertainment', 'Other'];
const categoryIcons: { [key: string]: React.ElementType } = {
  Food: Utensils,
  Transport: Car,
  Shopping: ShoppingCart,
  Housing: Home,
  Utilities: CircleDollarSign,
  Entertainment: TrendingUp,
  Other: CircleDollarSign,
};
const categoryColors: { [key: string]: string } = {
  Food: "hsl(var(--chart-1))",
  Transport: "hsl(var(--chart-2))",
  Shopping: "hsl(var(--chart-3))",
  Housing: "hsl(var(--chart-4))",
  Utilities: "hsl(var(--chart-5))",
  Entertainment: "hsl(var(--primary))",
  Other: "hsl(var(--secondary))",
};


const chartConfig = Object.fromEntries(
  expenseCategories.map(category => [
    category.toLowerCase(), 
    { label: category, color: categoryColors[category] }
  ])
) as ChartConfig;


export function ExpenseTracking() {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(expenseCategories[0]);
  const [isMounted, setIsMounted] = useState(false);
  const { processFinancialEvent } = usePet(); // Get pet context function

  useEffect(() => {
    setIsMounted(true);
    // Load expenses from localStorage
    const savedExpenses = localStorage.getItem("userExpenses");
    if (savedExpenses) {
      try {
        setExpenses(JSON.parse(savedExpenses));
      } catch (e) {
        console.error("Error parsing expenses from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("userExpenses", JSON.stringify(expenses));
    }
  }, [expenses, isMounted]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (description && amount) {
      const newExpense: Expense = {
        id: String(Date.now()),
        description,
        amount: parseFloat(amount),
        category,
        date: new Date().toISOString().split('T')[0],
      };
      setExpenses([newExpense, ...expenses]);
      setDescription('');
      setAmount('');
      setCategory(expenseCategories[0]);
      processFinancialEvent('unplannedExpense', { amount: newExpense.amount, category: newExpense.category }); // Pet interaction
    }
  };

  const expensesByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as { [key: string]: number });

  const pieChartData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value,
    fill: categoryColors[name] || categoryColors['Other'],
  }));
  
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (!isMounted) {
    return (
       <div className="space-y-6 p-6 animate-pulse">
        <div className="h-10 bg-muted rounded w-1/4"></div>
        <div className="h-64 bg-muted rounded-lg"></div>
        <div className="h-48 bg-muted rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 animate-slide-in-up">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Add New Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Coffee, Lunch" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount (XAF)</Label>
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 500" required step="1" />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full">Add Expense</Button>
          </form>
        </CardContent>
      </Card>

      {expenses.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline">Spending Overview</CardTitle>
            <CardDescription>Total spent: {totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} XAF</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
             {pieChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie data={pieChartData} dataKey="value" nameKey="name" cy="50%" cx="50%" outerRadius={100} labelLine={false} label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                     {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
             ) : (
                <p className="text-muted-foreground">No expense data to display chart.</p>
             )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.slice(0, 10).map((expense) => { // Show more recent expenses
                  const Icon = categoryIcons[expense.category] || CircleDollarSign;
                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>
                        <span className="flex items-center">
                          <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                          {expense.category}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">{expense.amount.toFixed(2)} XAF</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setExpenses(expenses.filter(e => e.id !== expense.id))}>✕</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center">No expenses recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    