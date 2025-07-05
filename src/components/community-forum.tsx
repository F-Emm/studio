
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDocs, setDoc } from 'firebase/firestore';
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
import type { FirestoreUser } from '@/types/firestore';

// --- Interfaces ---
interface Post {
  id: string;
  authorId: string;
  content: string;
  timestamp: Timestamp;
  imageUrl?: string | null;
  imagePath?: string;
  likedBy: string[];
}

interface Comment {
    id: string;
    authorId: string;
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
function CommentsSheet({ post, userProfiles }: { post: Post, userProfiles: Record<string, FirestoreUser> }) {
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
            if (error.code !== 'permission-denied') {
                console.error("Error fetching comments: ", error);
            }
        });

        return () => unsubscribe();
    }, [post.id, user]);

    const handleAddComment = async () => {
        if (!newComment.trim() || !user) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "posts", post.id, "comments"), {
                authorId: user.uid,
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
    
    const authorName = userProfiles[post.authorId]?.displayName || "a user";

    return (
        <SheetContent className="flex flex-col">
            <SheetHeader>
                <SheetTitle>Comments on {authorName}'s post</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto pr-6 space-y-4">
                 {comments.length > 0 ? comments.map(comment => {
                     const commentAuthor = userProfiles[comment.authorId];
                     return (
                     <div key={comment.id} className="flex items-start space-x-3">
                         <Avatar className="h-8 w-8">
                             <AvatarImage src={commentAuthor?.photoURL || undefined} alt={commentAuthor?.displayName} />
                             <AvatarFallback>{commentAuthor?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                         </Avatar>
                         <div className="bg-muted p-3 rounded-lg flex-1">
                             <div className="flex justify-between items-baseline">
                                 <p className="font-semibold text-sm">{commentAuthor?.displayName || 'User'}</p>
                                 <p className="text-xs text-muted-foreground">{formatTimeAgo(comment.timestamp)}</p>
                             </div>
                             <p className="text-sm">{comment.content}</p>
                         </div>
                     </div>
                 )}) : <p className="text-muted-foreground text-center py-8">No comments yet.</p>}
            </div>
            {user && (
                 <div className="mt-auto p-4 border-t bg-background">
                    <div className="flex gap-2">
                        <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." rows={2} disabled={!user || isSubmitting}/>
                        <Button onClick={handleAddComment} disabled={!user || isSubmitting || !newComment.trim()}>
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
  const { user, firestoreUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [userProfiles, setUserProfiles] = useState<Record<string, FirestoreUser>>({});

  useEffect(() => {
    setIsMounted(true);
    
    // Fetch all user profiles and listen for changes
    const usersRef = collection(db, "users");
    const unsubProfiles = onSnapshot(usersRef, (snapshot) => {
        const profiles: Record<string, FirestoreUser> = {};
        snapshot.forEach(doc => {
            profiles[doc.id] = doc.data() as FirestoreUser;
        });
        setUserProfiles(profiles);
    }, (error) => {
        console.error("Error fetching user profiles: ", error);
        toast({ title: "Error", description: "Could not load user profiles.", variant: "destructive" });
    });

    if (!user) {
        setPosts([]);
        setIsLoadingPosts(false);
        return () => unsubProfiles();
    }
    
    setIsLoadingPosts(true);
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    
    const unsubPosts = onSnapshot(q, (querySnapshot) => {
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
        }).catch(error => {
           if (error.code !== 'permission-denied') {
             console.error("Error fetching comment counts for post " + doc.id, error);
           }
        });
        commentCountPromises.push(promise);
      });
      
      Promise.all(commentCountPromises)
        .then(() => {
          setPosts(postsData);
          setIsLoadingPosts(false);
        })
        .catch(error => {
            if (error.code !== 'permission-denied') {
                console.error("Error fetching comment counts:", error);
                toast({ title: "Error", description: "Could not load comment counts.", variant: "destructive" });
            }
            setPosts(postsData);
            setIsLoadingPosts(false);
        });

    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.error("Error fetching posts: ", error);
        toast({ title: "Error", description: "Could not fetch community posts.", variant: "destructive" });
      }
      setIsLoadingPosts(false);
    });

    return () => {
        unsubPosts();
        unsubProfiles();
    };
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
      let imagePathValue: string | null = null;
      
      const postDocRef = doc(collection(db, "posts"));

      if (postImageFile) {
        imagePathValue = `posts/${postDocRef.id}/${uuidv4()}`;
        const storageRef = ref(storage, imagePathValue);
        const uploadTask = uploadBytesResumable(storageRef, postImageFile);

        downloadURL = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot: UploadTaskSnapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              reject(error);
            },
            async () => {
              try {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      }
      
      await setDoc(postDocRef, {
        authorId: user.uid,
        content: newPostContent,
        timestamp: serverTimestamp(),
        likedBy: [],
        imageUrl: downloadURL,
        imagePath: imagePathValue,
      });
      
      setNewPostContent('');
      setPostImageFile(null);
      const fileInput = document.getElementById('post-image') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      toast({ title: "Post Created", description: "Your post is now live." });
    } catch (error: any) {
      console.error("Error creating post:", error);
      let errorMessage = "Could not create your post. Please try again.";
      if (error.code === 'storage/unauthorized') {
        errorMessage = "Image upload failed. This is a permissions error. Please check your Firebase Storage rules in your Firebase Console and ensure your `.env.local` configuration is correct.";
      }
      toast({ title: "Error Creating Post", description: errorMessage, variant: "destructive", duration: 9000 });
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
        // TODO: Delete comments subcollection for production apps
        await deleteDoc(doc(db, "posts", post.id));
        toast({ title: "Post Deleted", description: "Your post has been removed."});
    } catch (error) {
        console.error("Error deleting post: ", error);
        toast({ title: "Error", description: "Could not delete post.", variant: "destructive"});
    }
  }
  
  if (!isMounted || authLoading) {
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
            disabled={!firestoreUser || isSubmitting}
          />
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <Input
                id="post-image"
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleImageFileChange}
                className="text-sm"
                disabled={!firestoreUser || isSubmitting}
              />
          </div>
          {uploadProgress !== null && (
              <Progress value={uploadProgress} className="h-2" />
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleCreatePost} disabled={!firestoreUser || !newPostContent.trim() || isSubmitting}>
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
          posts.map((post) => {
            const author = userProfiles[post.authorId];
            return (
            <Card key={post.id} className="shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Avatar>
                            <AvatarImage src={author?.photoURL || undefined} alt={author?.displayName} data-ai-hint="profile person" />
                            <AvatarFallback>
                            {author?.displayName?.split(' ').map(n => n[0]).join('') || <UserCircle />}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-sm">{author?.displayName || 'Loading...'}</p>
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
                <Button variant="ghost" size="sm" className="flex items-center gap-1.5" onClick={() => handleLikePost(post.id)} disabled={!user}>
                  <ThumbsUp className={`h-4 w-4 ${post.likedBy.includes(user?.uid || '') ? 'text-primary fill-primary' : ''}`} /> {post.likedBy.length}
                </Button>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex items-center gap-1.5" disabled={!user}>
                            <MessageSquare className="h-4 w-4" /> {commentCounts[post.id] || 0}
                        </Button>
                    </SheetTrigger>
                    <CommentsSheet post={post} userProfiles={userProfiles} />
                </Sheet>
              </CardFooter>
            </Card>
          )})
        )}
      </div>
    </div>
  );
}
