// API configuration with Auth0 token handling
const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5125';

class ApiService {
  private async buildError(response: Response): Promise<Error> {
    let message = `API request failed: ${response.status} ${response.statusText}`.trim();

    try {
      const text = await response.text();
      if (!text) {
        return new Error(message);
      }

      const payload = JSON.parse(text) as { message?: string; Message?: string; error?: string };
      const backendMessage = payload.message || payload.Message || payload.error;
      if (backendMessage) {
        message = backendMessage;
      }
    } catch {
      // Ignore JSON parse errors and keep status-based message.
    }

    return new Error(message);
  }

  private async getAuthHeader(): Promise<Record<string, string>> {
    const token = localStorage.getItem('auth0_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  async get(endpoint: string) {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${API_URL}/api${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw await this.buildError(response);
    }

    const data = await response.json();
    return { data };
  }

  async post(endpoint: string, data: unknown) {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${API_URL}/api${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw await this.buildError(response);
    }

    const responseData = await response.json();
    return { data: responseData };
  }

  async put(endpoint: string, data: unknown) {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${API_URL}/api${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw await this.buildError(response);
    }

    // PUT might not return content
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async delete(endpoint: string) {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${API_URL}/api${endpoint}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw await this.buildError(response);
    }

    // DELETE might not return content
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
}

const api = new ApiService();
export default api;
