# Ascendia Lite: Personal Finance Companion

Ascendia Lite is a modern, responsive web application designed to empower users on their journey to financial clarity. It provides a suite of tools for debt management, expense tracking, and financial education, all wrapped in a clean, intuitive, and friendly user interface.

## Core Features

*   **Debt Overview**: A clear, consolidated view of all your debts. Track your payoff progress with intuitive visualizations.
*   **Expense Tracking**: Easily log your daily expenses, categorize them, and understand your spending habits with insightful charts.
*   **AI Article Summarizer**: A Genkit-powered AI feature that summarizes financial articles, helping you stay informed quickly.
*   **Community Forum**: A space to connect with other users, share financial tips, ask questions, and support each other.
*   **Financial Goal Setting**: Define, track, and achieve your financial goals, from saving for a vacation to building an emergency fund.
*   **Gamified Pet Companion**: A virtual pet that thrives as you make positive financial decisions, adding a fun, motivational layer to your financial journey.

## Tech Stack

This project is built with a modern, robust, and scalable tech stack:

*   **Framework**: [Next.js](https://nextjs.org/) (App Router)
*   **UI Library**: [React](https://react.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
*   **Generative AI**: [Firebase Genkit](https://firebase.google.com/docs/genkit)
*   **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Storage)
*   **Form Management**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) for validation
*   **Icons**: [Lucide React](https://lucide.dev/)

---

## Project Structure

The codebase is organized to be modular and maintainable. Here's a look at the key directories:

```
/
├── public/                 # Static assets (images, manifest.json, service worker)
├── src/
│   ├── app/                # Next.js App Router: pages, layouts, and API routes
│   ├── ai/                 # Genkit flows and AI-related logic
│   ├── components/         # Reusable React components (UI and feature-specific)
│   ├── contexts/           # React Context providers (Authentication, Pet)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions and Firebase initialization
│   └── types/              # TypeScript type definitions
├── .env.local              # Environment variables (!!! IMPORTANT !!!)
├── next.config.ts          # Next.js configuration
└── package.json            # Project dependencies and scripts
```

---

## Local Setup Guide

Follow these steps to get a copy of the project running on your local machine for development and testing.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or later recommended)
*   `npm` or `yarn` package manager

### 1. Get the Code

If you don't have it, clone the repository to your local machine:
```bash
git clone <repository-url>
cd <repository-directory>
```
*(If you're already in Firebase Studio, you can skip this step.)*

### 2. Install Dependencies

Install all the required npm packages.
```bash
npm install
```

### 3. Set Up Firebase

This is the most crucial step. The app requires a Firebase project to function.

1.  **Create a Firebase Project**: Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Create a Web App**: Inside your project, add a new Web App (</>). Give it a nickname and register it.
3.  **Enable Firebase Services**:
    *   Go to the **Authentication** section and enable the **Email/Password** sign-in method.
    *   Go to the **Firestore Database** section and create a new database. Start in **test mode** for now (you can secure it later).
    *   Go to the **Storage** section and create a new storage bucket.
4.  **Get Firebase Config Keys**: In your Firebase project settings (click the ⚙️ gear icon), under "Your apps", find the Firebase SDK snippet and select the **Config** option. You'll see an object with keys like `apiKey`, `authDomain`, etc.

### 4. Configure Environment Variables

1.  In the root of your project, create a file named `.env.local`.
2.  Copy and paste the following content into it, replacing the `...` placeholders with the keys you got from the Firebase Console in the previous step.

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

**Note**: The `NEXT_PUBLIC_` prefix is essential. It allows Next.js to expose these variables to the browser.

### 5. Configure Firebase Storage Rules

For features like profile picture and community post image uploads to work, you need to update your Firebase Storage security rules.

1.  Go to the **Storage** section in your Firebase Console.
2.  Click on the **Rules** tab.
3.  Replace the existing rules with the following to allow authenticated users to read and write content:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow public reads for user-generated content
    match /users/{userId}/{allPaths=**} {
      allow read;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /posts/{postId}/{allPaths=**} {
      allow read;
      allow write: if request.auth != null;
    }
  }
}
```
4.  **Publish** the new rules.

### 6. Run the Development Server

Now you're ready to start the app!
```bash
npm run dev
```
Open [http://localhost:9003](http://localhost:9003) (or the port specified in your terminal) to view the application.

---

## Deployment

This application is configured for easy deployment to **Firebase App Hosting**.

### Prerequisites for Deployment

*   [Firebase CLI](https://firebase.google.com/docs/cli) installed and configured. Log in with `firebase login`.
*   Your project linked to your Firebase project with `firebase use <your-project-id>`.

### Deploying the App

1.  **Build the Project**: Create an optimized production build of your Next.js app.
    ```bash
    npm run build
    ```

2.  **Deploy to Firebase**: Use the Firebase CLI to deploy the built app.
    ```bash
    firebase deploy --only hosting
    ```
    *(If you've configured App Hosting, this command will deploy your Next.js application to its managed backend.)*

The CLI will provide you with a URL to your live application once the deployment is complete.
