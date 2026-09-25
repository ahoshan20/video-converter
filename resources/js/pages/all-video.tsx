import { Head } from "@inertiajs/react";
import {
    CheckCircle2,
    Clock3,
    Download,
    FileVideo,
    LoaderCircle,
    Search,
    Trash2,
    XCircle,
    RefreshCw,
    Video,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ConversionStatus =
    | "waiting"
    | "queued"
    | "processing"
    | "completed"
    | "failed";

type Conversion = {
    id: number;
    original_filename?: string;
    input_file_name?: string;
    input_size?: number;
    status: ConversionStatus;
    progress?: number;
    profile?: string;
    started_at?: string | null;
    completed_at?: string | null;
    created_at?: string | null;
    error_message?: string | null;
};

const STATUS_STYLES: Record<ConversionStatus, string> = {
    waiting:
        "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
    queued: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300",
    processing:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
    completed:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    failed: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300",
};

const STATUS_LABELS: Record<ConversionStatus, string> = {
    waiting: "Waiting",
    queued: "Queued",
    processing: "Converting",
    completed: "Completed",
    failed: "Failed",
};

function statusLabel(status: ConversionStatus) {
    return STATUS_LABELS[status] ?? status;
}

function humanFileSize(bytes?: number) {
    if (!bytes) return "—";

    const units = ["B", "KB", "MB", "GB"];

    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(date?: string | null) {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "—";
    }

    return parsed.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function formatFileType(filename?: string) {
    if (!filename) return "Video";

    const extension = filename.split(".").pop();

    return extension ? extension.toUpperCase() : "Video";
}

function StatusIcon({ status }: { status: ConversionStatus }) {
    if (status === "completed") {
        return <CheckCircle2 className="size-4" />;
    }

    if (status === "failed") {
        return <XCircle className="size-4" />;
    }

    if (status === "processing") {
        return <LoaderCircle className="size-4 animate-spin" />;
    }

    if (status === "queued") {
        return <Clock3 className="size-4" />;
    }

    return <Clock3 className="size-4" />;
}

export default function AllVideo() {
    const [items, setItems] = useState<Conversion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | ConversionStatus>("all");

    const loadVideos = async () => {
        try {
            setError(null);

            const response = await fetch("/api/all-conversions", {
                headers: {
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch conversion history.");
            }

            const result = await response.json();

            setItems(result.data ?? []);
        } catch (err) {
            console.error(err);
            setError("Unable to load your conversion history.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadVideos();
    }, []);

    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();

        return items.filter((item) => {
            const filename =
                item.original_filename ?? item.input_file_name ?? "";

            const matchesSearch =
                !query || filename.toLowerCase().includes(query);

            const matchesFilter = filter === "all" || item.status === filter;

            return matchesSearch && matchesFilter;
        });
    }, [items, search, filter]);

    const completedItems = useMemo(
        () => items.filter((item) => item.status === "completed"),
        [items],
    );

    const processingItems = useMemo(
        () =>
            items.filter(
                (item) =>
                    item.status === "processing" || item.status === "queued",
            ),
        [items],
    );

    const failedItems = useMemo(
        () => items.filter((item) => item.status === "failed"),
        [items],
    );

    const handleDownload = (id: number) => {
        window.location.href = `/api/conversions/${id}/download`;
    };

    return (
        <>
            <Head title="Conversion History" />

            <div className="mx-auto flex w-full flex-col gap-6 p-4 md:p-8">
                {/* Header */}
                <header className="rounded-2xl border bg-card p-6 shadow-sm">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                <Video className="size-4" />
                                Video library
                            </div>

                            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                                Conversion History
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                View, search, and download all of your converted
                                videos in one place.
                            </p>
                        </div>

                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsLoading(true);
                                void loadVideos();
                            }}
                            disabled={isLoading}
                        >
                            <RefreshCw
                                className={`size-4 ${
                                    isLoading ? "animate-spin" : ""
                                }`}
                            />
                            Refresh
                        </Button>
                    </div>
                </header>

                {/* Summary */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Total conversions
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold">
                                        {items.length}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                                    <FileVideo className="size-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Completed
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold">
                                        {completedItems.length}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600">
                                    <CheckCircle2 className="size-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        In progress
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold">
                                        {processingItems.length}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600">
                                    <LoaderCircle className="size-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Failed
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold">
                                        {failedItems.length}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-red-500/10 p-3 text-red-600">
                                    <XCircle className="size-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main */}
                <Card>
                    <CardHeader className="gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <FileVideo className="size-4" />
                                Your conversions
                            </CardTitle>

                            <CardDescription className="mt-1">
                                Search through your previous video conversions
                                and download completed files.
                            </CardDescription>
                        </div>

                        {/* Search */}
                        <div className="flex flex-col gap-3 md:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                                <Input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search by filename..."
                                    className="pl-9"
                                />
                            </div>

                            <div className="flex gap-2 overflow-x-auto">
                                {[
                                    ["all", "All"],
                                    ["completed", "Completed"],
                                    ["processing", "Converting"],
                                    ["queued", "Queued"],
                                    ["failed", "Failed"],
                                ].map(([value, label]) => (
                                    <Button
                                        key={value}
                                        type="button"
                                        variant={
                                            filter === value
                                                ? "default"
                                                : "outline"
                                        }
                                        size="sm"
                                        onClick={() =>
                                            setFilter(
                                                value as
                                                    | "all"
                                                    | ConversionStatus,
                                            )
                                        }
                                        className="shrink-0"
                                    >
                                        {label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {isLoading && items.length === 0 ? (
                            <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed">
                                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                                    <LoaderCircle className="size-5 animate-spin" />
                                    Loading conversion history...
                                </div>
                            </div>
                        ) : error ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30">
                                <XCircle className="mx-auto size-8 text-red-500" />

                                <p className="mt-3 font-medium text-red-700 dark:text-red-300">
                                    {error}
                                </p>

                                <Button
                                    className="mt-4"
                                    variant="outline"
                                    onClick={() => {
                                        setIsLoading(true);
                                        void loadVideos();
                                    }}
                                >
                                    Try again
                                </Button>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
                                <div className="rounded-full bg-muted p-4">
                                    <FileVideo className="size-7 text-muted-foreground" />
                                </div>

                                <h3 className="mt-4 font-semibold">
                                    {items.length === 0
                                        ? "No conversions yet"
                                        : "No matching conversions"}
                                </h3>

                                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                                    {items.length === 0
                                        ? "Converted videos will appear here once you start processing files."
                                        : "Try changing your search or filter to find another conversion."}
                                </p>

                                {search && (
                                    <Button
                                        variant="outline"
                                        className="mt-4"
                                        onClick={() => setSearch("")}
                                    >
                                        Clear search
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredItems.map((item) => {
                                    const filename =
                                        item.original_filename ??
                                        item.input_file_name ??
                                        "Untitled video";

                                    const progress = Math.max(
                                        0,
                                        Math.min(100, item.progress ?? 0),
                                    );

                                    return (
                                        <div
                                            key={item.id}
                                            className="group rounded-xl border bg-muted/20 p-4 transition hover:bg-muted/40"
                                        >
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                {/* File info */}
                                                <div className="flex min-w-0 items-start gap-3">
                                                    <div className="mt-0.5 shrink-0 rounded-xl bg-primary/10 p-3 text-primary">
                                                        <FileVideo className="size-5" />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <h3 className="truncate font-medium">
                                                            {filename}
                                                        </h3>

                                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                            <span>
                                                                {humanFileSize(
                                                                    item.input_size,
                                                                )}
                                                            </span>

                                                            <span>•</span>

                                                            <span>
                                                                {formatFileType(
                                                                    filename,
                                                                )}
                                                            </span>

                                                            {item.profile && (
                                                                <>
                                                                    <span>
                                                                        •
                                                                    </span>

                                                                    <span>
                                                                        {
                                                                            item.profile
                                                                        }
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>

                                                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                            {item.created_at && (
                                                                <span>
                                                                    Added{" "}
                                                                    {formatDate(
                                                                        item.created_at,
                                                                    )}
                                                                </span>
                                                            )}

                                                            {item.completed_at &&
                                                                item.status ===
                                                                    "completed" && (
                                                                    <span>
                                                                        Completed{" "}
                                                                        {formatDate(
                                                                            item.completed_at,
                                                                        )}
                                                                    </span>
                                                                )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Status + Action */}
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={`gap-1.5 ${STATUS_STYLES[item.status]}`}
                                                    >
                                                        <StatusIcon
                                                            status={item.status}
                                                        />
                                                        {statusLabel(
                                                            item.status,
                                                        )}
                                                    </Badge>

                                                    {item.status ===
                                                        "completed" && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                handleDownload(
                                                                    item.id,
                                                                )
                                                            }
                                                        >
                                                            <Download className="size-4" />
                                                            <span className="hidden sm:inline">
                                                                Download
                                                            </span>
                                                        </Button>
                                                    )}

                                                    {item.status ===
                                                        "failed" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setIsLoading(
                                                                    true,
                                                                );
                                                                void loadVideos();
                                                            }}
                                                        >
                                                            <RefreshCw className="size-4" />
                                                            Retry
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Progress */}
                                            {(item.status === "processing" ||
                                                item.status === "queued" ||
                                                item.status === "completed" ||
                                                item.status === "failed") && (
                                                <div className="mt-4">
                                                    <div className="mb-1.5 flex items-center justify-between text-xs">
                                                        <span className="text-muted-foreground">
                                                            {item.status ===
                                                            "completed"
                                                                ? "Conversion complete"
                                                                : item.status ===
                                                                    "failed"
                                                                  ? "Conversion failed"
                                                                  : item.status ===
                                                                      "queued"
                                                                    ? "Waiting to start"
                                                                    : "Conversion progress"}
                                                        </span>

                                                        <span className="font-medium">
                                                            {item.status ===
                                                            "completed"
                                                                ? "100%"
                                                                : `${progress}%`}
                                                        </span>
                                                    </div>

                                                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${
                                                                item.status ===
                                                                "failed"
                                                                    ? "bg-red-500"
                                                                    : item.status ===
                                                                        "completed"
                                                                      ? "bg-emerald-500"
                                                                      : "bg-primary"
                                                            }`}
                                                            style={{
                                                                width: `${
                                                                    item.status ===
                                                                    "completed"
                                                                        ? 100
                                                                        : progress
                                                                }%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Error */}
                                            {item.error_message && (
                                                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                                                    {item.error_message}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
