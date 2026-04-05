// Core Domain Models (Pure, no external dependencies)

export interface MCPToolRequest {
  tool: string;
  parameters: Record<string, any>;
}

export interface MCPToolResponse {
  status: 'success' | 'error';
  data?: any;
  error?: string;
}
