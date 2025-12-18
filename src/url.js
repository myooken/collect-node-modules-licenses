// package.jsonのrepositoryからURLを取り出す
export function getRepositoryUrl(pkg) {
  const repo = pkg?.repository;
  if (!repo) return null;
  if (typeof repo === "string") return repo;
  if (typeof repo === "object" && typeof repo.url === "string") return repo.url;
  return null;
}
