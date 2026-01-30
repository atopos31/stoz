package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Scan     ScanConfig
	Worker   WorkerConfig
	ZimaOS   ZimaOSConfig
}

type ServerConfig struct {
	Port     string
	GinMode  string
	LogLevel string
}

type DatabaseConfig struct {
	Path string
}

type ScanConfig struct {
	HostPath string
	CacheTTL time.Duration
}

type WorkerConfig struct {
	Count           int
	ConcurrentFiles int
	ChunkSize       int64
	MaxRetries      int
	// Verification settings
	EnableVerification bool  // Enable file verification after upload
	VerifyChunkSize    int64 // Size of chunk to verify (default 1MB)
}

type ZimaOSConfig struct {
	Timeout int
}

var AppConfig *Config

func Load() error {
	godotenv.Load()

	AppConfig = &Config{
		Server: ServerConfig{
			Port:     getEnv("SERVER_PORT", "8080"),
			GinMode:  getEnv("GIN_MODE", "release"),
			LogLevel: getEnv("LOG_LEVEL", "info"),
		},
		Database: DatabaseConfig{
			Path: getEnv("DB_PATH", "/data/stoz.db"),
		},
		Scan: ScanConfig{
			HostPath: getEnv("HOST_PATH", "/host"),
			CacheTTL: time.Duration(getEnvAsInt("SCAN_CACHE_TTL", 300)) * time.Second,
		},
		Worker: WorkerConfig{
			Count:              getEnvAsInt("WORKER_COUNT", 3),
			ConcurrentFiles:    getEnvAsInt("CONCURRENT_FILES", 3),
			ChunkSize:          int64(getEnvAsInt("CHUNK_SIZE", 10485760)),
			MaxRetries:         getEnvAsInt("MAX_RETRIES", 3),
			EnableVerification: getEnvAsBool("ENABLE_VERIFICATION", true),
			VerifyChunkSize:    int64(getEnvAsInt("VERIFY_CHUNK_SIZE", 1048576)), // 1MB
		},
		ZimaOS: ZimaOSConfig{
			Timeout: getEnvAsInt("ZIMAOS_TIMEOUT", 30),
		},
	}

	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.ParseBool(valueStr)
	if err != nil {
		return defaultValue
	}
	return value
}
