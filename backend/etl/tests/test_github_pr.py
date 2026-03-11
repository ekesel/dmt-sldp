import sys
from unittest.mock import MagicMock, patch
import pytest
from datetime import datetime, timezone

# Mock Django and data.models before importing
mock_pullrequest = MagicMock()
mock_pullrequest_reviewer = MagicMock()
mock_commit = MagicMock()
mock_user_resolver = MagicMock()
mock_pr_diff_analyzer = MagicMock()

sys.modules['data.models'] = MagicMock(
    PullRequest=mock_pullrequest,
    PullRequestReviewer=mock_pullrequest_reviewer,
    Commit=mock_commit
)
sys.modules['django.utils'] = MagicMock()
sys.modules['django.utils.timezone'] = MagicMock(now=lambda: datetime(2023, 1, 1, tzinfo=timezone.utc))
sys.modules['users.resolver'] = MagicMock(UserResolver=mock_user_resolver)
sys.modules['etl.analyzers.pr_diff'] = MagicMock(PRDiffAnalyzer=mock_pr_diff_analyzer)

from etl.connectors.github_pr import GitHubPRConnector

class TestGitHubPRConnector:
    
    @pytest.fixture
    def config(self):
        return {
            'api_key': 'ghp_testtoken',
            'repos': ['owner/repo1', 'owner/repo2']
        }

    @pytest.fixture
    def connector(self, config):
        return GitHubPRConnector(config)

    class TestAuthHeader:
        def test_returns_correct_headers_when_api_key_present(self, connector):
            
            headers = connector._get_auth_header()
            
            assert 'Authorization' in headers
            assert headers['Authorization'] == 'Bearer ghp_testtoken'
            assert headers['Accept'] == 'application/vnd.github.v3+json'

        def test_returns_empty_dict_when_no_api_key(self, config):
            config['api_key'] = ''
            no_key_connector = GitHubPRConnector(config)
            
            headers = no_key_connector._get_auth_header()
            
            assert headers == {}

    class TestTestConnection:
        @patch('requests.get')
        def test_returns_true_when_github_api_returns_200(self, mock_get, connector):
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_get.return_value = mock_response
            
            result = connector.test_connection()
            
            assert result is True
            mock_get.assert_called_once_with('https://api.github.com/user', headers=connector._get_auth_header())

        @patch('requests.get')
        def test_raises_exception_when_github_api_fails(self, mock_get, connector):
            mock_response = MagicMock()
            mock_response.status_code = 401
            mock_response.json.return_value = {'message': 'Bad credentials'}
            mock_get.return_value = mock_response
            
            with pytest.raises(Exception) as exc_info:
                connector.test_connection()
                
            assert '401' in str(exc_info.value)
            assert 'Bad credentials' in str(exc_info.value)

        def test_raises_value_error_when_no_api_key(self, config):
            config['api_key'] = ''
            no_key_connector = GitHubPRConnector(config)
            
            with pytest.raises(ValueError) as exc_info:
                no_key_connector.test_connection()
                
            assert 'Personal Access Token is required' in str(exc_info.value)

    class TestParseDate:
        def test_returns_datetime_when_valid_iso_string(self, connector):
            
            result = connector._parse_date('2023-10-27T10:00:00Z')
            
            assert result is not None
            assert result.year == 2023
            assert result.month == 10

        def test_returns_none_when_invalid_date_string(self, connector):
            
            result = connector._parse_date('invalid-date')
            
            assert result is None

        def test_returns_none_when_empty_string(self, connector):
            
            result = connector._parse_date('')
            
            assert result is None

    class TestSync:
        @patch.object(GitHubPRConnector, '_sync_pull_requests')
        @patch.object(GitHubPRConnector, '_sync_commits')
        def test_calls_sync_methods_for_each_repo_when_repos_configured(self, mock_sync_commits, mock_sync_prs, connector):
            mock_sync_prs.return_value = 5
            tenant_id = 1
            source_id = 2
            
            result = connector.sync(tenant_id, source_id)
            
            assert result['item_count'] == 10  # 5 from repo1 + 5 from repo2
            assert mock_sync_prs.call_count == 2
            assert mock_sync_commits.call_count == 2

        @patch.object(GitHubPRConnector, '_sync_pull_requests')
        def test_returns_zero_when_no_repos_configured(self, mock_sync_prs, config):
            config['repos'] = []
            no_repo_connector = GitHubPRConnector(config)
            
            result = no_repo_connector.sync(1, 2)
            
            assert result['item_count'] == 0
            mock_sync_prs.assert_not_called()

    class TestSyncCommits:
        @patch('requests.get')
        def test_creates_commit_records_when_api_returns_commits(self, mock_get, connector):
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [{
                'sha': 'commit-sha-123',
                'commit': {
                    'author': {'name': 'Test User', 'email': 'test@example.com', 'date': '2023-10-27T10:00:00Z'},
                    'message': 'Test commit'
                }
            }]
            mock_get.return_value = mock_response
            mock_commit.objects.update_or_create.reset_mock()
            
            connector._sync_commits('owner/repo1', 2, connector._get_auth_header())
            
            assert mock_commit.objects.update_or_create.call_count == 1
            call_kwargs = mock_commit.objects.update_or_create.call_args[1]
            assert call_kwargs['external_id'] == 'commit-sha-123'
            assert call_kwargs['source_config_id'] == 2

    class TestSyncPullRequests:
        @patch('requests.get')
        @patch.object(GitHubPRConnector, '_sync_pr_reviews')
        def test_creates_pr_records_and_calls_diff_analyzer_when_prs_found(self, mock_sync_reviews, mock_get, connector):
            # Setup mock for PRs call and Diff call
            pr_response = MagicMock()
            pr_response.status_code = 200
            pr_response.json.return_value = [{
                'number': 42,
                'title': 'Test PR',
                'state': 'closed',
                'merged_at': '2023-10-27T10:00:00Z',
                'user': {'login': 'testuser'},
                'created_at': '2023-10-26T10:00:00Z',
                'updated_at': '2023-10-27T10:00:00Z',
                'head': {'ref': 'feature-branch'},
                'base': {'ref': 'main'},
                'html_url': 'https://github.com/owner/repo/pull/42',
                'url': 'https://api.github.com/repos/owner/repo/pulls/42'
            }]
            
            diff_response = MagicMock()
            diff_response.status_code = 200
            diff_response.text = "diff content"
            
            # Sequence: pull requests, diff
            mock_get.side_effect = [pr_response, diff_response]
            
            mock_pr_diff_analyzer.calculate_ai_usage.return_value = {'ai_lines': 5, 'total_lines': 10, 'percent': 50.0}
            mock_pullrequest.objects.update_or_create.return_value = (MagicMock(), True)
            mock_pullrequest.objects.update_or_create.reset_mock()
            
            count = connector._sync_pull_requests('owner/repo1', 2, connector._get_auth_header())
            
            assert count == 1
            assert mock_pullrequest.objects.update_or_create.call_count == 1
            mock_pr_diff_analyzer.calculate_ai_usage.assert_called_once_with("diff content")

    class TestSyncPRReviews:
        @patch('requests.get')
        def test_creates_reviewer_records_when_reviews_found(self, mock_get, connector):
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [{
                'user': {'login': 'reviewer1'},
                'state': 'APPROVED',
                'submitted_at': '2023-10-27T11:00:00Z'
            }]
            mock_get.return_value = mock_response
            mock_pullrequest_reviewer.objects.update_or_create.reset_mock()
            
            pr_obj = MagicMock()
            connector._sync_pr_reviews('owner/repo1', '42', pr_obj, connector._get_auth_header())
            
            assert mock_pullrequest_reviewer.objects.update_or_create.call_count == 1
            call_kwargs = mock_pullrequest_reviewer.objects.update_or_create.call_args[1]
            assert call_kwargs['pull_request'] == pr_obj
            assert call_kwargs['defaults']['vote'] == 10
