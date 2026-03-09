import request from "../utils/request";

export interface OptimizePromptRequest {
  prompt: string;
  use_case?: "image" | "video";
  language?: "auto" | "zh" | "en";
}

export interface OptimizePromptResponse {
  optimized_prompt: string;
}

export const promptAPI = {
  optimize(data: OptimizePromptRequest) {
    return request.post<OptimizePromptResponse>("/prompts/optimize", data);
  },
};
