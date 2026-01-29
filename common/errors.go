package common

import "errors"

var (
	ErrInvalidRequest    = errors.New("invalid request")
	ErrTaskNotFound      = errors.New("task not found")
	ErrTaskAlreadyExists = errors.New("task already exists")
	ErrInvalidStatus     = errors.New("invalid status")
	ErrConnectionFailed  = errors.New("connection failed")
	ErrAuthFailed        = errors.New("authentication failed")
	ErrUploadFailed      = errors.New("upload failed")
	ErrFileNotFound      = errors.New("file not found")
	ErrPermissionDenied  = errors.New("permission denied")
)
