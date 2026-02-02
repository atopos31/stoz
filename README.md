# STOZ - Synology To ZimaOS Migration Tool

[English](README.md) | [中文](README_zh.md)

---

STOZ is a Docker-based application that simplifies migrating data from Synology NAS to ZimaOS systems with built-in file verification.

## Features

- **Automated Volume Scanning**: Automatically discovers and scans all Synology volumes
- **Selective Migration**: Choose specific folders to migrate with an intuitive UI
- **Real-time Progress Tracking**: Monitor migration progress with detailed statistics
- **File Verification**: Three-layer integrity verification after upload (size + timestamp + MD5)
- **Instant Cancellation**: Cancel migration tasks immediately, even during large file uploads
- **Error Handling**: Configurable error handling with retry logic
- **Persistent State**: Tasks survive container restarts
- **Web UI**: Modern React-based interface for easy operation
- **Recycle Bin Support**: Optional migration of Synology `#recycle` directories

## Architecture

- **Backend**: Go + Gin framework + SQLite + GORM
- **Frontend**: React 19 + TypeScript + Vite 7 + Tailwind CSS
- **Deployment**: Docker + Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Running on a Synology NAS or system with Synology volumes mounted
- ZimaOS system accessible on the network

### Installation

1. Clone the repository:
```bash
git clone https://github.com/atopos31/stoz.git
cd stoz
```

2. Start the application:
```bash
docker-compose up -d
```

3. Access the web interface:
```
http://localhost:8080
```

## Configuration

Environment variables can be configured in `docker-compose.yml` or a `.env` file (see `.env.example`):

```bash
# Application settings
GIN_MODE=release              # Gin mode: debug/release
SERVER_PORT=8080              # Server port
LOG_LEVEL=info                # Log level: debug/info/warn/error

# Database
DB_PATH=/data/stoz.db         # SQLite database path

# Scanning
HOST_PATH=/host               # Host mount point (do not change)
SCAN_CACHE_TTL=300            # Scan cache TTL in seconds

# Worker configuration
WORKER_COUNT=3                # Number of worker goroutines
CONCURRENT_FILES=3            # Concurrent file uploads
CHUNK_SIZE=10485760           # Upload chunk size (10MB)
MAX_RETRIES=3                 # Max retry attempts for failed uploads

# File verification (NEW)
ENABLE_VERIFICATION=true      # Enable file verification after upload
VERIFY_CHUNK_SIZE=1048576     # Verification chunk size (1MB)

# ZimaOS
ZIMAOS_TIMEOUT=30             # Login timeout in seconds
```

## Usage

### Step 1: Scan Volumes

The application automatically scans `/host/volume*` directories and displays all non-`@` prefixed folders.

### Step 2: Select Folders

Choose which folders you want to migrate from the discovered volumes.

### Step 3: Configure Connection

Enter your ZimaOS connection details:
- Host (e.g., `http://192.168.1.100` or `http://zimaos.local`)
- Username
- Password
- Base path on ZimaOS (default: `/media/ZimaOS-HD`)

Configure migration options:
- **Overwrite existing files**: Replace files that already exist on ZimaOS
- **Skip errors and continue**: Continue migration even if some files fail
- **Preserve file timestamps**: Keep original file modification times
- **Include recycle bin**: Migrate Synology `#recycle` directories

Test the connection before proceeding.

### Step 4: Monitor Migration

Watch real-time progress including:
- Overall progress percentage
- Files processed / total files
- Data transferred / total data
- Current transfer speed
- Failed file count
- **Verification progress** (when enabled)

Control the migration:
- **Cancel**: Stop and cancel the migration (cancels immediately, even during file uploads)

## File Verification

After all files are uploaded, STOZ automatically verifies file integrity using a three-layer approach:

1. **Size Check**: Compares file sizes between local and remote
2. **Timestamp Check**: Verifies modification times match (±1 second tolerance)
3. **MD5 Hash Check**: Compares MD5 hash of first 1MB of file content

**Benefits**:
- Ensures data integrity without downloading entire files
- Minimal bandwidth usage (only 1MB per file)
- Fast verification even for large files
- Any verification failure marks the task as failed with detailed error logs

**Configuration**:
- Set `ENABLE_VERIFICATION=false` to disable verification
- Adjust `VERIFY_CHUNK_SIZE` to change verification data size (default: 1MB)

## API Endpoints

### Health Check
```
GET /api/v1/health
```

### Scanning
```
GET /api/v1/scan
POST /api/v1/folder/details
```

### ZimaOS Connection
```
POST /api/v1/zimaos/test
```

### Migration Management
```
POST /api/v1/migration              # Create migration task
GET /api/v1/migration/:taskId       # Get task status
GET /api/v1/migrations              # List all tasks
POST /api/v1/migration/:taskId/cancel   # Cancel task
```

## Development

### Prerequisites

- Go 1.25+
- Node.js 20+
- npm or yarn

### Build Backend

```bash
go mod download
go build -o stoz .
```

### Build Frontend

```bash
cd webui
npm install
npm run build
```

### Run Locally

```bash
# Terminal 1: Start backend
export DB_PATH=./data/stoz.db
export HOST_PATH=/
./stoz

# Terminal 2: Start frontend dev server
cd webui
npm run dev
```

### Build Docker Image

```bash
docker build -t stoz:latest .
```

## Project Structure

```
stoz/
├── main.go                     # Application entry point
├── config/                     # Configuration management
├── models/                     # Database models
├── handler/                    # HTTP handlers
├── service/                    # Business logic
│   ├── scanner_service.go      # Volume scanning
│   ├── migration_service.go    # Task management
│   └── zimaos_client.go        # ZimaOS API client
├── worker/                     # Migration worker pool
├── middleware/                 # HTTP middleware
├── common/                     # Utilities (logger, errors)
├── webui/                      # React frontend
│   ├── src/
│   │   ├── api/               # API client
│   │   ├── pages/             # Page components
│   │   ├── components/        # Reusable components
│   │   └── types/             # TypeScript types
│   └── dist/                  # Built frontend assets
├── Dockerfile                  # Multi-stage build
├── docker-compose.yml          # Docker Compose config
└── README.md                   # This file
```

## Technical Details

### Migration Flow

1. User selects folders and configures ZimaOS connection
2. Task is created in SQLite database
3. Task is submitted to worker pool queue
4. Worker goroutine picks up the task:
   - Logs into ZimaOS
   - Recursively scans source folders
   - Creates directory structure on ZimaOS
   - Uploads files with chunking and retry logic using context-based cancellation
   - Updates progress in real-time
   - Can be cancelled instantly via context cancellation (interrupts ongoing file uploads)
5. **File Verification Phase** (if enabled):
   - Iterates through all uploaded files
   - Retrieves remote file metadata via ZimaOS API
   - Compares size, timestamp, and MD5 hash
   - Updates verification progress in real-time
   - Marks task as failed if any file fails verification
6. Frontend polls status every second

### Key Features

- **Worker Pool**: Fixed number of goroutines process tasks concurrently
- **Context-based Cancellation**: Uses Go contexts to instantly cancel ongoing file uploads
- **Task Persistence**: All tasks stored in SQLite for recovery after restart
- **Chunked Upload**: Large files uploaded in 10MB chunks with cancelable readers
- **Exponential Backoff**: Failed uploads retry with exponential delay
- **Progress Tracking**: Real-time progress with speed calculation
- **Error Logging**: All errors logged to database with error type (upload/verify)
- **Partial Download**: Uses HTTP Range requests for efficient verification

## Troubleshooting

### Container cannot access Synology volumes

Ensure the root filesystem is mounted:
```yaml
volumes:
  - /:/host:ro
```

### Connection test fails

- Verify ZimaOS is accessible from the Docker container
- Check firewall settings
- Ensure credentials are correct
- Try accessing ZimaOS API manually: `curl http://<host>/v1/users/login`

### Migration is slow

- Increase `CONCURRENT_FILES` for more parallel uploads
- Check network bandwidth between Synology and ZimaOS
- Verify ZimaOS system is not overloaded

### Verification fails

- Check network stability between STOZ and ZimaOS
- Verify ZimaOS has sufficient storage space
- Review error logs in the UI for specific file errors
- Consider disabling verification temporarily with `ENABLE_VERIFICATION=false`

### Database locked errors

- Ensure only one instance of STOZ is running
- Check file permissions on `/data` directory

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.
