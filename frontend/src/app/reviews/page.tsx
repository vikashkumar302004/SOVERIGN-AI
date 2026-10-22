"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  UserCheck,
  MessageSquare,
  Download,
  AlertCircle,
  RefreshCw,
  FileText,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface InspectionItem {
  id: number;
  workflow_id: string;
  document_id: number;
  document_filename: string;
  ai_recommendation: string;
  approval_status: string;
  model_analysis: string;
  submitted_by_username: string;
  submitted_at: string;
  reviewed_by_username?: string | null;
  reviewer_comment?: string | null;
  reviewed_at?: string | null;
  download_url: string;
}

export default function ManagerReviewsPage() {
  const { authFetch, user } = useAuth();
  const [pendingList, setPendingList] = useState<InspectionItem[]>([]);
  const [historyList, setHistoryList] = useState<InspectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review Modal State
  const [activeItem, setActiveItem] = useState<InspectionItem | null>(null);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingRes, historyRes] = await Promise.all([
        authFetch("/api/v1/inspections/pending-review"),
        authFetch("/api/v1/inspections/reviewed-history"),
      ]);

      if (pendingRes.status === 403 || historyRes.status === 403) {
        setError("Access Restricted: Only MANAGER and ADMIN roles can access inspection sign-offs.");
        setLoading(false);
        return;
      }

      if (pendingRes.ok) {
        const pData = await pendingRes.json();
        setPendingList(pData.inspections || []);
      }
      if (historyRes.ok) {
        const hData = await historyRes.json();
        setHistoryList(hData.inspections || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch inspection reviews:", err);
      setError("Failed to connect to inspection review server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const openReviewModal = (item: InspectionItem, action: "APPROVED" | "REJECTED") => {
    setActiveItem(item);
    setDecision(action);
    setComment("");
    setReviewError(null);
  };

  const handleConfirmReview = async () => {
    if (!activeItem || !decision || submittingReview) return;

    setSubmittingReview(true);
    setReviewError(null);

    try {
      const res = await authFetch(
        `/api/v1/inspections/${activeItem.workflow_id}/review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: decision,
            comment: comment.trim() || undefined,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Review submission failed (HTTP ${res.status})`);
      }

      // Close modal and refresh listings
      setActiveItem(null);
      setDecision(null);
      setComment("");
      await fetchReviews();
    } catch (err: any) {
      setReviewError(err.message || "Failed to submit manager sign-off.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const getAiBadge = (aiRec: string) => {
    const recUpper = (aiRec || "").toUpperCase();
    if (recUpper.includes("FAIL")) {
      return { label: "FAIL", color: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40", icon: XCircle };
    }
    if (recUpper.includes("NEEDS REVIEW") || recUpper.includes("NEEDS-REVIEW") || recUpper.includes("REVIEW")) {
      return { label: "NEEDS REVIEW", color: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40", icon: AlertTriangle };
    }
    return { label: "PASS", color: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40", icon: CheckCircle2 };
  };

  if (error && error.includes("Access Restricted")) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="p-8 bg-surface border border-[#EF4444]/40 rounded-xl text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-[#EF4444] mx-auto" />
          <h2 className="text-lg font-bold text-primary">403 Forbidden</h2>
          <p className="text-xs font-mono text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 select-none">
      {/* Header */}
      <div className="pb-4 border-b border-token flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            Manager Inspection Sign-offs & Approvals
          </h1>
          <p className="text-xs text-muted font-mono mt-1">
            Human-in-the-Loop Governance &bull; Review AI Recommendations & Finalize Sign-offs
          </p>
        </div>
        <button
          onClick={fetchReviews}
          disabled={loading}
          className="px-4 py-2 bg-surface hover:bg-surface-hover border border-token text-primary rounded-lg text-xs font-mono flex items-center space-x-2 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-accent ${loading ? "animate-spin" : ""}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Pending Reviews Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono text-primary font-bold uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#F59E0B]" />
            Pending Manager Review ({pendingList.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 rounded-xl bg-surface border border-token text-center text-xs font-mono text-muted">
            Loading pending inspection reviews...
          </div>
        ) : pendingList.length === 0 ? (
          <div className="p-8 rounded-xl bg-surface border border-token text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
            <p className="text-xs font-mono text-primary font-bold">No Pending Reviews</p>
            <p className="text-[11px] font-mono text-muted">All submitted inspection workflows have been signed off.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingList.map((item) => {
              const aiBadge = getAiBadge(item.ai_recommendation);
              const AiIcon = aiBadge.icon;
              return (
                <div
                  key={item.workflow_id}
                  className="bg-surface border border-token rounded-xl p-5 shadow-sm hover:border-accent/40 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-token">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-accent" />
                        <h3 className="text-sm font-bold text-primary">{item.document_filename}</h3>
                        <span className="text-xs font-mono text-muted">({item.workflow_id})</span>
                      </div>
                      <div className="text-[11px] font-mono text-muted flex items-center gap-3">
                        <span>Submitted by: <strong className="text-primary">{item.submitted_by_username}</strong></span>
                        <span>&bull;</span>
                        <span>Date: {item.submitted_at}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className={`px-3 py-1.5 rounded-lg border flex items-center space-x-1.5 font-mono text-xs font-bold ${aiBadge.color}`}>
                        <AiIcon className="w-3.5 h-3.5" />
                        <span>AI REC: {aiBadge.label}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openReviewModal(item, "APPROVED")}
                          className="px-3.5 py-1.5 bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] border border-[#10B981]/40 font-bold text-xs rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => openReviewModal(item, "REJECTED")}
                          className="px-3.5 py-1.5 bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444]/40 font-bold text-xs rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Summary Snippet */}
                  <div className="bg-base p-3 rounded-lg border border-token text-xs font-mono text-primary max-h-28 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {item.model_analysis}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reviewed History Section */}
      <div className="space-y-4 pt-6">
        <h2 className="text-sm font-mono text-primary font-bold uppercase tracking-wider flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-accent" />
          Reviewed History & Manager Decisions ({historyList.length})
        </h2>

        {historyList.length === 0 ? (
          <div className="p-6 rounded-xl bg-surface border border-token text-center text-xs font-mono text-muted">
            No historical reviews recorded yet.
          </div>
        ) : (
          <div className="bg-surface border border-token rounded-xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-base border-b border-token text-muted uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Document / Workflow</th>
                    <th className="py-3 px-4">AI Rec</th>
                    <th className="py-3 px-4">Manager Decision</th>
                    <th className="py-3 px-4">Reviewer</th>
                    <th className="py-3 px-4">Comment</th>
                    <th className="py-3 px-4">Reviewed At</th>
                    <th className="py-3 px-4 text-right">Deliverable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-token text-primary">
                  {historyList.map((item) => {
                    const aiBadge = getAiBadge(item.ai_recommendation);
                    const isApproved = item.approval_status === "APPROVED";
                    return (
                      <tr key={item.workflow_id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 px-4 font-sans font-medium">
                          <div>{item.document_filename}</div>
                          <div className="text-[10px] font-mono text-muted">{item.workflow_id}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${aiBadge.color}`}>
                            {aiBadge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] border ${
                              isApproved
                                ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40"
                                : "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40"
                            }`}
                          >
                            {item.approval_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-accent">
                          {item.reviewed_by_username || "N/A"}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-muted italic">
                          {item.reviewer_comment || "No comment."}
                        </td>
                        <td className="py-3 px-4 text-muted text-[11px]">
                          {item.reviewed_at || item.submitted_at}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={item.download_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 text-accent hover:underline font-bold"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Report</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation & Comment Modal */}
      {activeItem && decision && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-token rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-token pb-3">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                {decision === "APPROVED" ? (
                  <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                ) : (
                  <XCircle className="w-5 h-5 text-[#EF4444]" />
                )}
                Confirm Manager Sign-off: {decision}
              </h3>
              <button
                onClick={() => setActiveItem(null)}
                className="text-muted hover:text-primary text-xs font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono text-muted">
              <p>Target Document: <strong className="text-primary">{activeItem.document_filename}</strong></p>
              <p>AI Recommendation: <strong className="text-accent">{activeItem.ai_recommendation}</strong></p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-primary font-medium block">
                Reviewer Manager Comment (Optional):
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter justification, notes, or required follow-up actions..."
                rows={3}
                className="w-full bg-base border border-token focus:border-accent/60 text-primary text-xs font-mono rounded-lg p-3 outline-none resize-none"
              />
            </div>

            {reviewError && (
              <div className="p-3 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-xs font-mono">
                {reviewError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setActiveItem(null)}
                disabled={submittingReview}
                className="px-4 py-2 bg-base hover:bg-base/80 border border-token text-muted font-mono text-xs rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReview}
                disabled={submittingReview}
                className={`px-5 py-2 font-bold text-xs rounded-lg text-[#0A0E14] transition-all flex items-center space-x-2 cursor-pointer shadow-md active:scale-95 ${
                  decision === "APPROVED"
                    ? "bg-[#10B981] hover:bg-[#10B981]/90"
                    : "bg-[#EF4444] text-white hover:bg-[#EF4444]/90"
                }`}
              >
                <span>{submittingReview ? "Saving Decision..." : `Confirm ${decision}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
