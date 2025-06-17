"use client";

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, MessageSquare, Send, UserCircle } from "lucide-react";
import Image from 'next/image';

interface Post {
  id: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
  content: string;
  timestamp: Date;
  likes: number;
  comments: number;
  imageUrl?: string;
}

const initialPosts: Post[] = [
  {
    id: '1',
    user: { name: 'Alice Wonderland', avatarUrl: 'https://placehold.co/40x40.png?text=AW' },
    content: "Just started using Ascendia Lite to track my debts. It's so much clearer now! Anyone have tips for tackling credit card debt?",
    timestamp: new Date(Date.now() - 3600000 * 2), // 2 hours ago
    likes: 15,
    comments: 4,
    imageUrl: "https://placehold.co/600x400.png" ,
  },
  {
    id: '2',
    user: { name: 'Bob The Budgeter' },
    content: "My favorite feature is the expense tracking. Seeing where my money goes each month in a pie chart is eye-opening!",
    timestamp: new Date(Date.now() - 3600000 * 5), // 5 hours ago
    likes: 22,
    comments: 7,
  },
  {
    id: '3',
    user: { name: 'Charlie Saver', avatarUrl: 'https://placehold.co/40x40.png?text=CS' },
    content: "The article summarizer is a game changer for staying updated on financial news without spending hours reading.",
    timestamp: new Date(Date.now() - 3600000 * 24), // 1 day ago
    likes: 30,
    comments: 12,
  },
];

export function CommunityForum() {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [newPostContent, setNewPostContent] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCreatePost = () => {
    if (newPostContent.trim()) {
      const newPost: Post = {
        id: String(Date.now()),
        user: { name: 'CurrentUser', avatarUrl: 'https://placehold.co/40x40.png?text=ME' }, // Placeholder for logged-in user
        content: newPostContent,
        timestamp: new Date(),
        likes: 0,
        comments: 0,
      };
      setPosts([newPost, ...posts]);
      setNewPostContent('');
    }
  };
  
  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };


  if (!isMounted) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6 animate-pulse">
        <div className="h-32 bg-muted rounded-lg"></div>
        {[1,2,3].map(i => (
          <div key={i} className="h-48 bg-muted rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6 animate-slide-in-up">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Create New Post</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Share your thoughts, ask questions, or offer advice..."
            rows={4}
            className="resize-none"
          />
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleCreatePost} disabled={!newPostContent.trim()}>
            <Send className="mr-2 h-4 w-4" /> Post
          </Button>
        </CardFooter>
      </Card>

      <div className="space-y-6">
        {posts.map((post) => (
          <Card key={post.id} className="shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={post.user.avatarUrl} alt={post.user.name} data-ai-hint="profile person" />
                  <AvatarFallback>
                    {post.user.name.split(' ').map(n => n[0]).join('') || <UserCircle />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{post.user.name}</p>
                  <p className="text-xs text-muted-foreground">{formatTimeAgo(post.timestamp)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
              {post.imageUrl && (
                <div className="mt-4 rounded-lg overflow-hidden">
                  <Image src={post.imageUrl} alt="Post image" width={600} height={400} className="object-cover w-full h-auto" data-ai-hint="community finance" />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between items-center text-sm text-muted-foreground pt-4 border-t">
              <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
                <ThumbsUp className="h-4 w-4" /> {post.likes} Likes
              </Button>
              <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" /> {post.comments} Comments
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
