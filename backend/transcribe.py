# Usage: python3 transcribe.py /path/to/audio.wav
# Requires: openai-whisper (pip) or whisper package installed and ffmpeg available on PATH

import sys
import os

try:
    import whisper
except Exception as e:
    print('ERROR_IMPORT_WHISPER: ' + str(e), file=sys.stderr)
    sys.exit(2)

if len(sys.argv) < 2:
    print('Usage: python3 transcribe.py /path/to/file.wav', file=sys.stderr)
    sys.exit(1)

infile = sys.argv[1]

# choose model size you want: tiny, base, small, medium, large
MODEL_SIZE = os.environ.get('WHISPER_MODEL', 'small')

model = whisper.load_model(MODEL_SIZE)
# suppress verbose logging from whisper by setting verbose=False in transcribe
res = model.transcribe(infile, language=None)
# result contains 'text'
print(res.get('text', '').strip())