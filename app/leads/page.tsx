"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import PropertyCard from "@/components/PropertyCard";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import { Property } from "@/lib/types";
import { Plus, Trash2, Loader2, FolderOpen, BookmarkMinus } from "lucide-react";

interface ListItem {
  id: string;
  name: string;
  count: number;
  created_at: string;
}

export default function LeadsPage() {
  const [lists, setLists]           = useState<ListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingProps, setLoadingProps] = useState(false);
  const [newName, setNewName]       = useState("");
  const [creating, setCreating]     = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Load all lists on mount
  useEffect(() => {
    async function load() {
      setLoadingLists(true);
      try {
        const res = await fetch("/api/lists");
        const data = await res.json();
        const fetched: ListItem[] = data.lists ?? [];
        setLists(fetched);
        if (fetched.length > 0) setSelectedId((prev) => prev ?? fetched[0].id);
      } finally {
        setLoadingLists(false);
      }
    }
    load();
  }, []);

  // Load properties for selected list
  useEffect(() => {
    if (!selectedId) { setProperties([]); return; }
    setLoadingProps(true);
    fetch(`/api/lists/${selectedId}`)
      .then((r) => r.json())
      .then((data) => setProperties((data.properties ?? []) as Property[]))
      .catch(() => setProperties([]))
      .finally(() => setLoadingProps(false));
  }, [selectedId]);

  async function handleCreateList() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (data.list) {
        setLists((prev) => [...prev, data.list]);
        setSelectedId(data.list.id);
        setNewName("");
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteList() {
    if (!selectedId) return;
    await fetch(`/api/lists?id=${encodeURIComponent(selectedId)}`, {
      method: "DELETE",
    });
    setLists((prev) => {
      const next = prev.filter((l) => l.id !== selectedId);
      setSelectedId(next[0]?.id ?? null);
      return next;
    });
    setProperties([]);
  }

  async function handleRemoveProperty(parid: string) {
    if (!selectedId) return;
    await fetch(
      `/api/lists/${selectedId}?parid=${encodeURIComponent(parid)}`,
      { method: "DELETE" }
    );
    setProperties((prev) => prev.filter((p) => p.id !== parid));
    setLists((prev) =>
      prev.map((l) =>
        l.id === selectedId ? { ...l, count: Math.max(0, l.count - 1) } : l
      )
    );
  }

  const selectedList = lists.find((l) => l.id === selectedId);

  return (
    <div>
      <Header
        title="My Lists"
        subtitle="Save and manage properties across custom lists"
      />
      <div className="p-4 md:p-8">
        <div className="flex gap-5 md:gap-6 items-start">

          {/* ── List sidebar ── */}
          <div className="w-52 flex-shrink-0">
            <div
              className="rounded-xl overflow-hidden sticky top-4"
              style={{ background: "#fff", border: "1px solid #e5e5e5" }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: "1px solid #f0f0f0" }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#888888" }}
                >
                  My Lists
                </p>
              </div>

              {loadingLists ? (
                <div className="flex justify-center py-6">
                  <Loader2
                    size={16}
                    className="animate-spin"
                    style={{ color: "#888888" }}
                  />
                </div>
              ) : lists.length === 0 ? (
                <p
                  className="text-xs text-center py-5 px-3"
                  style={{ color: "#aaaaaa" }}
                >
                  No lists yet
                </p>
              ) : (
                <div>
                  {lists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => setSelectedId(list.id)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors"
                      style={{
                        background:
                          selectedId === list.id ? "#f5f5f5" : "transparent",
                        borderBottom: "1px solid #f9f9f9",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedId !== list.id)
                          (e.currentTarget as HTMLElement).style.background =
                            "#fafafa";
                      }}
                      onMouseLeave={(e) => {
                        if (selectedId !== list.id)
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                      }}
                    >
                      <span
                        className="flex-1 truncate font-medium text-sm"
                        style={{ color: "#111111" }}
                      >
                        {list.name}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: "#f0f0f0", color: "#888888" }}
                      >
                        {list.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* New list input */}
              <div
                className="p-3"
                style={{ borderTop: "1px solid #f0f0f0" }}
              >
                <div className="flex gap-1.5">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleCreateList()
                    }
                    placeholder="New list..."
                    className="flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-lg outline-none"
                    style={{ border: "1px solid #e5e5e5" }}
                    onFocus={(e) =>
                      ((e.target as HTMLInputElement).style.borderColor =
                        "#000000")
                    }
                    onBlur={(e) =>
                      ((e.target as HTMLInputElement).style.borderColor =
                        "#e5e5e5")
                    }
                  />
                  <button
                    onClick={handleCreateList}
                    disabled={creating || !newName.trim()}
                    className="px-2 py-1.5 rounded-lg flex items-center justify-center disabled:opacity-40 flex-shrink-0"
                    style={{ background: "#000000", color: "#ffffff" }}
                  >
                    {creating ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Plus size={12} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Properties panel ── */}
          <div className="flex-1 min-w-0">
            {!selectedId ? (
              <div
                className="rounded-xl p-16 text-center"
                style={{ background: "#fff", border: "1px solid #e5e5e5" }}
              >
                <FolderOpen
                  size={40}
                  className="mx-auto mb-3"
                  style={{ color: "#e5e5e5" }}
                />
                <p className="font-medium" style={{ color: "#555555" }}>
                  No lists yet
                </p>
                <p className="text-sm mt-1" style={{ color: "#888888" }}>
                  Create a list, then save properties from search
                </p>
              </div>
            ) : (
              <>
                {/* List header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2
                      className="font-semibold text-base"
                      style={{ color: "#111111" }}
                    >
                      {selectedList?.name}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: "#888888" }}>
                      {selectedList?.count ?? 0}{" "}
                      {selectedList?.count === 1 ? "property" : "properties"}
                    </p>
                  </div>
                  <button
                    onClick={handleDeleteList}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ border: "1px solid #fecaca", color: "#b91c1c" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "#fee2e2")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "transparent")
                    }
                  >
                    <Trash2 size={13} />
                    Delete List
                  </button>
                </div>

                {/* Loading skeleton */}
                {loadingProps ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="rounded-xl p-5 animate-pulse"
                        style={{
                          background: "#fff",
                          border: "1px solid #e5e5e5",
                        }}
                      >
                        <div
                          className="h-4 rounded w-3/4 mb-2"
                          style={{ background: "#f0f0f0" }}
                        />
                        <div
                          className="h-3 rounded w-1/2 mb-4"
                          style={{ background: "#f5f5f5" }}
                        />
                        <div className="grid grid-cols-3 gap-3">
                          {[0, 1, 2].map((j) => (
                            <div
                              key={j}
                              className="h-8 rounded"
                              style={{ background: "#f5f5f5" }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : properties.length === 0 ? (
                  <div
                    className="rounded-xl p-16 text-center"
                    style={{ background: "#fff", border: "1px solid #e5e5e5" }}
                  >
                    <BookmarkMinus
                      size={40}
                      className="mx-auto mb-3"
                      style={{ color: "#e5e5e5" }}
                    />
                    <p className="font-medium" style={{ color: "#555555" }}>
                      This list is empty
                    </p>
                    <p className="text-sm mt-1" style={{ color: "#888888" }}>
                      Go to Properties search and save properties here
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {properties.map((p) => (
                      <div key={p.id} className="relative group">
                        <PropertyCard
                          property={p}
                          onClick={() => setSelectedProperty(p)}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveProperty(p.id);
                          }}
                          title="Remove from list"
                          className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "#fee2e2", color: "#b91c1c" }}
                        >
                          <BookmarkMinus size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <PropertyDetailModal
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
      />
    </div>
  );
}
