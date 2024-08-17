import { signInWithPopup, GoogleAuthProvider, getAuth } from'firebase/auth';
import { initializeApp } from 'firebase/app';

console.log("Initializing Offscreen Document");


const firebaseConfig = {
  apiKey: "AIzaSyC2hQ3NHhloMCo0xEzAOKln1OksyPSFxZQ",
  authDomain: "chrome-extension-d2ff8.firebaseapp.com",
  projectId: "chrome-extension-d2ff8",
  storageBucket: "chrome-extension-d2ff8.appspot.com",
  messagingSenderId: "886134129667",
  appId: "1:886134129667:web:f8ce1223c40aef6540fa36",
  measurementId: "G-9ZYEC8SY3W"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// This code runs inside of an iframe in the extension's offscreen document.
// This gives you a reference to the parent frame, i.e. the offscreen document.
// You will need this to assign the targetOrigin for postMessage.
const PARENT_FRAME = document.location.ancestorOrigins[0];
console.log("parent frame:", PARENT_FRAME);

// This demo uses the Google auth provider, but any supported provider works.
// Make sure that you enable any provider you want to use in the Firebase Console.
// https://console.firebase.google.com/project/_/authentication/providers
const PROVIDER = new GoogleAuthProvider();


// function sendResponse(result) {
//     const response = JSON.stringify(result);
//     console.log("Sending response to parent frame:", response);
//     window.parent.postMessage(response, '*');
// }

// window.addEventListener('message', function(event) {
//     console.log("Received message in Offscreen Document:", event.data);
    
//     if (event.data.initAuth) {
//         console.log("Initiating Google Sign-In");
//         signInWithPopup(auth, PROVIDER)
//             .then(result => {
//                 console.log("Authentication successful");
//                 sendResponse({ success: true, user: result.user });
//             })
//             .catch(error => {
//                 console.error("Authentication error:", error);
//                 sendResponse({ success: false, error: error.message });
//             });
//     }
// });

function sendResponse(result) {
    globalThis.parent.self.postMessage(JSON.stringify(result), PARENT_FRAME);
  }
  
  globalThis.addEventListener('message', function({data}) {
    if (data.initAuth) {
      // Opens the Google sign-in page in a popup, inside of an iframe in the
      // extension's offscreen document.
      // To centralize logic, all respones are forwarded to the parent frame,
      // which goes on to forward them to the extension's service worker.
      signInWithPopup(auth, PROVIDER)
        .then(sendResponse)
        .catch(sendResponse)
    }
  });


console.log("Offscreen Document setup complete");