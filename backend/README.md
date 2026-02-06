# Code Documentation Assistant Backend

## Setup
Create a `.env` file (repo root or `backend/`) with:

```
DATABASE_URL=postgresql+psycopg2://postgres:postgres@db:5432/code_docs
OPENAI_API_KEY=your_key
EMBEDDING_MODEL=text-embedding-3-small
CHAT_MODEL=gpt-4o-mini
```

If you use a different embedding model, set `EMBEDDING_DIM`.

## Run with Docker
From the repo root:

```
docker-compose up --build
```

Then run migrations:

```
docker-compose exec backend alembic upgrade head
```

API is available at `http://localhost:8000`.
