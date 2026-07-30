from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    app_name: str = "Hackathon Mini API"
    api_key: str = ""
    llm_provider: str = "lmstudio"
    llm_model: str = ""
    llm_base_url: str = ""
    llm_api_key: str = ""
    openai_api_key: str = ""
    llm_timeout_seconds: float = 60.0
    llm_max_tokens: int = 32
    llm_history_messages: int = 2
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
    initialize_storage_on_startup: bool = False

    disease_classifier_path: str = "../cv/results/resnet/best_model.pth"

    @property
    def active_llm_base_url(self) -> str:
        if self.llm_base_url:
            return self.llm_base_url.rstrip("/")
        if self.llm_provider.lower() == "openai":
            return "https://api.openai.com/v1"
        return "http://localhost:1234/v1"

    @property
    def active_llm_model(self) -> str:
        if self.llm_model:
            return self.llm_model
        if self.llm_provider.lower() == "openai":
            return "gpt-4.1-mini"
        return "smollm2-135m-instruct"

    @property
    def active_llm_api_key(self) -> str:
        if self.llm_api_key:
            return self.llm_api_key
        if self.llm_provider.lower() == "openai":
            return self.openai_api_key
        return "lm-studio"


settings = Settings()
