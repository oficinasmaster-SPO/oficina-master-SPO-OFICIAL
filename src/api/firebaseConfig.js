
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyAVvUYtUQOFLxiqLWu3G6Q_cICuiCYgXUk",
    authDomain: "projectoficinasmaster.firebaseapp.com",
    databaseURL: "https://projectoficinasmaster-default-rtdb.firebaseio.com",
    projectId: "projectoficinasmaster",
    storageBucket: "projectoficinasmaster.firebasestorage.app",
    messagingSenderId: "107708544356",
    appId: "1:107708544356:web:ecad4b729d257a86407671",
    measurementId: "G-R2VK8MF8QV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
