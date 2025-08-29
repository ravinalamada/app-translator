import {useState, useRef, useEffect, useCallback} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightArrowLeft, faVolumeHigh, faMicrophone, faCopy, faDownload } from "@fortawesome/free-solid-svg-icons";
import clsx from "clsx";
import { WaveFile } from "wavefile";
import axios  from "axios";

const AUDIO_WEBM_TYPE = "audio/webm";
const AUDIO_WAV_TYPE = "audio/wav";
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

export function AppTranslator() {
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("fr");
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingTranscribe, setLoadingTranscribe] = useState(false);
  const [loadingTranslate, setLoadingTranslate] = useState(false);
  const [copied, setCopied] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const resetTextFields = () => {
    setInputText("");
    setTranslatedText("");
  };

  const initializeRecorder = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: AUDIO_WEBM_TYPE });
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data?.size > 0) audioChunksRef.current.push(e.data);
    };
    recorder.onstop = async () => handleRecordingStop();
    return recorder;
  };

  const handleRecordingStop = async () => {
    const webmBlob = new Blob(audioChunksRef.current, { type: AUDIO_WEBM_TYPE });
    const convertedWavBlob = await convertToWav(webmBlob);
    const url = URL.createObjectURL(convertedWavBlob);
    setAudioUrl(url);
    await uploadAndTranscribe(convertedWavBlob);
  };

  const startRecording = async () => {
    try {
      mediaRecorderRef.current = await initializeRecorder();
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setRecording(true);
    } catch {
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef?.current?.stop();
      setRecording(false);
    }
  };

  const convertToWav = async (blob: Blob): Promise<Blob> => {
    const audioCtx = new AudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(await blob.arrayBuffer());
    const wav = new WaveFile();
    wav.fromScratch(1, audioBuffer.sampleRate, "32f", audioBuffer.getChannelData(0));
    return new Blob([wav.toBuffer()], { type: AUDIO_WAV_TYPE });
  };

  const uploadAndTranscribe = async (audioBlob: Blob) => {
    try {
      setLoadingTranscribe(true);
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");
      formData.append("sourceLang", sourceLang);
      const res = await fetch("https://app-translator-71vf.onrender.com/backend/api/transcribe",
        { method: "POST", body: formData });
      if (!res.ok) throw new Error("Transcription failed");
      setInputText((await res.json()).text || "");
    } catch (err) {
      console.error("Transcribe failed:", err);
    } finally {
      setLoadingTranscribe(false);
    }
  };

  const handleTranslate = useCallback(async (text: string, source: string, target: string) => {
    setLoadingTranslate(true);
    try {
      const {data}  = await axios.request({
        method: "POST",
        url: "https://deep-translate1.p.rapidapi.com/language/translate/v2",
        headers: {
          'x-rapidapi-key': '3b32a7b98emshc3d0253ff577b0ap1862f2jsn40d854776284',
          'x-rapidapi-host': 'deep-translate1.p.rapidapi.com',
          'Content-Type': 'application/json'
        },
        data: { q: text, source, target }
      });
      setTranslatedText(data?.data?.translations?.translatedText?.[0] || "");
    } catch (err) {
      console.error("Translation failed:", err);
    } finally {
      setLoadingTranslate(false);
    }
  }, []);

  useEffect(() => {
    if (inputText.trim()) {
      const handler = setTimeout(() => handleTranslate(inputText, sourceLang, targetLang), 1000);
      return () => clearTimeout(handler);
    }
  }, [inputText, sourceLang, targetLang, handleTranslate]);

  const speakText = (text: string, lang: string) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = speechSynthesis.getVoices().find(v => v.lang?.startsWith(lang));
    if (voice) utterance.voice = voice;
    speechSynthesis.speak(utterance);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Copy failed");
    }
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
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
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="p-4 border rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <h2 className="font-medium">Source</h2>
              <div className="flex gap-2 items-center">
                <button
                  onClick={resetTextFields}
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
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-3 items-center">
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
                onClick={() => speakText(inputText, sourceLang)}
                disabled={inputText.trim().length === 0}
                className="w-10 h-10 text-white rounded-full bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon icon={faVolumeHigh} className="text-sm" />
              </button>
              {loadingTranscribe && <span className="text-sm text-gray-500">Transcribing...</span>}
              </div>
             <a href={audioUrl!} download="recording.webm" className="cursor-pointer">
               <FontAwesomeIcon icon={faDownload} />
             </a>
            </div>
          </section>

          <section className="p-4 border rounded-lg flex flex-col">
            <h2 className="font-medium">Translation</h2>
            <div className="flex-1 border rounded-lg overflow-y-auto p-4 mb-4">
              {translatedText.trim().length === 0 ? (
                <div className="flex items-baseline gap-4">
                  {loadingTranslate ?
                    <div className="col-3">
                      <div className="snippet" data-title="dot-flashing">
                        <div className="stage">
                          <div className="dot-flashing"></div>
                        </div>
                      </div>
                     </div>
                    :
                    <p className="text-slate-400">Translation will appear here</p>
                  }
                </div>
              ) : (
                <div className="flex items-baseline gap-4">
                  <div>{translatedText}</div>
                  {loadingTranslate &&
                    (<div className="col-3">
                    <div className="snippet" data-title="dot-flashing">
                      <div className="stage">
                        <div className="dot-flashing"></div>
                      </div>
                    </div>
                  </div>)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => speakText(translatedText, targetLang)}
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