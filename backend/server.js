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
    console.log(file);
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
    let buffer = await fs.promises.readFile(filePath);
     let wav = new wavefile.WaveFile(buffer);
      wav.toBitDepth('32f'); // Pipeline expects input as a Float32Array
      wav.toSampleRate(16000); // Whisper expects audio with a sampling rate of 16000
      let audioData = wav.getSamples();
      if (Array.isArray(audioData)) {
        if (audioData.length > 1) {
          const SCALING_FACTOR = Math.sqrt(2);

          // Merge channels (into first channel to save memory)
          for (let i = 0; i < audioData[0].length; ++i) {
            audioData[0][i] = SCALING_FACTOR * (audioData[0][i] + audioData[1][i]) / 2;
          }
        }

    // Select first channel
    audioData = audioData[0];
  }

  let output = await transcriber(audioData);
  res.json({ text: output.text });

  } catch (err) {
    console.error("Error during transcription:", err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Whisper server running on http://localhost:${PORT}`);
});
