package models

import "time"

type FolderInfo struct {
	Path         string       `json:"path"`
	Name         string       `json:"name"`
	Size         int64        `json:"size"`
	FileCount    int          `json:"file_count"`
	ModifiedTime time.Time    `json:"modified_time"`
	Children     []FolderInfo `json:"children,omitempty"`
}

type VolumeInfo struct {
	Name    string       `json:"name"`
	Path    string       `json:"path"`
	Folders []FolderInfo `json:"folders"`
}

type ScanResult struct {
	Volumes   []VolumeInfo `json:"volumes"`
	ScannedAt time.Time    `json:"scanned_at"`
}
