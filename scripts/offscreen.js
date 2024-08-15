    // This URL must point to the public site
    const _URL = 'https://curiocity-chrome-extension.web.app';
    const iframe = document.createElement('iframe');
    iframe.src = _URL;
    document.documentElement.appendChild(iframe);
    chrome.runtime.onMessage.addListener(handleChromeMessages);
    iframe.sandbox = "allow-scripts allow-popups allow-same-origin";



    function handleChromeMessages(message, sender, sendResponse) {
        if (message.target !== 'offscreen') {
          return false;  // Not handled by this listener
        }
      
        return new Promise((resolve) => {
          function handleIframeMessage(event) {
            try {
              if (event.data.startsWith('!_{')) {
                // Ignore Firebase internal messages
                return;
              }
              const data = JSON.parse(event.data);
              globalThis.removeEventListener('message', handleIframeMessage);
              sendResponse(data);
              resolve(true);
            } catch (e) {
              console.error(`JSON parse failed - ${e.message}`);
              resolve(false);
            }
          }
      
          globalThis.addEventListener('message', handleIframeMessage, false);
      
          // Initialize the authentication flow in the iframed document
          iframe.contentWindow.postMessage({"initAuth": true}, new URL(_URL).origin);
        });
      }
      
      // Update the listener registration
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        handleChromeMessages(message, sender, sendResponse);
        return true;  // Indicates an asynchronous response
      });
    



