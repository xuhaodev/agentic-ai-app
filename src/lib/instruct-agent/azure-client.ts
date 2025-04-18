import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

// Generic ModelClient builder for GitHub inference endpoint
export const createModelClient = (endpoint: string, apiKey: string) => {
  console.log('Creating ModelClient with endpoint:', endpoint);
  return ModelClient(endpoint, new AzureKeyCredential(apiKey));
};

// Restore search client export for web search usage
export const createSearchClient = (apiKey: string) => {
  return {
    async call(query: string) {
      try {
        const response = await fetch(`https://api.tavily.com/search?api_key=${apiKey}&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        return data.results || [];
      } catch (error) {
        console.error('Search engine error:', error);
        return [];
      }
    }
  };
};

// Forward isUnexpected for response error checking
export { isUnexpected };