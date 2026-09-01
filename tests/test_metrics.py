import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("metrics", ROOT / "scripts" / "metrics.py")
metrics = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(metrics)
CONFIG = json.loads((ROOT / "config" / "metrics.json").read_text())


class MetricsTests(unittest.TestCase):
    def test_github_workflow_is_manual_only(self):
        workflow = (ROOT / ".github" / "workflows" / "metrics.yml").read_text(encoding="utf-8")
        self.assertIn("workflow_dispatch:", workflow)
        self.assertNotIn("schedule:", workflow)

    def test_all_configured_repositories_are_unique(self):
        repository_ids = [repository["id"] for repository in CONFIG["repositories"]]
        self.assertEqual(14, len(repository_ids))
        self.assertEqual(14, len(set(repository_ids)))
        self.assertTrue({"ov-submitter", "ov-website2", "claude-plugins", "immi-scrapper", "ov-agents"}.issubset(repository_ids))

    def test_beto_aliases_normalize_to_one_person(self):
        for name, email in (("Alberto", "alberto@example.test"), ("Alberto Alcaraz", "beto@example.test"),
                            ("KurtKobalt", "kurt-kobalt@example.test"),
                            ("Alberto (aider)", "unknown@example.test")):
            self.assertEqual("beto", metrics.normalize_identity(name, email, CONFIG)["id"])

    def test_bots_are_grouped_as_automation(self):
        person = metrics.normalize_identity("github-actions[bot]", "41898282+github-actions[bot]@users.noreply.github.com", CONFIG)
        self.assertEqual({"id": "automation", "name": "Automation", "login": "automation", "avatar_url": "", "kind": "automation"}, person)

    def test_classifies_conventional_subjects(self):
        self.assertEqual("feature", metrics.classify_subject("feat(ui): add filters"))
        self.assertEqual("fix", metrics.classify_subject("fix!: resolve race"))
        self.assertEqual("refactor", metrics.classify_subject("refactor: simplify"))
        self.assertEqual("other", metrics.classify_subject("Ship it"))

    def test_line_metrics_separates_estimated_updates(self):
        self.assertEqual({"additions": 8, "deletions": 3, "updated_lines": 3, "lines_added": 5,
                          "lines_deleted": 0, "changed_lines": 11}, metrics.line_metrics(8, 3))

    def test_public_commit_record_is_private_safe_and_preserves_local_time(self):
        commit = {
            "sha": "abc123",
            "timestamp": "2026-01-02T23:15:00+08:00",
            "author_name": "Alberto",
            "author_email": "alberto@example.test",
            "parents": ["parent-a", "parent-b"],
            "subject": "fix(api): retain offset",
            "additions": 8,
            "deletions": 3,
            "files_changed": 2,
            "local_only": True,
        }

        record = metrics.public_commit_record(commit, "ov-admin", CONFIG)

        self.assertEqual("abc123", record["sha"])
        self.assertEqual("2026-01-02T23:15:00+08:00", record["timestamp"])
        self.assertEqual("2026-01-02", record["date"])
        self.assertEqual(23, record["hour"])
        self.assertEqual("ov-admin", record["repo"])
        self.assertEqual("beto", record["person"])
        self.assertEqual("fix", record["type"])
        self.assertTrue(record["merge"])
        self.assertEqual(
            {"additions": 8, "deletions": 3, "updated_lines": 3, "lines_added": 5,
             "lines_deleted": 0, "changed_lines": 11, "files_changed": 2},
            {key: record[key] for key in ("additions", "deletions", "updated_lines", "lines_added",
                                           "lines_deleted", "changed_lines", "files_changed")},
        )
        self.assertNotIn("author_name", record)
        self.assertNotIn("author_email", record)
        self.assertNotIn("local_only", record)
        self.assertNotIn("local-only", record)

    def test_parse_and_aggregate_local_and_merge_commits(self):
        log = (
            "\x1eaaa\x1f2026-01-02T10:00:00+00:00\x1fAlberto\x1falberto@example.test\x1fparent\x1ffeat: one\n"
            "4\t1\tsrc/a.py\n"
            "\x1ebbb\x1f2026-01-02T12:00:00+00:00\x1fgithub-actions[bot]\x1fx@users.noreply.github.com\x1fp1 p2\x1fchore: merge\n"
        )
        commits = metrics.parse_git_log(log, {"aaa"})
        self.assertEqual(2, len(commits))
        self.assertTrue(commits[0]["local_only"])
        self.assertEqual(0, commits[1]["additions"])
        rows, people, totals = metrics.aggregate_commits(commits, "ov-admin", CONFIG)
        self.assertEqual(2, totals["commits"])
        self.assertEqual(1, totals["local_commits"])
        self.assertEqual(1, totals["merge_commits"])
        self.assertEqual(1, totals["updated_lines"])
        self.assertEqual(3, totals["lines_added"])
        self.assertEqual(0, totals["lines_deleted"])
        self.assertEqual(1, totals["files_changed"])
        self.assertEqual(1, totals["commit_types"]["feature"])
        self.assertEqual(1, totals["commit_types"]["chore"])
        self.assertEqual(1, people["beto"]["local_commits"])
        self.assertEqual(2, len(rows))

    def test_unknown_human_gets_stable_filterable_slug(self):
        person = metrics.normalize_identity("Pat Example", "pat@example.test", CONFIG)
        self.assertEqual("pat-example", person["id"])
        self.assertEqual("human", person["kind"])

    def test_language_classification_ignores_lockfiles(self):
        self.assertEqual("TypeScript", metrics.language_for_path(Path("src/App.tsx")))
        self.assertEqual("Dockerfile", metrics.language_for_path(Path("Dockerfile")))
        self.assertIsNone(metrics.language_for_path(Path("package-lock.json")))

    def test_collects_repository_without_a_remote(self):
        with tempfile.TemporaryDirectory() as directory:
            repository = Path(directory) / "local-repository"
            subprocess.run(["git", "init", "-b", "main", str(repository)], check=True, capture_output=True)
            (repository / "README.md").write_text("local history\n", encoding="utf-8")
            subprocess.run(["git", "-C", str(repository), "add", "README.md"], check=True, capture_output=True)
            subprocess.run(
                ["git", "-C", str(repository), "-c", "user.name=Test User", "-c", "user.email=test@example.test", "commit", "-m", "docs: start"],
                check=True,
                capture_output=True,
            )

            default_ref, commits = metrics.collect_repo_commits(repository)

            self.assertEqual("main", default_ref)
            self.assertEqual(1, len(commits))
            self.assertTrue(commits[0]["local_only"])


if __name__ == "__main__":
    unittest.main()
