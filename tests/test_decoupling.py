"""
Test Suite: Verifies Supabase Data Decoupling Architecture
Tests client initialization, data mapping, feeder queue lifecycle, and migration parsing.
"""

import sys
import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path
from datetime import datetime, timezone

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import supabase_client
import migrate_to_supabase


class TestSupabaseDecoupling(unittest.TestCase):

    def setUp(self):
        # Reset cached client between tests
        supabase_client._client = None

    def test_configuration_check(self):
        """Test is_supabase_configured correctly inspects URL and Key."""
        with patch.object(supabase_client, "SUPABASE_URL", ""), \
             patch.object(supabase_client, "SUPABASE_KEY", ""):
            self.assertFalse(supabase_client.is_supabase_configured())

        with patch.object(supabase_client, "SUPABASE_URL", "https://xyz.supabase.co"), \
             patch.object(supabase_client, "SUPABASE_KEY", "anon-key-123"):
            self.assertTrue(supabase_client.is_supabase_configured())

    def test_fetch_repository_history(self):
        """Test fetching and mapping repositories from Supabase table."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [
            {
                "name": "owner/repo1",
                "discovered_on": "2026-11-01",
                "category_lang": "Python",
                "highest_rank_achieved": 1,
                "total_stars": "1,200",
                "url": "https://github.com/owner/repo1",
            }
        ]
        mock_client.table.return_value.select.return_value.range.return_value.execute.return_value = mock_response

        with patch.object(supabase_client, "get_supabase_client", return_value=mock_client):
            history = supabase_client.fetch_repository_history()
            self.assertIn("owner/repo1", history)
            self.assertEqual(history["owner/repo1"]["category_lang"], "Python")
            self.assertEqual(history["owner/repo1"]["highest_rank_achieved"], 1)

    def test_save_repository(self):
        """Test saving a repository record into Supabase."""
        mock_client = MagicMock()
        with patch.object(supabase_client, "get_supabase_client", return_value=mock_client):
            success = supabase_client.save_repository(
                name="test/repo",
                url="https://github.com/test/repo",
                discovered_on="2026-11-04",
                category_lang="TypeScript",
                highest_rank_achieved=3,
                total_stars="500",
                readme_content="Sample Readme",
            )
            self.assertTrue(success)
            mock_client.table.assert_called_with("repositories")
            mock_client.table().upsert.assert_called()

    def test_record_trending_snapshot(self):
        """Test recording a periodic trending snapshot."""
        mock_client = MagicMock()
        with patch.object(supabase_client, "get_supabase_client", return_value=mock_client):
            success = supabase_client.record_trending_snapshot(
                repo_name="test/repo",
                period="daily",
                period_key="2026-11-04",
                rank=1,
                stars="500",
                category_lang="Python",
                is_new=True,
            )
            self.assertTrue(success)
            mock_client.table.assert_called_with("trending_snapshots")

    def test_feeder_queue_lifecycle(self):
        """Test enqueueing and processing feeder queue items."""
        mock_client = MagicMock()
        mock_pending = MagicMock()
        mock_pending.data = [
            {
                "id": 101,
                "repo_name": "ai/tool",
                "rank": 2,
                "period": "daily",
                "readme_filename": "2_daily_tool.md",
                "readme_content": "AI Tool Readme",
            }
        ]
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = mock_pending

        with patch.object(supabase_client, "get_supabase_client", return_value=mock_client):
            # Enqueue
            enq_ok = supabase_client.enqueue_feeder("ai/tool", 2, "daily", "2_daily_tool.md", "AI Tool Readme")
            self.assertTrue(enq_ok)

            # Get pending
            pending = supabase_client.get_pending_feeder_items()
            self.assertEqual(len(pending), 1)
            self.assertEqual(pending[0]["repo_name"], "ai/tool")

            # Mark processed
            proc_ok = supabase_client.mark_feeder_processed([101], ["2_daily_tool.md"])
            self.assertTrue(proc_ok)

    def test_save_ai_summary(self):
        """Test saving AI summary to public.ai_summaries table."""
        mock_client = MagicMock()
        with patch.object(supabase_client, "get_supabase_client", return_value=mock_client):
            saved = supabase_client.save_ai_summary(
                summary_date="2026-11-04",
                content="# AI Summary\nGreat tools",
                source_files=["2_daily_tool.md"],
            )
            self.assertTrue(saved)
            mock_client.table.assert_called_with("ai_summaries")

    def test_migration_dry_run(self):
        """Test that migration parsing functions execute cleanly on existing files."""
        base_dir = Path("data")
        if base_dir.exists():
            history_count = migrate_to_supabase.migrate_history(base_dir, dry_run=True)
            self.assertGreater(history_count, 0)

            summaries_count = migrate_to_supabase.migrate_summaries(base_dir, dry_run=True)
            self.assertGreater(summaries_count, 0)

            logs_count = migrate_to_supabase.migrate_summary_logs(base_dir, dry_run=True)
            self.assertGreater(logs_count, 0)


if __name__ == "__main__":
    unittest.main()

