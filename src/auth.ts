import { auth } from "./firebase";

import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  UserCredential,
} from "firebase/auth";

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async (): Promise<UserCredential> =>
  await signInWithPopup(auth, googleProvider);

export const login = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  return await signInWithEmailAndPassword(auth, email, password);
};
export const signup = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  return await createUserWithEmailAndPassword(auth, email, password);
};
