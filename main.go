package main

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"

	"github.com/atopos31/stoz/common"
	"github.com/atopos31/stoz/config"
	"github.com/atopos31/stoz/handler"
	"github.com/atopos31/stoz/middleware"
	"github.com/atopos31/stoz/models"
	"github.com/atopos31/stoz/worker"
	"github.com/gin-gonic/gin"
)

//go:embed webui/dist
var webFS embed.FS

//go:embed webui/dist/index.html
var indexHTML []byte

func main() {
	if err := config.Load(); err != nil {
		panic("Failed to load config: " + err.Error())
	}

	common.InitLogger(config.AppConfig.Server.LogLevel)
	common.Infof("Starting STOZ application on port %s", config.AppConfig.Server.Port)

	if err := models.InitDB(config.AppConfig.Database.Path); err != nil {
		common.Fatalf("Failed to initialize database: %v", err)
	}
	common.Info("Database initialized successfully")

	worker.GetWorkerPool()
	common.Info("Worker pool initialized")

	gin.SetMode(config.AppConfig.Server.GinMode)
	router := gin.New()

	router.Use(middleware.Recovery())
	router.Use(middleware.CORS())
	router.Use(gin.Logger())

	
	setupRoutes(router)

	common.Infof("Server listening on :%s", config.AppConfig.Server.Port)
	if err := router.Run(":" + config.AppConfig.Server.Port); err != nil {
		common.Fatalf("Failed to start server: %v", err)
	}
}

func setupRoutes(router *gin.Engine) {
	healthHandler := handler.NewHealthHandler()
	scanHandler := handler.NewScanHandler()
	migrationHandler := handler.NewMigrationHandler()
	discoveryHandler := handler.NewDiscoveryHandler()

	api := router.Group("/api/v1")
	{
		api.GET("/health", healthHandler.Health)
		api.GET("/scan", scanHandler.Scan)
		api.POST("/folder/details", scanHandler.GetFolderDetails)
		api.GET("/discover", discoveryHandler.Discover)
		api.POST("/zimaos/test", migrationHandler.TestConnection)
		api.POST("/migration", migrationHandler.CreateMigration)
		api.GET("/migration/:taskId", migrationHandler.GetMigrationStatus)
		api.GET("/migrations", migrationHandler.ListMigrations)
		api.POST("/migration/:taskId/pause", migrationHandler.PauseMigration)
		api.POST("/migration/:taskId/resume", migrationHandler.ResumeMigration)
		api.POST("/migration/:taskId/cancel", migrationHandler.CancelMigration)
	}

	distFS, err := fs.Sub(webFS, "webui/dist/assets")
	if err == nil {
		router.StaticFS("/assets", http.FS(distFS))
	} else {
		common.Warnf("Frontend assets not found: %v", err)
	}

	router.NoRoute(func(c *gin.Context) {
		if c.Request.Method == http.MethodGet && !strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.Data(http.StatusOK, "text/html; charset=utf-8", indexHTML)
			return
		}
		c.Data(http.StatusNotFound, "text/plain; charset=utf-8", []byte("404 Not Found"))
	})
}
