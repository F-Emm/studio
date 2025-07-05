
"use client";

import type { User } from 'firebase/auth';
import { createContext, useState, useEffect, useContext, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
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
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    // This is the crucial check. If firebase.ts failed to initialize, auth and db will be null.
    if (!auth || !db) {
      setConfigError(true);
      setLoading(false);
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

  if (configError) {
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
