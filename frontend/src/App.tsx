import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send, Plus, FileText, Headphones, Loader2, Sparkles,
  Settings, PanelRightClose, PanelRightOpen, X, Brain,
  FileQuestion, PlaySquare, CheckCircle2, Copy, Paperclip,
  Trash2, Mic, Square, MicOff
} from 'lucide-react';

const API_URL = "http://localhost:8888";

const SUGGESTIONS = [
  "Summarize the key points of this document.",
  "Create a study guide based on these sources.",
  "What are the main arguments presented?",
  "Explain this concept like I'm 5 years old."
];

export default function App() {
  const [notebookId] = useState("default_notebook");
  const [messages, setMessages] = useState<{role: string, text: string}[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sources, setSources] = useState<{id: string, name: string, size: string}[]>([]);
  const [podcastUrl, setPodcastUrl] = useState<string | null>(null);
  const [isPodcastLoading, setIsPodcastLoading] = useState(false);
  const [showStudio, setShowStudio] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { scrollToBottom(); }, [messages, isLoading, isTranscribing]);

  // ping every 30s so the backend knows the tab is open, and tell it when we close
  useEffect(() => {
    const beat = setInterval(() => {
      fetch(`${API_URL}/api/ping`).catch(() => {});
    }, 30000);
    const bye = () => {
      navigator.sendBeacon(`${API_URL}/api/shutdown`, new Blob(["{}"], { type: "application/json" }));
    };
    window.addEventListener("pagehide", bye);
    window.addEventListener("beforeunload", bye);
    return () => {
      clearInterval(beat);
      window.removeEventListener("pagehide", bye);
      window.removeEventListener("beforeunload", bye);
    };
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("notebook_id", notebookId);

    const newSource = { id: Date.now().toString(), name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' };
    setSources(prev => [...prev, newSource]);

    try {
      const res = await fetch(`${API_URL}/api/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
    } catch (error) {
      setSources(prev => prev.filter(s => s.id !== newSource.id));
      alert("Failed to upload source.");
    }
  };

  const deleteSource = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    setSources(prev => prev.filter(s => s.id !== id));
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    setInput("");
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("query", text);
    formData.append("notebook_id", notebookId);

    try {
      const res = await fetch(`${API_URL}/api/chat`, { method: "POST", body: formData });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Connection error. Is your backend running?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePodcast = async () => {
    setIsPodcastLoading(true);
    setPodcastUrl(null);
    const formData = new FormData();
    formData.append("notebook_id", notebookId);

    try {
      const res = await fetch(`${API_URL}/api/podcast`, { method: "POST", body: formData });
      const data = await res.json();
      setPodcastUrl(`${API_URL}${data.audio_url}`);
    } catch (error) {
      alert("Failed to generate podcast. Ensure Piper TTS is installed.");
    } finally {
      setIsPodcastLoading(false);
    }
  };

  // --- VOICE RECORDING LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop()); // Release mic
        handleTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscription = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    try {
      const res = await fetch(`${API_URL}/api/transcribe`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.text) {
        // Auto-send the transcribed text as a chat query
        handleSend(data.text);
      }
    } catch (error) {
      alert("Failed to transcribe audio.");
    } finally {
      setIsTranscribing(false);
    }
  };
  // -----------------------------

  return (
    <div className="flex h-screen w-full bg-dsbg text-dstext font-sans overflow-hidden">

      {/* LEFT SIDEBAR */}
      <div className="w-[260px] bg-dspanel border-r border-dsborder flex flex-col transition-all duration-300 z-20">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer">
             <div className="w-6 h-6 rounded-md bg-dsblue flex items-center justify-center text-white font-bold text-xs">DS</div>
             <span className="font-semibold text-[14px] text-white tracking-wide">DeepSeek Learn</span>
          </div>
          <Settings size={16} className="text-dsmuted cursor-pointer hover:text-white transition-colors" />
        </div>

        <div className="px-3 py-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center w-full py-2 bg-dsinput border border-dsborder hover:bg-[#333333] text-white rounded-md transition-all duration-200 font-medium text-[13px] gap-2"
          >
            <Plus size={14} /> Add Source
          </button>
          <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept=".pdf,.txt,.md,.mp3,.m4a,.ogg,.wav,.webm,.flac" />
        </div>

        <div className="flex-1 overflow-y-auto px-3 pt-4">
          <div className="text-[11px] font-bold text-dsmuted uppercase tracking-wider mb-2 px-1">Sources</div>
          {sources.length === 0 ? (
             <div className="px-2 py-6 text-center flex flex-col items-center justify-center border border-dashed border-dsborder rounded-lg opacity-60">
               <FileText size={20} className="mb-2 text-dsmuted" />
               <span className="text-[12px] text-dsmuted">No sources added.</span>
             </div>
          ) : (
            <div className="flex flex-col gap-1">
              {sources.map((s) => (
                <div key={s.id} className="group p-2.5 hover:bg-dsinput rounded-md border border-transparent flex items-center gap-2.5 transition-all">
                  <FileText size={14} className="text-dsmuted flex-shrink-0 group-hover:text-dsblue transition-colors" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] truncate text-gray-300">{s.name}</div>
                  </div>
                  <button onClick={() => deleteSource(s.id, s.name)} className="opacity-0 group-hover:opacity-100 text-dsmuted hover:text-red-400 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-dsborder">
           <div className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-dsinput transition">
             <div className="w-7 h-7 rounded-full bg-dsinput border border-dsborder flex items-center justify-center text-xs font-bold text-white">U</div>
             <div className="flex-1"><div className="text-[13px] font-medium text-white">Local User</div></div>
           </div>
        </div>
      </div>

      {/* CENTER - Chat Area */}
      <div className="flex-1 flex flex-col relative bg-dsbg">
        <div className="h-14 border-b border-dsborder flex items-center justify-between px-6 bg-dsbg sticky top-0 z-10">
          <div className="flex items-center gap-2 text-[13px] text-dsmuted">
             <span className="hover:text-white cursor-pointer transition">Notebook</span>
             <span className="text-dsborder">/</span>
             <span className="text-white font-medium">{notebookId}</span>
          </div>
          <button onClick={() => setShowStudio(!showStudio)} className="p-1.5 hover:bg-dsinput rounded-md text-dsmuted hover:text-white transition-colors">
            {showStudio ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8">
          <div className="max-w-3xl mx-auto w-full pt-10 pb-40">

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[55vh] text-center animate-fade-in">
                <div className="w-12 h-12 bg-dsinput border border-dsborder rounded-xl flex items-center justify-center mb-6">
                  <Sparkles size={24} className="text-dsblue" />
                </div>
                <h1 className="text-2xl font-semibold mb-2 text-white">How can I help you today?</h1>
                <p className="text-dsmuted max-w-md mb-8 text-[14px]">Upload your materials on the left or click the microphone to ask a question.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-2xl">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => handleSend(s)} className="p-3 text-[13px] text-left bg-dsinput border border-dsborder hover:border-dsmuted rounded-lg transition-all text-gray-300 hover:text-white">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`mb-6 flex animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                  {msg.role === 'ai' && (
                    <div className="w-7 h-7 rounded-md bg-dsinput border border-dsborder flex-shrink-0 flex items-center justify-center mr-3 mt-1">
                      <Sparkles size={14} className="text-dsblue" />
                    </div>
                  )}

                  <div className={`group relative max-w-[85%] text-[14px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-dsinput text-white px-4 py-2.5 rounded-xl border border-dsborder'
                      : 'text-gray-200 bg-transparent py-1'
                  }`}>
                    {msg.role === 'ai' ? (
                      <div className="markdown-body">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.text
                    )}

                    {msg.role === 'ai' && (
                      <div className="absolute -bottom-6 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={() => {
                          navigator.clipboard.writeText(msg.text);
                          setCopiedIndex(i);
                          setTimeout(() => setCopiedIndex(null), 2000);
                        }} className="p-1 text-dsmuted hover:text-white transition" title="Copy">
                          {copiedIndex === i ? <CheckCircle2 size={13} className="text-green-500" /> : <Copy size={13} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {(isLoading || isTranscribing) && (
              <div className="flex items-start mb-6 animate-fade-in">
                <div className="w-7 h-7 rounded-md bg-dsinput border border-dsborder flex-shrink-0 flex items-center justify-center mr-3 mt-1">
                  <Sparkles size={14} className="text-dsblue" />
                </div>
                <div className="flex items-center gap-2 h-8">
                  {isTranscribing ? (
                    <span className="text-[13px] text-dsmuted flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Transcribing audio...
                    </span>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 bg-dsmuted rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-dsmuted rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-dsmuted rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                    </>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* FLOATING INPUT BAR */}
        <div className="absolute bottom-0 left-0 right-0 pt-10 pb-6 px-6 bg-gradient-to-t from-dsbg via-dsbg to-transparent pointer-events-none">
          <div className="max-w-3xl mx-auto relative pointer-events-auto">
            <div className={`relative flex items-center bg-dsinput border rounded-xl transition-all duration-200 overflow-hidden ${
              isRecording ? 'border-red-500 ring-1 ring-red-500' : 'border-dsborder focus-within:border-dsmuted'
            }`}>
              <button className="pl-4 pr-2 text-dsmuted hover:text-white transition-colors"><Paperclip size={18} /></button>

              <input
                type="text"
                value={isRecording ? "Listening..." : input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !isRecording) { e.preventDefault(); handleSend(); } }}
                disabled={isRecording || isTranscribing}
                placeholder="Ask a question or create something..."
                className="w-full bg-transparent py-3.5 px-2 text-[14px] text-white placeholder-dsmuted focus:outline-none disabled:opacity-50"
              />

              <div className="pr-2 pl-2 flex items-center gap-1">
                {/* VOICE RECORDING BUTTON */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isTranscribing}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isRecording
                      ? 'bg-red-500/20 text-red-500 animate-pulse'
                      : 'text-dsmuted hover:text-white hover:bg-[#333333]'
                  }`}
                >
                  {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={16} />}
                </button>

                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || isRecording || isTranscribing || !input.trim()}
                  className="p-2 bg-dsblue hover:bg-dsbluehover disabled:bg-dsborder disabled:text-dsmuted rounded-lg text-white transition-all duration-200"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
            <div className="text-center mt-3 text-[11px] text-dsmuted">
              {isRecording ? "Recording... click the red square to stop and send." : "AI-generated, for reference only."}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR - Studio */}
      {showStudio && (
        <div className="w-[300px] bg-dspanel border-l border-dsborder p-4 flex flex-col animate-fade-in overflow-y-auto z-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold text-white tracking-wide">Studio</h2>
            <button onClick={() => setShowStudio(false)} className="text-dsmuted hover:text-white transition lg:hidden"><X size={16} /></button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="p-4 bg-dsinput border border-dsborder rounded-lg transition-all duration-200">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-1.5 bg-[#222222] rounded border border-dsborder"><Headphones size={16} className="text-gray-300" /></div>
                <div>
                  <h3 className="font-medium text-white text-[13px]">Audio Overview</h3>
                  <p className="text-[11px] text-dsmuted mt-0.5">Generate a podcast from sources.</p>
                </div>
              </div>

              <div>
                {!podcastUrl && !isPodcastLoading && (
                  <button onClick={generatePodcast} disabled={sources.length === 0} className="w-full py-2 bg-[#222222] hover:bg-[#333333] border border-dsborder rounded-md text-[12px] font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <PlaySquare size={14} className="text-gray-400" /> Generate Audio
                  </button>
                )}
                {isPodcastLoading && (
                  <div className="w-full py-2 flex items-center justify-center text-[12px] text-dsblue">
                    <Loader2 size={14} className="animate-spin mr-2" /> Generating...
                  </div>
                )}
                {podcastUrl && (
                  <div className="mt-1">
                    <audio controls src={podcastUrl} />
                    <div className="flex justify-between items-center mt-2">
                      <button onClick={() => setPodcastUrl(null)} className="text-[11px] text-dsmuted hover:text-white transition">Reset</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-dsinput border border-dsborder rounded-lg opacity-50 cursor-not-allowed">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-[#222222] rounded border border-dsborder"><Brain size={16} className="text-gray-300" /></div>
                <div>
                  <h3 className="font-medium text-white text-[13px]">Flashcards</h3>
                  <p className="text-[11px] text-dsmuted mt-0.5">Test your knowledge.</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-dsinput border border-dsborder rounded-lg opacity-50 cursor-not-allowed">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-[#222222] rounded border border-dsborder"><FileQuestion size={16} className="text-gray-300" /></div>
                <div>
                  <h3 className="font-medium text-white text-[13px]">Study Guide</h3>
                  <p className="text-[11px] text-dsmuted mt-0.5">Generate a summary.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
