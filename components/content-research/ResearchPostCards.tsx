import type { ContentResearchPost } from "@/lib/content-research-types";
import { ResearchCoverThumb } from "@/components/content-research/ResearchCoverThumb";

function formatCount(n: number | undefined): string | undefined {
  if (n == null) return undefined;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

type ResearchPostCardsProps = {
  posts: ContentResearchPost[];
  labels: {
    postsTitle: string;
    likes: string;
    collects: string;
    comments: string;
    openNote: string;
    noCover: string;
  };
};

export function ResearchPostCards({ posts, labels }: ResearchPostCardsProps) {
  if (!posts.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-800">
        {labels.postsTitle} ({posts.length})
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {posts.map((post) => {
          const likes = formatCount(post.likes);
          const collects = formatCount(post.collects);
          const comments = formatCount(post.comments);

          return (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-2.5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition hover:border-emerald-300 hover:shadow"
            >
              <ResearchCoverThumb
                platform={post.platform}
                coverImageUrl={post.coverImageUrl}
                imageUrls={post.imageUrls}
                noCoverLabel={labels.noCover}
                className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100"
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-semibold text-slate-900 group-hover:text-emerald-800">
                  {post.title}
                </p>
                {post.author && (
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">@{post.author}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-600">
                  {collects != null && (
                    <span>
                      {labels.collects} {collects}
                    </span>
                  )}
                  {likes != null && (
                    <span>
                      {labels.likes} {likes}
                    </span>
                  )}
                  {comments != null && (
                    <span>
                      {labels.comments} {comments}
                    </span>
                  )}
                </div>
                {post.snippet && (
                  <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-500">
                    {post.snippet}
                  </p>
                )}
                <span className="mt-1 inline-block text-[10px] font-medium text-sky-700 underline">
                  {labels.openNote}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
