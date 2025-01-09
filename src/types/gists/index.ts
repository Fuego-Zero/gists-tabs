export type Gists = Array<{
  comments: number;
  comments_enabled: boolean;
  comments_url: string;
  commits_url: string;
  created_at: string;
  description: string;
  files: Record<string, Files>;
  forks_url: string;
  git_pull_url: string;
  git_push_url: string;
  html_url: string;
  id: string;
  node_id: string;
  owner: Owner;
  public: boolean;
  truncated: boolean;
  updated_at: string;
  url: string;
  user: null;
}>;

type Owner = {
  avatar_url: string;
  events_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  gravatar_id: string;
  html_url: string;
  id: number;
  login: string;
  node_id: string;
  organizations_url: string;
  received_events_url: string;
  repos_url: string;
  site_admin: boolean;
  starred_url: string;
  subscriptions_url: string;
  type: string;
  url: string;
  user_view_type: string;
};

type Files = {
  content: string;
  encoding: string;
  filename: string;
  language: string;
  raw_url: string;
  size: number;
  truncated: boolean;
  type: string;
};
