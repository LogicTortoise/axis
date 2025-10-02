from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    database_url: str = "sqlite:///./axis.db"
    api_prefix: str = "/api"
    port: int = 10101
    host: str = "0.0.0.0"

    # Claude Agent SDK 配置
    anthropic_api_key: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
