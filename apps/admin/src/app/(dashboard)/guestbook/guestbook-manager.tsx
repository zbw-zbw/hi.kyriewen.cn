'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Trash2, Loader2, MessageSquare, Filter } from 'lucide-react';

interface Message {
  id: number;
  userId: string;
  name: string;
  avatar: string | null;
  body: string;
  parentId: number | null;
  postSlug: string | null;
  createdAt: string;
}

type FilterType = 'all' | 'guestbook' | 'blog';

export default function GuestbookManager({
  initialMessages,
  initialTotal,
}: {
  initialMessages: Message[];
  initialTotal: number;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [total, setTotal] = useState(initialTotal);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [loading, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchMessages = (type: FilterType, p: number) => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/guestbook?type=${type}&page=${p}&limit=50`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMessages(data.data);
        setTotal(data.pagination.total);
      } catch (err) {
        toast.error(String(err));
      }
    });
  };

  const handleFilter = (type: FilterType) => {
    setFilter(type);
    setPage(1);
    fetchMessages(type, 1);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this message and all its replies?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/guestbook/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => prev.filter((m) => m.id !== id && m.parentId !== id));
      setTotal((prev) => prev - 1);
      toast.success('Message deleted');
    } catch (err) {
      toast.error(String(err));
    } finally {
      setDeletingId(null);
    }
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchMessages(filter, p);
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(['all', 'guestbook', 'blog'] as FilterType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => handleFilter(type)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === type
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {type === 'all' ? 'All' : type === 'guestbook' ? 'Guestbook' : 'Blog Comments'}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {total} messages
        </span>
      </div>

      {/* Messages list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No messages found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 rounded-lg border bg-card p-4 ${
                msg.parentId ? 'ml-8 border-dashed' : ''
              }`}
            >
              {/* Avatar */}
              {msg.avatar ? (
                <img
                  src={msg.avatar}
                  alt={msg.name}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {msg.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{msg.name}</span>
                  {msg.postSlug && (
                    <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-500">
                      {msg.postSlug}
                    </span>
                  )}
                  {msg.parentId && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      reply
                    </span>
                  )}
                  <time className="ml-auto text-xs text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleString()}
                  </time>
                </div>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {msg.body}
                </p>
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={() => handleDelete(msg.id)}
                disabled={deletingId === msg.id}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                {deletingId === msg.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-md border px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-md border px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
