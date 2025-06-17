import axios from "axios";
import { config } from "configs/server.config";
import { InternalServerError } from "@utils/errors/index.js";

interface AirLyftLoginResponse {
  data: {
    campHavenLogin: {
      token: string;
    };
  };
}

export class AirLyftService {
  private readonly apiUrl = config.airLyft.apiUrl;
  private readonly apiKey: string;
  private readonly projectId: string;

  constructor() {
    // Add these to your config
    this.apiKey = config.airLyft.apiKey;
    this.projectId = config.airLyft.projectId;
  }

  async getAuthorizationToken(userId: string): Promise<string> {
    try {
      const mutation = `
        mutation ServiceLogin($projectId: ID!, $userId: ID!) {
          campHavenLogin(projectId: $projectId, userId: $userId) {
            token
          }
        }
      `;

      const response = await axios.post<AirLyftLoginResponse>(
        this.apiUrl,
        {
          query: mutation,
          variables: {
            projectId: this.projectId,
            userId: userId,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": this.apiKey,
          },
        }
      );

      if (response.data?.data?.campHavenLogin?.token) {
        return response.data.data.campHavenLogin.token;
      }

      throw new InternalServerError(
        "Failed to get AirLyft authorization token"
      );
    } catch (error) {
      console.error("AirLyft authentication error:", error);
      throw new InternalServerError("Failed to authenticate with AirLyft");
    }
  }
}
