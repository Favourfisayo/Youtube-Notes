console.log("✅ content.js is running");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content: received", message);

  if (message.action === 'getTranscript') {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get("v");

    if (!videoId) {
      sendResponse({ error: "No video ID found" });
      return;
    }

    fetch(`http://localhost:3000/transcript?videoId=${videoId}`)
      .then(res => res.json())
      .then(data => {
        console.log("Content: fetched data", data);
        if (data.notes) {
          sendResponse({ notes: data.notes, videoId: videoId });
        } else {
          sendResponse({ error: data.error || "No notes returned." });
        }
      })
      .catch(err => {
        console.error("Content: fetch error", err);
        sendResponse({ error: "Backend error." });
      });

    return true; // Required to allow async response
  }
});
