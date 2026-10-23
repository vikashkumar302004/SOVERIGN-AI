"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
  User,
  Cpu,
  Clock,
  AlertCircle,
  Plus,
  Paperclip,
  X,
  FileText,
  MessageSquare,
  PanelLeft,
  Search,
  Upload,
  Database,
  Check,
  ChevronRight,
  Star,
  Trash2,
  Mic,
  MicOff,
  Loader2,
  Square,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface ChatSession {
  id: string;
  title: string;
  is_starred: boolean;
  created_at: string;
  last_message_preview?: string;
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  content: string;
  modelUsed?: string;
  attachedDocumentId?: string | null;
  attachedFileName?: string | null;
  timestamp: string;
  isStreaming?: boolean;
  sources?: CitationSource[];
  finishReason?: "complete" | "stopped" | "error";
}

interface CitationSource {
  label: string;
  document_id: number;
  filename: string;
  chunk_index: number;
  score: number;
  excerpt: string;
}

interface RegistryDocument {
  id: number;
  filename: string;
  file_size: number;
  created_at: string;
}

// Relative time formatting helper
function formatRelativeTime(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return "Yesterday";
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export default function ChatPage() {
  const { authFetch, user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRegistryDoc, setSelectedRegistryDoc] = useState<RegistryDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingSessions, setFetchingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History Sidebar Collapsible State
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);

  // Attachment Popover State
  const [showAttachPopover, setShowAttachPopover] = useState(false);
  const [registryDocs, setRegistryDocs] = useState<RegistryDocument[]>([]);
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Voice Recording (STT) State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const generationAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setShowHistorySidebar(window.matchMedia("(min-width: 768px)").matches);
  }, []);

  const stopGeneration = () => {
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    setLoading(false);
    setMessages((prev) =>
      prev.map((message) =>
        message.isStreaming
          ? { ...message, isStreaming: false, finishReason: "stopped" }
          : message
      )
    );
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Browser does not support microphone voice input.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());

          const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
          if (audioBlob.size === 0) return;

          setIsTranscribing(true);
          try {
            const formData = new FormData();
            formData.append("file", audioBlob, "voice_input.webm");

            const res = await authFetch("/api/v1/voice/transcribe", {
              method: "POST",
              body: formData,
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.detail || "Voice transcription failed");
            }

            const data = await res.json();
            if (data.text) {
              setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
            }
          } catch (err: any) {
            alert(err.message || "Failed to transcribe voice input");
          } finally {
            setIsTranscribing(false);
          }
        };

        recorder.start();
        setIsRecording(true);
      } catch (err: any) {
        alert("Microphone permission denied or unavailable: " + (err.message || err));
      }
    }
  };

  const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : "U";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    fetchSessions();
  }, []);

  // Close attachment popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowAttachPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSessions = async () => {
    setFetchingSessions(true);
    try {
      const res = await authFetch("/api/v1/chat/sessions");
      if (!res.ok) throw new Error("Failed to fetch chat sessions");
      const data = await res.json();
      const loadedSessions: ChatSession[] = (data.sessions || []).map((s: any) => ({
        id: String(s.id),
        title: s.title,
        is_starred: Boolean(s.is_starred),
        created_at: s.created_at,
        last_message_preview: s.last_message_preview,
      }));
      setSessions(loadedSessions);

      if (!activeSessionId) {
        if (loadedSessions.length > 0) {
          loadSessionMessages(loadedSessions[0].id);
        } else {
          createNewSession();
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setFetchingSessions(false);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/v1/chat/sessions/${sessionId}/messages`
      );
      if (!res.ok) throw new Error("Failed to load message history");
      const data = await res.json();
      const loadedMsgs: Message[] = (data.messages || []).map((m: any) => ({
        id: String(m.id),
        sender: m.role === "user" ? "user" : "assistant",
        content: m.content,
        modelUsed: m.model_used,
        attachedDocumentId: m.attached_document_id,
        attachedFileName: m.attached_filename,
        timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
        isStreaming: false,
      }));
      setMessages(loadedMsgs);
    } catch (err: any) {
      setError(err.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await authFetch("/api/v1/chat/sessions", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to create new session");
      const data = await res.json();
      const newSessionId = String(data.session_id);

      setActiveSessionId(newSessionId);
      setMessages([]);
      setSelectedFile(null);
      setSelectedRegistryDoc(null);
      setInput("");

      await fetchSessions();
      setActiveSessionId(newSessionId);
    } catch (err: any) {
      setError(err.message || "Failed to create new session");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Session Star/Favorite Status
  const handleToggleStar = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      const res = await authFetch(
        `/api/v1/chat/sessions/${sessionId}/star`,
        { method: "PATCH" }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn("Failed to toggle star:", errData.detail || res.statusText);
        return;
      }
      const updated = await res.json();

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, is_starred: updated.is_starred } : s
        )
      );
      fetchSessions();
    } catch (err: any) {
      console.error("Star toggle error:", err);
    }
  };

  // Delete Session
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!window.confirm("Permanently delete this chat session and all its messages?")) return;

    try {
      const res = await authFetch(
        `/api/v1/chat/sessions/${sessionId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to delete session");
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      if (activeSessionId === sessionId) {
        createNewSession();
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete chat session");
    }
  };

  // Fetch document registry list for Popover
  const fetchRegistryDocs = async () => {
    setLoadingDocs(true);
    try {
      const res = await authFetch("/api/v1/documents/list");
      if (res.ok) {
        const data = await res.json();
        setRegistryDocs(data.documents || []);
      }
    } catch (err) {
      console.error("Failed fetching registry docs:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleOpenAttachPopover = () => {
    setShowAttachPopover(!showAttachPopover);
    if (!showAttachPopover) {
      fetchRegistryDocs();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setSelectedRegistryDoc(null);
      setShowAttachPopover(false);
    }
  };

  const handleSelectRegistryDoc = (doc: RegistryDocument) => {
    setSelectedRegistryDoc(doc);
    setSelectedFile(null);
    setShowAttachPopover(false);
  };

  const removeAttachment = () => {
    setSelectedFile(null);
    setSelectedRegistryDoc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedFile && !selectedRegistryDoc) || loading) return;

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      try {
        const res = await authFetch("/api/v1/chat/sessions", {
          method: "POST",
        });
        if (!res.ok) throw new Error("Failed to create chat session");
        const data = await res.json();
        currentSessionId = String(data.session_id);
        setActiveSessionId(currentSessionId);
      } catch (err: any) {
        setError("Failed to create active session");
        return;
      }
    }

    const userText = input.trim();
    const attachedFile = selectedFile;
    const registryDoc = selectedRegistryDoc;
    const attachedName = attachedFile ? attachedFile.name : registryDoc ? registryDoc.filename : null;

    setInput("");
    setSelectedFile(null);
    setSelectedRegistryDoc(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError(null);

    const userMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: "user",
      content: userText,
      attachedFileName: attachedName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const aiMsgId = `ai-${Date.now()}`;
    const aiMsgPlaceholder: Message = {
      id: aiMsgId,
      sender: "assistant",
      content: "",
      modelUsed: "",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, aiMsgPlaceholder]);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("prompt", userText);
      if (currentSessionId) {
        formData.append("session_id", currentSessionId);
      }
      if (attachedFile) {
        formData.append("file", attachedFile);
      } else if (registryDoc) {
        formData.append("document_id", String(registryDoc.id));
      }

      const controller = new AbortController();
      generationAbortRef.current = controller;
      const res = await authFetch("/api/v1/chat", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          buffer = buffer.replace(/\r\n/g, "\n");
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed.startsWith("data: ")) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                if (data.type === "init") {
                  if (data.session_id) setActiveSessionId(String(data.session_id));
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMsgId
                        ? {
                            ...m,
                            modelUsed: data.model_used,
                            attachedFileName: data.attached_filename || m.attachedFileName,
                            sources: Array.isArray(data.sources) ? data.sources : [],
                          }
                        : m
                    )
                  );
                } else if (data.type === "token") {
                  accumulatedText += data.token;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMsgId
                        ? {
                            ...m,
                            content: accumulatedText,
                            modelUsed: data.model_used || m.modelUsed,
                          }
                        : m
                    )
                  );
                } else if (data.type === "done") {
                  accumulatedText = data.full_text || accumulatedText;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMsgId
                        ? {
                            ...m,
                            content: accumulatedText,
                            modelUsed: data.model_used || m.modelUsed,
                            isStreaming: false,
                            finishReason: data.finish_reason || "complete",
                          }
                        : m
                    )
                  );
                } else if (data.type === "error") {
                  const reference = data.request_id ? ` Reference: ${data.request_id}` : "";
                  setError(`${data.error || "Generation failed"}${reference}`);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMsgId
                        ? { ...m, isStreaming: false, finishReason: "error" }
                        : m
                    )
                  );
                }
              } catch (parseErr) {
                console.error("SSE parse error:", parseErr);
              }
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, isStreaming: false } : m))
      );
      fetchSessions();
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setError(err.message || "Failed to send message");
        setMessages((prev) => prev.filter((m) => m.id !== aiMsgId));
      }
    } finally {
      generationAbortRef.current = null;
      setLoading(false);
    }
  };

  const handleExampleClick = (promptText: string) => {
    setInput(promptText);
  };

  const filteredDocs = registryDocs.filter((d) =>
    d.filename.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  // Helper to get per-model colored dot style
  const getModelDotClass = (modelName?: string) => {
    if (!modelName) return "bg-[#22D3EE] shadow-[0_0_6px_#22D3EE]";
    const m = modelName.toLowerCase();
    if (m.includes("llama")) return "bg-[#22D3EE] shadow-[0_0_6px_#22D3EE]";
    if (m.includes("coder")) return "bg-[#A855F7] shadow-[0_0_6px_#A855F7]";
    if (m.includes("llava")) return "bg-[#F59E0B] shadow-[0_0_6px_#F59E0B]";
    if (m.includes("qwen")) return "bg-[#10B981] shadow-[0_0_6px_#10B981]";
    return "bg-[#22D3EE] shadow-[0_0_6px_#22D3EE]";
  };

  const starredSessions = sessions.filter((s) => s.is_starred);
  const recentSessions = sessions.filter((s) => !s.is_starred);

  // Helper to render session item button
  const renderSessionButton = (sess: ChatSession) => {
    const isActive = sess.id === activeSessionId;

    return (
      <div
        key={sess.id}
        onClick={() => loadSessionMessages(sess.id)}
        className={`w-full cursor-pointer text-left p-2.5 rounded-xl transition-all duration-150 ease-out active:scale-[0.98] flex items-start gap-2.5 group relative ${
          isActive
            ? "bg-[#22D3EE]/10 border-l-2 border-l-[#22D3EE] border-y border-r border-[#232838] text-[#22D3EE] font-medium"
            : "bg-transparent border border-transparent text-[#4B5563] hover:bg-[#12161F]/60 hover:text-[#E5E7EB]"
        }`}
      >
        <MessageSquare className={`w-4 h-4 mt-0.5 shrink-0 transition-opacity ${isActive ? "text-[#22D3EE] opacity-100" : "text-[#4B5563] opacity-50 group-hover:opacity-100 group-hover:text-[#E5E7EB]"}`} />
        <div className="overflow-hidden flex-1 pr-10">
          <div className="flex items-center justify-between gap-1">
            <span className={`text-[13px] font-medium truncate ${isActive ? "text-[#22D3EE]" : "text-[#D1D5DB]"}`}>
              {sess.title}
            </span>
          </div>
          {sess.last_message_preview && (
            <span className="text-[11px] text-[#4B5563] truncate block font-mono mt-0.5">
              {sess.last_message_preview}
            </span>
          )}
        </div>

        {/* Hover Action Buttons: Star & Delete */}
        <div className="absolute right-2 top-2.5 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#12161F]/90 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-[#232838]">
          <button
            type="button"
            onClick={(e) => handleToggleStar(e, sess.id)}
            title={sess.is_starred ? "Unstar Chat" : "Star Chat"}
            className="p-1 text-[#6B7280] hover:text-[#FBBF24] transition-colors active:scale-95"
          >
            <Star
              className={`w-3.5 h-3.5 ${
                sess.is_starred
                  ? "fill-[#FBBF24] text-[#FBBF24]"
                  : "text-[#6B7280]"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={(e) => handleDeleteSession(e, sess.id)}
            title="Delete Chat Session"
            className="p-1 text-[#6B7280] hover:text-[#F87171] transition-colors active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Persistent Star icon when starred and not hovered */}
        {sess.is_starred && (
          <Star className="w-3.5 h-3.5 fill-[#FBBF24] text-[#FBBF24] absolute right-3 top-3 group-hover:hidden" />
        )}
      </div>
    );
  };

  const hasInputContent = Boolean(input.trim() || selectedFile || selectedRegistryDoc);

  return (
    <div className="h-full min-h-0 flex w-full bg-[#07090d] overflow-hidden font-sans select-none">
      {/* History Session Sidebar (Collapsible) */}
      {showHistorySidebar && (
        <div className="absolute inset-y-0 left-0 z-30 w-[280px] border-r border-white/[0.07] bg-[#0b0e13] flex flex-col shrink-0 overflow-hidden shadow-[20px_0_60px_rgba(0,0,0,.35)] transition-all duration-300 md:relative md:w-64 md:shadow-none">
          <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between">
            {/* ONE BOLD ACCENT MOMENT: Solid Cyan New Chat Button */}
            <button
              onClick={createNewSession}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 accent-gradient text-[#07101f] font-semibold text-xs py-2.5 px-3 rounded-[10px] shadow-[0_10px_30px_rgba(55,91,160,.18)] transition-all duration-150 active:scale-[.98] disabled:opacity-50 font-sans cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New conversation</span>
            </button>
            <button
              type="button"
              onClick={() => setShowHistorySidebar(false)}
              aria-label="Close conversation history"
              className="ml-2 rounded-lg p-2 text-[#6f7989] hover:bg-white/[0.05] hover:text-white md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-8">
            {fetchingSessions && sessions.length === 0 ? (
              <div className="p-3 text-xs text-[#4B5563] font-mono">Loading...</div>
            ) : (
              <>
                {/* Starred Section */}
                {starredSessions.length > 0 && (
                  <div className="space-y-[2px]">
                    <div className="px-2.5 py-1 text-[10px] font-mono text-[#F59E0B] uppercase tracking-[0.15em] font-medium flex items-center gap-1.5">
                      <Star className="w-3 h-3 fill-[#F59E0B]" />
                      <span>STARRED</span>
                    </div>
                    {starredSessions.map(renderSessionButton)}
                  </div>
                )}

                {/* Recent Chats Section */}
                <div className="space-y-[2px]">
                  <div className="px-2.5 py-1 text-[10px] font-mono text-[#374151] uppercase tracking-[0.15em] font-medium">
                    RECENT CHATS
                  </div>
                  {recentSessions.length === 0 && starredSessions.length === 0 ? (
                    <div className="p-3 text-xs text-[#4B5563] font-mono">No previous chats</div>
                  ) : (
                    recentSessions.map(renderSessionButton)
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Full-Width Chat Canvas Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#07090d] relative overflow-hidden">
        {/* Slim Header Row */}
        <div className="px-4 sm:px-6 h-12 flex items-center justify-between border-b border-white/[0.055] bg-[#080b0f]/90 shrink-0 relative z-10">
          <div className="flex items-center space-x-3 text-[11px] font-mono text-[#6B7280]">
            <button
              onClick={() => setShowHistorySidebar(!showHistorySidebar)}
              className="p-1.5 rounded-lg hover:bg-white/[0.05] text-[#6f7989] hover:text-[#e6ebf2] transition-colors active:scale-95"
              title={showHistorySidebar ? "Collapse History" : "Expand History"}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[#818b9a] tracking-wide font-sans">
                {activeSessionId ? `Conversation #${activeSessionId}` : "New conversation"}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Messages Area */}
        <div className="flex-1 overflow-y-auto w-full relative z-10">
          {/* Spacing Rhythm: 40px vertical gap between speaker messages; flex justify-end hugs bottom when sparse */}
          <div className={`max-w-[820px] mx-auto w-full px-4 md:px-8 py-8 space-y-10 ${messages.length > 0 ? "min-h-full flex flex-col justify-end" : ""}`}>
            {messages.length === 0 ? (
              /* Truly Empty Session: Restrained 48px Icon + 1 line muted text */
              <div className="min-h-[58vh] flex flex-col items-center justify-center text-center select-none px-2">
                <div className="w-12 h-12 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.015] flex items-center justify-center shadow-[0_18px_50px_rgba(0,0,0,.3)]">
                  <MessageSquare className="w-5 h-5 text-[#8eb1ff]" />
                </div>
                <h1 className="mt-6 text-3xl font-semibold tracking-[-.045em] text-[#eef2f8]">How can I help you?</h1>
                <p className="mt-3 max-w-lg text-base leading-7 text-[#8791a1]">Ask anything, brainstorm an idea, write code, or attach a document and ask questions about it.</p>
                <div className="mt-7 grid w-full max-w-2xl gap-2 sm:grid-cols-3">
                  {[
                    "Explain a difficult topic",
                    "Help me write something",
                    "Analyze an attached document",
                  ].map((suggestion) => (
                    <button key={suggestion} onClick={() => setInput(suggestion)} className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3 text-left text-[11px] leading-4 text-[#7d8797] transition hover:border-[#78a7ff]/25 hover:bg-[#78a7ff]/[0.05] hover:text-[#b6c8e8]">
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-4 transition-all ${
                    msg.sender === "user"
                      ? "flex-row-reverse space-x-reverse max-w-[85%] sm:max-w-[75%] ml-auto"
                      : "max-w-[90%] sm:max-w-[85%]"
                  }`}
                >
                  {/* Circular Avatars */}
                  {msg.sender === "user" ? (
                    <div className="w-8 h-8 rounded-full bg-[#1F293D] border border-white/[0.08] text-[#E5E7EB] font-medium text-xs flex items-center justify-center shrink-0 select-none">
                      {userInitial}
                    </div>
                  ) : (
                    <img
                      src="/sovereign_logo.png"
                      alt="Sovereign AI Logo"
                      className="w-8 h-8 rounded-lg border border-white/[0.08] object-cover shrink-0 select-none"
                    />
                  )}

                  {/* Message Content Container */}
                  <div className="flex-1 overflow-hidden">
                    {/* User Message Bubble: Restrained Dark Elevated Surface (#1A2030) with 2px Cyan Left Accent */}
                    {msg.sender === "user" ? (
                      <div className="bg-[#1A2030] text-[#E5E7EB] rounded-2xl rounded-tr-sm px-4 py-3 border border-white/[0.08] border-l-2 border-l-[#22D3EE] text-sm leading-relaxed shadow-sm font-sans">
                        {msg.attachedFileName && (
                          <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30 text-[#22D3EE] text-xs font-mono">
                            <FileText className="w-3.5 h-3.5" />
                            <span>{msg.attachedFileName}</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                      </div>
                    ) : (
                      /* Assistant Content: 15px leading-[1.7] #D1D5DB with pl-6 Rail Alignment under avatar */
                      <div className="text-[#D1D5DB] text-[15px] leading-[1.7] pt-0.5">
                        {msg.attachedFileName && (
                          <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#161B26] border border-white/[0.08] text-[#22D3EE] text-xs font-mono">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Attached: {msg.attachedFileName}</span>
                          </div>
                        )}

                        <MarkdownRenderer
                          content={msg.content}
                          isStreaming={msg.isStreaming}
                        />

                        {/* Model Badge with Colored Dot & Monospace Timestamp Footer */}
                        {(msg.modelUsed || msg.timestamp || msg.finishReason === "stopped") && (
                          <div className="flex items-center gap-3 mt-4 pt-2 border-t border-[#232838]/50">
                            {msg.modelUsed && (
                              <span className="px-2.5 py-0.5 rounded-full bg-[#161B26] border border-white/[0.08] text-[#9CA3AF] font-mono text-[11px] font-medium flex items-center gap-1.5 select-none">
                                <span className={`w-1.5 h-1.5 rounded-full ${getModelDotClass(msg.modelUsed)}`} />
                                <span>{msg.modelUsed}</span>
                              </span>
                            )}
                            {msg.timestamp && (
                              <span className="text-[#6B7280] text-[10px] font-mono tracking-wider select-none">
                                {msg.timestamp}
                              </span>
                            )}
                            {msg.finishReason === "stopped" && (
                              <span className="text-amber-400/80 text-[10px] font-mono uppercase tracking-wider">
                                Stopped · partial response saved
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* "Thinking & initializing..." Indicator */}
            {loading && messages.length > 0 && messages[messages.length - 1]?.sender === "assistant" && !messages[messages.length - 1]?.content && (
              <div className="flex items-center gap-3">
                <img
                  src="/sovereign_logo.png"
                  alt="Sovereign AI Logo"
                  className="w-8 h-8 rounded-lg border border-white/[0.08] object-cover shrink-0 animate-pulse"
                />
                <div className="px-3 py-1 bg-[#161B26] border border-white/[0.08] text-xs font-mono text-[#6B7280] rounded-full flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-ping" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-mono flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Backend Error: {error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Scroll-fade bottom gradient */}
        <div className="absolute bottom-16 left-0 right-0 h-10 bg-gradient-to-t from-[#0D1117] to-transparent pointer-events-none z-10" />

        {/* Requirement 5: Visually Anchored Bottom Input Zone (#0D1117 with 1px top border) */}
        <div className="bg-[#080b0f]/95 border-t border-white/[0.055] py-3 px-3 sm:px-4 z-20 sticky bottom-0 backdrop-blur-xl">
          <div className="max-w-[820px] mx-auto w-full relative">
            {/* Removable Selected File Chip */}
            {(selectedFile || selectedRegistryDoc) && (
              <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#161B26] border border-white/[0.08] text-[#22D3EE] text-xs font-mono shadow-sm">
                <FileText className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span className="truncate max-w-xs">
                  {selectedFile ? selectedFile.name : selectedRegistryDoc?.filename}
                </span>
                <button
                  type="button"
                  onClick={removeAttachment}
                  className="hover:text-[#EF4444] transition-colors ml-1 active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Paperclip Attachment Popover Modal */}
            {showAttachPopover && (
              <div
                ref={popoverRef}
                className="absolute bottom-14 left-0 w-80 bg-[#161B26] border border-white/[0.1] rounded-xl shadow-2xl p-3 z-50 animate-fadeIn"
              >
                <div className="text-xs font-semibold text-[#E5E7EB] mb-2 flex items-center justify-between uppercase tracking-wider font-mono">
                  <span>Attach Document</span>
                  <button onClick={() => setShowAttachPopover(false)} className="text-[#6B7280] hover:text-[#E5E7EB] active:scale-95">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center space-x-2.5 p-2.5 rounded-lg bg-[#0A0E14] hover:bg-[#1F2533] border border-white/[0.06] text-xs text-[#E5E7EB] transition-all"
                  >
                    <Upload className="w-4 h-4 text-[#22D3EE]" />
                    <div className="text-left">
                      <div className="font-medium">Upload from Device</div>
                      <div className="text-[10px] text-[#6B7280]">Select PDF, DOCX, TXT from OS</div>
                    </div>
                  </button>

                  <div className="pt-2 border-t border-white/[0.06]">
                    <div className="text-[10px] font-mono text-[#6B7280] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Choose from Registry</span>
                      <Database className="w-3 h-3 text-[#22D3EE]" />
                    </div>

                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#6B7280]" />
                      <input
                        type="text"
                        value={docSearchQuery}
                        onChange={(e) => setDocSearchQuery(e.target.value)}
                        placeholder="Search registry files..."
                        className="w-full bg-[#0A0E14] border border-white/[0.06] rounded-md pl-8 pr-2 py-1 text-xs text-[#E5E7EB] placeholder-[#4B5563] outline-none"
                      />
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {loadingDocs ? (
                        <div className="text-[11px] text-[#6B7280] font-mono p-2">Loading documents...</div>
                      ) : filteredDocs.length === 0 ? (
                        <div className="text-[11px] text-[#6B7280] font-mono p-2">No documents found</div>
                      ) : (
                        filteredDocs.map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => handleSelectRegistryDoc(doc)}
                            className="w-full text-left p-2 rounded-md bg-[#0A0E14] hover:bg-[#1F2533] border border-transparent hover:border-white/[0.06] transition-all flex items-center justify-between text-xs text-[#E5E7EB] group"
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <FileText className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" />
                              <span className="truncate">{doc.filename}</span>
                            </div>
                            <Check className="w-3.5 h-3.5 text-[#22D3EE] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Voice Recording / Transcribing Live Banner Chips */}
            {isRecording && (
              <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>Recording voice input... Click mic icon again to stop.</span>
              </div>
            )}
            {isTranscribing && (
              <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#22D3EE]/10 border border-[#22D3EE]/20 text-[#22D3EE] text-xs font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#22D3EE]" />
                <span>Transcribing audio...</span>
              </div>
            )}

            {/* Input Bar Form */}
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Requirement 5: bg-[#161B26], border border-white/[0.08], rounded-xl, focus-within:border-[#22D3EE]/40 with NO glow ring */}
              <div className="bg-[#10141b] border border-white/[0.09] focus-within:border-[#78a7ff]/40 rounded-2xl p-1.5 flex items-center gap-1 sm:gap-2 shadow-[0_16px_50px_rgba(0,0,0,.2)] transition-colors outline-none">
                <button
                  type="button"
                  onClick={handleOpenAttachPopover}
                  disabled={loading || isRecording || isTranscribing}
                  title="Attach File or Select from Registry"
                  className="p-2 text-[#6B7280] hover:text-[#22D3EE] disabled:opacity-40 transition-colors rounded-lg shrink-0"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleRecording}
                  disabled={loading || isTranscribing}
                  title={isRecording ? "Stop Recording & Transcribe" : "Start Voice Input (STT)"}
                  className={`p-2 transition-colors rounded-lg shrink-0 flex items-center justify-center ${
                    isRecording
                      ? "bg-rose-500/20 text-rose-400"
                      : "text-[#6B7280] hover:text-[#22D3EE] disabled:opacity-40"
                  }`}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#22D3EE]" />
                  ) : isRecording ? (
                    <MicOff className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isRecording
                      ? "Listening to voice input..."
                      : isTranscribing
                      ? "Transcribing audio..."
                      : "Ask Sovereign AI anything..."
                  }
                  className="w-full bg-transparent text-[#E5E7EB] placeholder-[#4B5563] text-sm outline-none px-2 py-1.5 font-sans"
                  disabled={loading || isTranscribing}
                />

                <button
                  type={loading ? "button" : "submit"}
                  onClick={loading ? stopGeneration : undefined}
                  disabled={!loading && (isRecording || isTranscribing || !hasInputContent)}
                  title={loading ? "Stop generation" : "Send message"}
                  className={`p-2 rounded-lg transition-all duration-150 active:scale-95 shrink-0 flex items-center justify-center ${
                    loading || hasInputContent
                      ? "bg-[#82a9fa] hover:bg-[#9bbaff] text-[#07101f] opacity-100 cursor-pointer"
                      : "bg-[#1F2533] text-[#4B5563] opacity-40 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <Square className="w-4 h-4 fill-current" />
                  ) : (
                    <Send className="w-4 h-4 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
