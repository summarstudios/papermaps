"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { Proposal, Source } from "./types";
import { adminFetch, scoreColor, scoreBadgeColor, scoreTextColor, sourceIcon, sourceLabel } from "./helpers";

// ─── Score Bar ───────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(Math.max((value / 10) * 100, 0), 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-24 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${scoreColor(value)}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-300 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

// ─── Source Card ─────────────────────────────────────────

function SourceCard({ source }: { source: Source }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-gray-800/50 rounded-md">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-800/30 transition-colors rounded-md"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{sourceIcon(source.type)}</span>
          <span className="text-[13px] font-medium text-gray-200 truncate">{source.title}</span>
          <span className="text-[11px] text-gray-500 shrink-0">{sourceLabel(source.type)}</span>
          {source.reputation != null && (
            <span className="text-[11px] text-gray-500 shrink-0">rep: {source.reputation.toFixed(2)}</span>
          )}
          {source.upvotes != null && (
            <span className="text-[11px] text-gray-500 shrink-0">{source.upvotes} upvotes</span>
          )}
          {source.trendingDuration && (
            <span className="text-[11px] text-gray-500 shrink-0">trending {source.trendingDuration}</span>
          )}
        </div>
        <svg
          className={`h-3.5 w-3.5 text-gray-500 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-[13px] text-gray-400 leading-relaxed">{source.snippet}</p>
          {source.postCount != null && (
            <p className="text-xs text-gray-500">Post count: {source.postCount} in 7 days</p>
          )}
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span className="truncate max-w-[300px]">{source.url}</span>
              <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-72 bg-gray-800 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-gray-800 rounded-lg bg-gray-900 p-4 space-y-3">
          <div className="h-5 w-40 bg-gray-800 rounded" />
          <div className="h-4 w-56 bg-gray-800 rounded" />
          <div className="h-4 w-32 bg-gray-800 rounded" />
        </div>
        <div className="border border-gray-800 rounded-lg bg-gray-900 p-4 space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-20 bg-gray-800 rounded" />
              <div className="flex-1 h-2 bg-gray-800 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="border border-gray-800 rounded-lg bg-gray-900 p-4 h-32" />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const adminPrefix = params.adminPrefix as string;
  const proposalId = params.id as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [curatorNote, setCuratorNote] = useState("");
  const [error, setError] = useState("");

  const fetchProposal = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await adminFetch<{ data: Proposal }>(`/auto-research/proposals/${proposalId}`);
      setProposal(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => { fetchProposal(); }, [fetchProposal]);

  const handleAction = async (action: "approve" | "reject" | "defer") => {
    if (action === "reject" && !curatorNote.trim()) {
      toast.error("A curator note is required when rejecting a proposal.");
      return;
    }
    try {
      setActionLoading(action);
      await adminFetch(`/auto-research/proposals/${proposalId}/${action}`, {
        method: "POST",
        body: JSON.stringify({ reviewNote: curatorNote || undefined }),
      });
      toast.success(
        action === "approve" ? "Proposal approved — POI created in UNDER_REVIEW status"
          : action === "reject" ? "Proposal rejected"
          : "Proposal deferred for later review"
      );
      router.push(`/${adminPrefix}/auto-research`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Loading / Error states ─────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <nav className="flex items-center gap-1.5 text-[13px]">
          <Link href={`/${adminPrefix}/auto-research`} className="text-gray-400 hover:text-white">AutoResearch</Link>
          <ChevronRight />
          <span className="text-gray-600">Loading...</span>
        </nav>
        <Skeleton />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="space-y-4">
        <nav className="flex items-center gap-1.5 text-[13px]">
          <Link href={`/${adminPrefix}/auto-research`} className="text-gray-400 hover:text-white">AutoResearch</Link>
          <ChevronRight />
          <span className="text-gray-200">Error</span>
        </nav>
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
          {error || "Proposal not found"}
        </div>
      </div>
    );
  }

  const { scores } = proposal;
  const scoreEntries = [
    { label: "Hidden Gem", value: scores.hiddenGem },
    { label: "Authenticity", value: scores.authenticity },
    { label: "Character", value: scores.character },
    { label: "Local Favorite", value: scores.localFavorite },
    { label: "Uniqueness", value: scores.uniqueness },
    { label: "Longevity", value: scores.longevity },
    { label: "Non-Tourist", value: scores.nonTourist },
  ];
  const isPending = proposal.status === "PENDING";

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[13px]">
        <Link href={`/${adminPrefix}/auto-research`} className="text-gray-400 hover:text-white">AutoResearch</Link>
        <ChevronRight />
        <span className="text-gray-200 truncate max-w-[200px]">{proposal.placeName}</span>
      </nav>

      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{proposal.placeName}</h1>
        <StatusBadge status={proposal.status} />
      </div>

      {/* Place Info + Score Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-gray-800 rounded-lg bg-gray-900 p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-200">Place Info</h2>
          <div className="space-y-2">
            <InfoRow label="Location" value={`${proposal.area}, ${proposal.city}`} />
            <InfoRow label="Proposal" value={proposal.proposalType} bold />
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-gray-500 w-20 shrink-0">Score</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${scoreBadgeColor(proposal.compositeScore)}`}>
                {proposal.compositeScore.toFixed(1)}
              </span>
            </div>
            <InfoRow label="Category" value={proposal.suggestedCategory} />
          </div>
          {proposal.suggestedDescription && (
            <div className="pt-2 border-t border-gray-800/50">
              <span className="text-xs text-gray-500">Suggested Description</span>
              <p className="text-[13px] text-gray-300 mt-1 leading-relaxed">{proposal.suggestedDescription}</p>
            </div>
          )}
        </div>

        <div className="border border-gray-800 rounded-lg bg-gray-900 p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-200">Scoring Breakdown</h2>
          <div className="space-y-2.5">
            {scoreEntries.map((e) => <ScoreBar key={e.label} label={e.label} value={e.value} />)}
          </div>
          <div className="pt-2 border-t border-gray-800/50 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Composite</span>
            <span className={`text-sm font-semibold ${scoreTextColor(proposal.compositeScore)}`}>
              {proposal.compositeScore.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* LLM Reasoning + Concerns */}
      <div className="border border-gray-800 rounded-lg bg-gray-900 divide-y divide-gray-800/50">
        <div className="p-4 space-y-1.5">
          <h2 className="text-sm font-medium text-gray-200">LLM Reasoning</h2>
          <p className="text-[13px] text-gray-300 leading-relaxed whitespace-pre-wrap">{proposal.llmReasoning}</p>
        </div>
        {proposal.concerns && (
          <div className="p-4 space-y-1.5">
            <h2 className="text-sm font-medium text-amber-400">Concerns</h2>
            <p className="text-[13px] text-gray-400 leading-relaxed whitespace-pre-wrap">{proposal.concerns}</p>
          </div>
        )}
      </div>

      {/* Source Evidence */}
      {proposal.sources.length > 0 && (
        <div className="border border-gray-800 rounded-lg bg-gray-900 p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-200">Source Evidence</h2>
          <div className="space-y-2">
            {proposal.sources.map((s) => <SourceCard key={s.id} source={s} />)}
          </div>
        </div>
      )}

      {/* Similar POIs */}
      {proposal.similarPOIs.length > 0 && (
        <div className="border border-gray-800 rounded-lg bg-gray-900 p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-200">Similar POIs Nearby</h2>
          <div className="space-y-1">
            {proposal.similarPOIs.map((poi) => (
              <div key={poi.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/${adminPrefix}/pois/${poi.id}`}
                    className="text-[13px] text-gray-300 hover:text-white underline underline-offset-2 decoration-gray-700 hover:decoration-gray-400"
                  >
                    {poi.name}
                  </Link>
                  <span className="text-[11px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{poi.category}</span>
                </div>
                <span className="text-xs text-gray-500">{poi.distance}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="border border-gray-800 rounded-lg bg-gray-900 p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-200">Actions</h2>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400">Curator Note</label>
            <textarea
              value={curatorNote}
              onChange={(e) => setCuratorNote(e.target.value)}
              placeholder="Optional note (required for rejection)..."
              rows={2}
              className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-[13px] text-gray-200 placeholder-gray-600 focus:border-gray-500 focus:outline-none resize-y min-h-[60px]"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleAction("approve")}
              disabled={actionLoading !== null}
              className="h-8 px-4 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[13px] font-medium transition-colors disabled:opacity-50"
            >
              {actionLoading === "approve" ? "Approving..." : "Approve & Create POI"}
            </button>
            <button
              onClick={() => handleAction("reject")}
              disabled={actionLoading !== null}
              className="h-8 px-4 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-[13px] font-medium transition-colors disabled:opacity-50"
            >
              {actionLoading === "reject" ? "Rejecting..." : "Reject"}
            </button>
            <button
              onClick={() => handleAction("defer")}
              disabled={actionLoading !== null}
              className="h-8 px-4 rounded-md border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 text-[13px] font-medium transition-colors disabled:opacity-50"
            >
              {actionLoading === "defer" ? "Deferring..." : "Defer"}
            </button>
          </div>
        </div>
      )}

      {/* Already-reviewed note */}
      {!isPending && proposal.reviewNote && (
        <div className="border border-gray-800 rounded-lg bg-gray-900 p-4 space-y-1.5">
          <h2 className="text-sm font-medium text-gray-200">Curator Review Note</h2>
          <p className="text-[13px] text-gray-400">{proposal.reviewNote}</p>
        </div>
      )}
    </div>
  );
}

// ─── Tiny sub-components ─────────────────────────────────

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
      <span className={`text-[13px] text-gray-300 ${bold ? "font-medium" : ""}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400" :
    status === "REJECTED" ? "bg-red-500/10 text-red-400" :
    status === "DEFERRED" ? "bg-blue-500/10 text-blue-400" :
    "bg-amber-500/10 text-amber-400";
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${cls}`}>{status}</span>;
}

function ChevronRight() {
  return (
    <svg className="h-3.5 w-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
