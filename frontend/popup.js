let currentVideoId = null;
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);
  currentVideoId = url.searchParams.get("v");

  chrome.storage.local.get([currentVideoId], (data) => {
    if (data[currentVideoId]) {
      const htmlNotes = marked.parse(data[currentVideoId]);
      document.getElementById('notesOutput').innerHTML = htmlNotes;
      document.getElementById('downloadBtn').hidden = false;
    }
  });
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  chrome.storage.local.get([currentVideoId], (data) => {
    if (data[currentVideoId]) {
      const blob = new Blob([data[currentVideoId]], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'youtube-notes.md';
      link.click();
      URL.revokeObjectURL(url);
    }
  });
});

document.getElementById('generateNotes').addEventListener('click', async () => {
  const generateBtn = document.getElementById('generateNotes');
  const loadingDiv = document.getElementById('loading');
  const notesOutput = document.getElementById('notesOutput');
  const downloadBtn = document.getElementById('downloadBtn');

  // Reset UI state
  notesOutput.innerHTML = '';
  loadingDiv.style.display = 'block';
  generateBtn.disabled = true;
  downloadBtn.hidden = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  }, () => {
    chrome.tabs.sendMessage(tab.id, { action: 'getTranscript' }, (response) => {
      loadingDiv.style.display = 'none';
      generateBtn.disabled = false;

      if (chrome.runtime.lastError) {
        console.error("Popup: Error", chrome.runtime.lastError.message);
        notesOutput.innerText = "Error: " + chrome.runtime.lastError.message;
        return;
      }

      if (response.notes) {
        const rawNotes = response.notes;
        const htmlNotes = marked.parse(rawNotes);

        chrome.storage.local.set({ [response.videoId]: rawNotes }, () => {
          console.log("Popup: Saved notes to local storage for this video.");
        });

        notesOutput.innerHTML = htmlNotes;
        downloadBtn.hidden = false;

      } else if (response.error) {
        notesOutput.innerText = response.error;
      }
    });
  });
});
