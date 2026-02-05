package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"github.com/atopos31/stoz/common"
)

// cancelableReader wraps io.Reader and supports cancellation via context
type cancelableReader struct {
	ctx    context.Context
	reader io.Reader
}

func (r *cancelableReader) Read(p []byte) (n int, err error) {
	// Check if context is cancelled before each read
	select {
	case <-r.ctx.Done():
		return 0, r.ctx.Err()
	default:
	}
	return r.reader.Read(p)
}

type ZimaOSClient struct {
	host     string
	username string
	password string
	token    string
	client   *http.Client
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success int    `json:"success"`
	Message string `json:"message"`
	Data    struct {
		Token interface{} `json:"token"` // Can be string or TokenObject
		User  interface{} `json:"user"`
	} `json:"data"`
}

type TokenObject struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
}

type CreateFolderRequest struct {
	Path string `json:"path"`
}

type UploadResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// FileMetadata represents file metadata from ZimaOS
type FileMetadata struct {
	Name       string                 `json:"name"`
	Size       int64                  `json:"size"`
	Modified   int64                  `json:"modified"` // Unix timestamp
	IsDir      bool                   `json:"is_dir"`
	Path       string                 `json:"path"`
	Extensions map[string]interface{} `json:"extensions"`
}

// FileListResponse represents the response from listing files
type FileListResponse struct {
	Content []FileMetadata `json:"content"`
	Index   int            `json:"index"`
	Size    int            `json:"size"`
	Total   int            `json:"total"`
}

// StorageDevice represents a storage device from ZimaOS
type StorageDevice struct {
	Name       string                 `json:"name"`
	Path       string                 `json:"path"`
	Type       string                 `json:"type"`
	Font       string                 `json:"font"`
	Extensions map[string]interface{} `json:"extensions"`
}

func NewZimaOSClient(host, username, password string) *ZimaOSClient {
	return &ZimaOSClient{
		host:     host,
		username: username,
		password: password,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *ZimaOSClient) Login() error {
	loginReq := LoginRequest{
		Username: c.username,
		Password: c.password,
	}

	body, err := json.Marshal(loginReq)
	if err != nil {
		return fmt.Errorf("failed to marshal login request: %w", err)
	}

	url := fmt.Sprintf("%s/v1/users/login", c.host)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create login request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("login request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("login failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Read body once
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}

	// Try to parse as structured response
	var loginResp LoginResponse
	if err := json.Unmarshal(bodyBytes, &loginResp); err != nil {
		return fmt.Errorf("failed to decode login response: %w", err)
	}

	// Try to extract token from different response formats
	if loginResp.Data.Token != nil {
		switch token := loginResp.Data.Token.(type) {
		case string:
			// Old format: token is a string
			c.token = token
		case map[string]interface{}:
			// New format: token is an object with access_token
			if accessToken, ok := token["access_token"].(string); ok {
				c.token = accessToken
			} else if refreshToken, ok := token["refresh_token"].(string); ok {
				c.token = refreshToken
			}
		}
	}

	// Fallback: try to find token in raw response
	if c.token == "" {
		var rawResp map[string]interface{}
		if err := json.Unmarshal(bodyBytes, &rawResp); err == nil {
			// Try data.token as string
			if data, ok := rawResp["data"].(map[string]interface{}); ok {
				if token, ok := data["token"].(string); ok {
					c.token = token
				} else if tokenObj, ok := data["token"].(map[string]interface{}); ok {
					if accessToken, ok := tokenObj["access_token"].(string); ok {
						c.token = accessToken
					}
				}
			}
			// Try top-level token
			if c.token == "" {
				if token, ok := rawResp["token"].(string); ok {
					c.token = token
				}
			}
		}
	}

	if c.token == "" {
		return fmt.Errorf("no token received from login response")
	}

	common.Infof("Successfully logged in to ZimaOS, token: %s", c.token[:10]+"...")
	return nil
}

func (c *ZimaOSClient) TestConnection() error {
	if err := c.Login(); err != nil {
		return err
	}
	return nil
}

func (c *ZimaOSClient) CreateFolder(path string) error {
	if c.token == "" {
		if err := c.Login(); err != nil {
			return err
		}
	}

	createReq := CreateFolderRequest{
		Path: path,
	}

	body, err := json.Marshal(createReq)
	if err != nil {
		return fmt.Errorf("failed to marshal create folder request: %w", err)
	}

	url := fmt.Sprintf("%s/v2_1/files/folder", c.host)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create folder request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", c.token)

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("create folder request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
		common.Infof("Folder created or already exists: %s", path)
		return nil
	}

	bodyBytes, _ := io.ReadAll(resp.Body)
	bodyStr := string(bodyBytes)

	// Check for plain text error messages
	if resp.StatusCode == http.StatusConflict ||
		(resp.StatusCode >= 400 && (string(bodyBytes) == "" ||
			bodyStr == "folder already exists" ||
			bodyStr == "directory already exists")) {
		common.Infof("Folder already exists: %s", path)
		return nil
	}

	// Check for JSON error response with "path already exist" message
	if resp.StatusCode >= 400 {
		var errorResp map[string]interface{}
		if err := json.Unmarshal(bodyBytes, &errorResp); err == nil {
			if msg, ok := errorResp["message"].(string); ok {
				if msg == "path already exist" || msg == "folder already exists" || msg == "directory already exists" {
					common.Infof("Folder already exists: %s", path)
					return nil
				}
			}
		}
	}

	return fmt.Errorf("create folder failed with status %d: %s", resp.StatusCode, bodyStr)
}

func (c *ZimaOSClient) UploadFile(ctx context.Context, localPath, remotePath string, onProgress func(delta int64)) error {
	if c.token == "" {
		if err := c.Login(); err != nil {
			return err
		}
	}

	file, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return fmt.Errorf("failed to stat file: %w", err)
	}

	// Use pipe for streaming upload to avoid loading entire file into memory
	pr, pw := io.Pipe()
	mw := multipart.NewWriter(pw)

	// Write multipart data in a goroutine
	go func() {
		defer pw.Close() // Must close pw after mw to signal EOF
		defer mw.Close() // Must close mw first to write ending boundary

		// Write form fields first
		if err := mw.WriteField("path", filepath.Dir(remotePath)); err != nil {
			common.Errorf("Failed to write path field: %v", err)
			return
		}

		// Create form file part
		part, err := mw.CreateFormFile("file", filepath.Base(localPath))
		if err != nil {
			common.Errorf("Failed to create form file: %v", err)
			return
		}

		// Use cancelable reader to wrap the file
		cancelableFile := &cancelableReader{ctx: ctx, reader: file}

		progressReader := &progressReader{
			reader:     cancelableFile,
			onProgress: onProgress,
		}

		// Copy file content (can be cancelled by context)
		if _, err := io.Copy(part, progressReader); err != nil {
			if err == context.Canceled || err == context.DeadlineExceeded {
				common.Infof("File upload cancelled: %v", err)
			} else {
				common.Errorf("Failed to copy file: %v", err)
			}
			return
		}

		// Write modTime field
		if err := mw.WriteField("modTime", fmt.Sprintf("%s:%d", filepath.Base(localPath), stat.ModTime().Unix())); err != nil {
			common.Errorf("Failed to write modTime field: %v", err)
			return
		}
	}()

	// Use context to create request (cancelable)
	url := fmt.Sprintf("%s/v2_1/files/file/uploadV2", c.host)
	req, err := http.NewRequestWithContext(ctx, "POST", url, pr)
	if err != nil {
		return fmt.Errorf("failed to create upload request: %w", err)
	}

	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Authorization", c.token)

	uploadClient := &http.Client{
		Timeout: 0,
	}

	// Send request (will be interrupted when context is cancelled)
	resp, err := uploadClient.Do(req)
	if err != nil {
		// Check if it's a cancellation error
		if err == context.Canceled {
			return fmt.Errorf("upload cancelled by user")
		}
		if err == context.DeadlineExceeded {
			return fmt.Errorf("upload deadline exceeded")
		}
		return fmt.Errorf("upload request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("upload failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	common.Infof("File uploaded successfully: %s -> %s", localPath, remotePath)
	return nil
}

type progressReader struct {
	reader     io.Reader
	onProgress func(delta int64)
}

func (p *progressReader) Read(buf []byte) (int, error) {
	n, err := p.reader.Read(buf)
	if n > 0 && p.onProgress != nil {
		p.onProgress(int64(n))
	}
	return n, err
}

func (c *ZimaOSClient) GetToken() string {
	return c.token
}

// GetFileInfo retrieves metadata for a specific file from ZimaOS
// It queries the parent directory and finds the target file
func (c *ZimaOSClient) GetFileInfo(filePath string) (*FileMetadata, error) {
	if c.token == "" {
		if err := c.Login(); err != nil {
			return nil, err
		}
	}

	// Get parent directory
	parentDir := filepath.Dir(filePath)
	fileName := filepath.Base(filePath)

	// Query directory listing with all required parameters
	// Use url.QueryEscape to properly encode the path (handles Chinese and special characters)
	requestURL := fmt.Sprintf("%s/v2_1/files/file?path=%s&index=0&size=10000&sfz=true&sort=name&direction=asc",
		c.host, url.QueryEscape(parentDir))
	req, err := http.NewRequest("GET", requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", c.token)
	req.Header.Set("Accept", "application/json, text/plain, */*")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get file list with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var fileList FileListResponse
	if err := json.Unmarshal(bodyBytes, &fileList); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Find the target file in the list
	for _, file := range fileList.Content {
		if file.Name == fileName {
			return &file, nil
		}
	}

	return nil, fmt.Errorf("file not found: %s", filePath)
}

// DownloadPartialFile downloads a portion of a file from ZimaOS
// size: number of bytes to download from the beginning (e.g., 1MB = 1048576)
func (c *ZimaOSClient) DownloadPartialFile(filePath string, size int64) ([]byte, error) {
	if c.token == "" {
		if err := c.Login(); err != nil {
			return nil, err
		}
	}

	// Use ZimaOS v3/file download API
	// token, files, and action are query parameters
	requestURL := fmt.Sprintf("%s/v3/file?token=%s&files=%s&action=download",
		c.host, c.token, url.QueryEscape(filePath))
	req, err := http.NewRequest("GET", requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
	// Set Range header to request only the first 'size' bytes
	req.Header.Set("Range", fmt.Sprintf("bytes=0-%d", size-1))

	downloadClient := &http.Client{
		Timeout: 60 * time.Second, // Longer timeout for downloads
	}

	resp, err := downloadClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	// Accept both 200 (full content) and 206 (partial content) status codes
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusPartialContent {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("download failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Read the response body (will be limited by Range header if supported)
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// If the server doesn't support Range requests, manually limit the data
	if int64(len(data)) > size {
		data = data[:size]
	}

	return data, nil
}

// GetStorageList retrieves the list of storage devices from ZimaOS
func (c *ZimaOSClient) GetStorageList() ([]StorageDevice, error) {
	if c.token == "" {
		if err := c.Login(); err != nil {
			return nil, err
		}
	}

	requestURL := fmt.Sprintf("%s/v2/local_storage/storages", c.host)
	req, err := http.NewRequest("GET", requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", c.token)
	req.Header.Set("Accept", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get storage list with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var storages []StorageDevice
	if err := json.Unmarshal(bodyBytes, &storages); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	common.Infof("Retrieved %d storage devices from ZimaOS", len(storages))
	return storages, nil
}
