import { BlogEditor } from '@/components/blog-editor';

export default function NewBlogPostPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Post</h2>
        <p className="text-muted-foreground">
          Create a new blog post with MDX content.
        </p>
      </div>
      <BlogEditor />
    </div>
  );
}
