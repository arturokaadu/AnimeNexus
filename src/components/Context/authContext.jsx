import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
} from "firebase/auth";
import { auth, db, googleProvider } from "../../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export const authContext = createContext();

export const useAuth = () => {
  const context = useContext(authContext);
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const userCredentials = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  // User credentials handled by auth state observer
};

const loginWithGoogle = async () => {
  const userCredentials = await signInWithPopup(auth, googleProvider);
  const user = userCredentials.user;

  // Check if user exists in Firestore
  const docRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    // Create new user doc for Google user
    await setDoc(docRef, {
      username: user.displayName,
      email: user.email,
      dob: null, // Will need to be set in profile
      settings: {
        showNSFW: false
      },
      createdAt: new Date()
    });
  }

  return userCredentials;
};

const logout = () => {
  signOut(auth);
};

const resetPassword = (email) => {
  sendPasswordResetEmail(auth, email);
};

// Helper function to check if user is adult (18+)
const isAdult = (dob) => {
  if (!dob) return false;
  const birthDate = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
};

// Update user settings in Firestore
const updateUserSettings = async (settings) => {
  if (!user) return;
  const docRef = doc(db, "users", user.uid);
  await setDoc(docRef, { settings }, { merge: true });

  // Update local user state
  setUser({ ...user, settings: { ...user.settings, ...settings } });
};

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      // Fetch user data from Firestore
      const docRef = doc(db, "users", currentUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        // Merge auth user with firestore data
        setUser({ ...currentUser, ...userData });
      } else {
        setUser(currentUser);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  });
  return () => unsubscribe();
}, []);

return (
  <authContext.Provider value={{ signUp, login, loginWithGoogle, resetPassword, user, logout, loading, isAdult, updateUserSettings }}>
    {children}
  </authContext.Provider>
);
};
