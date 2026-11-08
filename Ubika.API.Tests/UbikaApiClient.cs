using System.Text.Json;
using RestSharp;

namespace Ubika.API.Tests;

public sealed class UbikaApiClient
{
    private readonly RestClient _client;

    public UbikaApiClient(string baseUrl)
    {
        _client = new RestClient(new RestClientOptions(baseUrl.TrimEnd('/')));
    }

    public Task<RestResponse> GetAsync(
        string path,
        string? token = null,
        IDictionary<string, string>? headers = null)
    {
        var request = new RestRequest(path, Method.Get);
        if (!string.IsNullOrEmpty(token))
            request.AddHeader("Authorization", $"Bearer {token}");
        AddHeaders(request, headers);
        return _client.ExecuteAsync(request);
    }

    public Task<RestResponse> PostAsync(
        string path,
        object? body = null,
        IDictionary<string, string>? headers = null)
    {
        var request = new RestRequest(path, Method.Post);
        if (body != null)
            request.AddStringBody(JsonSerializer.Serialize(body), ContentType.Json);
        AddHeaders(request, headers);
        return _client.ExecuteAsync(request);
    }

    private static void AddHeaders(RestRequest request, IDictionary<string, string>? headers)
    {
        if (headers == null) return;
        foreach (var (name, value) in headers)
            request.AddHeader(name, value);
    }
}
