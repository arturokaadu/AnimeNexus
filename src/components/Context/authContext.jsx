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

  /*
    Registro de nuevos usuarios
    Crea la cuenta en Firebase Auth y el documento de perfil en Firestore.
  */
  const signUp = async (email, password, username, dob, showNSFW) => {
    const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredentials.user;

    // Crear documento de usuario en Firestore
    await setDoc(doc(db, "users", user.uid), {
      username,
      email,
      dob,
      settings: {
        showNSFW
      },
      createdAt: new Date()
    });

    return userCredentials;
  };

  /*
    Sistema de Login con Email/Password
    Maneja la autenticación contra Firebase y actualiza el estado global.
  */
  const login = async (email, password) => {
    const userCredentials = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    // Credenciales manejadas por el observador de estado
    return userCredentials;
  };

  const loginWithGoogle = async () => {
    const userCredentials = await signInWithPopup(auth, googleProvider);
    const user = userCredentials.user;

    // Revisar si existe en Firestore
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Crear nuevo doc para usuario Google
      await setDoc(docRef, {
        username: user.displayName,
        email: user.email,
        dob: null, // Debera configurarse en perfil
        settings: {
          showNSFW: false
        },
        createdAt: new Date()
      });
    }

    return userCredentials;
  };

  /*
    Cierre de sesión seguro
    Limpia el estado y redirige al home.
  */
  const logout = () => {
    signOut(auth);
  };

  const resetPassword = (email) => {
    sendPasswordResetEmail(auth, email);
  };

  // Función auxiliar para verificar mayoría de edad (18+)
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

  // Actualizar configuración en Firestore
  const updateUserSettings = async (settings) => {
    if (!user) return;
    const docRef = doc(db, "users", user.uid);
    await setDoc(docRef, { settings }, { merge: true });

    // Actualizar estado local
    setUser({ ...user, settings: { ...user.settings, ...settings } });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Traer datos de Firestore
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          // Fusionar auth user con data de firestore
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
