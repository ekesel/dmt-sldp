from abc import ABC, abstractmethod

class BaseConnector(ABC):
    def __init__(self, integration):
        self.integration = integration
        self.config = {
            'base_url': integration.base_url,
            'api_key': integration.api_key,
            'workspace_id': integration.workspace_id,
            'credentials': integration.credentials,
        }

    @abstractmethod
    def fetch_work_items(self, last_sync=None):
        """Fetch normalized work items from the source."""
        pass

    @abstractmethod
    def fetch_sprints(self):
        """Fetch normalized sprints from the source."""
        pass

    @abstractmethod
    def fetch_pull_requests(self):
        """Fetch normalized pull requests from the source."""
        pass

    @abstractmethod
    def validate_connection(self):
        """Validate that the credentials and URL work."""
        pass
