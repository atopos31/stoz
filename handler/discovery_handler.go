package handler

import (
	"time"

	"github.com/atopos31/stoz/common"
	"github.com/atopos31/stoz/models"
	"github.com/atopos31/stoz/service"
	"github.com/gin-gonic/gin"
)

type DiscoveryHandler struct {
	discoveryService *service.DiscoveryService
}

func NewDiscoveryHandler() *DiscoveryHandler {
	return &DiscoveryHandler{
		discoveryService: service.NewDiscoveryService(),
	}
}

func (h *DiscoveryHandler) Discover(c *gin.Context) {
	timeout := 5 * time.Second

	devices, err := h.discoveryService.DiscoverDevices(timeout)
	if err != nil {
		common.Errorf("Discovery failed: %v", err)
		models.Error(c, 500, "Discovery failed: "+err.Error())
		return
	}

	models.Success(c, gin.H{
		"devices": devices,
		"count":   len(devices),
	})
}
