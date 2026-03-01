from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Callable
import logging

logger = logging.getLogger(__name__)

class BaseConnector(ABC):
    """
    Abstract base class for all source connectors (Jira, ClickUp, ADO, etc.)
    """
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.base_url = config.get('base_url', '')
        self.api_key = config.get('api_token', '') or config.get('api_key', '')
        self.username = config.get('username', '')

    @abstractmethod
    def test_connection(self) -> bool:
        """
        Validate credentials and connectivity.
        Returns True if successful, raises Exception if failed.
        """
        pass

    def fetch_folders(self) -> List[Dict[str, str]]:
        """
        Fetch available scope folders (e.g. ClickUp Folders, ADO Teams).
        Returns a list of dicts: [{'id': '...', 'name': '...'}]
        Defaults to empty list if not implemented.
        """
        return []

    @abstractmethod
    def sync(self, tenant_id: int, source_id: int, progress_callback: Optional[Callable[[int, str], None]] = None) -> Dict[str, Any]:
        """
        Perform full sync of data.
        Should return stats dict: {'items_synced': int, 'prs_synced': int}
        """
        pass

    def normalize_status(self, raw_status: str) -> str:
        """
        Map external status to DMT status categories ('todo', 'in_progress', 'done').
        Override this in subclasses for specific mapping logic.
        """
        status = raw_status.lower()
        if status in ['done', 'complete', 'closed', 'resolved', 'verified']:
            return 'done'
        elif status in ['in progress', 'active', 'development', 'review']:
            return 'in_progress'
        return 'todo'
