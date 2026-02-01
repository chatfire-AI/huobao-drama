package utils

import (
	"encoding/json"
	"testing"
)

// TestAttemptJSONRepairExcessBraces tests fixing JSON with excess closing braces
// This is the fix for issue #28: AI sometimes returns JSON with extra closing braces
func TestAttemptJSONRepairExcessBraces(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{
			name:    "normal JSON",
			input:   `{"backgrounds": [{"location": "test", "prompt": "hello"}]}`,
			wantErr: false,
		},
		{
			name:    "extra closing brace - issue #28 case",
			input:   `{"backgrounds": [{"location": "test", "prompt": "hello"}]}}`,
			wantErr: false,
		},
		{
			name:    "extra closing bracket",
			input:   `{"backgrounds": [{"location": "test", "prompt": "hello"}]]}`,
			wantErr: false,
		},
		{
			name:    "multiple extra closing braces",
			input:   `{"backgrounds": [{"location": "test", "prompt": "hello"}]}}}`,
			wantErr: false,
		},
		{
			name:    "missing closing brace",
			input:   `{"backgrounds": [{"location": "test", "prompt": "hello"}]`,
			wantErr: false,
		},
		{
			name:    "missing closing bracket",
			input:   `{"backgrounds": [{"location": "test", "prompt": "hello"}`,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var result struct {
				Backgrounds []struct {
					Location string `json:"location"`
					Prompt   string `json:"prompt"`
				} `json:"backgrounds"`
			}

			err := SafeParseAIJSON(tt.input, &result)
			if (err != nil) != tt.wantErr {
				t.Errorf("SafeParseAIJSON() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				// Verify the parsed result
				if len(result.Backgrounds) != 1 {
					t.Errorf("Expected 1 background, got %d", len(result.Backgrounds))
					return
				}
				if result.Backgrounds[0].Location != "test" {
					t.Errorf("Expected location 'test', got '%s'", result.Backgrounds[0].Location)
				}
				if result.Backgrounds[0].Prompt != "hello" {
					t.Errorf("Expected prompt 'hello', got '%s'", result.Backgrounds[0].Prompt)
				}
			}
		})
	}
}

// TestAttemptJSONRepairFunction tests the attemptJSONRepair function directly
func TestAttemptJSONRepairFunction(t *testing.T) {
	tests := []struct {
		name  string
		input string
		valid bool
	}{
		{
			name:  "fix extra closing brace",
			input: `{"key": "value"}}`,
			valid: true,
		},
		{
			name:  "fix extra closing bracket",
			input: `["item1", "item2"]]`,
			valid: true,
		},
		{
			name:  "fix missing closing brace",
			input: `{"key": "value"`,
			valid: true,
		},
		{
			name:  "fix missing closing bracket",
			input: `["item1", "item2"`,
			valid: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repaired := attemptJSONRepair(tt.input)
			var js json.RawMessage
			err := json.Unmarshal([]byte(repaired), &js)
			if tt.valid && err != nil {
				t.Errorf("attemptJSONRepair() failed to produce valid JSON: %v\nInput: %s\nOutput: %s", err, tt.input, repaired)
			}
		})
	}
}
