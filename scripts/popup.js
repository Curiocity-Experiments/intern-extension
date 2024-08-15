// Runs in the context of the extension's popup
// Only executes when the user clicks the extension icon to open the popup
// Has access to most Chrome APIs directly
// Cannot access web page DOM directly
// Short-lived - only active while the popup is open
// Used for creating the extension's user interface and handling user interactions within the popup
// Can communicate with content.js and background.js to perform actions on the current page






import { initializeApp } from '../firebase/firebase-app.js';
import { getFirestore, collection, addDoc } from '../firebase/firebase-firestore.js';


console.log("Readability available:", typeof Readability !== 'undefined');

const firebaseConfig = {
  apiKey: "AIzaSyALoh7EJWbdRST38fAE7kaFqVg7cKPvwEo",
  authDomain: "curiocity-chrome-extension.firebaseapp.com",
  databaseURL: "https://curiocity-chrome-extension-default-rtdb.firebaseio.com",
  projectId: "curiocity-chrome-extension",
  storageBucket: "curiocity-chrome-extension.appspot.com",
  messagingSenderId: "432321690144",
  appId: "1:432321690144:web:12e316859ba082fe161a45",
  measurementId: "G-XSNZFSQ6S1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);



// Function to load saved title and content
function loadSavedContent() {
    chrome.storage.local.get(['savedTitle', 'savedContent', 'savedImages'], function(result) {
        if (result.savedTitle) {
            document.getElementById("displayTitle").textContent = result.savedTitle;
        }
        if (result.savedContent) {
            document.getElementById("displayText").textContent = result.savedContent;
        }
        if (result.savedImages && result.savedImages !== "") {
            document.getElementById("displayImage").innerHTML = `<img src="${result.savedImages}" alt="Thumbnail">`;
        } else {
            document.getElementById("displayImage").textContent = "No image found.";
        }
    });
}

// Load saved content when popup opens
loadSavedContent();



// Captures Images and Thumbnail of a page
function captureImages(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs.length) {
            console.error('No active tab found');
            callback([]);
            return;
        }

        chrome.scripting.executeScript(
            {
                target: { tabId: tabs[0].id },
                func: () => {
                    // Helper function to find meta tag content
                    const findMetaContent = (selector) => {
                        const tag = document.querySelector(selector);
                        return tag ? tag.content : null;
                    };

                    // Find thumbnail image
                    let thumbnail = findMetaContent('meta[property="og:image"]') ||
                                    findMetaContent('meta[name="twitter:image"]') ||
                                    document.querySelector('link[rel="image_src"]')?.href;

                    // Capture images from content-rich areas
                    const contentSelectors = ['article', 'main', '#content', '#main', '.content', '.main'];
                    const contentImages = contentSelectors.flatMap(selector => 
                        Array.from(document.querySelectorAll(`${selector} img`)).map(img => img.src)
                    ).filter(Boolean); // Filter out any empty strings or null values

                    let images = [];
                    if (thumbnail) {
                        images = [thumbnail, ...contentImages];
                    } else if (contentImages.length > 0) {
                        // If no thumbnail, use the first content image as thumbnail
                        images = [...contentImages];
                    }

                    // Remove duplicates
                    const uniqueImages = [...new Set(images)];

                    console.log("Images found:", uniqueImages);

                    return uniqueImages;
                }
            },
            (results) => {
                if (chrome.runtime.lastError) {
                    console.error('Error executing script:', chrome.runtime.lastError);
                    callback([]);
                    return;
                }

                const imageUrls = results[0]?.result || [];
                callback(imageUrls);
            }
        );
    });
}

// Utilizing Readability.js
function getPageContent() {
    console.log("getPageContent function called");
    try {
        if (typeof Readability === 'undefined') {
            console.error("Readability is not defined in content script context");
            return { error: "Readability is not defined in content script context" };
        }
  
        const documentClone = document.cloneNode(true);
        const reader = new Readability(documentClone);
        const article = reader.parse();
  
        console.log("Article parsed:", article);
  
        if (!article) {
            console.error("Failed to parse page content");
            return { error: "Failed to parse page content" };
        }
  
        return {
            title: article.title || "No title found",
            content: article.textContent || "No content found",
            excerpt: article.excerpt || "No excerpt found",
            htmlContent: article.content || "No HTML content found"
        };
    } catch (error) {
        console.error("Error in getPageContent:", error);
        return { error: error.toString() };
    }
}


// Extracting hyperlinks from htmlContent from Readability.js 
function extractHyperlinks(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const links = doc.querySelectorAll('a');
    
    return Array.from(links).map(link => ({
        href: link.href,
        text: link.textContent.trim()
    })).filter(link => 
        link.href && 
        !link.href.startsWith('javascript:') && 
        !link.href.startsWith('#') &&
        link.text.length > 1
    );
}



// Function to extract just the markdown content from Reader API
function extractMarkdownContent(content) {
    const markdownContentRegex = /Markdown Content:\s*([\s\S]*)/;
    const match = content.match(markdownContentRegex);
    return match ? match[1].trim() : "No Markdown content found";
} 



// Dropdown button
const dropdowns = document.querySelectorAll('.dropdown');
dropdowns.forEach(dropdown => {
    const select = dropdown.querySelector('.select');
    const menu = dropdown.querySelector('.menu');
    const options = dropdown.querySelectorAll('.menu li');
    const selected = dropdown.querySelector('.selected');

    select.addEventListener('click', () => {
        select.classList.toggle('select-clicked');
        menu.classList.toggle('menu-open');
        selected.innerText = "Select a report";
    });

    options.forEach(option => {
        option.addEventListener('click', () => {
            selected.innerText = option.innerText;
            select.classList.remove('select-clicked');
            menu.classList.remove('menu-open');
            //Remove active class from all option elements
            options.forEach(option => {
                option.classList.remove('active');
            });
            //Add active class to clicked option element
            option.classList.add('active');
        });
    });
});





function updateIframeStyle(styles) {
    chrome.runtime.sendMessage({
        action: 'updateIframeStyle',
        styles: styles
    });
}


// When click google sign in button
document.getElementById("googleAuth").addEventListener("click", async () => {
    try {
        chrome.runtime.sendMessage({action: "authenticate"}, (response) => {
            console.log("Message from background.js:", response.success, "auth:", response.auth);
        });
        // Optionally, you can close the popup after authentication
        // window.close();
      } catch (error) {
        console.error('Authentication failed:', error);
      }
      

    // updateIframeStyle({
    //     position: 'fixed',
    //     top: '10px',
    //     right: '10px',
    //     width: '380px',
    //     height: 'calc(100% - 50px)',
    //     'z-index': '2147483650',
    //     border: 'none',
    //     'border-radius': '30px'
    // });
    // document.querySelector(".loginPage").style.display = 'none';
    // document.querySelector(".main").style.display = 'block';
})





// When click scrape webpage button
document.getElementById("scrapeWebpage").addEventListener("click", () => {
    console.log("Scrape button clicked");
    document.getElementById("displayText").textContent = "Loading...";
  
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        let currentTab = tabs[0];
        let currentUrl = currentTab.url;
        let combinedUrl = `https://r.jina.ai/${currentUrl}`;

        console.log("Current tab:", currentTab);
        console.log("Combined url with Jina ai's Reader API:", combinedUrl);
      
        // First, inject Readability.js into the page
        chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            files: ['scripts/Readability.js']
        }, () => {
            // After Readability is injected, execute the getPageContent function
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                function: getPageContent,
            }, (results) => {
                console.log("Script execution results:", results);
                
                if (chrome.runtime.lastError) {
                    console.error("Runtime error:", chrome.runtime.lastError);
                    document.getElementById("displayText").textContent = 'Error: ' + chrome.runtime.lastError.message;
                    return;
                }
  
                if (!results || results.length === 0 || !results[0].result) {
                    console.error("No results returned from script execution");
                    document.getElementById("displayText").textContent = 'Error: No content could be extracted';
                    return;
                }
  
                const result = results[0].result;
          
                if (result.error) {
                    console.error("Error in result:", result.error);
                    document.getElementById("displayText").textContent = 'Error: ' + result.error;
                    return;
                }
  
                const { content, title, excerpt, htmlContent } = result;
          
                document.getElementById("displayTitle").textContent = title;
                document.getElementById("displayText").textContent = content;
  
                console.log("Content extracted successfully:", { title, excerpt, htmlContent });


                // Continue with the rest of your code (image capture, storage, etc.)
                captureImages(function(imageUrls) {
                    console.log("Captured image URLs:", imageUrls);
                    let mainImage = "";

                    if (imageUrls.length > 0) {
                        mainImage = imageUrls[0]; // First image (thumbnail or first content image)               
                        console.log("Main image:", mainImage);
                        // Display the image in the new div
                        document.getElementById("displayImage").innerHTML = `<img src="${mainImage}" alt="Thumbnail">`;
                    } else {
                        console.log("No images found");
                        document.getElementById("displayImage").textContent = "No image found";
                    }

                    const hyperlink = extractHyperlinks(htmlContent);
                    console.log("Extracted hyperlinks:", hyperlink);

        
                    // Fetch content from the Reader API
                    fetch(combinedUrl)
                        .then(response => response.text())
                        .then(data => {
                            
                            // Extract the Markdown content from the data
                            //const markdown = extractMarkdownContent(data);
                            const markdown = data;
        
                            // Save the content to Chrome storage
                            chrome.storage.local.set({savedTitle: title, savedContent: content, savedImages: mainImage}, function() {
                                console.log('Title, Content, and Image saved to storage:', mainImage);
                            });

                            // Send the data to Firestore
                            addDoc(collection(db, "scrapedContent"), {
                                url: currentUrl,
                                title: title,
                                markdown: markdown,
                                textContent: content,
                                timestamp: new Date(), 
                                imageUrls: imageUrls,
                                hyperlinks: hyperlink
                            })
                            .then((docRef) => {
                                console.log("Document written with ID: ", docRef.id);
                            })
                            .catch((error) => {
                                console.error("Error adding document: ", error);
                            });       
                        })
                        .catch((error) => {
                            console.error('Error:', error);
                            contentDisplay.textContent = 'Error fetching content';
                        });
                });
            });
        });
    });
});


  