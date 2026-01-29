package storage

import (
	"encoding/base64"
	"os"
	"strings"
	"testing"
)

func TestLocalStorage_SaveBase64Image(t *testing.T) {
	// Setup temporary directory
	tempDir, err := os.MkdirTemp("", "storage_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	storage, err := NewLocalStorage(tempDir, "http://localhost:8080/storage")
	if err != nil {
		t.Fatalf("Failed to create storage: %v", err)
	}

	// Test case 1: Valid Base64 PNG with header
	t.Run("Valid Base64 PNG with Header", func(t *testing.T) {
		content := "Hello World"
		encoded := base64.StdEncoding.EncodeToString([]byte(content))
		base64Str := "data:image/png;base64," + encoded

		result, err := storage.SaveBase64Image(base64Str, "test_images")
		if err != nil {
			t.Fatalf("Failed to save base64 image: %v", err)
		}

		if !strings.HasSuffix(result.URL, ".png") {
			t.Errorf("Expected URL to end with .png, got %s", result.URL)
		}

		// Verify file content
		savedContent, err := os.ReadFile(result.AbsolutePath)
		if err != nil {
			t.Fatalf("Failed to read saved file: %v", err)
		}

		if string(savedContent) != content {
			t.Errorf("Expected content %s, got %s", content, string(savedContent))
		}
	})

	// Test case 2: Valid Base64 without header (default extension)
	t.Run("Valid Base64 without Header", func(t *testing.T) {
		content := "Test Data"
		encoded := base64.StdEncoding.EncodeToString([]byte(content))

		result, err := storage.SaveBase64Image(encoded, "test_images")
		if err != nil {
			t.Fatalf("Failed to save base64 image: %v", err)
		}

		// Verify file exists
		if _, err := os.Stat(result.AbsolutePath); os.IsNotExist(err) {
			t.Errorf("File was not created at %s", result.AbsolutePath)
		}
	})

	// Test case 3: Invalid Base64
	t.Run("Invalid Base64", func(t *testing.T) {
		invalidBase64 := "Invalid Base64 String"
		_, err := storage.SaveBase64Image(invalidBase64, "test_images")
		if err == nil {
			t.Error("Expected error for invalid base64, got nil")
		}
	})
}
