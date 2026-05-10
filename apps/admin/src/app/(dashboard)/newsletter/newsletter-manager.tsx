'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Send,
  Loader2,
  Mail,
  Calendar,
  Users,
  Plus,
  X,
  Eye,
} from 'lucide-react';

interface Issue {
  id: number;
  subject: string;
  previewText: string | null;
  htmlContent: string;
  sentAt: string | null;
  recipientCount: number;
  resendBroadcastId: string | null;
  createdAt: string;
}

export default function NewsletterManager({
  initialIssues,
}: {
  initialIssues: Array<Record<string, unknown>>;
}) {
  const [issues, setIssues] = useState<Issue[]>(
    initialIssues as unknown as Issue[]
  );
  const [showCompose, setShowCompose] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Compose form
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [pending, startTransition] = useTransition();

  const handleSend = () => {
    if (!subject.trim() || !htmlContent.trim()) {
      toast.error('Subject and content are required');
      return;
    }

    if (!confirm('Are you sure you want to send this newsletter to ALL subscribers?')) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject,
            previewText: previewText || undefined,
            htmlContent,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Send failed');

        if (data.sent) {
          toast.success('Newsletter sent successfully!');
        } else {
          toast.warning('Saved as draft (Resend not configured)');
        }

        if (data.issue) {
          setIssues((prev) => [data.issue as Issue, ...prev]);
        }

        setShowCompose(false);
        setSubject('');
        setPreviewText('');
        setHtmlContent('');
      } catch (err) {
        toast.error(String(err));
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Compose toggle */}
      <button
        type="button"
        onClick={() => setShowCompose((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {showCompose ? (
          <>
            <X className="h-4 w-4" /> Cancel
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" /> Compose Newsletter
          </>
        )}
      </button>

      {/* Compose form */}
      {showCompose && (
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold">New Newsletter</h3>

          <div className="space-y-2">
            <label className="text-sm font-medium">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Issue #04 — What I shipped this month"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Preview Text{' '}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Short preview shown in email clients"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">HTML Content *</label>
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="Paste your HTML email content here..."
              rows={12}
              className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSend}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {pending ? 'Sending...' : 'Send to All Subscribers'}
            </button>

            {htmlContent && (
              <button
                type="button"
                onClick={() => setPreviewHtml(htmlContent)}
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Eye className="h-4 w-4" /> Preview
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-6">
            <button
              type="button"
              onClick={() => setPreviewHtml(null)}
              className="absolute right-4 top-4 rounded-md p-1 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Email Preview
            </h3>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      )}

      {/* Issues list */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">
          Sent Issues ({issues.length})
        </h3>
        {issues.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <Mail className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No newsletters sent yet. Compose your first one above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4"
              >
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{issue.subject}</h4>
                  {issue.previewText && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {issue.previewText}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {issue.recipientCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {issue.sentAt
                      ? new Date(issue.sentAt).toLocaleDateString()
                      : 'Draft'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewHtml(issue.htmlContent)}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    <Eye className="h-3 w-3" /> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
