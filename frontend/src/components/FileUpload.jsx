import { useState, useCallback, useEffect } from "react";
import { Upload, Trash2, File as FileIcon, Loader2, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import axios from "axios";
import { toast } from "sonner";

export const FileUpload = () => {
    const [files, setFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success' | 'error', message: '' }
    const [loading, setLoading] = useState(true);

    // Fetch existing files from the database on mount
    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/api/files");
            console.log("Files response:", response.data); // Debug log

            if (response.data.status === "success" && Array.isArray(response.data.files)) {
                const existingFiles = response.data.files.map((file) => ({
                    id: file.filename, // Use filename as unique ID
                    name: file.filename,
                    size: file.file_size || 0,
                    uploaded: true, // Mark as already uploaded
                    uploadTime: file.upload_time,
                }));
                setFiles(existingFiles);
                console.log("Loaded existing files:", existingFiles); // Debug log
            }
        } catch (error) {
            console.error("Failed to fetch files:", error);
            toast.error("Failed to load existing files");
        } finally {
            setLoading(false);
        }
    };

    const uploadFile = async (fileToUpload) => {
        setUploadStatus({ type: 'loading', message: `Uploading ${fileToUpload.name}...` });

        const formData = new FormData();
        formData.append("file", fileToUpload.file);

        try {
            await axios.post("/api/ingest/file", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            // Update file status to uploaded
            setFiles(prev => prev.map(f =>
                f.id === fileToUpload.id ? { ...f, uploaded: true } : f
            ));

            setUploadStatus({ type: 'success', message: `${fileToUpload.name} uploaded successfully!` });
            toast.success(`${fileToUpload.name} uploaded successfully!`);

            // Clear status after 3 seconds
            setTimeout(() => setUploadStatus(null), 3000);
        } catch (error) {
            console.error("Upload failed:", error); const errorMessage = error.response?.data?.detail || `Failed to upload ${fileToUpload.name}`;
            setUploadStatus({ type: 'error', message: errorMessage });
            toast.error(errorMessage);

            // Remove failed file from list
            setFiles(prev => prev.filter(f => f.id !== fileToUpload.id));

            // Clear status after 5 seconds
            setTimeout(() => setUploadStatus(null), 5000);
        }
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);

        droppedFiles.forEach((file) => {
            const fileObj = {
                id: `${file.name}-${Date.now()}-${Math.random()}`,
                file: file,
                name: file.name,
                size: file.size,
                uploaded: false,
            };

            setFiles(prev => [...prev, fileObj]);
            // Auto-upload immediately
            uploadFile(fileObj);
        });
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileInput = useCallback((e) => {
        const selectedFiles = Array.from(e.target.files || []);

        selectedFiles.forEach((file) => {
            const fileObj = {
                id: `${file.name}-${Date.now()}-${Math.random()}`,
                file: file,
                name: file.name,
                size: file.size,
                uploaded: false,
            };

            setFiles(prev => [...prev, fileObj]);
            // Auto-upload immediately
            uploadFile(fileObj);
        });

        e.target.value = "";
    }, []);

    const removeFile = async (fileToRemove) => {
        try {
            // If the file is uploaded to the backend, delete it from there
            if (fileToRemove.uploaded) {
                await axios.delete(`/api/ingest/file/${encodeURIComponent(fileToRemove.name)}`);
                toast.success(`${fileToRemove.name} deleted successfully!`);
            }

            // Remove from local state
            setFiles(prev => prev.filter(f => f.id !== fileToRemove.id));
        } catch (error) {
            console.error("Delete failed:", error);
            const errorMessage = error.response?.data?.detail || `Failed to delete ${fileToRemove.name}`;
            toast.error(errorMessage);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const dm = 2;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
    };

    return (
        <div className="w-full space-y-6">
            {/* Upload Area */}
            <div
                className={cn(
                    "glassmorphic-card p-8 lg:p-12 text-center cursor-pointer transition-all duration-300 relative overflow-hidden",
                    isDragging && "upload-area-active scale-[1.02]",
                    !isDragging && "hover:border-primary/50 hover-lift"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById("fileInput")?.click()}
            >
                <input
                    type="file"
                    id="fileInput"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.md"
                    className="hidden"
                    onChange={handleFileInput}
                />
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
                        isDragging
                            ? "bg-gradient-to-br from-primary to-accent scale-110 glow-effect"
                            : "bg-gradient-to-br from-primary/20 to-accent/20"
                    )}>
                        <Upload className={cn(
                            "w-8 h-8 transition-all duration-300",
                            isDragging ? "text-white animate-bounce" : "text-primary"
                        )} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-base font-medium">
                            {isDragging
                                ? "Drop files here"
                                : "Drag & drop files here, or click to select"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Supports PDF, Word, Text, and Markdown files
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="pointer-events-none mt-2 border-primary/50 text-primary hover:bg-primary/10"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Select Files
                    </Button>
                </div>
            </div>

            {/* Upload Status Notification */}
            {uploadStatus && (
                <div className={cn(
                    "glassmorphic-card p-4 flex items-center gap-3 animate-slide-up",
                    uploadStatus.type === 'success' && "border-green-500/50",
                    uploadStatus.type === 'error' && "border-red-500/50"
                )}>
                    {uploadStatus.type === 'loading' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                    {uploadStatus.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {uploadStatus.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                    <p className="text-sm font-medium">{uploadStatus.message}</p>
                </div>
            )}

            {/* Uploaded Files List */}
            {loading ? (
                <div className="glassmorphic-card p-6 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                    <p className="text-sm text-muted-foreground">Loading documents...</p>
                </div>
            ) : files.length > 0 ? (
                <div className="space-y-4 animate-slide-up">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <span className="text-primary">📄</span>
                        Documents ({files.length})
                    </h3>
                    <div className="space-y-3">
                        {files.map((file, index) => (
                            <div
                                key={file.id}
                                className="glassmorphic-card p-4 flex items-center justify-between hover-lift group animate-slide-up"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                        file.uploaded
                                            ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20"
                                            : "bg-gradient-to-br from-primary/20 to-accent/20"
                                    )}>
                                        {file.uploaded ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatFileSize(file.size)}
                                            {file.uploaded && " • Uploaded"}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 transition-opacity hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFile(file);
                                    }}
                                    disabled={!file.uploaded}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
};
