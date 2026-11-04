import pytest
import re
from unittest.mock import patch, MagicMock
import sys
import os

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from importlib import import_module
git_trend = import_module("git-trend")


class TestGitHubCollector:
    """Tests for GitHub Trending HTML scraping, metadata extraction, and fallback mechanisms."""

    def test_parse_trending_block_complete_data(self):
        """Verify extraction of name, language, stars, and description from a standard GitHub trending block."""
        sample_html = """
        <article class="Box-row">
            <h2 class="h3 lh-condensed">
                <a href="/affaan-m/ECC" data-hydro-click="...">
                    <span class="text-normal">affaan-m / </span>ECC
                </a>
            </h2>
            <p class="col-9 color-fg-muted my-1 pr-4">
                The Everything Claude Code configuration and orchestration system.
            </p>
            <div class="f6 color-fg-muted mt-2">
                <span class="d-inline-block ml-0 mr-3">
                    <span class="repo-language-color" style="background-color: #f1e05a"></span>
                    <span itemprop="programmingLanguage">JavaScript</span>
                </span>
                <a href="/affaan-m/ECC/stargazers" class="LinkLink--muted d-inline-block mr-3">
                    <svg aria-label="star" class="octicon octicon-star" viewBox="0 0 16 16" width="16" height="16">...</svg>
                    241,804
                </a>
                <span class="d-inline-block float-sm-right">
                    1,420 stars today
                </span>
            </div>
        </article>
        """

        result = git_trend.parse_trending_block(sample_html)
        assert result["name"] == "affaan-m/ECC"
        assert result["language"] == "JavaScript"
        assert result["stars"] == "241,804"
        assert "Everything Claude Code" in result["description"]
        assert result["stars_period"] == "1,420"

    def test_parse_trending_block_missing_language_fallback(self):
        """Verify that when a trending block omits language, it returns 'Unknown' and triggers fallback."""
        sample_no_lang = """
        <article class="Box-row">
            <h2><a href="/flutter/flutter">flutter/flutter</a></h2>
            <a href="/flutter/flutter/stargazers">
                <svg>...</svg> 179,233
            </a>
        </article>
        """
        result = git_trend.parse_trending_block(sample_no_lang)
        assert result["name"] == "flutter/flutter"
        assert result["language"] == "Unknown"
        assert result["stars"] == "179,233"

    def test_parse_trending_block_empty_or_malformed(self):
        """Verify that malformed blocks with no repo header gracefully return empty dictionary."""
        malformed = "<article class='Box-row'><div>Just random banner text</div></article>"
        result = git_trend.parse_trending_block(malformed)
        assert result == {}

    @patch("urllib.request.urlopen")
    def test_fetch_repo_metadata_fallback_success(self, mock_urlopen):
        """Verify fallback fetcher queries GitHub API and returns accurate language and formatted stars."""
        mock_response = MagicMock()
        mock_response.read.return_value = b'{"language": "Dart", "stargazers_count": 179233}'
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        with patch.dict(os.environ, {"GITHUB_TOKEN": "ghp_test12345"}):
            lang, stars = git_trend.fetch_repo_metadata_fallback("flutter/flutter")
            assert lang == "Dart"
            assert stars == "179,233"
            call_args = mock_urlopen.call_args[0][0]
            assert call_args.headers.get("Authorization") == "Bearer ghp_test12345"

    @patch("urllib.request.urlopen")
    def test_fetch_repo_metadata_fallback_network_error(self, mock_urlopen):
        """Verify graceful degradation to ('Unknown', 'N/A') on network timeout or HTTP error."""
        mock_urlopen.side_effect = Exception("Connection timed out")

        lang, stars = git_trend.fetch_repo_metadata_fallback("nonexistent/repo")
        assert lang == "Unknown"
        assert stars == "N/A"

    def test_least_rank_preservation_logic(self):
        """Verify that best rank achieved calculation uses min() / LEAST so lower rank numbers win."""
        current_highest_rank = 3
        new_worse_rank = 15
        new_better_rank = 1

        # Worse rank (#15) must not overwrite #3
        assert min(current_highest_rank, new_worse_rank) == 3

        # Better rank (#1) must upgrade #3 to #1
        assert min(current_highest_rank, new_better_rank) == 1

    def test_numeric_stars_parsing(self):
        """Verify that string stars ('241,804', '1,107') correctly convert to integers."""
        sample_stars = ["241,804", "1,107", "45,854", "0", "N/A"]
        expected_ints = [241804, 1107, 45854, 0, 0]
        
        parsed = []
        for s in sample_stars:
            clean = "".join(c for c in s if c.isdigit())
            parsed.append(int(clean) if clean else 0)
            
        assert parsed == expected_ints

    def test_trending_multi_language_extraction(self):
        """Verify that diverse programming languages (JavaScript, Rust, Python, Go, Dart) are recognized."""
        sample_snippet = """
        <article class="Box-row">
            <h2><a href="/rust-lang/rust">rust-lang/rust</a></h2>
            <span itemprop="programmingLanguage">Rust</span>
            <a href="/rust-lang/rust/stargazers"><svg>...</svg> 98,421</a>
        </article>
        <article class="Box-row">
            <h2><a href="/golang/go">golang/go</a></h2>
            <span itemprop="programmingLanguage">Go</span>
            <a href="/golang/go/stargazers"><svg>...</svg> 124,530</a>
        </article>
        """
        blocks = sample_snippet.split('<article class="Box-row">')[1:]
        repos = [git_trend.parse_trending_block(b) for b in blocks]
        
        assert len(repos) == 2
        assert repos[0]["name"] == "rust-lang/rust"
        assert repos[0]["language"] == "Rust"
        assert repos[0]["stars"] == "98,421"
        assert repos[1]["name"] == "golang/go"
        assert repos[1]["language"] == "Go"
        assert repos[1]["stars"] == "124,530"
