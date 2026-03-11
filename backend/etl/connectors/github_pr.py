from typing import Dict, Any, List, Optional, Callable
import requests
import logging
from ..base import BaseConnector
from django.utils import timezone
from datetime import datetime
from data.models import PullRequest, PullRequestReviewer, Commit
from users.resolver import UserResolver
from etl.analyzers.pr_diff import PRDiffAnalyzer

logger = logging.getLogger(__name__)

class GitHubPRConnector(BaseConnector):
    """
    Connects to GitHub to fetch Pull Requests, Reviews, Commits, and Diffs
    calculating AI code usage percentage on the fly during sync.
    Expects config_json to have a 'repos' list of strings like ["owner/repo"].
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_base = "https://api.github.com"
        if self.api_key:
            self.api_key = self.api_key.strip()

    def _get_auth_header(self) -> Dict[str, str]:
        if not self.api_key:
            return {}
        return {
            'Authorization': f'Bearer {self.api_key}',
            'Accept': 'application/vnd.github.v3+json'
        }

    def test_connection(self) -> bool:
        if not self.api_key:
            raise ValueError("GitHub Personal Access Token is required")
            
        url = f"{self.api_base}/user"
        try:
            response = requests.get(url, headers=self._get_auth_header())
            if response.status_code == 200:
                return True
            msg = f"GitHub Connection Failed: {response.status_code}"
            try:
                msg += f" - {response.json().get('message', '')}"
            except:
                pass
            raise Exception(msg)
        except Exception as e:
            logger.error(f"GitHub Connection Error: {e}")
            raise e

    def sync(self, tenant_id: int, source_id: int, progress_callback: Optional[Callable[[int, str], None]] = None) -> Dict[str, Any]:
        """
        Sync PRs, Reviews, and Commits for all configured repositories.
        """
        repos = self.config.get('repos', [])
        if not repos:
            logger.warning(f"No GitHub repos configured for source_id {source_id}")
            return {'item_count': 0}

        headers = self._get_auth_header()
        total_repos = len(repos)
        item_count = 0

        for i, repo in enumerate(repos):
            if progress_callback:
                progress_callback(int((i/total_repos)*100), f"Syncing GitHub Repo: {repo}...")
                
            item_count += self._sync_pull_requests(repo, source_id, headers)
            self._sync_commits(repo, source_id, headers)

        return {'item_count': item_count}

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        if not date_str:
            return None
        try:
            clean_str = date_str.replace('Z', '+00:00')
            return datetime.fromisoformat(clean_str)
        except ValueError:
            logger.warning(f"Could not parse GitHub date: {date_str}")
            return None

    def _sync_commits(self, repo: str, source_id: int, headers: Dict):
        """
        Fetch commits for a specific repository.
        """
        url = f"{self.api_base}/repos/{repo}/commits?per_page=100"
        resp = requests.get(url, headers=headers)
        
        if resp.status_code != 200:
            logger.warning(f"Failed to fetch commits for {repo}: {resp.status_code}")
            return
            
        commits = resp.json()
        for c in commits:
            sha = c.get('sha')
            commit_data = c.get('commit', {})
            author_data = commit_data.get('author', {})
            
            email = self.identity_resolver.resolve(author_data.get('email'))
            name = author_data.get('name')
            message = commit_data.get('message', '')
            date_str = author_data.get('date')
            
            committed_at = self._parse_date(date_str) or timezone.now()
            resolved_author = UserResolver.resolve_by_identity('github', email)
            
            # GitHub list endpoint doesn't give additions/deletions easily without single commit fetch
            # We skip detailed fetch to save rate limits
            
            Commit.objects.update_or_create(
                external_id=sha,
                source_config_id=source_id,
                defaults={
                    'repository_name': repo,
                    'author_email': email,
                    'author_name': name,
                    'resolved_author': resolved_author,
                    'message': message[:2000],
                    'committed_at': committed_at,
                    'additions': 0,
                    'deletions': 0
                }
            )

    def _sync_pull_requests(self, repo: str, source_id: int, headers: Dict) -> int:
        """
        Fetch PRs, Diffs, and Reviews for a repository.
        """
        # Fetching top 100 PRs (state=all gets open and closed)
        url = f"{self.api_base}/repos/{repo}/pulls?state=all&per_page=100"
        resp = requests.get(url, headers=headers)
        
        if resp.status_code != 200:
            logger.warning(f"Failed to fetch PRs for {repo}: {resp.status_code}")
            return 0
            
        prs = resp.json()
        count = 0
        
        for pr in prs:
            pr_id = str(pr.get('number'))
            title = pr.get('title', '')
            state = pr.get('state') # open, closed
            
            is_merged = pr.get('merged_at') is not None
            pr_status = 'completed' if is_merged else ('abandoned' if state == 'closed' else 'active')
            
            user = pr.get('user', {})
            email = self.identity_resolver.resolve(user.get('login')) # GitHub often hides emails, login is fallback
            resolved_author = UserResolver.resolve_by_identity('github', email)
            
            created_at = self._parse_date(pr.get('created_at')) or timezone.now()
            updated_at = self._parse_date(pr.get('updated_at')) or created_at
            merged_at = self._parse_date(pr.get('merged_at'))
            
            source_ref = pr.get('head', {}).get('ref', '')
            target_ref = pr.get('base', {}).get('ref', '')
            pr_url = pr.get('html_url', '')
            
            # Fetch Diff & AI Usage if active or recently changed.
            # To save API calls, we might only do this for new/un-analyzed PRs in a real async task.
            # Here we do a lightweight fetch.
            diff_url = pr.get('url')
            ai_data = {'ai_lines': 0, 'total_lines': 0, 'percent': 0.0}
            
            if diff_url:
                diff_headers = headers.copy()
                diff_headers['Accept'] = 'application/vnd.github.v3.diff'
                diff_resp = requests.get(diff_url, headers=diff_headers)
                
                if diff_resp.status_code == 200:
                    ai_data = PRDiffAnalyzer.calculate_ai_usage(diff_resp.text)

            pr_obj, created = PullRequest.objects.update_or_create(
                external_id=pr_id,
                source_config_id=source_id,
                defaults={
                    'title': title,
                    'author_email': email,
                    'resolved_author': resolved_author,
                    'status': pr_status,
                    'repository_name': repo,
                    'source_branch': source_ref,
                    'target_branch': target_ref,
                    'created_at': created_at,
                    'updated_at': updated_at,
                    'merged_at': merged_at,
                    'pr_url': pr_url,
                    'ai_code_percent': ai_data['percent'],
                    'ai_generated_lines': ai_data['ai_lines'],
                    'total_changed_lines': ai_data['total_lines'],
                    'diff_analyzed_at': timezone.now()
                }
            )
            
            # Sync Reviews
            self._sync_pr_reviews(repo, pr_id, pr_obj, headers)
            count += 1
            
        return count

    def _sync_pr_reviews(self, repo: str, pr_number: str, pr_obj: PullRequest, headers: Dict):
        """
        Fetch reviews for a specific PR.
        """
        url = f"{self.api_base}/repos/{repo}/pulls/{pr_number}/reviews"
        resp = requests.get(url, headers=headers)
        
        if resp.status_code == 200:
            reviews = resp.json()
            for review in reviews:
                user = review.get('user', {})
                rev_email = self.identity_resolver.resolve(user.get('login')) # Fallback to login
                if not rev_email:
                    continue
                    
                rev_name = user.get('login', '')
                state = review.get('state', '')
                
                # Normalize vote
                vote = 10 if state == 'APPROVED' else (0 if state == 'COMMENTED' else 5)
                reviewed_at = self._parse_date(review.get('submitted_at'))
                
                resolved_rev = UserResolver.resolve_by_identity('github', rev_email)
                
                PullRequestReviewer.objects.update_or_create(
                    pull_request=pr_obj,
                    reviewer_email=rev_email,
                    defaults={
                        'reviewer_name': rev_name,
                        'resolved_reviewer': resolved_rev,
                        'vote': vote,
                        'reviewed_at': reviewed_at
                    }
                )
