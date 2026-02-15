from abc import ABC, abstractmethod

class BaseConnector(ABC):
    def __init__(self, source_config):
        self.integration = source_config # Alias for backward compatibility in connectors
        self.source = source_config
        self.config = {
            'base_url': source_config.base_url,
            'api_key': source_config.api_key,
            'workspace_id': source_config.workspace_id,
            'credentials': source_config.config_json.get('credentials', {}),
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
