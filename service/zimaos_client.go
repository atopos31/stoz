package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/atopos31/stoz/common"
)

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

func (c *ZimaOSClient) UploadFile(localPath, remotePath string) error {
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
		mw.WriteField("path", filepath.Dir(remotePath))
		mw.WriteField("modTime", fmt.Sprintf("%d", stat.ModTime().Unix()))

		// Create form file part
		part, err := mw.CreateFormFile("file", filepath.Base(localPath))
		if err != nil {
			return
		}

		// Stream file content to part
		io.Copy(part, file)
	}()

	// Send request - http client will read from pr in streaming fashion
	url := fmt.Sprintf("%s/v2_1/files/file/uploadV2", c.host)
	req, err := http.NewRequest("POST", url, pr)
	if err != nil {
		return fmt.Errorf("failed to create upload request: %w", err)
	}

	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Authorization", c.token)

	uploadClient := &http.Client{
		Timeout: 0,
	}

	resp, err := uploadClient.Do(req)
	if err != nil {
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

func (c *ZimaOSClient) GetToken() string {
	return c.token
}
