"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Copy, CheckCheck, MessageCircle, Rocket, ExternalLink, CheckCircle } from 'lucide-react';
import { parseTypebotJSON } from '@/lib/jsonValidation';

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
        <div className="min-h-screen flex flex-col relative">
            {/* Header */}
            <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b-2 border-[#00f3ff] bg-[#0d0221]/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold tracking-widest text-[#00f3ff] glow">FLOW OS CORE v2.1</h2>
                </div>
            </header>

            {/* Success Toast */}
            {createdBot && (
                <div className="fixed top-8 right-8 z-50 bg-[#0d0221] border-2 border-[#00f3ff] p-8 max-w-sm shadow-[0_0_20px_#00f3ff] animate-fade-in group hover:shadow-[0_0_40px_#00f3ff] transition-all">
                    <div className="flex items-start gap-5">
                        <div className="bg-[#0d0221] p-2 border-2 border-[#00f3ff]">
                            <CheckCircle className="w-8 h-8 text-[#00f3ff] flex-shrink-0" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#00f3ff] uppercase tracking-tighter text-2xl italic leading-none mb-1 glow">Success!</p>
                            <p className="font-bold text-[#ff00ff] uppercase tracking-widest text-sm mb-4 text-magenta">Bot is Live</p>
                            <div className="bg-black/50 p-3 border border-[#39ff14] mb-6">
                                <p className="text-[10px] text-[#39ff14] font-bold uppercase tracking-[0.2em] mb-1 opacity-70">Typebot ID</p>
                                <p className="text-xs text-[#39ff14] font-bold truncate">{createdBot?.typebotId}</p>
                            </div>
                            <a
                                href={createdBot?.typebotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary w-full"
                            >
                                Open Editor <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                        <button
                            onClick={() => setCreatedBot(null)}
                            className="text-[#00f3ff] hover:text-[#ff00ff] font-bold text-xl transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Main */}
            <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-12 md:px-32 lg:px-48 py-16 md:py-32">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-12 mb-20">
                    {!hasMessages && (
                        <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
                            <div className="w-24 h-24 bg-[#0d0221] border-2 border-[#00f3ff] shadow-[0_0_15px_#00f3ff] flex items-center justify-center mb-12">
                                <MessageCircle className="w-12 h-12 text-[#00f3ff]" />
                            </div>
                            <h2 className="text-4xl font-bold text-[#00f3ff] mb-6 uppercase italic tracking-widest glow">ORCHESTRATION START</h2>
                            <p className="text-[#39ff14] text-terminal max-w-sm font-bold text-lg uppercase tracking-widest">Awaiting system objective instructions...</p>
                        </div>
                    )}

                    {messages.map((message, index) => (
                        <div key={index} className={`flex flex-col animate-fade-in ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[90%] md:max-w-[75%] px-6 py-4 border-2 ${message.role === 'user'
                                ? 'bg-black/80 text-[#ff00ff] border-[#ff00ff] shadow-[0_0_15px_#ff00ff]'
                                : 'card'
                                }`}>
                                <p className={`leading-relaxed whitespace-pre-wrap font-bold text-xl ${message.role === 'user' ? 'text-magenta' : ''}`}>{message.content}</p>
                            </div>
                            <div className={`flex items-center gap-3 mt-3 px-1 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <span className={`text-sm font-bold uppercase tracking-widest ${message.role === 'user' ? 'text-magenta' : 'text-[#00f3ff]'}`}>
                                    [{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]
                                </span>
                                {message.role === 'assistant' && (
                                    <button onClick={() => copyToClipboard(message.content, index)} className="text-[#00f3ff] hover:text-[#ff00ff] transition-all">
                                        {copiedIndex === index ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex items-center gap-4 px-6 py-4 border-2 border-[#39ff14] shadow-[0_0_15px_#39ff14] bg-black/80 w-fit animate-fade-in">
                            <Loader2 className="w-5 h-5 animate-spin text-[#39ff14]" />
                            <span className="font-bold uppercase tracking-widest text-[#39ff14] glow">Processing Neural Query...</span>
                        </div>
                    )}

                    {isCreating && (
                        <div className="flex items-center gap-4 px-6 py-4 border-2 border-[#ff00ff] shadow-[0_0_15px_#ff00ff] bg-black/80 w-fit animate-fade-in">
                            <Rocket className="w-5 h-5 animate-pulse text-[#ff00ff]" />
                            <span className="font-bold uppercase tracking-widest text-[#ff00ff] glow">Initializing Bot Genesis...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/20 border-2 border-red-500 p-6 shadow-[0_0_20px_red] animate-fade-in">
                            <p className="font-bold uppercase text-red-500 tracking-widest glow">SYSTEM ERROR: {error}</p>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area with Maximum Spacing */}
                <div className="space-y-12 mb-48 px-4 md:px-0">
                    <div className="card !p-6 shadow-[0_0_30px_rgba(0,243,255,0.2)]">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="INPUT COMMAND..."
                            className="w-full"
                            rows={messages.length > 0 ? 2 : 3}
                            disabled={isLoading || isCreating}
                        />
                        <div className="flex items-center justify-between mt-6">
                            <span className="text-sm font-bold uppercase tracking-[0.3em] text-[#39ff14] glow">Awaiting Input_</span>
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isLoading || isCreating}
                                className="btn-primary"
                            >
                                <Send className="w-5 h-5" />
                                EXECUTE
                            </button>
                        </div>
                    </div>

                    {lastMessageIsAssistant && !isLoading && !isCreating && (
                        <div className="flex gap-6 justify-end">
                            <button onClick={handleCreateBot} className="btn-primary btn-magenta !px-12">
                                <Rocket className="w-6 h-6" />
                                GENERATE TYPEBOT SEQUENCE
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="py-8 text-center text-[#ff00ff] text-xl tracking-widest uppercase glow">
                [ NEURAL SYSTEM BY TERENCE ]
            </footer>
        </div>
    );
}
