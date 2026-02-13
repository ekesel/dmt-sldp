from .jira import JiraConnector
from .clickup import ClickUpConnector
from .azure_boards import AzureBoardsConnector
from .github import GitHubConnector

class ConnectorFactory:
    _registry = {
        'jira': JiraConnector,
        'clickup': ClickUpConnector,
        'azure_boards': AzureBoardsConnector,
        'github': GitHubConnector,
    }

    @classmethod
    def get_connector(cls, integration):
        connector_class = cls._registry.get(integration.source_type)
        if not connector_class:
            raise ValueError(f"No connector registered for {integration.source_type}")
        return connector_class(integration)
