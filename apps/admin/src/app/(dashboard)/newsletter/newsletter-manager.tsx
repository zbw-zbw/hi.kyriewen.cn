'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Send, Loader2, Mail, Calendar, Users, Plus, X, Eye } from 'lucide-react';
import { useAdminLocale } from '@/components/locale-provider';

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
  const { t } = useAdminLocale();
  const [issues, setIssues] = useState<Issue[]>(initialIssues as unknown as Issue[]);
  const [showCompose, setShowCompose] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Compose form
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [pending, startTransition] = useTransition();

  const handleSend = () => {
    if (!subject.trim() || !htmlContent.trim()) {
      toast.error(t('newsletter.requiredFields'));
      return;
    }

    if (!confirm(t('newsletter.confirmSend'))) {
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
        if (!res.ok) throw new Error(data.error ?? t('common.sendFailed'));

        if (data.sent) {
          toast.success(t('newsletter.sent'));
        } else {
          toast.warning(t('newsletter.savedAsDraft'));
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
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('newsletter.pageTitle')}</h2>
        <p className="text-muted-foreground">{t('newsletter.pageDesc')}</p>
      </div>

      {/* Compose toggle */}
      <button
        type="button"
        onClick={() => setShowCompose((v) => !v)}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
      >
        {showCompose ? (
          <>
            <X className="h-4 w-4" /> {t('common.cancel')}
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" /> {t('newsletter.compose')}
          </>
        )}
      </button>

      {/* Compose form */}
      {showCompose && (
        <div className="bg-card space-y-4 rounded-lg border p-6">
          <h3 className="text-lg font-semibold">{t('newsletter.newTitle')}</h3>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('newsletter.fieldSubject')}</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('newsletter.subjectPlaceholder')}
              className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('newsletter.fieldPreviewText')}</label>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder={t('newsletter.previewPlaceholder')}
              className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('newsletter.fieldHtmlContent')}</label>
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder={t('newsletter.htmlPlaceholder')}
              rows={12}
              className="bg-background w-full rounded-md border px-3 py-2 font-mono text-sm"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSend}
              disabled={pending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {pending ? t('newsletter.sending') : t('newsletter.sendAll')}
            </button>

            {htmlContent && (
              <button
                type="button"
                onClick={() => setPreviewHtml(htmlContent)}
                className="hover:bg-accent inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
              >
                <Eye className="h-4 w-4" /> {t('newsletter.preview')}
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
              className="absolute top-4 right-4 rounded-md p-1 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {t('newsletter.emailPreview')}
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
          {t('newsletter.sentIssues').replace('{count}', String(issues.length))}
        </h3>
        {issues.length === 0 ? (
          <div className="bg-card rounded-lg border p-8 text-center">
            <Mail className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
            <p className="text-muted-foreground text-sm">{t('newsletter.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="bg-card flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{issue.subject}</h4>
                  {issue.previewText && (
                    <p className="text-muted-foreground mt-0.5 text-xs">{issue.previewText}</p>
                  )}
                </div>
                <div className="text-muted-foreground flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {issue.recipientCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {issue.sentAt
                      ? new Date(issue.sentAt).toLocaleDateString()
                      : t('newsletter.draft')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewHtml(issue.htmlContent)}
                    className="hover:text-foreground flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" /> {t('newsletter.view')}
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
