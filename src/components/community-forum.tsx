
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, type UploadTaskSnapshot } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from '@/components/ui/input';
import { ThumbsUp, MessageSquare, Send, UserCircle, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Progress } from './ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';

// --- Interfaces ---
interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
  timestamp: Timestamp;
  imageUrl?: string | null;
  imagePath?: string;
  likedBy: string[];
}

interface Comment {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatarUrl?: string | null;
    content: string;
    timestamp: Timestamp;
}

// --- Helper Functions ---
const formatTimeAgo = (timestamp: Timestamp | null): string => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate();
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
  };


// --- Comments Component ---
function CommentsSheet({ post }: { post: Post }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!user) {
            setComments([]);
            return;
        }

        const commentsRef = collection(db, "posts", post.id, "comments");
        const q = query(commentsRef, orderBy("timestamp", "asc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
        }, (error) => {
            console.error("Error fetching comments: ", error);
            // This can happen on logout if the listener is still active, so we don't toast.
        });

        return () => unsubscribe();
    }, [post.id, user]);

    const handleAddComment = async () => {
        if (!newComment.trim() || !user) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "posts", post.id, "comments"), {
                authorId: user.uid,
                authorName: user.displayName || "Anonymous",
                authorAvatarUrl: user.photoURL || null,
                content: newComment,
                timestamp: serverTimestamp(),
            });
            setNewComment("");
        } catch (error) {
            toast({ title: "Error", description: "Could not add comment.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <SheetContent className="flex flex-col">
            <SheetHeader>
                <SheetTitle>Comments on {post.authorName}'s post</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto pr-6 space-y-4">
                 {comments.length > 0 ? comments.map(comment => (
                     <div key={comment.id} className="flex items-start space-x-3">
                         <Avatar className="h-8 w-8">
                             <AvatarImage src={comment.authorAvatarUrl || undefined} alt={comment.authorName} />
                             <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                         </Avatar>
                         <div className="bg-muted p-3 rounded-lg flex-1">
                             <div className="flex justify-between items-baseline">
                                 <p className="font-semibold text-sm">{comment.authorName}</p>
                                 <p className="text-xs text-muted-foreground">{formatTimeAgo(comment.timestamp)}</p>
                             </div>
                             <p className="text-sm">{comment.content}</p>
                         </div>
                     </div>
                 )) : <p className="text-muted-foreground text-center py-8">No comments yet.</p>}
            </div>
            {user && (
                 <div className="mt-auto p-4 border-t bg-background">
                    <div className="flex gap-2">
                        <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." rows={2} />
                        <Button onClick={handleAddComment} disabled={isSubmitting || !newComment.trim()}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                        </Button>
                    </div>
                </div>
            )}
        </SheetContent>
    );
}


// --- Main Forum Component ---
export function CommunityForum() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    setIsMounted(true);

    if (!user) {
        setPosts([]);
        setIsLoadingPosts(false);
        return;
    }
    
    setIsLoadingPosts(true);
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsData: Post[] = [];
      const commentCountPromises: Promise<void>[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        postsData.push({
          id: doc.id,
          ...data,
          likedBy: data.likedBy || [],
        } as Post);
        
        const commentsRef = collection(db, "posts", doc.id, "comments");
        const promise = getDocs(commentsRef).then(commentsSnapshot => {
            setCommentCounts(prev => ({...prev, [doc.id]: commentsSnapshot.size }));
        });
        commentCountPromises.push(promise);
      });
      
      Promise.all(commentCountPromises).then(() => {
        setPosts(postsData);
        setIsLoadingPosts(false);
      });

    }, (error) => {
      console.error("Error fetching posts: ", error);
      // Don't toast permission errors, as they can happen during logout.
      if (error.code !== 'permission-denied') {
        toast({ title: "Error", description: "Could not fetch community posts.", variant: "destructive" });
      }
      setIsLoadingPosts(false);
    });

    return () => unsubscribe();
  }, [toast, user]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPostImageFile(e.target.files?.[0] || null);
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !user) return;
    setIsSubmitting(true);
    setUploadProgress(null);

    try {
        let downloadURL: string | null = null;
        let imagePath: string | null = null;

        const postDocRef = await addDoc(collection(db, "posts"), {
            authorId: user.uid,
            authorName: user.displayName || "Anonymous",
            authorAvatarUrl: user.photoURL || null,
            content: newPostContent,
            timestamp: serverTimestamp(),
            likedBy: [],
            imageUrl: null,
            imagePath: null
        });

        if (postImageFile) {
            imagePath = `posts/${postDocRef.id}/${uuidv4()}`;
            const storageRef = ref(storage, imagePath);
            const uploadTask = uploadBytesResumable(storageRef, postImageFile);
            
            await new Promise<void>((resolve, reject) => {
                uploadTask.on('state_changed', 
                    (snapshot: UploadTaskSnapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(progress);
                    },
                    (error) => {
                        console.error("Upload failed", error);
                        reject(error);
                    },
                    async () => {
                        downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        await updateDoc(postDocRef, {
                            imageUrl: downloadURL,
                            imagePath: imagePath,
                        });
                        resolve();
                    }
                );
            });
        }
        
      setNewPostContent('');
      setPostImageFile(null);
      const fileInput = document.getElementById('post-image') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      toast({ title: "Post Created", description: "Your post is now live." });
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast({ title: "Error", description: `Could not create your post. ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;
    const postRef = doc(db, "posts", postId);
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.likedBy.includes(user.uid)) {
        await updateDoc(postRef, { likedBy: arrayRemove(user.uid) });
    } else {
        await updateDoc(postRef, { likedBy: arrayUnion(user.uid) });
    }
  };

  const handleDeletePost = async (post: Post) => {
    if (!user || user.uid !== post.authorId) return;
    try {
        if (post.imagePath) {
            const imageRef = ref(storage, post.imagePath);
            await deleteObject(imageRef);
        }
        // Also delete comments subcollection if needed - for now just delete the post
        await deleteDoc(doc(db, "posts", post.id));
        toast({ title: "Post Deleted", description: "Your post has been removed."});
    } catch (error) {
        console.error("Error deleting post: ", error);
        toast({ title: "Error", description: "Could not delete post.", variant: "destructive"});
    }
  }
  
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
          {uploadProgress !== null && (
              <Progress value={uploadProgress} className="h-2" />
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleCreatePost} disabled={!newPostContent.trim() || isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {isSubmitting ? (uploadProgress !== null ? `Uploading... ${Math.round(uploadProgress)}%` : 'Posting...') : 'Post'}
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
                <div className="flex items-center justify-between">
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
                    {user?.uid === post.authorId && (
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your post and its associated image.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDeletePost(post)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                       </AlertDialog>
                    )}
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
              <CardFooter className="flex justify-start items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
                <Button variant="ghost" size="sm" className="flex items-center gap-1.5" onClick={() => handleLikePost(post.id)}>
                  <ThumbsUp className={`h-4 w-4 ${post.likedBy.includes(user?.uid || '') ? 'text-primary fill-primary' : ''}`} /> {post.likedBy.length}
                </Button>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
                            <MessageSquare className="h-4 w-4" /> {commentCounts[post.id] || 0}
                        </Button>
                    </SheetTrigger>
                    <CommentsSheet post={post} />
                </Sheet>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
