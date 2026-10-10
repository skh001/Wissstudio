"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipFilter } from "@/components/shared/chip-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { GALLERY_CATEGORIES } from "@/lib/constants";
import { fullName } from "@/lib/utils";
import type { GalleryItem } from "@/types/domain";
import { GalleryFormDialog } from "./gallery-form-dialog";
import { GalleryGrid } from "./gallery-grid";

export function GalleryView({ items }: { items: GalleryItem[] }) {
  const [adding, setAdding] = useState(false);
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => cat === "all" || (cat === "featured" ? i.is_featured : cat === "before-after" ? !!i.before_url : i.categories.includes(cat)))
      .filter((i) => !q || `${i.title ?? ""} ${i.categories.join(" ")} ${i.client ? fullName(i.client) : ""}`.toLowerCase().includes(q));
  }, [items, cat, query]);

  return (
    <>
      <PageHeader
        title="Gallery"
        description={`${items.length} set${items.length !== 1 ? "s" : ""} photographed`}
        actions={<Button onClick={() => setAdding(true)}><Plus />Add photos</Button>}
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ChipFilter
          value={cat}
          onChange={setCat}
          options={[
            { value: "all", label: "All", count: items.length },
            { value: "featured", label: "Favourites" },
            { value: "before-after", label: "Before / after" },
            ...GALLERY_CATEGORIES.map((c) => ({ value: c, label: c, count: items.filter((i) => i.categories.includes(c)).length })),
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Title, client, style…" />
      </div>
      {list.length ? (
        <GalleryGrid items={list} />
      ) : (
        <EmptyState
          title={items.length ? "No photo matches" : "Your portfolio starts here"}
          description={items.length ? "Try another category or search." : "Add before and after photos of your sets. They're resized automatically on upload."}
          action={!items.length && <Button onClick={() => setAdding(true)}><Plus />Add your first set</Button>}
        />
      )}
      <GalleryFormDialog open={adding} onOpenChange={setAdding} />
    </>
  );
}
