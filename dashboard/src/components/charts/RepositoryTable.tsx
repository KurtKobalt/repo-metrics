import type { NamedMetrics, RepoData } from '../../types/metrics'
import { formatCompact, formatNumber } from '../../utils/formatters'
import { ChartContainer } from '../shared/ChartContainer'

export function RepositoryTable({ data, repos }: { data: NamedMetrics[]; repos: Record<string, RepoData> }) {
  const maxCommits = Math.max(1, ...data.map(repo => repo.commits))
  return (
    <ChartContainer
      eyebrow="REPOSITORIES"
      title="Where the work landed"
      description="All configured products stay one canonical repository across old and current owners."
      isEmpty={data.length === 0}
      className="repository-panel"
    >
      <div className="table-scroll">
        <table className="metrics-table">
          <thead>
            <tr>
              <th>Repository</th>
              <th>Commits</th>
              <th>Added</th>
              <th>Updated*</th>
              <th>Deleted</th>
              <th>Files</th>
            </tr>
          </thead>
          <tbody>
            {data.map(repo => (
              <tr key={repo.id}>
                <td>
                  <div className="repo-name-row">
                    <span className="repo-initial">{repo.name.slice(0, 2).toUpperCase()}</span>
                    <span>
                      <strong>{repo.name}</strong>
                      <small>{repos[repo.id]?.github.owner ? `${repos[repo.id].github.owner}/${repos[repo.id].github.name}` : repo.id}</small>
                    </span>
                  </div>
                  <div className="repo-progress"><i style={{ width: `${(repo.commits / maxCommits) * 100}%` }} /></div>
                </td>
                <td className="primary-number">{formatNumber(repo.commits)}</td>
                <td className="added-number">+{formatCompact(repo.lines_added)}</td>
                <td className="updated-number">~{formatCompact(repo.updated_lines)}</td>
                <td className="deleted-number">−{formatCompact(repo.lines_deleted)}</td>
                <td>{formatCompact(repo.files_changed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartContainer>
  )
}
