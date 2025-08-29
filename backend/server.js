import express from "express";
import multer from "multer";
import fs from "fs";
import { createClient } from "@deepgram/sdk";
import dotenv from "dotenv";
import cors from "cors";

// Load environment variables from .env
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5000;

// Setup multer for file uploads
const upload = multer({ dest: "uploads/" });

// Init Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Transcribe endpoint
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      fileBuffer,
      {
        model: "nova-3",
        language: "en",
      }
    );

    fs.unlinkSync(filePath); // cleanup uploaded file

    if (error) {
      return res.status(500).json({ error });
    }
    res.json({ text: result.results.channels[0].alternatives[0].transcript });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));