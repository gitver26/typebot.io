"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/flow-builder?prompt=${encodeURIComponent(query)}`);
  };

  const suggestions = [
    "Customer support bot",
    "Lead generation flow",
    "FAQ assistant",
    "Appointment booking",
    "Product recommendations",
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Visual Overlays */}
      <div className="retro-grid" />
      <div className="crt-overlay" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b-2 border-[#00f3ff] bg-[#0d0221]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-widest text-[#00f3ff] glow">FLOW OS CORE v2.1</h2>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-12 md:px-32 py-16 z-10 relative">
        <div className="w-full max-w-4xl flex flex-col items-center">

          <div className="text-center w-full mb-16">
            <h1 className="text-6xl md:text-9xl font-bold text-[#00f3ff] tracking-widest mb-4">
              NEURAL FLOW
            </h1>
            <p className="text-2xl md:text-4xl text-[#ff00ff] text-magenta tracking-widest uppercase mb-8">
              Synthesize. Orchestrate. Automate.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-16">
            <div className="card">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="DEFINE NEURAL SEQUENCE..."
                className="w-full min-h-[160px]"
              />
              <div className="flex items-center justify-between mt-6">
                <span className="text-xl text-[#39ff14] text-terminal hidden md:block">
                  LINK ESTABLISHED_
                </span>
                <button
                  type="submit"
                  disabled={!query.trim()}
                  className="btn-primary"
                >
                  CONSTRUCT
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </form>

          <div className="w-full flex flex-wrap items-center justify-center gap-6 mt-6 pb-24">
            <span className="text-xl text-[#00f3ff] w-full text-center mb-4 uppercase tracking-widest">Neural Templates_</span>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setQuery(suggestion)}
                className="chip"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-[#ff00ff] text-xl tracking-widest uppercase">
        [ DEVELOPED BY TERENCE ]
      </footer>
    </div>
  );
}
