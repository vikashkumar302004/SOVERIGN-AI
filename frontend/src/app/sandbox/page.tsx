"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Terminal, Play, CheckCircle2, XCircle, Clock, AlertTriangle, Code2 } from "lucide-react";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-base flex items-center justify-center font-mono text-xs text-muted animate-pulse">
      <span>Initializing Sandbox Code Editor Engine...</span>
    </div>
  ),
});

const SAMPLE_PYTHON = `def check_prime(n: int) -> bool:
    if n <= 1:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

print("Testing prime numbers up to 20:")
for num in range(1, 21):
    print(f"Number {num:2d}: {'PRIME' if check_prime(num) else 'COMPOSITE'}")
`;

const SAMPLE_CPP = `#include <iostream>
#include <vector>

int main() {
    std::cout << "Sovereign AI C++ Subprocess Sandbox" << std::endl;
    std::vector<int> numbers = {10, 20, 30, 40, 50};
    int sum = 0;
    for (int n : numbers) {
        sum += n;
    }
    std::cout << "Calculated Sum: " << sum << std::endl;
    return 0;
}
`;

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export default function SandboxPage() {
  const { authFetch } = useAuth();
  const { theme } = useTheme();
  const [language, setLanguage] = useState<"python" | "cpp">("python");
  const [code, setCode] = useState(SAMPLE_PYTHON);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const handleLanguageChange = (newLang: "python" | "cpp") => {
    setLanguage(newLang);
    setCode(newLang === "python" ? SAMPLE_PYTHON : SAMPLE_CPP);
    setResult(null);
  };

  const handleExecute = async () => {
    if (!code.trim() || executing) return;

    setExecuting(true);
    setError(null);
    setResult(null);

    const startTime = performance.now();

    try {
      const res = await authFetch("/api/v1/sandbox/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code }),
      });

      const endTime = performance.now();
      setExecutionTime(Math.round(endTime - startTime));

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Execution failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to execute code in sandbox");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="workspace-page space-y-6 select-none">
      {/* Header */}
      <div className="pb-4 border-b border-token flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <Terminal className="w-5 h-5 text-accent" />
            Subprocess Code Sandbox
          </h1>
          <p className="text-xs text-muted font-mono mt-1">
            POST /api/v1/sandbox/execute &bull; Python Subprocess & WinLibs g++ (-static) C++ Compiler
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <div className="flex items-center bg-surface border border-token rounded-lg p-1 text-xs font-mono shadow-sm">
            <button
              onClick={() => handleLanguageChange("python")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                language === "python"
                  ? "bg-accent/15 text-accent border border-accent/40 font-semibold"
                  : "text-muted hover:text-primary"
              }`}
            >
              Python
            </button>
            <button
              onClick={() => handleLanguageChange("cpp")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                language === "cpp"
                  ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40 font-semibold"
                  : "text-muted hover:text-primary"
              }`}
            >
              C++ (g++)
            </button>
          </div>

          {/* Run Button */}
          <button
            onClick={handleExecute}
            disabled={executing || !code.trim()}
            className="px-5 py-2 bg-[#10B981] hover:bg-[#059669] text-[#0A0E14] font-bold text-xs rounded-lg disabled:opacity-40 transition-all flex items-center space-x-2 shadow-md cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 fill-[#0A0E14]" />
            <span>{executing ? "Executing..." : "Run Code"}</span>
          </button>
        </div>
      </div>

      {/* Editor & Output Panels Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Editor Box */}
        <div className="bg-surface border border-token rounded-xl overflow-hidden flex flex-col h-[500px] shadow-md">
          <div className="bg-base border-b border-token px-4 py-2.5 flex items-center justify-between text-xs font-mono text-muted">
            <span className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-accent" />
              Source Editor ({language.toUpperCase()})
            </span>
            <span className="text-[10px] text-muted">Monaco Engine</span>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : "python"}
              theme={theme === "light" ? "vs" : "vs-dark"}
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                fontSize: 13,
                fontFamily: "monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 12 },
              }}
            />
          </div>
        </div>

        {/* Terminal Output Panel */}
        <div className="bg-surface border border-token rounded-xl flex flex-col h-[500px] overflow-hidden shadow-md">
          {/* Header Bar */}
          <div className="bg-base border-b border-token px-4 py-2.5 flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-2 text-muted">
              <Terminal className="w-4 h-4 text-[#10B981]" />
              Terminal Console Output
            </span>
            {result && (
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="flex items-center space-x-1 text-muted">
                  <Clock className="w-3 h-3 text-[#F59E0B]" />
                  <span>{executionTime} ms</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    result.status === "SUCCESS"
                      ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40"
                      : result.status === "COMPILE_ERROR"
                      ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40"
                      : "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40"
                  }`}
                >
                  {result.status} (Exit: {result.exit_code})
                </span>
              </div>
            )}
          </div>

          {/* Console Area */}
          <div className="p-4 flex-1 bg-base overflow-y-auto font-mono text-xs space-y-4">
            {executing ? (
              <div className="py-12 text-center text-muted flex items-center justify-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping"></span>
                <span>Compiling & Running Subprocess Sandbox...</span>
              </div>
            ) : !result && !error ? (
              <div className="py-12 text-center text-muted">
                Click &quot;Run Code&quot; to execute code in sandbox.
              </div>
            ) : (
              <>
                {/* Standard Output (stdout) */}
                {result?.stdout && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#10B981] font-semibold uppercase tracking-wider block">
                      STDOUT
                    </span>
                    <pre className="text-primary whitespace-pre-wrap leading-relaxed bg-surface p-3 rounded-lg border border-token">
                      {result.stdout}
                    </pre>
                  </div>
                )}

                {/* Standard Error (stderr) */}
                {result?.stderr && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#EF4444] font-semibold uppercase tracking-wider block">
                      STDERR / COMPILER OUTPUT
                    </span>
                    <pre className="text-[#EF4444] whitespace-pre-wrap leading-relaxed bg-[#EF4444]/10 p-3 rounded-lg border border-[#EF4444]/30">
                      {result.stderr}
                    </pre>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
