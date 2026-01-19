"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/flow-builder?prompt=${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 dark:bg-zinc-950">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Typebot
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400">
            What would you like to build today?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="group relative w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe your chatbot..."
              className="h-12 w-full rounded-full border border-zinc-200 bg-white px-5 pr-12 text-base text-zinc-900 shadow-sm outline-none transition-shadow placeholder:text-zinc-400 hover:shadow-md focus:border-zinc-300 focus:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-zinc-600"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path
                  fillRule="evenodd"
                  d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {["Customer support bot", "Lead generation", "FAQ assistant", "Booking system"].map(
            (suggestion) => (
              <button
                key={suggestion}
                onClick={() => setQuery(suggestion)}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
              >
                {suggestion}
              </button>
            )
          )}
        </div>
      </main>
    </div>
  );
}
