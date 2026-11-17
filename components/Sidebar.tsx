"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Pin,
  PinOff,
  Trash2,
  MoreHorizontal,
  PanelLeftClose,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import type { Conversation } from "@/lib/types";
import { groupConversations } from "@/lib/conversations";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onTogglePin,
  onDelete,
  isOpen,
  onClose,
}: SidebarProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click or Escape
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        if (confirmDeleteId) {
          setConfirmDeleteId(null);
        } else if (menuOpenId) {
          setMenuOpenId(null);
        } else if (isOpen) {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmDeleteId, menuOpenId, isOpen, onClose]);

  const groups = groupConversations(conversations);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          role="presentation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        ref={sidebarRef}
        aria-label="Conversation history"
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-border bg-surface transition-transform duration-300 md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        }`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-[var(--on-accent)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-heading font-semibold text-lg tracking-tight text-text">
              Alpha Kids
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text transition-colors md:flex"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-button font-medium text-[var(--on-primary)] shadow-xs transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New chat</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
          {groups.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Your chats will appear here.
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="px-2.5 py-1 text-[11px] font-heading font-semibold uppercase tracking-wider text-muted">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const isActive = item.id === activeId;
                  const isMenuOpen = menuOpenId === item.id;
                  const isConfirming = confirmDeleteId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="group relative flex items-center rounded-lg transition-colors"
                    >
                      {/* Active / Item Button */}
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(item.id);
                          if (window.innerWidth < 768) onClose();
                        }}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                          isActive
                            ? "bg-surface-2 font-medium text-text"
                            : "text-text hover:bg-surface-2/60"
                        } pr-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
                      >
                        {item.pinned && (
                          <Pin className="h-3.5 w-3.5 shrink-0 text-accent fill-accent/20" />
                        )}
                        <span className="truncate">{item.title}</span>
                      </button>

                      {/* Options Button */}
                      <div className="absolute right-1.5 flex items-center">
                        <button
                          type="button"
                          aria-label="Chat options"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(isMenuOpen ? null : item.id);
                            setConfirmDeleteId(null);
                          }}
                          className={`flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-text transition-opacity cursor-pointer ${
                            isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                          }`}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Menu Popup */}
                      {isMenuOpen && (
                        <div
                          className="absolute right-2 top-8 z-50 w-44 rounded-xl border border-border bg-surface p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-100 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isConfirming ? (
                            <div className="p-1 space-y-2">
                              <p className="text-[11px] font-medium text-text">
                                Delete this chat?
                              </p>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDelete(item.id);
                                    setMenuOpenId(null);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="flex-1 rounded-md bg-[var(--danger-text)] px-2 py-1 text-center font-medium text-white hover:opacity-90"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="flex-1 rounded-md border border-border px-2 py-1 text-center font-medium text-text hover:bg-surface-2"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  onTogglePin(item.id);
                                  setMenuOpenId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-text hover:bg-surface-2 cursor-pointer"
                              >
                                {item.pinned ? (
                                  <>
                                    <PinOff className="h-3.5 w-3.5" />
                                    <span>Unpin chat</span>
                                  </>
                                ) : (
                                  <>
                                    <Pin className="h-3.5 w-3.5" />
                                    <span>Pin chat</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(item.id)}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[var(--danger-text)] hover:bg-[var(--danger-bg)] cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete chat</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
