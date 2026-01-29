package handler

import (
	"github.com/atopos31/stoz/common"
	"github.com/atopos31/stoz/models"
	"github.com/atopos31/stoz/service"
	"github.com/gin-gonic/gin"
)

type ScanHandler struct {
	scannerService *service.ScannerService
}

func NewScanHandler() *ScanHandler {
	return &ScanHandler{
		scannerService: service.NewScannerService(),
	}
}

func (h *ScanHandler) Scan(c *gin.Context) {
	result, err := h.scannerService.Scan()
	if err != nil {
		common.Errorf("Scan failed: %v", err)
		models.Error(c, 500, "Scan failed: "+err.Error())
		return
	}

	models.Success(c, result)
}

type GetFolderDetailsRequest struct {
	Path string `json:"path" binding:"required"`
}

func (h *ScanHandler) GetFolderDetails(c *gin.Context) {
	var req GetFolderDetailsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		models.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	details, err := h.scannerService.GetFolderDetails(req.Path)
	if err != nil {
		common.Errorf("Failed to get folder details for %s: %v", req.Path, err)
		models.Error(c, 500, "Failed to get folder details: "+err.Error())
		return
	}

	models.Success(c, details)
}
