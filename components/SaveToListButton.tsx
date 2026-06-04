"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Plus,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Property } from "@/lib/types";

interface ListItem {
  id: string;
  name: string;
  count: number;
}

interface Props {
  property: Property;
}

export default function SaveToListButton({ property }: Props) {
  const [open, setOpen]         = useState(false);
  const [lists, setLists]       = useState<ListItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(false);
  const [newName, setNewName]   = useState("");
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load lists + which ones contain this property when dropdown opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch("/api/lists").then((r) => r.json()),
      fetch(
        `/api/lists?parid=${encodeURIComponent(property.id)}`
      ).then((r) => r.json()),
    ])
      .then(([listsData, savedData]) => {
        setLists(listsData.lists ?? []);
        setSavedIds(new Set(savedData.listIds ?? []));
      })
      .finally(() => setLoading(false));
  }, [open, property.id]);

  async function toggle(listId: string) {
    const isSaved = savedIds.has(listId);
    // Optimistic update
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(listId);
      else next.add(listId);
      return next;
    });
    if (isSaved) {
      await fetch(
        `/api/lists/${listId}?parid=${encodeURIComponent(property.id)}`,
        { method: "DELETE" }
      );
    } else {
      await fetch(`/api/lists/${listId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parid: property.id, snapshot: property }),
      });
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
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
        // Auto-add the current property to the new list
        await fetch(`/api/lists/${data.list.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parid: property.id, snapshot: property }),
        });
        setSavedIds((prev) => new Set([...prev, data.list.id]));
        setNewName("");
        setShowNew(false);
      }
    } finally {
      setCreating(false);
    }
  }

  const isSavedAny = savedIds.size > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        style={{
          background: isSavedAny ? "#000000" : "#f5f5f5",
          color: isSavedAny ? "#ffffff" : "#111111",
        }}
        onMouseEnter={(e) => {
          if (!isSavedAny)
            (e.currentTarget as HTMLElement).style.background = "#ebebeb";
        }}
        onMouseLeave={(e) => {
          if (!isSavedAny)
            (e.currentTarget as HTMLElement).style.background = "#f5f5f5";
        }}
      >
        {isSavedAny ? (
          <BookmarkCheck size={14} />
        ) : (
          <Bookmark size={14} />
        )}
        {isSavedAny ? "Saved" : "Save to List"}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-64 rounded-xl shadow-xl z-[60] overflow-hidden"
          style={{ background: "#fff", border: "1px solid #e5e5e5" }}
        >
          <div
            className="px-3 py-2.5"
            style={{ borderBottom: "1px solid #f0f0f0" }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "#888888" }}
            >
              Save to List
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2
                size={18}
                className="animate-spin"
                style={{ color: "#888888" }}
              />
            </div>
          ) : (
            <>
              {lists.length === 0 && !showNew && (
                <p
                  className="text-xs text-center py-5"
                  style={{ color: "#aaaaaa" }}
                >
                  No lists yet
                </p>
              )}

              <div className="max-h-52 overflow-y-auto">
                {lists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => toggle(list.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors"
                    style={{ borderBottom: "1px solid #f9f9f9" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "#f9f9f9")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "transparent")
                    }
                  >
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        background: savedIds.has(list.id)
                          ? "#000000"
                          : "transparent",
                        border: savedIds.has(list.id)
                          ? "none"
                          : "1.5px solid #cccccc",
                      }}
                    >
                      {savedIds.has(list.id) && (
                        <Check size={10} color="#fff" strokeWidth={3} />
                      )}
                    </div>
                    <span className="flex-1 truncate" style={{ color: "#111111" }}>
                      {list.name}
                    </span>
                    <span
                      className="text-xs ml-auto"
                      style={{ color: "#aaaaaa" }}
                    >
                      {list.count}
                    </span>
                  </button>
                ))}
              </div>

              {showNew ? (
                <div
                  className="p-3 flex gap-2"
                  style={{ borderTop: "1px solid #f0f0f0" }}
                >
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                      if (e.key === "Escape") setShowNew(false);
                    }}
                    placeholder="List name..."
                    className="flex-1 min-w-0 text-sm px-2.5 py-1.5 rounded-lg outline-none"
                    style={{ border: "1px solid #e5e5e5" }}
                  />
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newName.trim()}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 flex items-center"
                    style={{ background: "#000000", color: "#ffffff" }}
                  >
                    {creating ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      "Add"
                    )}
                  </button>
                  <button
                    onClick={() => setShowNew(false)}
                    className="p-1.5 rounded-lg"
                    style={{ color: "#888888" }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNew(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    borderTop: "1px solid #f0f0f0",
                    color: "#000000",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "#f9f9f9")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "transparent")
                  }
                >
                  <Plus size={14} />
                  New List
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
