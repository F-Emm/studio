"use client";

import { useState, useEffect } from 'react';
import { summarizeArticle, type SummarizeArticleInput } from '@/ai/flows/summarize-article';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookOpenText } from "lucide-react";

export function ArticleSummarization() {
  const [articleContent, setArticleContent] = useState('');
  const [userInterests, setUserInterests] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleContent.trim()) {
      toast({
        title: "Input Error",
        description: "Please provide article content to summarize.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSummary('');

    try {
      const input: SummarizeArticleInput = {
        articleContent,
        userInterests: userInterests || "general finance", // Default interest if none provided
      };
      const result = await summarizeArticle(input);
      setSummary(result.summary);
    } catch (error) {
      console.error("Error summarizing article:", error);
      toast({
        title: "Summarization Failed",
        description: "Could not summarize the article. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) {
     return (
       <div className="space-y-6 p-6 animate-pulse">
        <div className="h-10 bg-muted rounded w-1/4"></div>
        <div className="h-40 bg-muted rounded-lg"></div>
        <div className="h-20 bg-muted rounded-lg"></div>
        <div className="h-10 bg-primary rounded w-1/5"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 animate-slide-in-up">
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BookOpenText className="mr-2 h-6 w-6 text-primary" />
            Financial Article Summarizer
          </CardTitle>
          <CardDescription>
            Paste a financial article and your interests to get a tailored summary.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="articleContent">Article Content</Label>
              <Textarea
                id="articleContent"
                value={articleContent}
                onChange={(e) => setArticleContent(e.target.value)}
                placeholder="Paste the full text of the financial article here..."
                rows={10}
                className="resize-y"
                required
                aria-required="true"
              />
            </div>
            <div>
              <Label htmlFor="userInterests">Your Financial Interests (Optional)</Label>
              <Input
                id="userInterests"
                value={userInterests}
                onChange={(e) => setUserInterests(e.target.value)}
                placeholder="e.g., stock market, real estate, cryptocurrency"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Summarizing...
                </>
              ) : (
                "Summarize Article"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {summary && (
        <Card className="w-full max-w-2xl mx-auto mt-6 shadow-lg animate-fade-in">
          <CardHeader>
            <CardTitle className="text-xl font-headline">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
