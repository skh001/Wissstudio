"use client";

import { useRef } from "react";
import { FileText, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { cn } from "@/lib/utils";

const isPdfUrl = (url: string) => /\.pdf(?:$|\?)/i.test(url);

export function ImageUpload({
  value,
  onChange,
  folder,
  label = "Add photo",
  className,
  aspect = "aspect-square",
  allowPdf = false,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  folder: string;
  label?: string;
  className?: string;
  aspect?: string;
  /** Also accept PDF files (receipts, supplier invoices). */
  allowPdf?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useMediaUpload(folder);

  async function handle(file?: File) {
    if (!file) return;
    const isPdf = file.type === "application/pdf";
    if (!file.type.startsWith("image/") && !(allowPdf && isPdf)) {
      return toast.error(allowPdf ? "Choose an image (JPG, PNG, WEBP, HEIC) or a PDF." : "Choose an image file (JPG, PNG, WEBP or HEIC).");
    }
    if (file.size > (isPdf ? 8 : 15) * 1024 * 1024) {
      return toast.error(isPdf ? "This PDF is over 8 MB. Choose a smaller one." : "This photo is over 15 MB. Choose a smaller one.");
    }
    try {
      onChange(await upload(file));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-dashed border-border bg-muted/50 transition hover:border-primary/50",
        aspect,
        className,
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); void handle(e.dataTransfer.files?.[0]); }}
    >
      {value ? (
        <>
          {isPdfUrl(value) ? (
            <a href={value} target="_blank" rel="noreferrer" className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-xs text-muted-foreground hover:text-foreground">
              <FileText className="h-6 w-6 text-primary" />
              <span>PDF</span>
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          )}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-plum shadow-soft opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-xs text-muted-foreground"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <ImagePlus className="h-5 w-5 text-primary" />}
          <span>{uploading ? "Uploading…" : label}</span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={allowPdf ? "image/*,application/pdf" : "image/*"}
        // the camera shortcut would hide the file picker, so PDFs couldn't be chosen on phones
        capture={allowPdf ? undefined : "environment"}
        className="hidden"
        onChange={(e) => { void handle(e.target.files?.[0]); e.target.value = ""; }}
      />
    </div>
  );
}
