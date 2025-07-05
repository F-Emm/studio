
"use client";

import type { User } from 'firebase/auth';
import { createContext, useState, useEffect, useContext, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { SplashScreen } from '@/components/splash-screen';
import type { FirestoreUser } from '@/types/firestore';

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
    // If auth is null (due to missing config), this will cause an error in the console,
    // but it will no longer show the config error screen.
    if (!auth || !db) {
        console.error("Firebase is not configured. The application will not function correctly.");
        setLoading(false);
        // We render children anyway to allow page to load, but auth features will fail.
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
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
        setFirestoreUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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
