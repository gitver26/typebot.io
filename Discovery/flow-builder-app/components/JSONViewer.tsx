"use client";

import { useState } from 'react';
import { Copy, Download, X, CheckCheck, AlertCircle, CheckCircle, Rocket, Loader2, ExternalLink } from 'lucide-react';
import { formatJSON, downloadJSON, type TypebotJSON } from '@/lib/jsonValidation';

interface JSONViewerProps {
    json: TypebotJSON;
    fileName?: string;
    onClose?: () => void;
    validationErrors?: string[];
}

export default function JSONViewer({
    json,
    fileName = 'typebot-flow.json',
    onClose,
    validationErrors = [],
}: JSONViewerProps) {
    const [copied, setCopied] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishResult, setPublishResult] = useState<{
        success: boolean;
        typebotId?: string;
        typebotUrl?: string;
        error?: string;
    } | null>(null);

    const formattedJSON = formatJSON(json);
    const isValid = validationErrors.length === 0;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(formattedJSON);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        downloadJSON(json, fileName);
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        setPublishResult(null);

        try {
            const response = await fetch('/api/typebot/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(json),
            });

            const data = await response.json();
            setPublishResult(data);
        } catch (error) {
            setPublishResult({
                success: false,
                error: error instanceof Error ? error.message : 'Network error',
            });
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0d0221]/90 backdrop-blur-xl">
            <div className="card max-w-4xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-[0_0_50px_rgba(0,243,255,0.3)]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b-2 border-[#00f3ff] bg-[#0d0221]">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-bold tracking-widest text-[#00f3ff] glow">
                            GEN_MATRIX_OUTPUT
                        </h2>
                        {isValid ? (
                            <div className="px-4 py-1 border-2 border-[#39ff14] text-[#39ff14] text-terminal font-bold flex items-center gap-2 glow">
                                <CheckCircle className="w-5 h-5" />
                                VALID_SEQUENCE
                            </div>
                        ) : (
                            <div className="px-4 py-1 border-2 border-red-500 text-red-500 font-bold flex items-center gap-2 glow">
                                <AlertCircle className="w-5 h-5" />
                                DATA_CORRUPTION
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[#00f3ff] hover:text-[#ff00ff] transition-colors"
                    >
                        <X className="w-8 h-8" />
                    </button>
                </div>

                {/* Validation Errors */}
                {!isValid && (
                    <div className="m-6 p-6 border-2 border-red-500 bg-red-500/10 shadow-[0_0_15px_red]">
                        <p className="font-bold mb-3 flex items-center gap-2 text-red-500 uppercase tracking-widest">
                            <AlertCircle className="w-6 h-6" />
                            ERRORS DETECTED_
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-red-400 font-bold">
                            {validationErrors.map((error, i) => (
                                <li key={i}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* JSON Content */}
                <div className="flex-1 overflow-auto p-6 bg-black/50">
                    <pre className="text-xl font-bold p-6 border-2 border-[#39ff14]/30 text-[#39ff14] text-terminal bg-black/80">
                        {formattedJSON}
                    </pre>
                </div>

                {/* Action Buttons */}
                <div className="p-6 border-t-2 border-[#00f3ff] flex flex-wrap gap-6 bg-[#0d0221]">
                    <button
                        onClick={handleCopy}
                        className="btn-primary"
                    >
                        {copied ? (
                            <>
                                <CheckCheck className="w-6 h-6" />
                                COPIED_
                            </>
                        ) : (
                            <>
                                <Copy className="w-6 h-6" />
                                COPY_STREAM
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleDownload}
                        className="btn-primary"
                    >
                        <Download className="w-6 h-6" />
                        EXTRACT_FILE
                    </button>

                    <button
                        onClick={handlePublish}
                        disabled={isPublishing || !isValid}
                        className="btn-primary btn-magenta ml-auto"
                    >
                        {isPublishing ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                UPLOADING...
                            </>
                        ) : (
                            <>
                                <Rocket className="w-6 h-6" />
                                UPLOAD_TO_GRID
                            </>
                        )}
                    </button>
                </div>

                {/* Publish Result */}
                {publishResult && (
                    <div className={`mx-6 mb-6 p-6 border-2 shadow-[0_0_20px_rgba(0,0,0,0.5)] ${publishResult.success
                            ? 'border-[#39ff14] bg-[#39ff14]/10 shadow-[0_0_20px_#39ff14]'
                            : 'border-red-500 bg-red-500/10 shadow-[0_0_20px_red]'
                        }`}>
                        {publishResult.success ? (
                            <>
                                <p className="font-bold mb-3 flex items-center gap-2 text-[#39ff14] uppercase tracking-widest glow">
                                    <CheckCircle className="w-6 h-6" />
                                    TRANSMISSION_COMPLETE
                                </p>
                                <p className="text-lg mb-4 text-[#39ff14] font-bold">
                                    NODE_ID: {publishResult.typebotId}
                                </p>
                                {publishResult.typebotUrl && (
                                    <a
                                        href={publishResult.typebotUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary"
                                    >
                                        <ExternalLink className="w-5 h-5" />
                                        ACCESS_EDITOR
                                    </a>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="font-bold mb-3 flex items-center gap-2 text-red-500 uppercase tracking-widest glow">
                                    <AlertCircle className="w-6 h-6" />
                                    UPLINK_FAILED
                                </p>
                                <p className="text-red-400 font-bold">{publishResult.error}</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
