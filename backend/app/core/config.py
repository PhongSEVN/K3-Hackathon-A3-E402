from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    app_name: str = "Hackathon Mini API"
    api_key: str = ""
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/hackathon"


settings = Settings()
