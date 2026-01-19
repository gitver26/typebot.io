'use client';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)'
        }}>
            <div className="glass-panel max-w-4xl w-full max-h-[90vh] flex flex-col rounded-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b" style={{
                    borderColor: 'rgba(169, 188, 208, 0.2)'
                }}>
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold" style={{ color: '#E8F4FD' }}>
                            Generated JSON
                        </h2>
                        {isValid ? (
                            <div className="px-3 py-1 rounded-lg flex items-center gap-2 text-sm font-medium" style={{
                                background: 'rgba(34, 197, 94, 0.2)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                color: '#4ade80'
                            }}>
                                <CheckCircle className="w-4 h-4" />
                                Valid
                            </div>
                        ) : (
                            <div className="px-3 py-1 rounded-lg flex items-center gap-2 text-sm font-medium" style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171'
                            }}>
                                <AlertCircle className="w-4 h-4" />
                                Invalid
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="dark-button dark-button-secondary p-2"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Validation Errors */}
                {!isValid && (
                    <div className="m-6 p-4 rounded-lg" style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                        <p className="font-semibold mb-2 flex items-center gap-2 text-red-400">
                            <AlertCircle className="w-5 h-5" />
                            Validation Errors:
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1 text-red-300">
                            {validationErrors.map((error, i) => (
                                <li key={i}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* JSON Content */}
                <div className="flex-1 overflow-auto p-6">
                    <pre className="text-sm font-mono p-4 rounded-lg" style={{
                        background: 'rgba(0, 31, 63, 0.5)',
                        border: '1px solid rgba(169, 188, 208, 0.2)',
                        color: '#A9BCD0'
                    }}>
                        {formattedJSON}
                    </pre>
                </div>

                {/* Action Buttons */}
                <div className="p-6 border-t flex flex-wrap gap-3" style={{
                    borderColor: 'rgba(169, 188, 208, 0.2)'
                }}>
                    <button
                        onClick={handleCopy}
                        className="dark-button dark-button-secondary flex items-center gap-2"
                    >
                        {copied ? (
                            <>
                                <CheckCheck className="w-5 h-5" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="w-5 h-5" />
                                Copy
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleDownload}
                        className="dark-button dark-button-secondary flex items-center gap-2"
                    >
                        <Download className="w-5 h-5" />
                        Download
                    </button>

                    <button
                        onClick={handlePublish}
                        disabled={isPublishing || !isValid}
                        className="dark-button dark-button-primary flex items-center gap-2 ml-auto"
                    >
                        {isPublishing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Publishing...
                            </>
                        ) : (
                            <>
                                <Rocket className="w-5 h-5" />
                                Publish to Typebot
                            </>
                        )}
                    </button>
                </div>

                {/* Publish Result */}
                {publishResult && (
                    <div className="mx-6 mb-6 p-4 rounded-lg" style={{
                        background: publishResult.success
                            ? 'rgba(34, 197, 94, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                        border: publishResult.success
                            ? '1px solid rgba(34, 197, 94, 0.3)'
                            : '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                        {publishResult.success ? (
                            <>
                                <p className="font-bold mb-2 flex items-center gap-2" style={{ color: '#4ade80' }}>
                                    <CheckCircle className="w-5 h-5" />
                                    Successfully Published!
                                </p>
                                <p className="text-sm mb-3" style={{ color: '#A9BCD0' }}>
                                    Typebot ID: {publishResult.typebotId}
                                </p>
                                {publishResult.typebotUrl && (
                                    <a
                                        href={publishResult.typebotUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="dark-button dark-button-primary inline-flex items-center gap-2 text-sm"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Open in Typebot Editor
                                    </a>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="font-bold mb-2 flex items-center gap-2" style={{ color: '#f87171' }}>
                                    <AlertCircle className="w-5 h-5" />
                                    Publishing Failed
                                </p>
                                <p className="text-sm" style={{ color: '#fca5a5' }}>{publishResult.error}</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
