package handler

import (
	"strconv"

	"github.com/atopos31/stoz/common"
	"github.com/atopos31/stoz/models"
	"github.com/atopos31/stoz/service"
	"github.com/atopos31/stoz/worker"
	"github.com/gin-gonic/gin"
)

type MigrationHandler struct {
	migrationSvc *service.MigrationService
}

func NewMigrationHandler() *MigrationHandler {
	return &MigrationHandler{
		migrationSvc: service.GetMigrationService(),
	}
}

type TestConnectionRequest struct {
	Host     string `json:"host" binding:"required"`
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *MigrationHandler) TestConnection(c *gin.Context) {
	var req TestConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		models.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	client := service.NewZimaOSClient(req.Host, req.Username, req.Password)
	if err := client.TestConnection(); err != nil {
		common.Errorf("Connection test failed: %v", err)
		models.Error(c, 500, "Connection test failed: "+err.Error())
		return
	}

	models.SuccessWithMessage(c, "Connection successful", gin.H{
		"token": client.GetToken()[:10] + "...",
	})
}

type CreateMigrationRequest struct {
	SourceFolders []string                 `json:"source_folders" binding:"required"`
	ZimaOSHost    string                   `json:"zimaos_host" binding:"required"`
	ZimaOSUser    string                   `json:"zimaos_username" binding:"required"`
	ZimaOSPass    string                   `json:"zimaos_password" binding:"required"`
	BasePath      string                   `json:"base_path" binding:"required"`
	Options       service.MigrationOptions `json:"options"`
}

func (h *MigrationHandler) CreateMigration(c *gin.Context) {
	var req CreateMigrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		models.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	if len(req.SourceFolders) == 0 {
		models.BadRequest(c, "At least one source folder is required")
		return
	}

	taskID, err := h.migrationSvc.CreateTask(
		req.SourceFolders,
		req.ZimaOSHost,
		req.ZimaOSUser,
		req.ZimaOSPass,
		req.BasePath,
		req.Options,
	)
	if err != nil {
		common.Errorf("Failed to create migration task: %v", err)
		models.Error(c, 500, "Failed to create task: "+err.Error())
		return
	}

	worker.GetWorkerPool().SubmitTask(taskID)

	models.Success(c, gin.H{
		"task_id": taskID,
	})
}

func (h *MigrationHandler) GetMigrationStatus(c *gin.Context) {
	taskID := c.Param("taskId")
	if taskID == "" {
		models.BadRequest(c, "Task ID is required")
		return
	}

	status, err := h.migrationSvc.GetTaskStatus(taskID)
	if err != nil {
		common.Errorf("Failed to get task status: %v", err)
		models.Error(c, 404, "Task not found")
		return
	}

	models.Success(c, status)
}

func (h *MigrationHandler) ListMigrations(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	tasks, total, err := h.migrationSvc.ListTasks(limit, offset)
	if err != nil {
		common.Errorf("Failed to list tasks: %v", err)
		models.Error(c, 500, "Failed to list tasks: "+err.Error())
		return
	}

	models.Success(c, gin.H{
		"tasks":  tasks,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func (h *MigrationHandler) CancelMigration(c *gin.Context) {
	taskID := c.Param("taskId")
	if taskID == "" {
		models.BadRequest(c, "Task ID is required")
		return
	}

	if err := h.migrationSvc.CancelTask(taskID); err != nil {
		common.Errorf("Failed to cancel task: %v", err)
		models.Error(c, 500, "Failed to cancel task: "+err.Error())
		return
	}

	models.SuccessWithMessage(c, "Task cancelled", nil)
}

type GetStorageListRequest struct {
	Host     string `json:"host" binding:"required"`
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *MigrationHandler) GetStorageList(c *gin.Context) {
	var req GetStorageListRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		models.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	client := service.NewZimaOSClient(req.Host, req.Username, req.Password)
	if err := client.Login(); err != nil {
		common.Errorf("Login failed: %v", err)
		models.Error(c, 500, "Login failed: "+err.Error())
		return
	}

	storages, err := client.GetStorageList()
	if err != nil {
		common.Errorf("Failed to get storage list: %v", err)
		models.Error(c, 500, "Failed to get storage list: "+err.Error())
		return
	}

	models.Success(c, gin.H{
		"storages": storages,
		"count":    len(storages),
	})
}
