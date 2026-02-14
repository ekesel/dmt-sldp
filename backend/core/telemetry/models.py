from datetime import datetime
from pydantic import BaseModel, Field

class DataSyncPayload(BaseModel):
    integration_id: int
    schema_name: str
    status: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
