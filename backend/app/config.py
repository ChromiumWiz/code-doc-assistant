import os

from dotenv import load_dotenv


load_dotenv()


class Settings:
    def __init__(self) -> None:
        self.database_url = os.getenv("DATABASE_URL")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.embedding_model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
        self.chat_model = os.getenv("CHAT_MODEL", "gpt-4o-mini")
        self.embedding_dim = self._resolve_embedding_dim()

        if not self.database_url:
            raise RuntimeError("DATABASE_URL is required")

    def _resolve_embedding_dim(self) -> int:
        override = os.getenv("EMBEDDING_DIM")
        if override:
            return int(override)

        model = os.getenv("EMBEDDING_MODEL", "")
        if "text-embedding-3-large" in model:
            return 3072
        if "text-embedding-3-small" in model:
            return 1536
        if "text-embedding-ada-002" in model:
            return 1536

        raise RuntimeError(
            "Unknown EMBEDDING_MODEL. Set EMBEDDING_DIM to the correct dimension."
        )


settings = Settings()
