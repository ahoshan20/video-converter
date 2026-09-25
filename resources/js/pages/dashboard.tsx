import { Head } from "@inertiajs/react";
import {
    Download,
    Film,
    FolderUp,
    LoaderCircle,
    Play,
    Trash2,
    UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { dashboard } from "@/routes";

type ConversionStatus =
    | "waiting"
    | "queued"
    | "converting"
    | "completed"
    | "failed"
    | "cancelled";

type ConversionRecord = {
    id: number;
    original_filename: string;
    input_size?: number | null;
    output_filename?: string | null;
    output_size?: number | null;
    status: ConversionStatus;
    progress: number;
    file_type?: string;
    profile?: string;
    error_message?: string | null;
    output_path?: string | null;
};

const SUPPORTED_FORMATS = ["MP4", "MKV", "AVI", "MOV", "WebM", "3GP"] as const;

const CONVERSION_PROFILE = {
    name: "Symphony BL102",
    container: "3GP",
    videoCodec: "MPEG-4 Part 2",
    resolution: "320x240",
    fps: 15,
    videoBitrate: "300 kbps",
    audioCodec: "AAC",
    audioBitrate: "64 kbps",
    sampleRate: "44100 Hz",
};

const STATUS_STYLES: Record<ConversionStatus, string> = {
    waiting:
        "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
    queued: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    converting:
        "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
    completed:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
    cancelled:
        "bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-100",
};

function humanFileSize(bytes?: number | null): string {
    if (!bytes) {
        return "—";
    }

    const units = ["B", "KB", "MB", "GB"];
    let amount = bytes;
    let unitIndex = 0;

    while (amount >= 1024 && unitIndex < units.length - 1) {
        amount /= 1024;
        unitIndex += 1;
    }

    return `${amount.toFixed(amount >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function statusLabel(status: ConversionStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function getCsrfToken(): string {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ""
    );
}

function formatFileType(fileName: string): string {
    const extension = fileName.split(".").pop();
    return extension ? extension.toUpperCase() : "FILE";
}

export default function Dashboard() {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [items, setItems] = useState<ConversionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadConversions = async () => {
        setIsLoading(true);

        try {
            const response = await fetch("/api/conversions", {
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                },
            });
            console.log("loadConversions response:", response);

            if (!response.ok) {
                throw new Error("Could not load conversion history.");
            }

            const payload = await response.json();
            setItems(payload.data ?? []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not load conversions.",
            );
        } finally {
            setIsLoading(false);
        }
    };

    // useEffect(() => {
    //     void loadConversions();
    //     const interval = window.setInterval(() => {
    //         void loadConversions();
    //     }, 2500);

    //     return () => window.clearInterval(interval);
    // }, []);

    useEffect(() => {
        void loadConversions();
    }, []);

    useEffect(() => {
        const hasActive = items.some((item) =>
            ["waiting", "queued", "converting"].includes(item.status),
        );

        if (!hasActive) {
            return;
        }

        const interval = window.setInterval(() => {
            void loadConversions();
        }, 2500);

        return () => window.clearInterval(interval);
    }, [items]);

    const activeItems = useMemo(
        () =>
            items.filter((item) =>
                ["waiting", "queued", "converting"].includes(item.status),
            ),
        [items],
    );
    const completedItems = useMemo(
        () => items.filter((item) => item.status === "completed"),
        [items],
    );

    const handleFiles = async (files: FileList | File[]) => {
        const list = Array.from(files);
        if (list.length === 0) {
            return;
        }

        const allowed = [
            "video/mp4",
            "video/x-matroska",
            "video/x-msvideo",
            "video/quicktime",
            "video/webm",
            "video/3gpp",
            "video/3gpp2",
        ];
        const invalid = list.filter(
            (file) =>
                !allowed.includes(file.type) &&
                !["mp4", "mkv", "avi", "mov", "webm", "3gp", "3gpp"].includes(
                    file.name.split(".").pop()?.toLowerCase() ?? "",
                ),
        );

        if (invalid.length > 0) {
            setError(`Unsupported file type: ${invalid[0].name}`);
            return;
        }

        setError(null);
        setIsUploading(true);

        try {
            const formData = new FormData();
            list.forEach((file) => formData.append("videos[]", file));

            const response = await fetch("/api/videos/upload", {
                method: "POST",
                credentials: "same-origin",
                body: formData,
                headers: {
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
            });

            console.log("handleFiles response:", response);
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload?.message ?? "Upload failed.");
            }

            setItems((existing) => [...(payload.data ?? []), ...existing]);
            setIsUploading(false);
            void loadConversions();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed.");
            setIsUploading(false);
        }
    };

    const handleConvertAll = async () => {
        const idsToConvert = items
            .filter(
                (item) => item.status === "waiting" || item.status === "queued",
            )
            .map((item) => item.id);

        if (idsToConvert.length === 0) {
            return;
        }

        try {
            const response = await fetch("/api/conversions", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                    Accept: "application/json",
                },
                body: JSON.stringify({ conversions: idsToConvert }),
            });

            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload?.message ?? "Conversion failed.");
            }

            setItems((existing) =>
                existing.map((item) => {
                    const updated = payload.data?.find(
                        (entry: ConversionRecord) => entry.id === item.id,
                    );
                    return updated
                        ? {
                              ...item,
                              ...updated,
                              status: updated.status ?? item.status,
                          }
                        : item;
                }),
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Conversion failed.");
        }
    };

    const handleRemove = async (id: number) => {
        try {
            const response = await fetch(`/api/conversions/${id}`, {
                method: "DELETE",
                credentials: "same-origin",
                headers: {
                    "X-CSRF-TOKEN": getCsrfToken(),
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Could not remove conversion.");
            }

            setItems((existing) => existing.filter((item) => item.id !== id));
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not remove conversion.",
            );
        }
    };

    const handleDownload = (id: number) => {
        window.location.href = `/api/conversions/${id}/download`;
    };

    const handleDownloadAll = () => {
        completedItems.forEach((item) => handleDownload(item.id));
    };

    return (
        <>
            <Head title="Button Phone Video Converter" />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
                <header className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            Local batch conversion
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                            Button Phone Video Converter
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                            Convert multiple videos to a 3GP profile designed
                            for the Symphony BL102 button phone, without leaving
                            your laptop.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleDownloadAll}
                        disabled={completedItems.length === 0}
                    >
                        <Download className="size-4" />
                        Download All Completed
                    </Button>
                </header>

                <div className="grid gap-6 xl:grid-cols-[1.5fr_0.7fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FolderUp className="size-4" /> Video queue
                            </CardTitle>
                            <CardDescription>
                                Drag and drop clips or choose them manually.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    setIsDragging(false);
                                    void handleFiles(event.dataTransfer.files);
                                }}
                                className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
                                    isDragging
                                        ? "border-primary bg-accent/50"
                                        : "border-border bg-muted/20"
                                }`}
                                onClick={() => inputRef.current?.click()}
                            >
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept=".mp4,.mkv,.avi,.mov,.webm,.3gp,.3gpp,video/*"
                                    className="hidden"
                                    multiple
                                    onChange={(event) => {
                                        if (event.target.files) {
                                            void handleFiles(
                                                event.target.files,
                                            );
                                            event.target.value = "";
                                        }
                                    }}
                                />
                                <UploadCloud className="size-10 text-muted-foreground" />
                                <p className="mt-4 text-lg font-medium">
                                    Select Videos
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {isUploading
                                        ? "Uploading..."
                                        : "Drop files here or browse for multiple items"}
                                </p>
                                <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                                    {SUPPORTED_FORMATS.map((format) => (
                                        <Badge key={format} variant="outline">
                                            {format}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                                    {error}
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-4 pt-2">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Queued conversions
                                    </p>
                                    <p className="text-2xl font-semibold">
                                        {activeItems.length}
                                    </p>
                                </div>
                                <Button
                                    onClick={handleConvertAll}
                                    disabled={
                                        items.filter(
                                            (item) =>
                                                item.status === "waiting" ||
                                                item.status === "queued",
                                        ).length === 0 || isUploading
                                    }
                                >
                                    <Play className="size-4" />
                                    Convert All
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {isLoading && items.length === 0 ? (
                                    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground animate-pulse">
                                        <LoaderCircle className="size-4 animate-spin" />
                                        Loading conversion history...
                                    </div>
                                ) : items.length === 0 ? (
                                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                                        No videos yet. Add a few clips to start
                                        converting.
                                    </div>
                                ) : (
                                    items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="rounded-xl border bg-muted/30 p-3"
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium">
                                                        {item.original_filename}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                        <span>
                                                            {humanFileSize(
                                                                item.input_size,
                                                            )}
                                                        </span>
                                                        <span>•</span>
                                                        <span>
                                                            {formatFileType(
                                                                item.original_filename,
                                                            )}
                                                        </span>
                                                        <span>•</span>
                                                        <span>
                                                            {item.profile ??
                                                                CONVERSION_PROFILE.name}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        className={
                                                            STATUS_STYLES[
                                                                item.status
                                                            ]
                                                        }
                                                        variant="secondary"
                                                    >
                                                        {statusLabel(
                                                            item.status,
                                                        )}
                                                    </Badge>
                                                    {[
                                                        "waiting",
                                                        "queued",
                                                    ].includes(item.status) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                void handleRemove(
                                                                    item.id,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    )}
                                                    {item.status ===
                                                        "completed" && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleDownload(
                                                                    item.id,
                                                                )
                                                            }
                                                        >
                                                            <Download className="size-4" />
                                                            Download
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>
                                                        {item.status ===
                                                        "completed"
                                                            ? "Complete"
                                                            : item.status ===
                                                                "failed"
                                                              ? "Error"
                                                              : "Progress"}
                                                    </span>
                                                    <span>
                                                        {item.progress ?? 0}%
                                                    </span>
                                                </div>
                                                <div className="h-2.5 overflow-hidden rounded-full bg-background">
                                                    <div
                                                        className={`h-full rounded-full ${item.status === "failed" ? "bg-red-500" : item.status === "completed" ? "bg-emerald-500" : "bg-primary"}`}
                                                        style={{
                                                            width: `${Math.max(0, Math.min(100, item.progress ?? 0))}%`,
                                                        }}
                                                    />
                                                </div>
                                                {item.error_message && (
                                                    <p className="mt-2 text-xs text-red-600 dark:text-red-300">
                                                        {item.error_message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Film className="size-4" /> Conversion
                                    profile
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                                    <span className="text-muted-foreground">
                                        Profile
                                    </span>
                                    <span className="font-medium">
                                        {CONVERSION_PROFILE.name}
                                    </span>
                                </div>
                                <div className="grid gap-2">
                                    {[
                                        [
                                            "Container",
                                            CONVERSION_PROFILE.container,
                                        ],
                                        [
                                            "Video codec",
                                            CONVERSION_PROFILE.videoCodec,
                                        ],
                                        [
                                            "Resolution",
                                            CONVERSION_PROFILE.resolution,
                                        ],
                                        ["FPS", `${CONVERSION_PROFILE.fps}`],
                                        [
                                            "Video bitrate",
                                            CONVERSION_PROFILE.videoBitrate,
                                        ],
                                        [
                                            "Audio codec",
                                            CONVERSION_PROFILE.audioCodec,
                                        ],
                                        [
                                            "Audio bitrate",
                                            CONVERSION_PROFILE.audioBitrate,
                                        ],
                                        [
                                            "Audio sample rate",
                                            CONVERSION_PROFILE.sampleRate,
                                        ],
                                    ].map(([label, value]) => (
                                        <div
                                            key={label}
                                            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                                        >
                                            <span className="text-muted-foreground">
                                                {label}
                                            </span>
                                            <span className="font-medium">
                                                {value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Quick summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>Ready to convert</span>
                                    <span className="font-medium text-foreground">
                                        {
                                            items.filter(
                                                (item) =>
                                                    item.status === "waiting" ||
                                                    item.status === "queued",
                                            ).length
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Completed</span>
                                    <span className="font-medium text-foreground">
                                        {completedItems.length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Failed</span>
                                    <span className="font-medium text-foreground">
                                        {
                                            items.filter(
                                                (item) =>
                                                    item.status === "failed",
                                            ).length
                                        }
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: "Dashboard",
            href: dashboard(),
        },
    ],
};
