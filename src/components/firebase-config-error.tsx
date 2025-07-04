
"use client";

import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLogo } from './app-logo';

export function FirebaseConfigErrorScreen() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4">
                <AppLogo />
            </div>
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <AlertTriangle className="h-7 w-7 text-destructive" />
                Configuration Needed
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <CardDescription className="text-center text-lg">
                Your Firebase project configuration is missing.
            </CardDescription>
            <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground space-y-2">
                <p>To run the app, you need to provide your Firebase project keys:</p>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Open the <code className="font-mono bg-muted px-1 py-0.5 rounded">.env.local</code> file in your project.</li>
                    <li>
                        Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Firebase Console</a> and navigate to <strong>Project settings</strong> (Gear icon ⚙️).
                    </li>
                    <li>
                        In the "Your apps" card, find your web app's <strong>Firebase SDK snippet</strong> and select the <strong>Config</strong> option.
                    </li>
                    <li>
                        Copy the configuration values (apiKey, authDomain, etc.) into the corresponding variables in your <code className="font-mono bg-muted px-1 py-0.5 rounded">.env.local</code> file.
                    </li>
                </ol>
            </div>
             <p className="text-center text-xs text-muted-foreground">After saving the file, you may need to restart the application.</p>
        </CardContent>
      </Card>
    </div>
  );
}
