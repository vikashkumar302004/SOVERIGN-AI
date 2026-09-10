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
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);

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

            const res = await authFetch("http://localhost:8000/api/v1/voice/transcribe", {
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
      const res = await authFetch("http://localhost:8000/api/v1/chat/sessions");
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
        `http://localhost:8000/api/v1/chat/sessions/${sessionId}/messages`
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
      const res = await authFetch("http://localhost:8000/api/v1/chat/sessions", {
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
        `http://localhost:8000/api/v1/chat/sessions/${sessionId}/star`,
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
        `http://localhost:8000/api/v1/chat/sessions/${sessionId}`,
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
      const res = await authFetch("http://localhost:8000/api/v1/documents/list");
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
        const res = await authFetch("http://localhost:8000/api/v1/chat/sessions", {
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
      }

      const res = await authFetch("http://localhost:8000/api/v1/chat", {
        method: "POST",
        body: formData,
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
                          }
                        : m
                    )
                  );
                } else if (data.type === "error") {
                  setError(data.error);
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
      setError(err.message || "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== aiMsgId));
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (promptText: string) => {
    setInput(promptText);
  };

  const filteredDocs = registryDocs.filter((d) =>
    d.filename.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  const starredSessions = sessions.filter((s) => s.is_starred);
  const recentSessions = sessions.filter((s) => !s.is_starred);

  // Helper to render session item button
  const renderSessionButton = (sess: ChatSession) => {
    const isActive = sess.id === activeSessionId;
    const relativeTime = formatRelativeTime(sess.created_at);

    return (
      <div
        key={sess.id}
        onClick={() => loadSessionMessages(sess.id)}
        className={`w-full cursor-pointer text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 group relative ${
          isActive
            ? "bg-[#22D3EE]/10 border-l-2 border-l-[#22D3EE] border-y border-r border-[#232838] text-[#22D3EE] font-medium"
            : "bg-transparent border border-transparent text-[#6B7280] hover:bg-[#12161F] hover:text-[#E5E7EB]"
        }`}
      >
        <MessageSquare className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? "text-[#22D3EE]" : "text-[#6B7280] group-hover:text-[#E5E7EB]"}`} />
        <div className="overflow-hidden flex-1 pr-12">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium truncate">{sess.title}</span>
          </div>
          {sess.last_message_preview && (
            <div className="text-[11px] text-[#6B7280] truncate font-mono mt-0.5">
              {sess.last_message_preview}
            </div>
          )}
        </div>

        {/* Hover Action Buttons: Star & Delete */}
        <div className="absolute right-2 top-2.5 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#12161F]/90 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-[#232838]">
          <button
            type="button"
            onClick={(e) => handleToggleStar(e, sess.id)}
            title={sess.is_starred ? "Unstar Chat" : "Star Chat"}
            className="p-1 text-[#6B7280] hover:text-[#FBBF24] transition-colors"
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
            className="p-1 text-[#6B7280] hover:text-[#F87171] transition-colors"
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

  return (
    <div className="h-full min-h-0 flex w-full bg-base overflow-hidden font-sans select-none transition-colors duration-300">
      {/* History Session Sidebar (Collapsible) */}
      {showHistorySidebar && (
        <div className="w-64 border-r border-token bg-base flex flex-col shrink-0 overflow-hidden shadow-xl transition-all duration-300">
          <div className="p-3.5 border-b border-token flex items-center justify-between">
            <button
              onClick={createNewSession}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 accent-gradient accent-gradient-hover text-[#0A0E14] font-bold py-2 px-3 rounded-lg text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 tracking-wide uppercase"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {fetchingSessions && sessions.length === 0 ? (
              <div className="p-3 text-xs text-muted font-mono">Loading...</div>
            ) : (
              <>
                {/* Starred Section (Only visible if starred sessions exist) */}
                {starredSessions.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-mono text-[#F59E0B] uppercase tracking-widest font-semibold flex items-center gap-1.5">
                      <Star className="w-3 h-3 fill-[#F59E0B]" />
                      <span>STARRED</span>
                    </div>
                    {starredSessions.map(renderSessionButton)}
                  </div>
                )}

                {/* Recent Chats Section */}
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-mono text-muted uppercase tracking-widest font-semibold">
                    RECENT CHATS
                  </div>
                  {recentSessions.length === 0 && starredSessions.length === 0 ? (
                    <div className="p-3 text-xs text-muted font-mono">No previous chats</div>
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
      <div className="flex-1 flex flex-col h-full min-w-0 bg-base relative transition-colors duration-300">
        {/* Slim Header Row */}
        <div className="px-6 py-3 flex items-center justify-between border-b border-token bg-base shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowHistorySidebar(!showHistorySidebar)}
              className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-token text-muted hover:text-primary transition-all shadow-sm"
              title={showHistorySidebar ? "Collapse History" : "Expand History"}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <img
                src="/sovereign_logo.png"
                alt="Sovereign AI Logo"
                className="w-6 h-6 rounded-lg object-cover border border-accent/40 shadow-sm"
              />
              <h1 className="text-xs font-semibold text-primary tracking-tight">
                Session #{activeSessionId || "New"}
              </h1>
            </div>
          </div>
        </div>

        {/* Scrollable Messages Area */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-8 space-y-8">
            {messages.length === 0 ? (
              /* Empty State for Fresh Session with Official Logo */
              <div className="h-[55vh] flex flex-col items-center justify-center text-center space-y-4 select-none">
                <img
                  src="/sovereign_logo.png"
                  alt="Sovereign AI Official Logo"
                  className="w-16 h-16 rounded-2xl border border-accent/40 shadow-xl object-cover"
                />
                <div>
                  <h3 className="text-base font-semibold text-primary">Start a Conversation with Sovereign AI</h3>
                  <p className="text-xs font-mono text-muted mt-1 max-w-sm">
                    Local LLM reasoning in strict air-gapped security with zero data leaks.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-4 transition-all ${
                    msg.sender === "user"
                      ? "flex-row-reverse space-x-reverse max-w-[85%] sm:max-w-[70%] ml-auto"
                      : "max-w-[85%] sm:max-w-[80%]"
                  }`}
                >
                  {/* Circular Avatars */}
                  {msg.sender === "user" ? (
                    <div className="w-9 h-9 rounded-full accent-gradient border border-accent/40 text-[#0A0E14] font-bold text-xs flex items-center justify-center shrink-0 shadow-md select-none">
                      {userInitial}
                    </div>
                  ) : (
                    <img
                      src="/sovereign_logo.png"
                      alt="Sovereign AI Logo"
                      className="w-9 h-9 rounded-full border border-accent/40 object-cover shadow-md shrink-0 select-none"
                    />
                  )}

                  {/* Message Content Container */}
                  <div className="flex-1 overflow-hidden">
                    {/* User Message Bubble */}
                    {msg.sender === "user" ? (
                      <div className="accent-gradient text-[#0A0E14] font-medium rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-md border border-accent/40 text-sm leading-relaxed">
                        {msg.attachedFileName && (
                          <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 text-[#0A0E14] text-xs font-mono font-semibold">
                            <FileText className="w-3.5 h-3.5" />
                            <span>{msg.attachedFileName}</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                      </div>
                    ) : (
                      /* Assistant Content */
                      <div className="text-primary text-sm leading-relaxed pt-0.5">
                        {msg.attachedFileName && (
                          <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/30 text-accent text-xs font-mono">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Attached: {msg.attachedFileName}</span>
                          </div>
                        )}

                        <MarkdownRenderer
                          content={msg.content}
                          isStreaming={msg.isStreaming}
                        />

                        {/* Model Badge & Timestamp Footer */}
                        {(msg.modelUsed || msg.timestamp) && (
                          <div className="flex items-center gap-3 mt-4 pt-2 border-t border-token">
                            {msg.modelUsed && (
                              <span className="px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent font-mono text-[11px] font-medium flex items-center gap-1.5 shadow-sm select-none">
                                <Cpu className="w-3 h-3 text-accent" />
                                {msg.modelUsed}
                              </span>
                            )}
                            {msg.timestamp && (
                              <span className="text-muted text-xs font-mono select-none">
                                {msg.timestamp}
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
              <div className="flex items-center gap-4">
                <img
                  src="/sovereign_logo.png"
                  alt="Sovereign AI Logo"
                  className="w-9 h-9 rounded-full border border-accent/40 object-cover shadow-md shrink-0 animate-pulse"
                />
                <div className="px-3.5 py-1.5 bg-surface border border-token text-xs font-mono text-muted rounded-full flex items-center gap-2 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  <span>Thinking & initializing stream...</span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-mono flex items-center gap-2.5 shadow-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Backend Error: {error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Pinned Fixed Bottom Input Bar */}
        <div className="sticky bottom-0 bg-gradient-to-t from-base via-base/95 to-transparent pt-2 pb-4 px-4 z-20">
          <div className="max-w-3xl mx-auto w-full relative">
            {/* Removable Selected File Chip */}
            {(selectedFile || selectedRegistryDoc) && (
              <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-mono shadow-md backdrop-blur-md">
                <FileText className="w-4 h-4 text-accent" />
                <span className="truncate max-w-xs">
                  {selectedFile ? selectedFile.name : selectedRegistryDoc?.filename}
                </span>
                <button
                  type="button"
                  onClick={removeAttachment}
                  className="hover:text-[#EF4444] transition-colors ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Paperclip Attachment Popover Modal */}
            {showAttachPopover && (
              <div
                ref={popoverRef}
                className="absolute bottom-16 left-0 w-80 bg-surface border border-token rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn"
              >
                <div className="text-xs font-semibold text-primary mb-2 flex items-center justify-between">
                  <span>Attach Document</span>
                  <button onClick={() => setShowAttachPopover(false)} className="text-muted hover:text-primary">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Option 1: OS File Upload */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center space-x-2.5 p-2.5 rounded-xl bg-base hover:bg-surface-hover border border-token text-xs text-primary transition-all"
                  >
                    <Upload className="w-4 h-4 text-accent" />
                    <div className="text-left">
                      <div className="font-semibold">Upload from Device</div>
                      <div className="text-[10px] text-muted">Select PDF, DOCX, TXT from OS</div>
                    </div>
                  </button>

                  {/* Option 2: Document Registry Scrollable List */}
                  <div className="pt-2 border-t border-token">
                    <div className="text-[11px] font-mono text-muted uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Choose from Registry</span>
                      <Database className="w-3 h-3 text-accent" />
                    </div>

                    {/* Registry Search */}
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted" />
                      <input
                        type="text"
                        value={docSearchQuery}
                        onChange={(e) => setDocSearchQuery(e.target.value)}
                        placeholder="Search registry files..."
                        className="w-full bg-base border border-token rounded-lg pl-8 pr-2 py-1 text-xs text-primary placeholder-muted outline-none"
                      />
                    </div>

                    {/* Docs Scroll List */}
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {loadingDocs ? (
                        <div className="text-[11px] text-muted font-mono p-2">Loading documents...</div>
                      ) : filteredDocs.length === 0 ? (
                        <div className="text-[11px] text-muted font-mono p-2">No documents found</div>
                      ) : (
                        filteredDocs.map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => handleSelectRegistryDoc(doc)}
                            className="w-full text-left p-2 rounded-lg bg-base hover:bg-surface-hover border border-transparent hover:border-token transition-all flex items-center justify-between text-xs text-primary group"
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span className="truncate">{doc.filename}</span>
                            </div>
                            <Check className="w-3.5 h-3.5 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
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
              <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-mono shadow-sm animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>Recording voice input... Click mic icon again to stop.</span>
              </div>
            )}
            {isTranscribing && (
              <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-mono shadow-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                <span>Transcribing voice recording offline with faster-whisper...</span>
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

              {/* Input Bar Container */}
              <div className="bg-surface/90 backdrop-blur-xl border border-token focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/30 rounded-2xl p-2 flex items-center gap-2 shadow-2xl transition-all">
                {/* Paperclip Button */}
                <button
                  type="button"
                  onClick={handleOpenAttachPopover}
                  disabled={loading || isRecording || isTranscribing}
                  title="Attach File or Select from Registry"
                  className="p-2 text-muted hover:text-accent disabled:opacity-40 transition-colors rounded-xl hover:bg-surface-hover shrink-0"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Microphone STT Button */}
                <button
                  type="button"
                  onClick={handleToggleRecording}
                  disabled={loading || isTranscribing}
                  title={isRecording ? "Stop Recording & Transcribe" : "Start Voice Input (STT)"}
                  className={`p-2 transition-all rounded-xl shrink-0 flex items-center justify-center ${
                    isRecording
                      ? "bg-rose-500/20 text-rose-500 border border-rose-500/40 animate-pulse"
                      : "text-muted hover:text-accent hover:bg-surface-hover disabled:opacity-40"
                  }`}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  ) : isRecording ? (
                    <MicOff className="w-4 h-4 text-rose-500" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>

                {/* Prompt Text Input */}
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
                  className="w-full bg-transparent text-primary placeholder-muted text-sm outline-none px-2 py-2 font-sans"
                  disabled={loading || isTranscribing}
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={loading || isRecording || isTranscribing || (!input.trim() && !selectedFile && !selectedRegistryDoc)}
                  className="p-2.5 rounded-xl accent-gradient text-[#0A0E14] accent-gradient-hover shadow-md shadow-accent/20 disabled:opacity-30 transition-all active:scale-95 shrink-0"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
