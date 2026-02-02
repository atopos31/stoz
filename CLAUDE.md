# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

STOZ is a Docker-based migration tool that transfers data from Synology NAS to ZimaOS systems with built-in file verification. The application uses a Go backend with Gin framework and a React 19 frontend with TypeScript.

## Development Commands

### Backend (Go)

```bash
# Install dependencies
go mod download

# Build binary
go build -o stoz .

# Run locally (requires environment variables)
export DB_PATH=./data/stoz.db
export HOST_PATH=/
./stoz

# Run tests
go test ./...
```

### Frontend (React)

```bash
cd webui

# Install dependencies
npm install

# Development server (runs on port 5173)
npm run dev

# Production build (outputs to webui/dist)
npm run build

# Preview production build
npm run preview
```

### Docker

```bash
# Build Docker image
docker build -t stoz:latest .

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Architecture

### Backend Structure

The Go backend follows a layered architecture:

- **main.go**: Entry point, sets up Gin router and embedded frontend assets
- **config/**: Environment-based configuration with `godotenv` support
- **models/**: GORM database models (MigrationTask, ErrorLog) and SQLite initialization
- **handler/**: HTTP handlers for API endpoints (scan, migration, discovery, health)
- **service/**: Business logic layer
  - `scanner_service.go`: Scans Synology volumes at `/host/volume*`
  - `migration_service.go`: Manages migration tasks and in-memory status updates
  - `zimaos_client.go`: HTTP client for ZimaOS API (login, upload, folder creation, file verification)
  - `discovery_service.go`: UDP broadcast discovery for ZimaOS devices on network
- **worker/**: Goroutine-based worker pool for concurrent migration tasks
  - `migration_worker.go`: Processes tasks from queue, handles file scanning, upload, verification, and retry logic
- **middleware/**: CORS and panic recovery middleware
- **common/**: Shared utilities (logger using logrus, error helpers)

### Frontend Structure

React 19 + TypeScript + Vite application:

- **pages/**: Page components for each workflow step (ScanPage, SelectPage, ConfigPage, MigrationPage, HistoryPage, TaskDetailPage)
- **components/**: Reusable UI components
  - `ui/`: shadcn/ui components (button, card, dialog, progress, etc.)
  - `layout/`: Header and Layout components
  - `workflow/`: StepIndicator for multi-step workflow
  - `migration/`: TaskCard, TaskProgress, TaskStatusBadge
- **api/**: API client with fetch wrappers
- **store/**: Zustand state management
  - `useAppStore.ts`: Selected folders, ZimaOS config, workflow state
  - `useTaskStore.ts`: Active migration task tracking
- **hooks/**: Custom React hooks (useTaskRecovery, useNotification, useNetworkStatus)
- **types/**: TypeScript type definitions shared across frontend
- **lib/**: Utilities (format, api-retry)

### Data Flow

1. **Scanning**: Frontend requests `/api/v1/scan` → backend scans `/host/volume*` directories → returns folder tree (excludes `@` prefixed system folders)
2. **Task Creation**: User selects folders → configures ZimaOS connection → frontend POSTs to `/api/v1/migration` → backend creates task in SQLite
3. **Worker Processing**: Worker pool picks up task → logs into ZimaOS → recursively scans source folders → creates remote directory structure → uploads files with chunking
4. **File Verification** (if enabled): After upload completes → worker verifies each file by comparing size, timestamp, and MD5 hash of first 1MB → marks task as failed if any file fails verification
5. **Progress Tracking**: Worker updates in-memory status via `MigrationService.UpdateTaskStatus()` → frontend polls `/api/v1/migration/:taskId` every second → displays real-time progress

## Key Technical Details

### Worker Pool Pattern

The backend uses a fixed-size worker pool (`WORKER_COUNT` goroutines) with a buffered channel queue. Tasks persist in SQLite and survive container restarts. Workers check task status in database for pause/cancel/resume operations.

### Embedded Frontend

The frontend is embedded into the Go binary using `//go:embed webui/dist`. The `main.go` serves `index.html` for all non-API routes (SPA routing) and static assets from `/assets`.

### Multi-Stage Docker Build

Dockerfile uses 3 stages:
1. Node.js Alpine: Build frontend with `npm run build`
2. Go 1.25 Alpine: Build backend with CGO enabled (for SQLite), copy frontend dist
3. Alpine: Final minimal image with binary only

### File Verification Logic

Located in `worker/migration_worker.go`:
- After all files uploaded, worker enters verification phase (status = "verifying")
- For each file: retrieves remote metadata via ZimaOS API, compares size/timestamp (±1s tolerance), downloads first 1MB via HTTP Range request, compares MD5 hashes
- Any verification failure marks entire task as failed and logs error with type="verify"
- Controlled by `ENABLE_VERIFICATION` and `VERIFY_CHUNK_SIZE` env vars

### ZimaOS Client

The `service/zimaos_client.go` handles multiple ZimaOS API response formats for token extraction. It uses:
- `/v1/users/login`: Authentication
- `/v2_1/files/folder`: Create directories
- `/v2_1/files/file/uploadV2`: Multipart streaming upload with `modTime` preservation
- `/v2_1/files/file`: List directory contents (for verification)
- `/v3/file`: Download files with Range header support

### Environment Configuration

All configuration is in `config/config.go` with defaults. Key variables:
- `HOST_PATH=/host`: Mount point for Synology volumes
- `WORKER_COUNT=3`: Number of concurrent workers
- `CONCURRENT_FILES=3`: Parallel file uploads per worker
- `CHUNK_SIZE=10485760`: 10MB upload chunks
- `ENABLE_VERIFICATION=true`: Enable post-upload verification
- `VERIFY_CHUNK_SIZE=1048576`: 1MB chunk for MD5 verification

### Frontend State Management

Zustand stores (`useAppStore`, `useTaskStore`) persist to localStorage. The app uses a multi-step workflow (Scan → Select → Config → Migration → History) with route-based navigation.

## Important Patterns

### Error Handling

- Backend: Errors logged to `ErrorLog` table with `error_type` field ("upload" or "verify")
- Frontend: Uses toast notifications and error boundaries
- API retries: Frontend uses exponential backoff retry logic in `lib/api-retry.ts`

### Task Status Lifecycle

States: `pending` → `running` → `verifying` (optional) → `completed`/`failed`/`cancelled`

Pause/resume changes status to `paused` → `pending` → `running`

### Directory Filtering

- Skips directories starting with `@` (e.g., `@eaDir` - Synology thumbnails)
- Optionally skips `#recycle` directories based on `IncludeRecycle` option
- Only scans `/host/volume*` paths by default

## Testing Locally Without Docker

1. Backend: Set `HOST_PATH=/` to scan from root, or point to a test directory
2. Frontend: Runs on `localhost:5173` in dev mode, proxies API to backend on port 8080
3. Database: Will be created at path specified by `DB_PATH` env var

## Network Discovery

The application supports UDP broadcast discovery of ZimaOS devices on the local network via `/api/v1/discover`. This allows automatic detection of available ZimaOS systems without manual IP entry.
