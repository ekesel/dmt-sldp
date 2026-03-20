from typing import Optional, Dict, Any, Type
from .base import BaseConnector
from .connectors.jira import JiraConnector
from .connectors.clickup import ClickupConnector
from .connectors.ado import AzureDevOpsConnector
from .connectors.github_pr import GitHubPRConnector

class ConnectorFactory:
    _registry: Dict[str, Type[BaseConnector]] = {
        'jira': JiraConnector,
        'clickup': ClickupConnector,
        'azure_devops': AzureDevOpsConnector,
        'azure_boards': AzureDevOpsConnector, # Alias
        'azure_devops_git': AzureDevOpsConnector, # PR Sync
        'github': GitHubPRConnector,
    }

    @classmethod
    def register(cls, source_type: str, connector_class: Type[BaseConnector]):
        cls._registry[source_type] = connector_class

    @classmethod
    def get_connector(cls, source_type: str, config: Dict[str, Any]) -> Optional[BaseConnector]:
        connector_class = cls._registry.get(source_type)
        if not connector_class:
            return None
        return connector_class(config)
