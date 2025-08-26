import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightArrowLeft, faVolumeHigh, faMicrophone, faCopy } from "@fortawesome/free-solid-svg-icons";
import clsx from "clsx";
import { WaveFile } from "wavefile";
import axios  from "axios";

type Lang = { code: string; name: string };

const LANGUAGES: Lang[] = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "de", name: "German" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ar", name: "Arabic" },
];

export default function AppTranslator() {
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("fr");
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [loadingTranscribe, setLoadingTranscribe] = useState(false);
  const [loadingTranslate, setLoadingTranslate] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- Recording handlers ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" }); // safe for most browsers
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        // Combine recorded chunks into webm blob
        const webmBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        // Convert webm → wav
        const wavBlob = await convertToWav(webmBlob);
        const url = URL.createObjectURL(wavBlob);
        setAudioUrl(url);
        await uploadAndTranscribe(wavBlob);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error("Microphone access denied or not available", err);
      alert("Could not access microphone. Check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // --- Convert webm/ogg → wav ---
  const convertToWav = async (blob: Blob): Promise<Blob> => {
  const arrayBuffer = await blob.arrayBuffer();

  // Use browser's AudioContext for decoding
  const audioCtx = new AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  // Take the first channel (mono)
  const channelData = audioBuffer.getChannelData(0);
  const wav = new WaveFile();
  wav.fromScratch(1, audioBuffer.sampleRate, "32f", channelData);

  const wavBuffer = wav.toBuffer();
  return new Blob([wavBuffer], { type: "audio/wav" });
};

  // --- Upload audio and transcribe ---
  const uploadAndTranscribe = async (audioBlob: Blob) => {
    try {
      setLoadingTranscribe(true);
      const fd = new FormData();
      fd.append("audio", audioBlob, "recording.wav"); // 👈 WAV now
      fd.append("sourceLang", sourceLang);

      const res = await fetch("http://localhost:5000/api/transcribe", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) throw new Error("Transcription failed");
      const data = await res.json();
      const text = data.text || "";
      console.log(text);
      setInputText(text);

      // if (text.trim().length > 0) await handleTranslate(text);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTranscribe(false);
    }
  };

  async function handleTranslate() {
    setLoadingTranslate(true);
    const options = {
      method: 'POST',
      url: 'https://deep-translate1.p.rapidapi.com/language/translate/v2',
      headers: {
        'x-rapidapi-key': '3b32a7b98emshc3d0253ff577b0ap1862f2jsn40d854776284',
        'x-rapidapi-host': 'deep-translate1.p.rapidapi.com',
        'Content-Type': 'application/json'
      },
      data: {
        q: inputText,
        source: sourceLang,
        target: targetLang
      }
    };

    try {
      const {data} = await axios.request(options);
      const { data: translationsData } = data || {};
      const { translations } = translationsData || {};
      setTranslatedText(translations?.translatedText?.[0]);
    } catch (error) {
      console.error(error);
    } finally {
        setLoadingTranslate(false);
      }
  }

  const speakTranslation = (text: string) => {
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    const match = voices.find(v => v.lang && v.lang.startsWith(targetLang));
    if (match) utter.voice = match;
    window.speechSynthesis.speak(utter);
  };

  useEffect(() => {
    window.speechSynthesis.onvoiceschanged = () => setTimeout(() => {}, 0);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputText.trim().length > 0) {
        handleTranslate();
      }
    }, 1000);
    return () => clearTimeout(handler);
  }, [inputText]);

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-6">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">App Translator</h1>
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-y-2">
              <label htmlFor="sourceLang">Source language</label>
              <select
                value={sourceLang}
                onChange={e => setSourceLang(e.target.value)}
                className="border px-3 py-2 rounded-lg"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={swapLanguages}
              className="bg-primary-300 text-white w-8 h-8 rounded-full hover:bg-primary-600 transition"
            >
              <FontAwesomeIcon icon={faArrowRightArrowLeft} size={"sm"} />
            </button>
            <div className="flex flex-col gap-y-2">
              <label htmlFor="targetLang">Target language</label>
              <select
                value={targetLang}
                onChange={e => setTargetLang(e.target.value)}
                className="border px-3 py-2 rounded-lg"
              >
                {LANGUAGES.filter(l => l.code !== "auto").map(l => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>
          <a href={audioUrl!} download="recording.webm">Download</a>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="p-4 border rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <h2 className="font-medium">Source</h2>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => { setInputText(""); setTranslatedText(""); }}
                  className="text-sm px-2 py-1 rounded bg-gray-100"
                >Clear</button>
              </div>
            </div>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              rows={8}
              className="w-full p-3 border rounded-lg resize-none"
              placeholder="Type or record speech..."
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={recording ? stopRecording : startRecording}
                className={clsx(
                  "w-10 h-10 rounded-full text-white",
                  recording ? 'bg-red-500' : 'bg-primary-600'
                )}
              >
                <FontAwesomeIcon icon={faMicrophone} className="text-md" />
              </button>
              <button
                onClick={() => speakTranslation(inputText)}
                disabled={inputText.trim().length === 0}
                className="w-10 h-10 text-white rounded-full bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon icon={faVolumeHigh} className="text-sm" />
              </button>
              {loadingTranscribe && <span className="text-sm text-gray-500">Transcribing...</span>}
            </div>
          </section>

          <section className="p-4 border rounded-lg flex flex-col">
            <h2 className="font-medium">Translation</h2>
            <div className="flex-1 border rounded-lg overflow-y-auto p-4 mb-4">
              {translatedText.trim().length === 0 ? (
                <p className="text-slate-400">Translation will appear here</p>
              ) : (
                <div className="flex items-baseline">
                  <div>{translatedText}</div>
                  {loadingTranslate && <div className="ml-3 text-sm text-gray-500">Translating...</div>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => speakTranslation(translatedText)}
                disabled={translatedText.trim().length === 0}
                className="w-10 h-10 text-white rounded-full bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon icon={faVolumeHigh} className="text-sm" />
              </button>
              <button
                onClick={handleCopy}
                disabled={translatedText.trim().length === 0}
                className={clsx(
                  "w-10 h-10 rounded-full bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed",
                  copied && "bg-green-500"
                )}
              >
                <FontAwesomeIcon icon={faCopy} className="text-sm text-white" />
              </button>
            </div>
          </section>
        </main>

        <footer className="mt-6 text-xs text-gray-400">
          Tip: change languages and click Record to auto transcribe and translate.
        </footer>
      </div>
    </div>
  );
}