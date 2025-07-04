
"use client";

import type { User } from 'firebase/auth';
import { createContext, useState, useEffect, useContext, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import { SplashScreen } from '@/components/splash-screen';
import type { FirestoreUser } from '@/types/firestore';
import { FirebaseConfigErrorScreen } from '@/components/firebase-config-error';

interface AuthContextType {
  user: User | null;
  firestoreUser: FirestoreUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firestoreUser: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firestoreUser, setFirestoreUser] = useState<FirestoreUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If firebase is not configured, don't attempt to connect.
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user && db) {
        // User is logged in, listen for their Firestore document
        const userDocRef = doc(db, 'users', user.uid);
        const unsubFirestore = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setFirestoreUser(doc.data() as FirestoreUser);
          } else {
            console.error("Firestore user document not found!");
            setFirestoreUser(null);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error listening to user document:", error);
          setFirestoreUser(null);
          setLoading(false);
        });
        return () => unsubFirestore();
      } else {
        // User is logged out
        setFirestoreUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Render an actionable error screen if Firebase is not configured.
  // This prevents the rest of the app from rendering and crashing.
  if (!isFirebaseConfigured) {
    return <FirebaseConfigErrorScreen />;
  }

  return (
    <AuthContext.Provider value={{ user, firestoreUser, loading }}>
      {loading ? <SplashScreen /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
