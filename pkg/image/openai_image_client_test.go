package image

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestOpenAIImageClientStrictGenerationsUsesB64JSON(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/images/generations" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Fatalf("missing authorization header")
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("read body: %v", err)
		}
		var payload map[string]interface{}
		if err := json.Unmarshal(body, &payload); err != nil {
			t.Fatalf("unmarshal body: %v", err)
		}
		if _, ok := payload["image"]; ok {
			t.Fatalf("strict OpenAI generations should not include image field")
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"created":1,"data":[{"b64_json":"aGVsbG8="}]}`))
	}))
	defer server.Close()

	client := NewOpenAIImageClient(server.URL, "test-key", "gpt-image-1.5", "/images/generations", true)
	result, err := client.GenerateImage("a prompt", WithSize("1024x1024"), WithQuality("low"))
	if err != nil {
		t.Fatalf("GenerateImage failed: %v", err)
	}
	if !result.Completed {
		t.Fatalf("expected completed=true")
	}
	if !strings.HasPrefix(result.ImageURL, "data:image/png;base64,") {
		t.Fatalf("expected data URI result, got: %s", result.ImageURL)
	}
}

func TestOpenAIImageClientStrictEditUsesMultipartAndEditsEndpoint(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/images/edits" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		contentType := r.Header.Get("Content-Type")
		if !strings.Contains(contentType, "multipart/form-data") {
			t.Fatalf("unexpected content type: %s", contentType)
		}

		reader, err := r.MultipartReader()
		if err != nil {
			t.Fatalf("multipart reader: %v", err)
		}

		var hasPrompt bool
		var hasImage bool
		for {
			part, err := reader.NextPart()
			if err == io.EOF {
				break
			}
			if err != nil {
				t.Fatalf("next part: %v", err)
			}

			switch part.FormName() {
			case "prompt":
				promptBytes, _ := io.ReadAll(part)
				if len(promptBytes) == 0 {
					t.Fatalf("empty prompt field")
				}
				hasPrompt = true
			case "image", "image[]":
				imageBytes, _ := io.ReadAll(part)
				if len(imageBytes) == 0 {
					t.Fatalf("empty image part")
				}
				hasImage = true
			}
		}

		if !hasPrompt {
			t.Fatalf("missing prompt field")
		}
		if !hasImage {
			t.Fatalf("missing image field")
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"created":1,"data":[{"b64_json":"aGVsbG8="}]}`))
	}))
	defer server.Close()

	// "hello" => data URI
	dataURI := "data:image/png;base64," + base64.StdEncoding.EncodeToString([]byte("hello"))
	client := NewOpenAIImageClient(server.URL, "test-key", "gpt-image-1.5", "/images/generations", true)
	result, err := client.GenerateImage("edit prompt", WithReferenceImages([]string{dataURI}))
	if err != nil {
		t.Fatalf("GenerateImage failed: %v", err)
	}
	if !result.Completed {
		t.Fatalf("expected completed=true")
	}
	if !strings.HasPrefix(result.ImageURL, "data:image/png;base64,") {
		t.Fatalf("expected data URI result, got: %s", result.ImageURL)
	}
}

func TestOpenAIImageClientLegacyKeepsCompatibleImageField(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/images/generations" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if ct := r.Header.Get("Content-Type"); !strings.Contains(ct, "application/json") {
			t.Fatalf("unexpected content type: %s", ct)
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("read body: %v", err)
		}
		var payload struct {
			Image []string `json:"image"`
		}
		if err := json.Unmarshal(body, &payload); err != nil {
			t.Fatalf("unmarshal payload: %v", err)
		}
		if len(payload.Image) != 1 {
			t.Fatalf("expected legacy mode to send image field, got: %v", payload.Image)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"created":1,"data":[{"url":"https://example.com/image.png"}]}`))
	}))
	defer server.Close()

	client := NewOpenAIImageClient(server.URL, "test-key", "legacy-model", "/images/generations", false)
	result, err := client.GenerateImage("legacy prompt", WithReferenceImages([]string{"dummy"}))
	if err != nil {
		t.Fatalf("GenerateImage failed: %v", err)
	}
	if result.ImageURL != "https://example.com/image.png" {
		t.Fatalf("unexpected image url: %s", result.ImageURL)
	}
}

func TestCreateImageFormPartSetsHeaders(t *testing.T) {
	t.Parallel()

	var b strings.Builder
	writer := multipart.NewWriter(&b)
	part, err := createImageFormPart(writer, "image", "a.png", "image/png")
	if err != nil {
		t.Fatalf("createImageFormPart failed: %v", err)
	}
	_, _ = part.Write([]byte("x"))
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}
	if !strings.Contains(b.String(), "Content-Type: image/png") {
		t.Fatalf("missing image content-type header")
	}
}
