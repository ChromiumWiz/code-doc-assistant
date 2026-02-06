## a. Quick setup instructions

Please refer to the setup instructions for the backend and frontend in their respective folder-level README files.

---

## b. Architecture overview

### Architecture diagram

https://drive.google.com/file/d/1kPU_BivJUWHMh2yaSq3lUIf_LB1gzaPn/view?usp=sharing

This is a simple RAG-based **Code Documentation Assistant** that indexes a GitHub repository and answers questions grounded in the indexed code.

### Components

- **FastAPI backend**  
  Validates GitHub URLs, clones repositories, chunks files, generates embeddings, performs retrieval, calls the LLM, and returns answers with citations.

- **Next.js UI**  
  Allows users to enter a GitHub repository URL, trigger indexing, and chat with the indexed codebase.

### Flows

#### Index
- UI submits GitHub URL  
- Backend validates the URL and performs a shallow clone  
- Backend filters files and chunks them (structure-aware for Python and TS/JS, sliding window for others)  
- Backend generates embeddings and stores them in Postgres with pgvector  

#### Chat
- UI submits a question along with `repo_id`  
- Backend embeds the question and retrieves topK chunks using pgvector  
- Backend builds a bounded context  
- Backend calls the LLM and returns an answer with citations  

---

## c. What would be required to productionize, scale, and deploy on a hyper-scaler (AWS / GCP / Azure)

### Deployment
- Package the backend as a container and deploy to:
  - **GCP**: Cloud Run  
  - **AWS**: ECS / Fargate  
  - **Azure**: Container Apps  
- Add an API gateway or load balancer in front of the service.

### Storage
- Move to managed Postgres:
  - Cloud SQL / RDS / Azure Postgres  

### Async indexing
Indexing can be slow for large repositories. In production, I would:
- Enqueue indexing jobs using a queue  
- Run workers for cloning, chunking, and embedding  
- Expose job status to clients  

Examples:
- GCP: Pub/Sub or Cloud Tasks  
- AWS: SQS  
- Azure: Service Bus  

### Security
- Authentication and authorization  
- Secret storage using Secret Manager / KMS  

### Reliability
- Timeouts and retries for GitHub and LLM provider calls  
- Input limits (repository size, file size, allowed extensions)  

### Observability
- Centralized logs and metrics  
- Dashboards for:
  - Indexing throughput  
  - Retrieval latency  
  - LLM latency  

---

## d. RAG / LLM approach and decisions

### Approach
- **Simple RAG**: retrieve relevant code chunks and generate answers strictly from those chunks with citations.

### Chunking
- **Python**: AST-based chunking into class / function / method regions  
- **Other files**: sliding window fallback  

**Reasoning**: code-related questions map better to symbol-level chunks, and line-level citations are more trustworthy.

### Embedding model
- Chosen for stable dimension and good cost/quality balance.  
- If using OpenAI, `text-embedding-3-small` works well for code.

### Vector database
**Choices considered**
- FAISS / Chroma (local, quick)  
- Managed vector databases (more infrastructure overhead)  

**Final choice**
- **Postgres + pgvector** because it is durable, production-friendly, and stores metadata and vectors together.

### Orchestration framework
- No LangGraph or agent orchestration for v1.  
- Reason: fewer moving parts, easier to test and debug, and retrieval quality is the primary lever.

### Prompt and context management
- Strict grounding: answer only from provided context  
- Always include citations (file path and line ranges)  
- Context builder enforces a fixed budget and deduplicates across files to avoid prompt bloat  

### Guardrails
- Prompt injection heuristic to detect common jailbreak phrases and refuse early  
- Retrieval confidence handling: if evidence is weak, respond with “not found in indexed repo” instead of guessing  

### Quality
- Verifiability via citations  
- Structure-aware chunking improves retrieval relevance for code questions  

### Observability
When `RAG_DEBUG=true`, the backend logs:
- Sources / chunks provided to the LLM  
- Sources used by the LLM (parsed from citations)  
- Both logs are correlated using a unique internal ID per request  

This makes RAG behavior inspectable without any UI changes.

---

## e. Key technical decisions and why

- **Simple RAG over agents**: prioritizes reliability and clarity; reduces failure modes and keeps behavior explainable  
- **pgvector**: provides persistence and a scalable foundation with a clear path to managed Postgres in the cloud  
- **Structure-aware chunking for Python**: included to demonstrate how chunking quality can be improved; fallback for others keeps scope controlled  
- **Shallow cloning of GitHub repositories**: faster indexing and reduced bandwidth usage  

---

## f. Engineering standards followed (and some skipped)

### Followed
- Clear separation of concerns: indexing vs retrieval vs API  
- Configuration via environment variables  
- Database migrations using Alembic  
- Defensive error handling with clear responses  
- Consistent metadata for traceable citations  
- Small, readable modules with minimal abstraction  

### Skipped or minimized (for POC)
- Full authentication and multi-tenant isolation  
- Background job queue for indexing  
- Comprehensive test coverage and load testing  
- Full tracing and metrics stack (kept to RAG-focused logging)  

---

## g. How AI tools were used during development

- Used AI coding assistance to accelerate scaffolding (routes, models, basic service structure)  
- Reviewed and edited all generated output to:
  - simplify flows  
  - remove unnecessary abstractions  
  - ensure consistent metadata and citations  
  - enforce a POC-first, controlled scope  
- Manually reviewed every generated code change before accepting it  

---

## h. What I would do differently with more time

- Broader language support with customized chunking strategies  
- Async indexing (queue + workers) with progress and status tracking  
- Stronger guardrails, including improved prompt injection handling and secret detection in outputs  
