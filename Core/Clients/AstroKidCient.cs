using RestSharp;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Core.Config;

namespace Core.Clients
{
    public class AstroKidClient
    {
        private readonly RestClient _client;

        public AstroKidClient()
        {
            var options = new RestClientOptions(ConfigManager.Settings.BaseUrl)
            {
                //  configurar timeouts, etc.
            };

            _client = new RestClient(options);
        }

        public async Task<RestResponse> GetAsync(string endpoint, string token = "")
        {
            var request = new RestRequest(endpoint, Method.Get);

            if (!string.IsNullOrEmpty(token))
            {
                request.AddHeader("Authorization", $"Bearer {token}");
            }

            return await _client.ExecuteAsync(request);
        }

        public async Task<RestResponse> PostAsync<T>(string endpoint, T? body, string token = "") where T : class
        {
            var request = new RestRequest(endpoint, Method.Post);
            if (body != null)
            {
                var jsonBody = JsonSerializer.Serialize(body);
                request.AddStringBody(jsonBody, ContentType.Json);
            }

            if (!string.IsNullOrEmpty(token))
            {
                request.AddHeader("Authorization", $"Bearer {token}");
            }

            return await _client.ExecuteAsync(request);
        }

        public async Task<RestResponse> DeleteAsync(string endpoint, string token = "")
        {
            var request = new RestRequest(endpoint, Method.Delete);

            if (!string.IsNullOrEmpty(token))
            {
                request.AddHeader("Authorization", $"Bearer {token}");
            }

            return await _client.ExecuteAsync(request);
        }

        public async Task<RestResponse> PutAsync<T>(string endpoint, T? body, string token = "") where T : class
        {
            var request = new RestRequest(endpoint, Method.Put);
            if (body != null)
            {
                var jsonBody = JsonSerializer.Serialize(body);
                request.AddStringBody(jsonBody, ContentType.Json);
            }

            if (!string.IsNullOrEmpty(token))
            {
                request.AddHeader("Authorization", $"Bearer {token}");
            }

            return await _client.ExecuteAsync(request);
        }

        public async Task<RestResponse> SendAsync(
            Method method,
            string endpoint,
            object? body = null,
            string token = "",
            IDictionary<string, string>? headers = null)
        {
            var request = new RestRequest(endpoint, method);
            if (body != null)
            {
                request.AddStringBody(JsonSerializer.Serialize(body), ContentType.Json);
            }

            if (!string.IsNullOrEmpty(token))
            {
                request.AddHeader("Authorization", $"Bearer {token}");
            }

            if (headers != null)
            {
                foreach (var (name, value) in headers)
                {
                    request.AddHeader(name, value);
                }
            }

            return await _client.ExecuteAsync(request);
        }
    }
}