from .base import BaseConnector
from ..sources.azure_boards import AzureBoardsSource

class AzureBoardsConnector(BaseConnector):
    def __init__(self, integration):
        super().__init__(integration)
        self.source = AzureBoardsSource(integration)

    def fetch_work_items(self, last_sync=None):
        return self.source.fetch_work_items(last_sync=last_sync)

    def fetch_sprints(self):
        # Azure Boards sprints fetch logic would go here
        return []

    def fetch_pull_requests(self):
        # Azure Boards PRs fetch logic would go here
        return []

    def validate_connection(self):
        return True # Mock pass
