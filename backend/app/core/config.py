from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    app_name: str = "Hackathon Mini API"
    api_key: str = ""
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/hackathon"

    secret_key: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "hackathon"
    minio_secret_key: str = "hackathon123"
    minio_use_ssl: bool = False
    minio_bucket_plant_images: str = "plant-images"
    minio_bucket_avatars: str = "avatars"


settings = Settings()
