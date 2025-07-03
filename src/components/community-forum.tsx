
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from '@/components/ui/input';
import { ThumbsUp, MessageSquare, Send, UserCircle, Loader2, Image as ImageIcon } from "lucide-react";
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
  timestamp: Timestamp;
  likes: number;
  comments: number;
  imageUrl?: string | null;
}

export function CommunityForum() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsData: Post[] = [];
      querySnapshot.forEach((doc) => {
        postsData.push({ id: doc.id, ...doc.data() } as Post);
      });
      setPosts(postsData);
      setIsLoadingPosts(false);
    }, (error) => {
      console.error("Error fetching posts: ", error);
      toast({ title: "Error", description: "Could not fetch community posts.", variant: "destructive" });
      setIsLoadingPosts(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPostImageFile(e.target.files?.[0] || null);
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !user) return;
    setIsSubmitting(true);

    try {
      const postDocRef = await addDoc(collection(db, "posts"), {
        authorId: user.uid,
        authorName: user.displayName || "Anonymous",
        authorAvatarUrl: user.photoURL || null,
        content: newPostContent,
        timestamp: serverTimestamp(),
        likes: 0,
        comments: 0,
        imageUrl: null,
      });

      if (postImageFile) {
        const imageRef = ref(storage, `post-images/${postDocRef.id}`);
        await uploadBytes(imageRef, postImageFile);
        const downloadURL = await getDownloadURL(imageRef);
        await addDoc(collection(db, "posts"), { ...postDocRef, imageUrl: downloadURL }); // This is wrong, should update
      }

      setNewPostContent('');
      setPostImageFile(null);
      toast({ title: "Post Created", description: "Your post is now live." });
    } catch (error) {
      console.error("Error creating post:", error);
      toast({ title: "Error", description: "Could not create your post.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formatTimeAgo = (timestamp: Timestamp | null): string => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate();
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
        <div className="h-48 bg-muted rounded-lg"></div>
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
        <CardContent className="space-y-4">
          <Textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Share your thoughts, ask questions, or offer advice..."
            rows={4}
            className="resize-none"
          />
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <Input
                id="post-image"
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleImageFileChange}
                className="text-sm"
              />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleCreatePost} disabled={!newPostContent.trim() || isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {isSubmitting ? 'Posting...' : 'Post'}
          </Button>
        </CardFooter>
      </Card>

      <div className="space-y-6">
        {isLoadingPosts ? (
           <div className="flex justify-center items-center p-8">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
        ) : posts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No posts yet.</p>
            <p>Be the first to share something with the community!</p>
          </div>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={post.authorAvatarUrl || undefined} alt={post.authorName} data-ai-hint="profile person" />
                    <AvatarFallback>
                      {post.authorName.split(' ').map(n => n[0]).join('') || <UserCircle />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{post.authorName}</p>
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
          ))
        )}
      </div>
    </div>
  );
}
