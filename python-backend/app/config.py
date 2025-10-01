from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:///./axis.db"
    api_prefix: str = "/api"
    port: int = 10101
    host: str = "0.0.0.0"

    class Config:
        env_file = ".env"

settings = Settings()
