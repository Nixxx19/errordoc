import type { Matcher } from "../types.js";
import { extractGroup } from "../utils/extract.js";

export const firebaseUserNotFound: Matcher = {
  id: "firebase-user-not-found",
  name: "Firebase auth/user-not-found",
  frameworks: ["firebase", "node"],
  test: (input) => /auth\/user-not-found/.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "auth/user-not-found",
      explanation: "No Firebase user account exists with the provided email or UID. The user may not have signed up yet, or the account was deleted.",
      fixes: [
        { description: "Verify the email/UID is correct (check for typos)", safe: false },
        { description: "Prompt the user to create an account first (signUp flow)", safe: false },
        { description: "Check the Firebase Console > Authentication tab for existing users", safe: false },
        { description: "Handle this error gracefully in your UI with a helpful message", safe: false },
      ],
      confidence: 0.95,
      category: "auth",
      framework: "firebase",
      matched: "auth/user-not-found",
    };
  },
};

export const firebaseWrongPassword: Matcher = {
  id: "firebase-wrong-password",
  name: "Firebase auth/wrong-password",
  frameworks: ["firebase", "node"],
  test: (input) => /auth\/wrong-password|auth\/invalid-credential/.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "auth/wrong-password",
      explanation: "The password is incorrect for this account. Note: Firebase v9+ returns 'auth/invalid-credential' instead of 'auth/wrong-password' for security reasons.",
      fixes: [
        { description: "Double-check the password being sent", safe: false },
        { description: "Offer a 'Forgot Password' flow using sendPasswordResetEmail()", safe: false },
        { description: "Check if the account uses a different sign-in method (Google, GitHub, etc.)", safe: false },
        { description: "Don't reveal to the user whether the email or password was wrong (security best practice)", safe: false },
      ],
      confidence: 0.95,
      category: "auth",
      framework: "firebase",
      matched: input.match(/auth\/wrong-password|auth\/invalid-credential/)![0],
    };
  },
};

export const firebaseEmailInUse: Matcher = {
  id: "firebase-email-in-use",
  name: "Firebase auth/email-already-in-use",
  frameworks: ["firebase", "node"],
  test: (input) => /auth\/email-already-in-use/.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "auth/email-already-in-use",
      explanation: "An account already exists with this email address. This happens during sign-up when the email is already registered.",
      fixes: [
        { description: "Redirect the user to the sign-in flow instead", safe: false },
        { description: "Offer account linking if the user signed up with a different method (e.g., Google)", safe: false },
        { description: "Check the 'One account per email address' setting in Firebase Console", safe: false },
      ],
      confidence: 0.95,
      category: "auth",
      framework: "firebase",
      matched: "auth/email-already-in-use",
    };
  },
};

export const firebaseWeakPassword: Matcher = {
  id: "firebase-weak-password",
  name: "Firebase auth/weak-password",
  frameworks: ["firebase", "node"],
  test: (input) => /auth\/weak-password/.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "auth/weak-password",
      explanation: "The password is too weak. Firebase requires passwords to be at least 6 characters long.",
      fixes: [
        { description: "Ensure the password is at least 6 characters", safe: false },
        { description: "Add client-side password validation before calling Firebase", safe: false },
        { description: "Consider enforcing stronger password rules (uppercase, numbers, symbols)", safe: false },
      ],
      confidence: 0.95,
      category: "auth",
      framework: "firebase",
      matched: "auth/weak-password",
    };
  },
};

export const firebasePermissionDenied: Matcher = {
  id: "firebase-permission-denied",
  name: "Firebase permission-denied",
  frameworks: ["firebase", "node"],
  test: (input) => /(?:FirebaseError|PERMISSION_DENIED|firestore).*permission.denied|permission.denied.*(?:firestore|firebase)/i.test(input) || /Missing or insufficient permissions/.test(input),
  match(input) {
    const collection = extractGroup(input, /(?:collection|document|path)[:\s]+["']?(\S+?)["']?(?:\s|$)/i);

    return {
      id: this.id,
      pattern: "Firestore permission-denied",
      explanation: `Permission denied${collection ? ` for "${collection}"` : ""}. Your Firestore security rules are blocking this operation.`,
      fixes: [
        { description: "Check your Firestore security rules in Firebase Console > Firestore > Rules", safe: false },
        { description: "For development, temporarily allow all: allow read, write: if true; (DO NOT use in production)", safe: false },
        { description: "Ensure the user is authenticated if your rules require auth (request.auth != null)", safe: false },
        { description: "Test your rules using the Firebase Rules Playground in the Console", safe: false },
      ],
      confidence: 0.93,
      category: "permission",
      framework: "firebase",
      matched: input.match(/permission.denied|Missing or insufficient permissions/i)![0],
    };
  },
};

export const firebaseDeadlineExceeded: Matcher = {
  id: "firebase-deadline-exceeded",
  name: "Firebase DEADLINE_EXCEEDED",
  frameworks: ["firebase", "node"],
  test: (input) => /DEADLINE_EXCEEDED/.test(input) && /firebase|firestore|grpc/i.test(input),
  match(input) {
    return {
      id: this.id,
      pattern: "DEADLINE_EXCEEDED",
      explanation: "The Firestore operation timed out. This usually happens with large queries, network issues, or when Firestore is under heavy load.",
      fixes: [
        { description: "Reduce the query scope — add more filters or use pagination with limit()", safe: false },
        { description: "Add composite indexes for complex queries (check the Firebase Console for index suggestions)", safe: false },
        { description: "Check your network connection and firewall settings", safe: false },
        { description: "Implement retry logic with exponential backoff", safe: false },
      ],
      confidence: 0.9,
      category: "network",
      framework: "firebase",
      matched: "DEADLINE_EXCEEDED",
    };
  },
};
