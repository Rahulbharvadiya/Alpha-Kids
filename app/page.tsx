"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatView from "@/components/ChatView";
import ThemeToggle from "@/components/ThemeToggle";
import { useConversations } from "@/hooks/useConversations";
import Logo from "@/components/Logo";
import { PanelLeft } from "lucide-react";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const {
    conversations,
    activeId,
    activeConversation,
    loading,
    error,
    mounted,
    startNew,
    select,
    togglePin,
    remove,
    send,
    retryLast,
  } = useConversations();

  if (!mounted) {
    // Avoid hydration mismatch while reading localStorage
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-bg text-muted">
        <div className="flex items-center gap-3">
          <Logo className="h-6 w-6 animate-pulse" size={24} />
          <span className="text-sm font-heading">Loading Alpha Kids Coach...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={select}
        onNewChat={startNew}
        onTogglePin={togglePin}
        onDelete={remove}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-border/60 bg-surface/50 px-4 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:bg-surface-2 hover:text-text transition-colors cursor-pointer"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-base md:text-lg text-text">
                {activeConversation?.title || "Alpha Kids Coach"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Chat Conversation View */}
        <ChatView
          conversation={activeConversation}
          loading={loading}
          error={error}
          onSend={send}
          onRetry={retryLast}
        />
      </main>
    </div>
  );
}
