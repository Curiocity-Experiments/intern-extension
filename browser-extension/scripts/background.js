// Background scripts run independently of any particular web page or browser window.
// They can listen for browser events and react to them 
// eg) listens for browser events (like tab changes, bookmarks being added, etc.))

// Updates the Iframe Style
function updateIframeStyle(styles) {
    const iframe = document.getElementById('cm-frame');
    if (iframe) {
        Object.assign(iframe.style, styles);
    }
}

// When the user clicks the icon, iframe is created and inserted into the popup (for better UI).
chrome.action.onClicked.addListener(async function (tab) {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const oldIframe = document.getElementById('cm-frame');
            if (oldIframe) {
                console.log("Existing iframe found. Removing it.");
                oldIframe.remove();
                return;
            }

            const iframe = document.createElement('iframe');
            iframe.setAttribute('id', 'cm-frame');
            iframe.src = chrome.runtime.getURL('popup.html');

            // Apply styles directly to the iframe
            Object.assign(iframe.style, {
                position: 'fixed',
                top: '10px',
                right: '10px',
                width: '380px',
                height: '450px',
                zIndex: '2147483650',
                borderRadius: '30px',
                border: 'none' // Added to remove default iframe border
            });

            document.body.appendChild(iframe);
            console.log("Iframe created with style:", iframe.style.cssText);
            console.log("Computed iframe style after appending:", 
                window.getComputedStyle(iframe).cssText);
        },
    });
});




// Add a message listener in the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateIframeStyle') {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: updateIframeStyle,
                args: [message.styles]
            });
        });
    }

    if (message.action === "authenticate") {
        (async () => {
            try {
                const auth = await firebaseAuth();
                console.log("Authentication successful");
                sendResponse({success: true, auth: auth});
            } catch (error) {
                console.error("Authentication failed:", error);
                sendResponse({success: false, error: error.message});
            }
        })();
        return true; // Indicates we will send a response asynchronously
    }
});


// Brings the Google Auth popup to the front, so it's not hidden behind other windows
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url.startsWith("https://accounts.google.com/o/oauth2/auth/")) {
      console.log ("GOOGLE AUTH PAGE");
      // bring this window to the front so the user can see it. 
      chrome.windows.update(tab.windowId, {focused: true});        
      return;
  }
});



const OFFSCREEN_DOCUMENT_PATH = '../offscreen.html';

// A global promise to avoid concurrency issues
let creatingOffscreenDocument;
let creating;

// Chrome only allows for a single offscreenDocument. This is a helper function
// that returns a boolean indicating if a document is already active.
async function hasDocument() {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const matchedClients = await clients.matchAll();
  return matchedClients.some(
    (c) => c.url === chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)
  );
}

async function setupOffscreenDocument(path) {
  // If we do not have a document, we are already setup and can skip
  if (!(await hasDocument())) {
    // create offscreen document
    if (creating) {
      await creating;
    } else {
      creating = chrome.offscreen.createDocument({
        url: path,
        reasons: [
            chrome.offscreen.Reason.DOM_SCRAPING
        ],
        justification: 'authentication'
      });
      await creating;
      creating = null;
    }
  }
}

async function closeOffscreenDocument() {
  if (!(await hasDocument())) {
    return;
  }
  await chrome.offscreen.closeDocument();
}

function getAuth() {
  return new Promise(async (resolve, reject) => {
    const auth = await chrome.runtime.sendMessage({
      type: 'firebase-auth',
      target: 'offscreen'
    });
    auth?.name !== 'FirebaseError' ? resolve(auth) : reject(auth);
  })
}

async function firebaseAuth() {
  await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
  

  const auth = await getAuth()
    .then((auth) => {
      console.log('User Authenticated', auth);
      return auth;
    })
    .catch(err => {
      if (err.code === 'auth/operation-not-allowed') {
        console.error('You must enable an OAuth provider in the Firebase' +
                      ' console in order to use signInWithPopup. This sample' +
                      ' uses Google by default.');
      } else {
        console.error(err);
        return err;
      }
    })
    .finally(closeOffscreenDocument)

  return auth;
}
