# Code Documentation Assistant Backend

## Setup
Create a `.env` file (repo root or `backend/`) using `.env.example` as a template.

If you use a different embedding model, set `EMBEDDING_DIM`. You can also adjust `CHAT_TEMPERATURE`.

## Run locally
Install dependencies and run migrations:

```
pip install -r requirements.txt
alembic upgrade head
```

Start the API:

```
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API is available at `http://localhost:8000`.
