package worker

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"math"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/atopos31/stoz/common"
	"github.com/atopos31/stoz/config"
	"github.com/atopos31/stoz/models"
	"github.com/atopos31/stoz/service"
)

type WorkerPool struct {
	taskQueue    chan string
	workers      int
	migrationSvc *service.MigrationService
	stopChan     chan struct{}
	wg           sync.WaitGroup
}

var pool *WorkerPool
var poolOnce sync.Once

func GetWorkerPool() *WorkerPool {
	poolOnce.Do(func() {
		pool = &WorkerPool{
			taskQueue:    make(chan string, 100),
			workers:      config.AppConfig.Worker.Count,
			migrationSvc: service.GetMigrationService(),
			stopChan:     make(chan struct{}),
		}
		pool.Start()
	})
	return pool
}

func (p *WorkerPool) Start() {
	for i := 0; i < p.workers; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}
	common.Infof("Started %d migration workers", p.workers)
}

func (p *WorkerPool) Stop() {
	close(p.stopChan)
	p.wg.Wait()
	common.Info("All migration workers stopped")
}

func (p *WorkerPool) SubmitTask(taskID string) {
	p.taskQueue <- taskID
}

func (p *WorkerPool) worker(id int) {
	defer p.wg.Done()
	common.Infof("Worker %d started", id)

	for {
		select {
		case <-p.stopChan:
			common.Infof("Worker %d stopping", id)
			return
		case taskID := <-p.taskQueue:
			common.Infof("Worker %d processing task %s", id, taskID)
			if err := p.processTask(taskID); err != nil {
				common.Errorf("Worker %d failed to process task %s: %v", id, taskID, err)
			}
		}
	}
}

func (p *WorkerPool) processTask(taskID string) error {
	task, err := p.migrationSvc.GetTask(taskID)
	if err != nil {
		return fmt.Errorf("failed to get task: %w", err)
	}

	if task.Status == models.StatusCancelled {
		common.Infof("Task %s is cancelled, skipping", taskID)
		return nil
	}

	task.Status = models.StatusRunning
	now := time.Now()
	task.StartedAt = &now
	if err := p.migrationSvc.UpdateTask(task); err != nil {
		return fmt.Errorf("failed to update task status: %w", err)
	}

	var options service.MigrationOptions
	if err := json.Unmarshal([]byte(task.Options), &options); err != nil {
		options = service.MigrationOptions{
			OverwriteExisting: false,
			SkipErrors:        true,
			PreserveTimes:     true,
		}
	}

	var sourceFolders []string
	if err := json.Unmarshal([]byte(task.SourceFolders), &sourceFolders); err != nil {
		return p.failTask(task, fmt.Errorf("failed to parse source folders: %w", err))
	}

	client := service.NewZimaOSClient(task.ZimaOSHost, task.ZimaOSUsername, task.ZimaOSPassword)
	if err := client.Login(); err != nil {
		return p.failTask(task, fmt.Errorf("failed to login to ZimaOS: %w", err))
	}

	common.Infof("Successfully logged in to ZimaOS for task %s", taskID)

	fileList, totalSize, err := p.scanFolders(sourceFolders, task.BasePath, options)
	if err != nil {
		return p.failTask(task, fmt.Errorf("failed to scan folders: %w", err))
	}

	task.TotalFiles = len(fileList)
	task.TotalSize = totalSize
	if err := p.migrationSvc.UpdateTask(task); err != nil {
		common.Errorf("Failed to update task file count: %v", err)
	}

	common.Infof("Task %s: Found %d files, total size: %d bytes", taskID, len(fileList), totalSize)

	status := &service.TaskStatus{
		TaskID:          taskID,
		Status:          models.StatusRunning,
		TotalFiles:      len(fileList),
		TotalSize:       totalSize,
		ProcessedFiles:  0,
		TransferredSize: 0,
		Progress:        0,
		FailedFiles:     0,
		StartedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	p.migrationSvc.UpdateTaskStatus(taskID, status)

	startTime := time.Now()
	lastUpdateTime := time.Now()
	var lastTransferredSize int64

	for i, fileInfo := range fileList {
		task, err := p.migrationSvc.GetTask(taskID)
		if err != nil {
			common.Errorf("Failed to get task status: %v", err)
			break
		}

		if task.Status == models.StatusCancelled {
			common.Infof("Task %s cancelled", taskID)
			return nil
		}

		if task.Status == models.StatusPaused {
			common.Infof("Task %s paused, waiting for resume", taskID)
			for {
				time.Sleep(5 * time.Second)
				task, err := p.migrationSvc.GetTask(taskID)
				if err != nil || task.Status == models.StatusCancelled {
					return nil
				}
				if task.Status == models.StatusPending {
					task.Status = models.StatusRunning
					p.migrationSvc.UpdateTask(task)
					break
				}
			}
		}

		status.CurrentFile = fileInfo.LocalPath

		remoteDir := filepath.Dir(fileInfo.RemotePath)
		if err := client.CreateFolder(remoteDir); err != nil {
			common.Errorf("Failed to create remote folder %s: %v", remoteDir, err)
			if !options.SkipErrors {
				return p.failTask(task, fmt.Errorf("failed to create folder: %w", err))
			}
			status.FailedFiles++
			p.logError(taskID, fileInfo.LocalPath, err)
			continue
		}

		if err := p.uploadFileWithRetry(client, fileInfo.LocalPath, fileInfo.RemotePath, config.AppConfig.Worker.MaxRetries); err != nil {
			common.Errorf("Failed to upload file %s: %v", fileInfo.LocalPath, err)
			if !options.SkipErrors {
				return p.failTask(task, fmt.Errorf("failed to upload file: %w", err))
			}
			status.FailedFiles++
			p.logError(taskID, fileInfo.LocalPath, err)
			continue
		}

		status.ProcessedFiles = i + 1
		status.TransferredSize += fileInfo.Size
		status.Progress = float64(status.TransferredSize) / float64(status.TotalSize) * 100

		now := time.Now()
		if now.Sub(lastUpdateTime) >= 1*time.Second {
			elapsed := now.Sub(startTime).Seconds()
			if elapsed > 0 {
				status.Speed = int64(float64(status.TransferredSize-lastTransferredSize) / now.Sub(lastUpdateTime).Seconds())
				if status.Speed > 0 {
					remaining := status.TotalSize - status.TransferredSize
					status.ETA = int64(float64(remaining) / float64(status.Speed))
				}
			}

			status.UpdatedAt = now
			p.migrationSvc.UpdateTaskStatus(taskID, status)

			task.ProcessedFiles = status.ProcessedFiles
			task.TransferredSize = status.TransferredSize
			task.Progress = status.Progress
			task.FailedFiles = status.FailedFiles
			p.migrationSvc.UpdateTask(task)

			lastUpdateTime = now
			lastTransferredSize = status.TransferredSize
		}
	}

	task.Status = models.StatusCompleted
	task.ProcessedFiles = status.ProcessedFiles
	task.TransferredSize = status.TransferredSize
	task.Progress = 100
	task.FailedFiles = status.FailedFiles
	completedAt := time.Now()
	task.CompletedAt = &completedAt
	if err := p.migrationSvc.UpdateTask(task); err != nil {
		common.Errorf("Failed to update task completion: %v", err)
	}

	status.Status = models.StatusCompleted
	status.Progress = 100
	status.UpdatedAt = time.Now()
	p.migrationSvc.UpdateTaskStatus(taskID, status)

	common.Infof("Task %s completed successfully", taskID)
	return nil
}

type FileInfo struct {
	LocalPath  string
	RemotePath string
	Size       int64
}

func (p *WorkerPool) scanFolders(folders []string, basePath string, options service.MigrationOptions) ([]FileInfo, int64, error) {
	var fileList []FileInfo
	var totalSize int64
	var mu sync.Mutex

	for _, folder := range folders {
		err := filepath.WalkDir(folder, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				common.Warnf("Failed to access path %s: %v", path, err)
				return nil
			}

			if d.IsDir() {
				// Skip directories starting with @ (e.g., @eaDir - Synology thumbnail system)
				if strings.HasPrefix(d.Name(), "@") {
					common.Infof("Skipping system directory: %s", path)
					return filepath.SkipDir
				}
				// Skip #recycle directories if not including recycle bin
				if !options.IncludeRecycle && d.Name() == "#recycle" {
					common.Infof("Skipping recycle bin: %s", path)
					return filepath.SkipDir
				}
				return nil
			}

			info, err := d.Info()
			if err != nil {
				common.Warnf("Failed to get file info for %s: %v", path, err)
				return nil
			}

			relativePath := strings.TrimPrefix(path, folder)
			relativePath = strings.TrimPrefix(relativePath, "/")

			// Add basePath prefix to remote path
			remotePath := filepath.Join(basePath, filepath.Base(folder), relativePath)

			mu.Lock()
			fileList = append(fileList, FileInfo{
				LocalPath:  path,
				RemotePath: remotePath,
				Size:       info.Size(),
			})
			totalSize += info.Size()
			mu.Unlock()

			return nil
		})

		if err != nil {
			return nil, 0, err
		}
	}

	return fileList, totalSize, nil
}

func (p *WorkerPool) uploadFileWithRetry(client *service.ZimaOSClient, localPath, remotePath string, maxRetries int) error {
	var err error
	for i := 0; i < maxRetries; i++ {
		err = client.UploadFile(localPath, remotePath)
		if err == nil {
			return nil
		}

		if i < maxRetries-1 {
			backoff := time.Duration(math.Pow(2, float64(i))) * time.Second
			common.Warnf("Upload failed (attempt %d/%d), retrying in %v: %v", i+1, maxRetries, backoff, err)
			time.Sleep(backoff)
		}
	}

	return fmt.Errorf("upload failed after %d attempts: %w", maxRetries, err)
}

func (p *WorkerPool) failTask(task *models.MigrationTask, err error) error {
	task.Status = models.StatusFailed
	now := time.Now()
	task.CompletedAt = &now
	if updateErr := p.migrationSvc.UpdateTask(task); updateErr != nil {
		common.Errorf("Failed to update failed task: %v", updateErr)
	}

	status := &service.TaskStatus{
		TaskID:    task.TaskID,
		Status:    models.StatusFailed,
		UpdatedAt: time.Now(),
	}
	p.migrationSvc.UpdateTaskStatus(task.TaskID, status)

	return err
}

func (p *WorkerPool) logError(taskID, filePath string, err error) {
	errorLog := &models.ErrorLog{
		TaskID:   taskID,
		FilePath: filePath,
		ErrorMsg: err.Error(),
		Retried:  0,
	}
	if err := models.DB.Create(errorLog).Error; err != nil {
		common.Errorf("Failed to log error: %v", err)
	}
}
