from typing import Optional, Dict, Any, Type
from .base import BaseConnector
from .connectors.jira import JiraConnector

class ConnectorFactory:
    _registry: Dict[str, Type[BaseConnector]] = {
        'jira': JiraConnector,
        # 'clickup': ClickupConnector,
        # 'azure_boards': AzureBoardsConnector,
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
