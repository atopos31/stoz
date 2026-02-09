package service

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/atopos31/stoz/common"
	"github.com/atopos31/stoz/models"
	"github.com/google/uuid"
)

type MigrationService struct {
	taskStatus sync.Map
}

type TaskStatus struct {
	TaskID                 string  `json:"task_id"`
	Status                 string  `json:"status"`
	CurrentFile            string  `json:"current_file"`
	CurrentFileSize        int64   `json:"current_file_size"`
	CurrentFileTransferred int64   `json:"current_file_transferred"`
	CurrentFileProgress    float64 `json:"current_file_progress"`
	Speed                  int64   `json:"speed"`
	ProcessedFiles         int     `json:"processed_files"`
	TotalFiles             int     `json:"total_files"`
	TransferredSize        int64   `json:"transferred_size"`
	TotalSize              int64   `json:"total_size"`
	Progress               float64 `json:"progress"`
	FailedFiles            int     `json:"failed_files"`
	// Verification progress fields
	VerifyingFiles    int       `json:"verifying_files"`     // Number of files verified
	VerifyFailedFiles int       `json:"verify_failed_files"` // Number of verification failures
	StartedAt         time.Time `json:"started_at"`
	UpdatedAt         time.Time `json:"updated_at"`

	// Path information fields
	SourceFolders []string `json:"source_folders"` // Source folder paths
	ZimaOSHost    string   `json:"zimaos_host"`    // ZimaOS host address
	BasePath      string   `json:"base_path"`      // Target base path
	Error         string   `json:"error"`          // Error message when failed
}

type MigrationOptions struct {
	OverwriteExisting bool `json:"overwrite_existing"`
	SkipErrors        bool `json:"skip_errors"`
	PreserveTimes     bool `json:"preserve_times"`
	IncludeRecycle    bool `json:"include_recycle"`
}

var migrationService *MigrationService
var once sync.Once

func GetMigrationService() *MigrationService {
	once.Do(func() {
		migrationService = &MigrationService{}
	})
	return migrationService
}

func (s *MigrationService) CreateTask(sourceFolders []string, host, username, password, basePath string, options MigrationOptions) (string, error) {
	taskID := uuid.New().String()

	optionsJSON, err := json.Marshal(options)
	if err != nil {
		return "", fmt.Errorf("failed to marshal options: %w", err)
	}

	sourceFoldersJSON, err := json.Marshal(sourceFolders)
	if err != nil {
		return "", fmt.Errorf("failed to marshal source folders: %w", err)
	}

	task := &models.MigrationTask{
		TaskID:         taskID,
		Status:         models.StatusPending,
		SourceFolders:  string(sourceFoldersJSON),
		ZimaOSHost:     host,
		ZimaOSUsername: username,
		ZimaOSPassword: password,
		BasePath:       basePath,
		Options:        string(optionsJSON),
		Progress:       0,
	}

	if err := models.DB.Create(task).Error; err != nil {
		return "", fmt.Errorf("failed to create task: %w", err)
	}

	common.Infof("Created migration task: %s", taskID)
	return taskID, nil
}

func (s *MigrationService) GetTask(taskID string) (*models.MigrationTask, error) {
	var task models.MigrationTask
	if err := models.DB.Where("task_id = ?", taskID).First(&task).Error; err != nil {
		return nil, err
	}
	return &task, nil
}

func (s *MigrationService) GetTaskStatus(taskID string) (*TaskStatus, error) {
	// Always get task from database to fill path information
	task, err := s.GetTask(taskID)
	if err != nil {
		return nil, err
	}

	// Parse source_folders from JSON string
	var sourceFolders []string
	if err := json.Unmarshal([]byte(task.SourceFolders), &sourceFolders); err != nil {
		common.Warnf("Failed to parse source_folders for task %s: %v", taskID, err)
		sourceFolders = []string{} // Default to empty array
	}

	// Check if there's a runtime status in cache
	if status, ok := s.taskStatus.Load(taskID); ok {
		cachedStatus := status.(*TaskStatus)
		// Fill path information into cached status
		cachedStatus.SourceFolders = sourceFolders
		cachedStatus.ZimaOSHost = task.ZimaOSHost
		cachedStatus.BasePath = task.BasePath
		cachedStatus.Error = task.Error
		return cachedStatus, nil
	}

	// No cache, return status from database
	return &TaskStatus{
		TaskID:          task.TaskID,
		Status:          task.Status,
		ProcessedFiles:  task.ProcessedFiles,
		TotalFiles:      task.TotalFiles,
		TransferredSize: task.TransferredSize,
		TotalSize:       task.TotalSize,
		Progress:        task.Progress,
		FailedFiles:     task.FailedFiles,
		UpdatedAt:       task.UpdatedAt,

		// Fill path information
		SourceFolders: sourceFolders,
		ZimaOSHost:    task.ZimaOSHost,
		BasePath:      task.BasePath,
		Error:         task.Error,
	}, nil
}

func (s *MigrationService) UpdateTaskStatus(taskID string, status *TaskStatus) {
	s.taskStatus.Store(taskID, status)
}

func (s *MigrationService) UpdateTask(task *models.MigrationTask) error {
	return models.DB.Save(task).Error
}

func (s *MigrationService) ListTasks(limit, offset int) ([]*models.MigrationTask, int64, error) {
	var tasks []*models.MigrationTask
	var total int64

	if err := models.DB.Model(&models.MigrationTask{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := models.DB.Order("created_at desc").Limit(limit).Offset(offset).Find(&tasks).Error; err != nil {
		return nil, 0, err
	}

	return tasks, total, nil
}

func (s *MigrationService) CancelTask(taskID string) error {
	task, err := s.GetTask(taskID)
	if err != nil {
		return err
	}

	if task.Status == models.StatusCompleted || task.Status == models.StatusCancelled {
		return fmt.Errorf("task is already completed or cancelled")
	}

	task.Status = models.StatusCancelled
	now := time.Now()
	task.CompletedAt = &now
	return s.UpdateTask(task)
}
