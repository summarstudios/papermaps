"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { AdminTable } from "@/components/admin/AdminTable";

interface POI {
  id: string;
  name: string;
  status: string;
  priority?: string;
  qualityScore?: number;
  category?: { id: string; name: string; color?: string; emoji?: string };
}

interface Stats {
  AI_SUGGESTED?: number;
  UNDER_REVIEW?: number;
  APPROVED?: number;
  PUBLISHED?: number;
  ARCHIVED?: number;
}

const STATUS_STYLES: Record<string, string> = {
  AI_SUGGESTED: "bg-blue-500/10 text-blue-400",
  UNDER_REVIEW: "bg-amber-500/10 text-amber-400",
  APPROVED: "bg-emerald-500/10 text-emerald-400",
  PUBLISHED: "bg-emerald-500/10 text-emerald-400",
  ARCHIVED: "bg-gray-500/10 text-gray-400",
};

const PRIORITY_STYLES: Record<string, string> = {
  MUST_VISIT: "text-red-400",
  RECOMMENDED: "text-amber-400",
  HIDDEN_GEM: "text-purple-400",
  OPTIONAL: "text-gray-400",
};

export default function POIListPage() {
  const params = useParams();
  const router = useRouter();
  const adminPrefix = params.adminPrefix as string;
  const cityId = params.id as string;

  const [pois, setPois] = useState<POI[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const poiParams: Record<string, string | number | undefined> = {
        limit: 50,
        status: statusFilter || undefined,
        categoryId: categoryFilter || undefined,
        search: search || undefined,
      };

      const [poisRes, statsRes, catsRes] = await Promise.allSettled([
        apiClient.getCityPOIs(cityId, poiParams),
        apiClient.getCityPOIStats(cityId),
        apiClient.getCategories({ limit: 100 }),
      ]);

      if (poisRes.status === "fulfilled") {
        setPois(poisRes.value.data ?? []);
      }
      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      }
      if (catsRes.status === "fulfilled") {
        setCategories(catsRes.value.data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load POIs");
    } finally {
      setLoading(false);
    }
  }, [cityId, statusFilter, categoryFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-[13px]">
        <Link href={`/${adminPrefix}/cities`} className="text-gray-400 hover:text-white">Cities</Link>
        <ChevronRight />
        <Link href={`/${adminPrefix}/cities/${cityId}`} className="text-gray-400 hover:text-white">City</Link>
        <ChevronRight />
        <span className="text-gray-200">POIs</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Points of Interest</h1>
        <Link
          href={`/${adminPrefix}/cities/${cityId}/pois/add`}
          className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md bg-white text-gray-900 hover:bg-gray-100 text-[13px] font-medium transition-colors"
        >
          Quick Add from Google
        </Link>
      </div>

      {/* Pipeline Stats */}
      {stats && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {(["AI_SUGGESTED", "UNDER_REVIEW", "APPROVED", "PUBLISHED"] as const).map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-600 mx-1">&rarr;</span>}
              <span className="text-gray-400">{stats[s] ?? 0}</span>
              <span className="text-gray-500">{s.replace(/_/g, " ")}</span>
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-gray-700 bg-gray-900 pl-8 pr-3 text-[13px] text-gray-300 placeholder:text-gray-500 focus:border-gray-500 focus:outline-none"
            placeholder="Search POIs..."
          />
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 w-[140px] rounded-md border border-gray-700 bg-gray-900 px-2 text-[13px] text-gray-300 focus:border-gray-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="AI_SUGGESTED">AI Suggested</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-8 w-[140px] rounded-md border border-gray-700 bg-gray-900 px-2 text-[13px] text-gray-300 focus:border-gray-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">{error}</div>
      )}

      <AdminTable
        columns={[
          {
            key: "name",
            label: "Name",
            sortable: true,
            render: (_, poi) => (
              <span className="text-[13px] text-gray-200 font-medium">{poi.name}</span>
            ),
          },
          {
            key: "category",
            label: "Category",
            render: (_, poi) => {
              const cat = poi.category;
              if (!cat) return <span className="text-gray-500 text-[13px]">—</span>;
              return (
                <span className="inline-flex items-center gap-1 text-[13px]">
                  {cat.emoji && <span>{cat.emoji}</span>}
                  <span
                    className="px-1.5 py-0.5 rounded text-[11px] font-medium"
                    style={{
                      backgroundColor: cat.color ? `${cat.color}20` : undefined,
                      color: cat.color ?? "#9ca3af",
                    }}
                  >
                    {cat.name}
                  </span>
                </span>
              );
            },
          },
          {
            key: "status",
            label: "Status",
            sortable: true,
            render: (_, poi) => (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${
                  STATUS_STYLES[poi.status] ?? "bg-gray-500/10 text-gray-400"
                }`}
              >
                {poi.status.replace(/_/g, " ")}
              </span>
            ),
          },
          {
            key: "priority",
            label: "Priority",
            sortable: true,
            render: (_, poi) => (
              <span
                className={`text-[13px] ${
                  PRIORITY_STYLES[poi.priority ?? ""] ?? "text-gray-500"
                }`}
              >
                {poi.priority?.replace(/_/g, " ") ?? "—"}
              </span>
            ),
          },
          {
            key: "qualityScore",
            label: "Quality",
            sortable: true,
            render: (_, poi) =>
              poi.qualityScore != null ? (
                <span className="text-[13px] text-gray-400">{poi.qualityScore}%</span>
              ) : (
                "—"
              ),
          },
        ]}
        data={pois}
        loading={loading}
        emptyTitle="No POIs found"
        onRowClick={(poi) => router.push(`/${adminPrefix}/pois/${poi.id}`)}
      />
    </div>
  );
}

function ChevronRight() {
  return (
    <svg className="h-3.5 w-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
