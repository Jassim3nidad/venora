"use client";

import { useState } from "react";
import { Sparkles, MessageSquare, X, Send, Bot } from "lucide-react";

export function AIConciergeWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    {
      sender: "bot",
      text: "Hello! I am Venora Concierge. How can I help with your event, venue selection, or guest planning today?",
    },
  ]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setInput("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `Thank you for your question about "${userMsg}". Browse our side-by-side venue comparison tool or check availability directly on any venue listing!`,
        },
      ]);
    }, 600);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-full shadow-2xl hover:scale-105 transition-all duration-200 border border-indigo-500/30"
          aria-label="Open AI Concierge assistant"
        >
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-bold tracking-wide">AI Concierge</span>
        </button>
      ) : (
        <div className="w-80 sm:w-96 h-[460px] bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="p-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold">Venora AI Concierge</p>
                <p className="text-[10px] text-emerald-400">Online • Advisory Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl leading-relaxed ${
                    m.sender === "user"
                      ? "bg-rose-600 text-white rounded-br-none"
                      : "bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-slate-800/80 border-t border-slate-700 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about venues, pricing, or packages..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleSend}
              className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
