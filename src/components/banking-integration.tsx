
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Banknote, Link as LinkIcon, CreditCard, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

const subFeatures = [
  { name: "Link External Accounts", icon: LinkIcon, hint: "connect bank" },
  { name: "In-App Payments", icon: CreditCard, hint: "pay bills" },
  { name: "Account Balance Sync", icon: RefreshCw, hint: "update balance" },
];

export function BankingIntegration() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="space-y-6 p-4 md:p-6 animate-pulse">
        <div className="h-12 w-12 bg-muted rounded-full mx-auto mb-4"></div>
        <div className="h-10 bg-muted rounded w-1/3 mx-auto"></div>
        <div className="h-6 bg-muted rounded w-2/3 mx-auto"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-lg p-6">
              <div className="h-6 w-1/4 bg-muted/50 rounded ml-auto mb-2"></div>
              <div className="h-10 w-10 bg-muted/50 rounded-full mx-auto mb-3"></div>
              <div className="h-6 w-3/4 bg-muted/50 rounded mx-auto"></div>
            </div>
          ))}
        </div>
        <div className="h-12 bg-primary/50 rounded w-1/4 mx-auto mt-10"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 animate-slide-in-up">
      <Card className="w-full max-w-4xl mx-auto shadow-xl overflow-hidden bg-card">
        <CardHeader className="text-center pt-8 pb-6 bg-muted/20">
          <div className="flex justify-center mb-4">
            <Banknote className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl lg:text-4xl font-headline">Banking Integration</CardTitle>
          <CardDescription className="text-md lg:text-lg text-muted-foreground mt-2">
            Banking tools are on the way—stay tuned!
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {subFeatures.map((feature) => (
              <div
                key={feature.name}
                className="p-6 border rounded-xl relative bg-background shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col items-center text-center"
              >
                <Badge
                  variant="secondary"
                  className="absolute top-3 right-3"
                >
                  Coming Soon
                </Badge>
                <feature.icon className="h-12 w-12 mb-4 text-primary opacity-75" />
                <h3 className="text-xl font-semibold text-foreground opacity-60">
                  {feature.name}
                </h3>
              </div>
            ))}
          </div>
          <div className="text-center pt-6">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* Wrap disabled button in a span for tooltip to work */}
                  <span tabIndex={0}>
                    <Button disabled size="lg" className="bg-primary/70 hover:bg-primary/70 cursor-not-allowed">
                        Notify Me
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>We’ll let you know when Banking Integration goes live.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
