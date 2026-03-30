"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

import {
  type Proposal,
  type ProposalStats,
  type ProposalStatus,
  type ProposalType,
  ProposalCard,
  ProposalCardSkeleton,
  RejectModal,
  StatsBar,
} from "./_components";
import { fetchProposals, reviewProposal } from "./_api";

// ── Filter presets ─────────────────────────────────────────────────────────

const SCORE_FILTERS = [
  { label: "All", value: 0 },
  { label: "High \u22658", value: 8 },
  { label: "Medium 5-8", value: 5 },
] as const;

const TYPE_FILTERS: { label: string; value: ProposalType | "" }[] = [
  { label: "All types", value: "" },
  { label: "Add", value: "ADD" },
  { label: "Remove", value: "REMOVE" },
  { label: "Flag", value: "FLAG" },
];

const STATUS_FILTERS: { label: string; value: ProposalStatus | "" }[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Deferred", value: "DEFERRED" },
];

// ── Page component ─────────────────────────────────────────────────────────

export default function AutoResearchQueuePage() {
  const params = useParams();
  const adminPrefix = params.adminPrefix as string;

  // Data
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<ProposalStats>({
    pending: 0,
    approvedToday: 0,
    rejectedToday: 0,
    averageScore: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  // Filters
  const [citySlug, setCitySlug] = useState("");
  const [status, setStatus] = useState<ProposalStatus | "">( "PENDING");
  const [type, setType] = useState<ProposalType | "">("");
  const [minScore, setMinScore] = useState(0);
  const [page, setPage] = useState(1);

  // UI state
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters = citySlug || status !== "PENDING" || type || minScore > 0;

  // ── Fetch data ───────────────────────────────────────────────────────────

  const loadProposals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchProposals({
        citySlug: citySlug || undefined,
        status: status || undefined,
        type: type || undefined,
        minScore: minScore || undefined,
        page,
      });
      setProposals(res.data ?? []);
      setPagination(res.pagination ?? { page: 1, totalPages: 1, total: 0 });
      setStats(
        res.stats ?? {
          pending: 0,
          approvedToday: 0,
          rejectedToday: 0,
          averageScore: 0,
        },
      );
      setSelectedIndex(0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load proposals");
    } finally {
      setLoading(false);
    }
  }, [citySlug, status, type, minScore, page]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleApprove = useCallback(
    async (id: string) => {
      if (actionLoading) return;
      try {
        setActionLoading(true);
        await reviewProposal(id, "approve");
        toast.success("Proposal approved");
        setProposals((prev) => prev.filter((p) => p.id !== id));
        setStats((prev) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          approvedToday: prev.approvedToday + 1,
        }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to approve");
      } finally {
        setActionLoading(false);
      }
    },
    [actionLoading],
  );

  const handleRejectConfirm = useCallback(
    async (reason: string) => {
      if (!rejectingId || actionLoading) return;
      try {
        setActionLoading(true);
        await reviewProposal(rejectingId, "reject", reason);
        toast.success("Proposal rejected");
        setProposals((prev) => prev.filter((p) => p.id !== rejectingId));
        setStats((prev) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          rejectedToday: prev.rejectedToday + 1,
        }));
        setRejectingId(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to reject");
      } finally {
        setActionLoading(false);
      }
    },
    [rejectingId, actionLoading],
  );

  const handleDefer = useCallback(
    async (id: string) => {
      if (actionLoading) return;
      try {
        setActionLoading(true);
        await reviewProposal(id, "defer");
        toast.success("Proposal deferred");
        setProposals((prev) => prev.filter((p) => p.id !== id));
        setStats((prev) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
        }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to defer");
      } finally {
        setActionLoading(false);
      }
    },
    [actionLoading],
  );

  // ── Keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (actionLoading || rejectingId) return;

      const current = proposals[selectedIndex];
      if (!current) return;

      switch (e.key.toLowerCase()) {
        case "a":
          if (current.status === "PENDING") handleApprove(current.id);
          break;
        case "r":
          if (current.status === "PENDING") setRejectingId(current.id);
          break;
        case "d":
          if (current.status === "PENDING") handleDefer(current.id);
          break;
        case "arrowdown":
        case "j":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, proposals.length - 1));
          break;
        case "arrowup":
        case "k":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    actionLoading,
    rejectingId,
    proposals,
    selectedIndex,
    handleApprove,
    handleDefer,
  ]);

  // ── Clear all filters ────────────────────────────────────────────────────

  const clearFilters = () => {
    setCitySlug("");
    setStatus("PENDING");
    setType("");
    setMinScore(0);
    setPage(1);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const rejectingProposal = rejectingId
    ? proposals.find((p) => p.id === rejectingId)
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">
            AutoResearch Queue
          </h1>
          <p className="text-[13px] text-gray-400">
            Review AI-generated proposals for POI changes
          </p>
        </div>
        <span className="text-[13px] text-gray-500">
          {pagination.total} total
        </span>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* City filter */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            value={citySlug}
            onChange={(e) => {
              setCitySlug(e.target.value);
              setPage(1);
            }}
            className="h-8 w-full pl-8 pr-3 rounded-md border border-gray-800 bg-gray-900 text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-700"
            placeholder="Filter by city slug..."
          />
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ProposalStatus | "");
            setPage(1);
          }}
          className="h-8 w-[120px] px-2 rounded-md border border-gray-800 bg-gray-900 text-[13px] text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-700"
        >
          <option value="">All status</option>
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as ProposalType | "");
            setPage(1);
          }}
          className="h-8 w-[110px] px-2 rounded-md border border-gray-800 bg-gray-900 text-[13px] text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-700"
        >
          {TYPE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Score filter pills */}
        <div className="flex items-center gap-1">
          {SCORE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setMinScore(f.value);
                setPage(1);
              }}
              className={`h-7 px-2.5 rounded-md text-[13px] transition-colors ${
                minScore === f.value
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="h-8 px-2 inline-flex items-center gap-1 rounded-md text-[13px] text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>Shortcuts:</span>
        <span>
          <kbd className="px-1 py-0.5 bg-gray-800 rounded text-[11px]">A</kbd>{" "}
          Approve
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-gray-800 rounded text-[11px]">R</kbd>{" "}
          Reject
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-gray-800 rounded text-[11px]">D</kbd>{" "}
          Defer
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-gray-800 rounded text-[11px]">
            J/K
          </kbd>{" "}
          Navigate
        </span>
      </div>

      {/* Proposals list */}
      <div ref={listRef} className="space-y-2">
        {loading ? (
          <>
            <ProposalCardSkeleton />
            <ProposalCardSkeleton />
            <ProposalCardSkeleton />
            <ProposalCardSkeleton />
          </>
        ) : proposals.length === 0 ? (
          <div className="border border-gray-800 rounded-lg p-12 text-center">
            <div className="text-4xl mb-3">&#10003;</div>
            <h2 className="text-sm font-medium text-gray-200 mb-1">
              {hasActiveFilters ? "No matching proposals" : "All caught up!"}
            </h2>
            <p className="text-[13px] text-gray-500">
              {hasActiveFilters
                ? "Try adjusting your filters"
                : "No proposals waiting for review."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 h-8 px-3 rounded-md border border-gray-700 text-[13px] text-gray-300 hover:bg-gray-800"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          proposals.map((proposal, index) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              isSelected={index === selectedIndex}
              onSelect={() => setSelectedIndex(index)}
              onApprove={handleApprove}
              onReject={(id) => setRejectingId(id)}
              onDefer={handleDefer}
              actionLoading={actionLoading}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-gray-400">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total}{" "}
            proposals)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="h-7 px-2 rounded-md text-[13px] text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`h-7 w-7 rounded-md text-[13px] ${
                    page === pageNum
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {pagination.totalPages > 5 && (
              <span className="text-gray-500">...</span>
            )}
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="h-7 px-2 rounded-md text-[13px] text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectingProposal && (
        <RejectModal
          proposalName={rejectingProposal.placeName}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectingId(null)}
        />
      )}
    </div>
  );
}
