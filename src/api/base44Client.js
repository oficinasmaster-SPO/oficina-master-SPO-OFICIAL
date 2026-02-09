import { auth, db } from './firebaseConfig';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc, setDoc } from "firebase/firestore";

// Helper to normalize Firestore docs
const docToObj = (docSnap) => ({ id: docSnap.id, ...docSnap.data() });

// AUTH ADAPTER
const authAdapter = {
  me: () => new Promise((resolve, reject) => {
    // Check current user state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe();
      if (firebaseUser) {
        // Fetch extra profile data from 'users' collection if needed
        resolve({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          full_name: firebaseUser.displayName || firebaseUser.email.split('@')[0], // Fallback
          // Add other fields expected by the app
        });
      } else {
        reject({ status: 401, message: "Not authenticated" });
      }
    });
  }),

  login: async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    return {
      user: {
        id: user.uid,
        email: user.email
      },
      token: await user.getIdToken()
    };
  },

  logout: async (redirectUrl) => {
    await signOut(auth);
    if (redirectUrl) window.location.href = redirectUrl;
  },

  redirectToLogin: (currentUrl) => {
    window.location.href = '/login';
  }
};

// ENTITIES ADAPTER (Proxy to intercept Entity.method calls)
const entitiesAdapter = new Proxy({}, {
  get: (target, entityName) => {
    return {
      // e.g. base44.entities.Task.filter({ status: 'done' })
      filter: async (filters = {}) => {
        const colRef = collection(db, entityName);
        const constraints = [];

        for (const [key, value] of Object.entries(filters)) {
          constraints.push(where(key, "==", value));
        }

        const q = query(colRef, ...constraints);
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docToObj);
      },

      // base44.entities.Task.list()
      list: async () => {
        const colRef = collection(db, entityName);
        const snapshot = await getDocs(colRef);
        return snapshot.docs.map(docToObj);
      },

      // base44.entities.Task.get(id)
      get: async (id) => {
        const docRef = doc(db, entityName, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return docToObj(docSnap);
        return null; // or throw? Base44 typically returns null or throws.
      },

      // base44.entities.Task.create(data)
      create: async (data) => {
        const colRef = collection(db, entityName);
        const docRef = await addDoc(colRef, data);
        return { id: docRef.id, ...data };
      },

      // base44.entities.Task.update(id, data)
      update: async (id, data) => {
        const docRef = doc(db, entityName, id);
        await updateDoc(docRef, data);
        return { id, ...data };
      },

      // base44.entities.Task.delete(id)
      delete: async (id) => {
        const docRef = doc(db, entityName, id);
        await deleteDoc(docRef);
        return true;
      }
    };
  }
});

// FUNCTIONS ADAPTER (Mock or Cloud Functions)
const functionsAdapter = {
  invoke: async (functionName, payload) => {
    console.warn(`[Firebase Adapter] Calling cloud function '${functionName}' is not fully implemented yet. Payload:`, payload);
    // TODO: Implement using firebase/functions httpsCallable if needed
    // For now, return a success mock or throw depending on critical functions
    return { data: { success: true, message: "Mock response from Firebase Adapter" } };
  }
};

// APP LOGS ADAPTER
const appLogsAdapter = {
  logUserInApp: async (pageName) => {
    console.log(`[AppLogs] Navigation: ${pageName}`);
    return true;
  }
};

// EXPORT REPLACEMENT
export const base44 = {
  auth: authAdapter,
  entities: entitiesAdapter,
  functions: functionsAdapter,
  appLogs: appLogsAdapter
};

