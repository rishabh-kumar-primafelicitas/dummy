import axios from "axios";
import { config } from "@config/server.config";

const GRAPHQL_ENDPOINT =
  config.airLyft.graphqlEndpoint || "https://quests-api.datahaven.xyz/graphql";

interface GraphQLResponse {
  data?: any;
  errors?: any;
}

export const executeGraphQLQuery = async (
  query: string,
  variables: any,
  useAuth: boolean = false,
  useApiKey: boolean = false,
  customAuthToken?: string
): Promise<GraphQLResponse> => {
  const headers: any = {
    "Content-Type": "application/json",
  };

  if (useAuth) {
    const authToken = customAuthToken;
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  if (useApiKey) {
    headers["api-key"] = process.env.AIRLYFT_API_KEY;
  }

  const response = await axios.post<GraphQLResponse>(
    GRAPHQL_ENDPOINT,
    {
      query,
      variables,
    },
    { headers }
  );

  return response.data;
};
