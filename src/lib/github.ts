const GITHUB_API = 'https://api.github.com';

interface GitHubRepoResponse {
  stargazers_count: number;
  subscribers_count: number;
  forks_count: number;
  pushed_at: string;
}

export interface GitHubRepoStats {
  stars: number;
  watchers: number;
  forks: number;
  updatedAt: string;
}

function parseRepoUrl(repoUrl: string) {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) return null;
  return { owner: match[1]!, repo: match[2]!.replace(/\.git$/, '') };
}

export async function fetchRepoStats(
  repoUrl: string
): Promise<GitHubRepoStats | null> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) return null;

  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}`,
      {
        headers,
        next: { revalidate: 60 * 60 * 4 }, // 4h cache
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as GitHubRepoResponse;
    return {
      stars: data.stargazers_count,
      watchers: data.subscribers_count,
      forks: data.forks_count,
      updatedAt: data.pushed_at,
    };
  } catch {
    return null;
  }
}

export interface GitHubUserStats {
  followers: number;
  publicRepos: number;
  totalStars: number;
}

export async function fetchUserStats(
  username: string
): Promise<GitHubUserStats | null> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`${GITHUB_API}/users/${username}`, {
        headers,
        next: { revalidate: 60 * 60 },
      }),
      fetch(`${GITHUB_API}/users/${username}/repos?per_page=100&type=owner`, {
        headers,
        next: { revalidate: 60 * 60 },
      }),
    ]);
    if (!userRes.ok || !reposRes.ok) return null;

    const user = (await userRes.json()) as {
      followers: number;
      public_repos: number;
    };
    const repos = (await reposRes.json()) as Array<{
      stargazers_count: number;
      fork: boolean;
    }>;
    const totalStars = repos
      .filter((r) => !r.fork)
      .reduce((sum, r) => sum + r.stargazers_count, 0);

    return {
      followers: user.followers,
      publicRepos: user.public_repos,
      totalStars,
    };
  } catch {
    return null;
  }
}
