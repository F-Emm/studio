
export interface FirestoreUser {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string | null;
    createdAt: string;
    hasCompletedOnboarding: boolean;
}
