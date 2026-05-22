import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Camera, ImagePlus, Loader2, Sparkles, AlertCircle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/lib/gemini";
import { scanCard } from "@/lib/api";

interface ScanPageProps {
  onAnalyzed: (result: AnalysisResult, imageUrl: string) => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Scan({ onAnalyzed }: ScanPageProps) {
  const [, setLocation] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noKey, setNoKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setError(null);
    setNoKey(false);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  async function handleAnalyze() {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    setNoKey(false);

    try {
      const imageBase64 = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type || "image/jpeg";
      const result = await scanCard(imageBase64, mimeType);
      onAnalyzed(result, previewUrl ?? "");
      setLocation("/review");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred analyzing the card.";
      if (msg.includes("Gemini API Key") || msg.includes("Settings")) {
        setNoKey(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-foreground">Scan Business Card</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Take a photo or upload an image to extract contact info
          </p>
        </div>

        <div
          className={`relative rounded-2xl border-2 border-dashed transition-colors mb-6 ${
            previewUrl
              ? "border-primary/30 bg-primary/5"
              : "border-border hover:border-primary/50 bg-card cursor-pointer"
          }`}
          onClick={!previewUrl ? () => fileInputRef.current?.click() : undefined}
          data-testid="upload-area"
        >
          {!previewUrl ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ImagePlus className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Tap to select an image</p>
              <p className="text-xs text-muted-foreground">Camera or photo library</p>
            </div>
          ) : (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Business card preview"
                className="w-full rounded-2xl object-contain max-h-64"
                data-testid="img-preview"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewUrl(null);
                  setSelectedFile(null);
                  setError(null);
                  setNoKey(false);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground border border-border text-sm font-bold"
                data-testid="button-clear-image"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          data-testid="input-file"
        />

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-select-image"
          >
            <Camera className="h-5 w-5" />
            <span className="text-sm">Take Photo</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-upload-image"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-sm">Upload Image</span>
          </Button>
        </div>

        {noKey && (
          <div
            className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-4 mb-6"
            data-testid="error-no-key"
          >
            <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1">
                Gemini API Key required
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Please add your Gemini API Key in Settings to use this feature.
              </p>
              <button
                className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300 underline underline-offset-2"
                onClick={() => {
                  const btn = document.querySelector<HTMLButtonElement>('[data-testid="button-settings"]');
                  btn?.click();
                }}
              >
                Open Settings →
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            className="flex items-start gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4 mb-6"
            data-testid="error-message"
          >
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={handleAnalyze}
          disabled={!selectedFile || loading}
          data-testid="button-analyze"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Analyzing card...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Analyze Card
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          className="w-full mt-3"
          onClick={() => setLocation("/")}
          data-testid="button-cancel"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
