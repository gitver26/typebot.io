'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Copy, CheckCheck, Sparkles, MessageCircle, Rocket, ExternalLink, CheckCircle, ArrowRight } from 'lucide-react';
import { parseTypebotJSON, type TypebotJSON } from '@/lib/jsonValidation';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [createdBot, setCreatedBot] = useState<{
        typebotId: string;
        typebotUrl: string;
    } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/straico/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage.content }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Failed to get response');
                setIsLoading(false);
                return;
            }

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.reply,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinue = () => {
        inputRef.current?.focus();
    };

    const handleCreateBot = async () => {
        setIsCreating(true);
        setError(null);

        const generateMessage = {
            role: 'user' as const,
            content: 'Build now. Output only the strict JSON object following the Typebot schema. Do not include any explanations, markdown fences, or extra text - just the raw JSON.',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, generateMessage]);

        try {
            const chatResponse = await fetch('/api/straico/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: generateMessage.content }),
            });

            const chatData = await chatResponse.json();

            if (!chatData.success) {
                setError(chatData.error || 'Failed to generate bot schema');
                setIsCreating(false);
                return;
            }

            const aiMessage: Message = {
                role: 'assistant',
                content: chatData.reply,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiMessage]);

            const result = parseTypebotJSON(chatData.reply);
            if (!result.valid || !result.data) {
                setError('Failed to generate valid schema: ' + (result.errors?.[0] || 'Unknown error'));
                setIsCreating(false);
                return;
            }

            const publishResponse = await fetch('/api/typebot/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result.data),
            });

            const publishData = await publishResponse.json();

            if (publishData.success && publishData.typebotId && publishData.typebotUrl) {
                setCreatedBot({
                    typebotId: publishData.typebotId,
                    typebotUrl: publishData.typebotUrl,
                });
            } else {
                setError('Failed to create bot: ' + (publishData.error || 'Unknown error'));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const copyToClipboard = async (text: string, index: number) => {
        await navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const hasMessages = messages.length > 0;
    const lastMessageIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    {/* No branding */}
                </div>
            </header>

            {/* Success Toast */}
            {createdBot && (
                <div className="fixed top-20 right-6 z-50 success-toast p-5 max-w-sm animate-fade-in">
                    <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900">Bot created successfully!</p>
                            <p className="text-sm text-slate-500 mt-1 truncate">ID: {createdBot.typebotId}</p>
                            <a
                                href={createdBot.typebotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0084d1] mt-3 bg-[#0084d1]/10 px-3 py-1.5 rounded-lg hover:bg-[#0084d1]/20 transition-colors"
                            >
                                Open in Editor <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                        <button onClick={() => setCreatedBot(null)} className="text-slate-400 hover:text-slate-600 p-1">&times;</button>
                    </div>
                </div>
            )}

            {/* Main */}
            <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-12 md:px-32 lg:px-48 py-16 md:py-24">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-8 mb-12">
                    {!hasMessages && (
                        <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
                            <div className="w-20 h-20 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-12 shadow-sm">
                                <MessageCircle className="w-10 h-10 text-[#0084d1]" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">What would you like to build?</h2>
                            <p className="text-slate-500 max-w-sm">Describe your chatbot's goal and I'll generate the Typebot flow for you.</p>
                        </div>
                    )}

                    {messages.map((message, index) => (
                        <div key={index} className={`flex flex-col animate-fade-in ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`${message.role === 'user' ? 'message-user' : 'message-assistant'} max-w-[90%] md:max-w-[80%] px-5 py-3.5 text-[15px]`}>
                                <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                            </div>
                            <div className={`flex items-center gap-2 mt-2 px-1 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <span className="text-xs text-[#71717a]">
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {message.role === 'assistant' && (
                                    <button onClick={() => copyToClipboard(message.content, index)} className="text-[#71717a] hover:text-[#a1a1aa] transition-colors">
                                        {copiedIndex === index ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex items-center gap-3 px-5 py-3 card w-fit animate-fade-in">
                            <Loader2 className="w-4 h-4 animate-spin text-[#a855f7]" />
                            <span className="text-sm text-[#a1a1aa]">Thinking...</span>
                        </div>
                    )}

                    {isCreating && (
                        <div className="flex items-center gap-3 px-5 py-3 card w-fit animate-fade-in" style={{ borderColor: 'rgba(168, 85, 247, 0.3)' }}>
                            <Rocket className="w-4 h-4 text-[#a855f7] animate-pulse" />
                            <span className="text-sm text-[#a855f7]">Creating your bot...</span>
                        </div>
                    )}

                    {error && (
                        <div className="error-toast px-5 py-3 animate-fade-in">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area with Maximum Spacing */}
                <div className="space-y-12 mb-32 px-12 md:px-16">
                    <div className="card p-8 shadow-2xl shadow-blue-500/10 focus-within:shadow-blue-500/20 transition-all border-slate-200 focus-within:border-[#0084d1] bg-white">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g. A real estate bot that captures leads..."
                            className="w-full bg-transparent border-none text-[16px] p-4 resize-none focus:outline-none placeholder:text-slate-400"
                            rows={messages.length > 0 ? 2 : 3}
                            disabled={isLoading || isCreating}
                        />
                        <div className="flex items-center justify-between px-2 pb-2">
                            <span className="text-xs text-[#71717a]">Press Enter to send</span>
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading || isCreating}
                                className="btn-primary flex items-center gap-2 py-2 px-4"
                            >
                                <Send className="w-4 h-4" />
                                Send
                            </button>
                        </div>
                    </div>

                    {lastMessageIsAssistant && !isLoading && !isCreating && (
                        <div className="flex gap-3 justify-end">
                            <button onClick={handleContinue} className="btn-secondary flex items-center gap-2">
                                <MessageCircle className="w-4 h-4" />
                                Continue
                            </button>
                            <button onClick={handleCreateBot} className="btn-primary flex items-center gap-2">
                                <Rocket className="w-4 h-4" />
                                Create Bot
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="py-8 text-center text-slate-400 text-sm">
                Build by Terence
            </footer>
        </div>
    );
}
