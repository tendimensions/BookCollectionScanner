from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./books.db"
    google_books_api_key: str = ""
    server_port: int = 8000
    cors_origins: list[str] = ["*"]

    class Config:
        env_file = ".env"


settings = Settings()
