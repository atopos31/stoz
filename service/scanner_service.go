package service

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/atopos31/stoz/common"
	"github.com/atopos31/stoz/config"
	"github.com/atopos31/stoz/models"
)

type ScannerService struct {
	cache      *models.ScanResult
	cacheTime  time.Time
	cacheMutex sync.RWMutex
}

func NewScannerService() *ScannerService {
	return &ScannerService{}
}

func (s *ScannerService) Scan() (*models.ScanResult, error) {
	s.cacheMutex.RLock()
	if s.cache != nil && time.Since(s.cacheTime) < config.AppConfig.Scan.CacheTTL {
		defer s.cacheMutex.RUnlock()
		common.Info("Returning cached scan result")
		return s.cache, nil
	}
	s.cacheMutex.RUnlock()

	common.Info("Starting new scan")
	result, err := s.performScan()
	if err != nil {
		return nil, err
	}

	s.cacheMutex.Lock()
	s.cache = result
	s.cacheTime = time.Now()
	s.cacheMutex.Unlock()

	return result, nil
}

func (s *ScannerService) performScan() (*models.ScanResult, error) {
	hostPath := config.AppConfig.Scan.HostPath
	entries, err := os.ReadDir(hostPath)
	if err != nil {
		common.Errorf("Failed to read host path %s: %v", hostPath, err)
		return nil, err
	}

	var volumes []models.VolumeInfo
	var wg sync.WaitGroup
	volumeChan := make(chan models.VolumeInfo, 10)

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		name := entry.Name()
		if !strings.HasPrefix(name, "volume") {
			continue
		}

		wg.Add(1)
		go func(volumeName string) {
			defer wg.Done()

			volumePath := filepath.Join(hostPath, volumeName)
			folders, err := s.scanVolume(volumePath)
			if err != nil {
				common.Errorf("Failed to scan volume %s: %v", volumeName, err)
				return
			}

			volumeChan <- models.VolumeInfo{
				Name:    volumeName,
				Path:    volumePath,
				Folders: folders,
			}
		}(name)
	}

	go func() {
		wg.Wait()
		close(volumeChan)
	}()

	for volume := range volumeChan {
		volumes = append(volumes, volume)
	}

	return &models.ScanResult{
		Volumes:   volumes,
		ScannedAt: time.Now(),
	}, nil
}

func (s *ScannerService) scanVolume(volumePath string) ([]models.FolderInfo, error) {
	entries, err := os.ReadDir(volumePath)
	if err != nil {
		return nil, err
	}

	folders := make([]models.FolderInfo, 0)
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		name := entry.Name()
		if strings.HasPrefix(name, "@") {
			continue
		}

		folderPath := filepath.Join(volumePath, name)
		info, err := entry.Info()
		if err != nil {
			common.Warnf("Failed to get info for %s: %v", folderPath, err)
			continue
		}

		folderInfo := models.FolderInfo{
			Path:         folderPath,
			Name:         name,
			ModifiedTime: info.ModTime(),
			Size:         0,
			FileCount:    0,
		}

		folders = append(folders, folderInfo)
	}

	return folders, nil
}

func (s *ScannerService) GetFolderDetails(folderPath string, includeRecycle bool) (*models.FolderInfo, error) {
	info, err := os.Stat(folderPath)
	if err != nil {
		return nil, err
	}

	if !info.IsDir() {
		return nil, os.ErrInvalid
	}

	var totalSize int64
	var fileCount int

	err = filepath.WalkDir(folderPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}

		if d.IsDir() {
			// Skip system directories starting with @
			if strings.HasPrefix(d.Name(), "@") {
				return filepath.SkipDir
			}
			// Skip #recycle directories if not including recycle bin
			if !includeRecycle && d.Name() == "#recycle" {
				return filepath.SkipDir
			}
			return nil
		}

		info, err := d.Info()
		if err == nil {
			totalSize += info.Size()
			fileCount++
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return &models.FolderInfo{
		Path:         folderPath,
		Name:         filepath.Base(folderPath),
		Size:         totalSize,
		FileCount:    fileCount,
		ModifiedTime: info.ModTime(),
	}, nil
}
