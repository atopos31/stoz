package models

import (
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

type MigrationTask struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	TaskID          string     `gorm:"uniqueIndex;not null" json:"task_id"`
	Status          string     `gorm:"index;not null" json:"status"`
	SourceFolders   string     `gorm:"type:text;not null" json:"source_folders"`
	ZimaOSHost      string     `gorm:"not null" json:"zimaos_host"`
	ZimaOSUsername  string     `gorm:"not null" json:"zimaos_username"`
	ZimaOSPassword  string     `gorm:"not null" json:"-"`
	BasePath        string     `gorm:"not null" json:"base_path"`
	TotalFiles      int        `gorm:"default:0" json:"total_files"`
	ProcessedFiles  int        `gorm:"default:0" json:"processed_files"`
	FailedFiles     int        `gorm:"default:0" json:"failed_files"`
	TotalSize       int64      `gorm:"default:0" json:"total_size"`
	TransferredSize int64      `gorm:"default:0" json:"transferred_size"`
	Progress        float64    `gorm:"default:0" json:"progress"`
	Options         string     `gorm:"type:text" json:"options"`
	CreatedAt       time.Time  `json:"created_at"`
	StartedAt       *time.Time `json:"started_at"`
	CompletedAt     *time.Time `json:"completed_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type ErrorLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TaskID    string    `gorm:"index;not null" json:"task_id"`
	FilePath  string    `gorm:"not null" json:"file_path"`
	ErrorMsg  string    `gorm:"type:text;not null" json:"error_msg"`
	ErrorType string    `gorm:"default:upload" json:"error_type"` // upload/verify
	Retried   int       `gorm:"default:0" json:"retried"`
	CreatedAt time.Time `json:"created_at"`
}

func InitDB(dbPath string) error {
	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return err
	}

	return DB.AutoMigrate(&MigrationTask{}, &ErrorLog{})
}

const (
	StatusPending   = "pending"
	StatusRunning   = "running"
	StatusVerifying = "verifying" // New: file verification in progress
	StatusPaused    = "paused"
	StatusCompleted = "completed"
	StatusFailed    = "failed"
	StatusCancelled = "cancelled"
)
