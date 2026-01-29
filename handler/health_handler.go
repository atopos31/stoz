package handler

import (
	"github.com/atopos31/stoz/models"
	"github.com/gin-gonic/gin"
)

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

func (h *HealthHandler) Health(c *gin.Context) {
	models.Success(c, gin.H{
		"status": "ok",
	})
}
