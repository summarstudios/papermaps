"use client";

import { useState } from "react";
import {
  Check,
  X,
  ArrowRight,
  ExternalLink,
  ChevronUp,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

export type ProposalStatus = "PENDING" | "APPROVED" | "REJECTED" | "DEFERRED";
export type ProposalType = "ADD" | "REMOVE" | "FLAG";

export interface ProposalSource {
  name: string;
  url?: string;
  upvotes?: number;
}

export interface Proposal {
  id: string;
  placeName: string;
  area?: string;
  citySlug: string;
  cityName?: string;
  category?: string;
  type: ProposalType;
  score: number;
  reasoning: string;
  sources: ProposalSource[];
  status: ProposalStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface ProposalStats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  averageScore: number;
}

// ── Score badge ────────────────────────────────────────────────────────────

export function ScoreBadge({ score }: { score: number }) {
  const label =
    score >= 8 ? "HIGH" : score >= 5 ? "MED" : "LOW";
  const style =
    score >= 8
      ? "bg-emerald-500/10 text-emerald-400"
      : score >= 5
        ? "bg-amber-500/10 text-amber-400"
        : "bg-red-500/10 text-red-400";
  const dotStyle =
    score >= 8
      ? "bg-emerald-400"
      : score >= 5
        ? "bg-amber-400"
        : "bg-red-400";

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${style}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyle}`} />
      {label} ({score.toFixed(1)})
    </span>
  );
}

// ── Type badge ─────────────────────────────────────────────────────────────

export function TypeBadge({ type }: { type: ProposalType }) {
  const config: Record<ProposalType, { label: string; style: string }> = {
    ADD: { label: "ADD POI", style: "bg-blue-500/10 text-blue-400" },
    REMOVE: { label: "REMOVE", style: "bg-red-500/10 text-red-400" },
    FLAG: { label: "FLAG", style: "bg-amber-500/10 text-amber-400" },
  };
  const { label, style } = config[type];
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium uppercase ${style}`}
    >
      {label}
    </span>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: ProposalStatus }) {
  const config: Record<ProposalStatus, { label: string; style: string }> = {
    PENDING: { label: "Pending", style: "bg-amber-500/10 text-amber-400" },
    APPROVED: { label: "Approved", style: "bg-emerald-500/10 text-emerald-400" },
    REJECTED: { label: "Rejected", style: "bg-red-500/10 text-red-400" },
    DEFERRED: { label: "Deferred", style: "bg-gray-500/10 text-gray-400" },
  };
  const { label, style } = config[status];
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${style}`}
    >
      {label}
    </span>
  );
}

// ── Sources list ───────────────────────────────────────────────────────────

function Sources({ sources }: { sources: ProposalSource[] }) {
  if (!sources.length) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-gray-500">Sources:</span>
      {sources.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-0.5">
          {s.url ? (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline"
            >
              {s.name}
            </a>
          ) : (
            <span className="text-xs text-gray-400">{s.name}</span>
          )}
          {s.upvotes != null && (
            <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
              <ChevronUp className="h-2.5 w-2.5" />
              {s.upvotes}
            </span>
          )}
          {i < sources.length - 1 && (
            <span className="text-gray-600 ml-0.5">·</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ── Proposal card ──────────────────────────────────────────────────────────

interface ProposalCardProps {
  proposal: Proposal;
  isSelected: boolean;
  onSelect: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDefer: (id: string) => void;
  actionLoading: boolean;
}

export function ProposalCard({
  proposal,
  isSelected,
  onSelect,
  onApprove,
  onReject,
  onDefer,
  actionLoading,
}: ProposalCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`border rounded-lg bg-gray-900 p-3 space-y-2 cursor-pointer transition-colors ${
        isSelected
          ? "border-accent ring-1 ring-accent/30"
          : "border-gray-800 hover:border-gray-700"
      }`}
    >
      {/* Top row: score + type | name + area */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ScoreBadge score={proposal.score} />
          <TypeBadge type={proposal.type} />
        </div>
        {proposal.cityName && (
          <span className="text-[11px] text-gray-500 whitespace-nowrap">
            {proposal.cityName}
          </span>
        )}
      </div>

      {/* Name + category */}
      <div>
        <h3 className="text-[13px] font-medium text-gray-100">
          {proposal.placeName}
          {proposal.area && (
            <span className="text-gray-500 font-normal"> — {proposal.area}</span>
          )}
        </h3>
        {proposal.category && (
          <span className="text-xs text-gray-500">{proposal.category}</span>
        )}
      </div>

      {/* Reasoning */}
      <p className="text-[13px] text-gray-400 line-clamp-2 leading-relaxed">
        &ldquo;{proposal.reasoning}&rdquo;
      </p>

      {/* Sources */}
      <Sources sources={proposal.sources} />

      {/* Actions */}
      {proposal.status === "PENDING" && (
        <div className="flex items-center gap-2 pt-1 border-t border-gray-800/50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove(proposal.id);
            }}
            disabled={actionLoading}
            className="h-7 px-3 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReject(proposal.id);
            }}
            disabled={actionLoading}
            className="h-7 px-3 inline-flex items-center gap-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDefer(proposal.id);
            }}
            disabled={actionLoading}
            className="h-7 px-3 inline-flex items-center gap-1 rounded-md border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 text-[13px] transition-colors disabled:opacity-50"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Defer
          </button>
        </div>
      )}

      {/* Already reviewed */}
      {proposal.status !== "PENDING" && (
        <div className="flex items-center gap-2 pt-1 border-t border-gray-800/50">
          <StatusBadge status={proposal.status} />
          {proposal.reviewNote && (
            <span className="text-[11px] text-gray-500 truncate">
              {proposal.reviewNote}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reject modal ───────────────────────────────────────────────────────────

interface RejectModalProps {
  proposalName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function RejectModal({ proposalName, onConfirm, onCancel }: RejectModalProps) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md border border-gray-800 rounded-lg bg-gray-900 p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-100">
          Reject &ldquo;{proposalName}&rdquo;
        </h3>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this proposal being rejected?"
            className="w-full min-h-[80px] p-2 rounded-md border border-gray-800 bg-gray-950 text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-700 resize-none"
            autoFocus
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-8 px-3 rounded-md border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 text-[13px] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            className="h-8 px-3 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stats bar ──────────────────────────────────────────────────────────────

export function StatsBar({ stats }: { stats: ProposalStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="border border-gray-800 rounded-lg bg-gray-900 p-3">
        <div className="text-xs font-medium text-gray-400 mb-1">Pending</div>
        <div className="text-2xl font-semibold text-gray-100">
          {stats.pending}
        </div>
      </div>
      <div className="border border-gray-800 rounded-lg bg-gray-900 p-3">
        <div className="text-xs font-medium text-gray-400 mb-1">
          Approved today
        </div>
        <div className="text-2xl font-semibold text-emerald-400">
          {stats.approvedToday}
        </div>
      </div>
      <div className="border border-gray-800 rounded-lg bg-gray-900 p-3">
        <div className="text-xs font-medium text-gray-400 mb-1">
          Rejected today
        </div>
        <div className="text-2xl font-semibold text-red-400">
          {stats.rejectedToday}
        </div>
      </div>
      <div className="border border-gray-800 rounded-lg bg-gray-900 p-3">
        <div className="text-xs font-medium text-gray-400 mb-1">Avg score</div>
        <div className="text-2xl font-semibold text-gray-100">
          {stats.averageScore.toFixed(1)}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────

export function ProposalCardSkeleton() {
  return (
    <div className="border border-gray-800 rounded-lg bg-gray-900 p-3 space-y-2 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-5 w-20 rounded bg-gray-800" />
        <div className="h-5 w-16 rounded bg-gray-800" />
      </div>
      <div className="h-4 w-3/4 rounded bg-gray-800" />
      <div className="h-4 w-1/2 rounded bg-gray-800" />
      <div className="h-8 w-full rounded bg-gray-800" />
    </div>
  );
}
