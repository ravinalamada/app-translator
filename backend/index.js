const express = require('express');
const multer = require('multer');
const path = require('path');
const { execFile, exec } = require('child_process');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: path.join(__dirname, 'uploads') });

function convertToWav(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = `ffmpeg -y -i ${JSON.stringify(inputPath)} -ac 1 -ar 16000 ${JSON.stringify(outputPath)}`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`ffmpeg error: ${stderr || err.message}`));
      }
      resolve(outputPath);
    });
  });
}

// --- Transcribe API ---
app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file uploaded' });

  const inputPath = req.file.path;
  const wavPath = path.join(path.dirname(inputPath), `${req.file.filename}.wav`);
  const debugPath = path.join(__dirname, "last.wav"); // always keep copy

  try {
    // convert to WAV
    await convertToWav(inputPath, wavPath);

    // save copy for listening later
    fs.copyFileSync(wavPath, debugPath);

    // run Whisper
    execFile(
      'python3',
      [path.join(__dirname, 'transcribe.py'), wavPath],
      { maxBuffer: 1024 * 1024 * 10 },
      (err, stdout, stderr) => {
        // cleanup
        try { fs.unlinkSync(inputPath); } catch (e) {}
        try { fs.unlinkSync(wavPath); } catch (e) {}

        if (err) {
          console.error('transcription error', err, stderr);
          return res.status(500).json({ error: 'transcription failed' });
        }

        const text = stdout ? stdout.toString().trim() : '';
        res.json({ text });
      }
    );
  } catch (err) {
    console.error('transcription pipeline error', err);
    try { fs.unlinkSync(inputPath); } catch (e) {}
    try { fs.unlinkSync(wavPath); } catch (e) {}
    res.status(500).json({ error: err.message || 'conversion error' });
  }
});

// --- Serve last audio file for debugging ---
app.get("/last-audio", (req, res) => {
  const debugPath = path.join(__dirname, "last.wav");
  if (fs.existsSync(debugPath)) {
    res.sendFile(debugPath);
  } else {
    res.status(404).send("No debug audio available");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));