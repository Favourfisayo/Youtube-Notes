
# AI Notes Chrome Extension Documentation

## Project Overview

This project is a Chrome extension that generates and downloads summarized notes from YouTube videos. It leverages AI to extract and summarize the transcript of YouTube videos and provides a seamless user experience for saving and downloading those summaries.

### Key Features:
- Extracts video transcript.
- Summarizes the transcript using Gemini's API.
- Saves and displays notes in the Chrome extension popup.
- Provides options to download the summarized notes as a markdown (.md) or text file.

## Backend Structure

Our backend consists of two main files:

1. **`get_transcript.py`** - This Python script fetches the YouTube video transcript using the `youtube_transcript_api` library.
2. **`index.js`** - This Node.js + Express app serves as our server, interacting with the Python script and Gemini's AI for summarizing the notes.

### Backend Code:

#### 1. `get_transcript.py`

This Python script is used to fetch the transcript of a YouTube video using the `YouTubeTranscriptApi`.

```python
import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

video_id = sys.argv[1]

try:
    transcript = YouTubeTranscriptApi.get_transcript(video_id)
    texts = " ".join([entry['text'] for entry in transcript])
    print(json.dumps(texts))
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
```

**Explanation:**
- The script takes the `video_id` as an argument.
- It fetches the transcript using the `YouTubeTranscriptApi`.
- It then joins all the transcript text entries into one string.
- Finally, the transcript is printed as a JSON response.

#### 2. `index.js`

This is the server-side code where we interact with the backend, trigger the Python script, and summarize the transcript using Gemini's AI.

```javascript
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
require('dotenv').config(); // for using .env

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Gemini Setup
const genAI = require('@google/generative-ai');
const genAIclient = new genAI.GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get('/transcript', (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) return res.status(400).json({ error: 'videoId is required' });

  // Call the Python script using the videoId
  exec(`python get_transcript.py ${videoId}`, async (error, stdout, stderr) => {
    if (error) {
      console.error('Python Error:', stderr);
      return res.status(500).json({ error: 'Failed to fetch transcript' });
    }

    const transcript = JSON.parse(stdout.trim());

    try {
      // Use Gemini to summarize
      const model = genAIclient.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `Summarize the following YouTube transcript into short, clear bullet-point notes:

${transcript}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      res.json({ notes: summary });
  
    } catch (apiError) {
      console.error('Gemini API Error:', apiError);
      res.status(500).json({ error: 'Failed to generate notes using Gemini' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

**Explanation:**
- This script sets up an Express server that listens for requests on the `/transcript` route.
- The server expects a `videoId` to be passed as a query parameter.
- It calls the `get_transcript.py` script using the `exec` function, passing the `videoId` as an argument.
- The transcript is then summarized using Gemini's AI and returned in the response.

## Frontend Structure

The frontend is built as a Chrome extension popup. The key functionalities are:

- Injecting the content script to extract the transcript.
- Sending the transcript request to the backend.
- Displaying the summarized notes in the popup.
- Storing and retrieving notes using Chrome's `chrome.storage.local`.
- Downloading notes in `.md` or `.txt` format.

### Frontend Code:

#### 1. **Popup Script (popup.js)**

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);
  const currentVideoId = url.searchParams.get("v");

  chrome.storage.local.get(['savedNotes', 'videoId'], (data) => {
    if (data.savedNotes && data.videoId === currentVideoId) {
      const htmlNotes = marked.parse(data.savedNotes);
      document.getElementById('notesOutput').innerHTML = htmlNotes;
      document.getElementById('downloadBtn').hidden = false;
    }
  });
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  chrome.storage.local.get(['savedNotes'], (data) => {
    if (data.savedNotes) {
      const blob = new Blob([data.savedNotes], { type: 'text/markdown' });
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

  notesOutput.innerHTML = '';
  loadingDiv.style.display = 'block';
  generateBtn.disabled = true;
  downloadBtn.hidden = true;

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

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

        chrome.storage.local.set({ savedNotes: rawNotes, videoId: response.videoId }, () => {
          console.log("Popup: saved notes to local storage");
        });

        notesOutput.innerHTML = htmlNotes;
        downloadBtn.hidden = false;

      } else if (response.error) {
        notesOutput.innerText = response.error;
      }
    });
  });
});
```

**Explanation:**
- The `DOMContentLoaded` event listener is used to check if there are saved notes in the local storage for the current video and load them.
- The `generateNotes` button fetches the transcript, sends it to the backend, and stores the notes in local storage.
- The download button allows users to download the notes in `.md` format.

## Tech Stack

### Frontend:
- **HTML/CSS** - Structure and styling of the popup.
- **JavaScript (Vanilla)** - For interactivity, including fetching, saving, and displaying notes.
- **Marked.js** - To convert the raw markdown notes into HTML format.
- **Chrome Extension API** - To interact with the browser, store data, and manipulate tabs.

### Backend:
- **Node.js** - The backend is built with Node.js to handle server requests.
- **Express.js** - For routing and handling API requests.
- **Python** - Used in `get_transcript.py` to fetch the YouTube video transcript.
- **Gemini API** - Used to summarize the transcript.
- **YouTube Transcript API** - Fetches the transcript of the video.

### Tools & Libraries:
- **CORS** - To enable cross-origin requests in the backend.
- **Dotenv** - For managing environment variables (like the Gemini API key).
- **Child Process (exec)** - For executing the Python script from Node.js.

## Issues and Solutions

### 1. CORS Issues
- **Problem:** The backend was being blocked by CORS policies while making requests to external APIs.
- **Solution:** We used the `cors` library in Express to enable cross-origin resource sharing.

### 2. API Quota Exceeded
- **Problem:** We were initially using OpenAI's API, but the free tier exceeded its quota.
- **Solution:** We switched to Gemini’s API, which provided better functionality for summarizing the transcript.

### 3. Storing Notes per Video
- **Problem:** We needed to ensure that the notes were tied to the specific video, and they should be retained even after closing and reopening the popup.
- **Solution:** We stored the notes in Chrome’s `localStorage` along with the video ID. On reopening, we checked if the notes matched the current video ID before displaying them.

### 4. UI Layout Issues
- **Problem:** The notes were too large for the container.
- **Solution:** We used CSS to limit the height of the notes container and added scroll functionality.

