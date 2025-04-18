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

      const prompt = `Give a Comprehensive Summarize the following YouTube transcript: \n\n${transcript}`;

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
