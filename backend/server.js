import express from "express";
import { pipeline } from "@huggingface/transformers";
import path from "path";
import wavefile from "wavefile";
import multer from "multer";
import fs from "fs";
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5000;

// Setup multer
const storage = multer.diskStorage({
  destination: "uploads/", // folder
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
    // Example: 1692984728472.wav
  }
});

const upload = multer({ storage });

// Load Whisper model once at startup
let transcriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en");

// Transcription endpoint
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;

    // Load audio file buffer
    const buffer = fs.readFileSync(filePath);
    const wav = new wavefile.WaveFile(buffer);

    // Downsample + reduce bit depth (saves memory)
    wav.toBitDepth("16");
    wav.toSampleRate(16000);

    // Always single channel
    let audioData = wav.getSamples(true, Int16Array);

    // Whisper models expect Float32Array
    let float32Data = new Float32Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      float32Data[i] = audioData[i] / 32768; // normalize
    }

    // Process in chunks (30s per chunk = 480k samples)
    const chunkSize = 16000 * 30;
    const results = [];

    for (let i = 0; i < float32Data.length; i += chunkSize) {
      const chunk = float32Data.slice(i, i + chunkSize);
      const output = await transcriber(chunk);
      results.push(output.text);
    }

    res.json({ text: results.join(" ") });

    // Clean up uploaded file
    fs.unlinkSync(filePath);

  } catch (err) {
    console.error("Error during transcription:", err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Whisper server running on http://localhost:${PORT}`);
});
