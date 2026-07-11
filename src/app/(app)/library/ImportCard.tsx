"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { parseSubtitles } from "@/features/subtitles/parse";
import { createMedia, insertCues } from "@/lib/actions/media";
import { putVideo } from "@/lib/video-store";

/** Reads duration + a poster frame from the picked file, entirely client-side. */
function probeVideo(file: File): Promise<{ durationMs: number | null; poster: string | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;

    const finish = (durationMs: number | null, poster: string | null) => {
      URL.revokeObjectURL(url);
      resolve({ durationMs, poster });
    };
    video.onerror = () => finish(null, null);
    video.onloadedmetadata = () => {
      const durationMs = Number.isFinite(video.duration)
        ? Math.round(video.duration * 1000)
        : null;
      video.currentTime = Math.min(video.duration * 0.1 || 0, 90);
      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          const w = 480;
          canvas.width = w;
          canvas.height = Math.round((video.videoHeight / video.videoWidth) * w) || 270;
          const ctx = canvas.getContext("2d");
          if (!ctx) return finish(durationMs, null);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          finish(durationMs, canvas.toDataURL("image/jpeg", 0.6));
        } catch {
          finish(durationMs, null);
        }
      };
      // Some codecs never fire seeked — fall back after a beat.
      setTimeout(() => finish(durationMs, null), 4000);
    };
  });
}

type Step = "idle" | "parsing" | "saving" | "storing";

export function ImportCard() {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [deFile, setDeFile] = useState<File | null>(null);
  const [enFile, setEnFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  const busy = step !== "idle";

  async function importMedia() {
    if (!videoFile || !deFile || busy) return;
    setError(null);
    try {
      setStep("parsing");
      const deCues = parseSubtitles(deFile.name, await deFile.text());
      if (deCues.length === 0) throw new Error("No cues found in the German subtitle file.");
      const enCues = enFile ? parseSubtitles(enFile.name, await enFile.text()) : [];
      const { durationMs, poster } = await probeVideo(videoFile);

      setStep("saving");
      const title = videoFile.name.replace(/\.[^.]+$/, "").replace(/[._]/g, " ").trim();
      const created = await createMedia({ title, durationMs, posterUrl: poster });
      if (!created.ok) throw new Error(created.error);

      const insDe = await insertCues(created.mediaId, "de", deCues);
      if (!insDe.ok) throw new Error(insDe.error);
      if (enCues.length > 0) await insertCues(created.mediaId, "en", enCues);

      setStep("storing");
      await putVideo(created.mediaId, videoFile);
      router.push(`/watch/${created.mediaId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
      setStep("idle");
    }
  }

  const filePicker = (
    label: string,
    accept: string,
    file: File | null,
    set: (f: File | null) => void,
    required: boolean,
  ) => (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
        file
          ? "border-accent/50 bg-accent-soft"
          : "border-border bg-white/[0.02] hover:border-accent/40"
      }`}
    >
      <span className="text-[13px] font-medium">
        {label}
        {required ? "" : " (optional)"}
      </span>
      <span className="max-w-full truncate text-xs text-muted">
        {file ? file.name : accept.replace(/,/g, " · ")}
      </span>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => set(e.target.files?.[0] ?? null)}
      />
    </label>
  );

  const stepLabel: Record<Step, string> = {
    idle: "Import & watch",
    parsing: "Parsing subtitles…",
    saving: "Saving…",
    storing: "Storing video…",
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold">Import a movie or episode</h2>
      <p className="mt-1 text-[13px] text-muted">
        A local video file, its German subtitles, and (ideally) English subtitles.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {filePicker("Video", "video/*", videoFile, setVideoFile, true)}
        {filePicker("German subtitles", ".srt,.vtt", deFile, setDeFile, true)}
        {filePicker("English subtitles", ".srt,.vtt", enFile, setEnFile, false)}
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-4">
        <Button onClick={importMedia} disabled={!videoFile || !deFile || busy}>
          {stepLabel[step]}
        </Button>
      </div>
    </section>
  );
}
