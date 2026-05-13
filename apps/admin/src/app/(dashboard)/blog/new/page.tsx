'use client';

import { BlogEditor } from '@/components/blog-editor';
import { useAdminLocale } from '@/components/locale-provider';

export default function NewBlogPostPage() {
  const { t } = useAdminLocale();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('blogEditor.newPostTitle')}</h2>
        <p className="text-muted-foreground">{t('blogEditor.newPostDesc')}</p>
      </div>
      <BlogEditor />
    </div>
  );
}
