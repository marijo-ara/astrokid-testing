using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.Health
{
    /// <summary>
    /// Post-deploy liveness of the backend.
    /// Ported from astro-kid-backend tests/integration/test_qa_endpoints.py
    /// (TestHealthCheck, TestAllEndpointsSmoke).
    /// </summary>
    [TestFixture]
    [Category("API")]
    [Category("Smoke")]
    [Category("Health")]
    public class HealthSmokeTests : BaseApiTest
    {
        [Test]
        public async Task Root_Reports_Ok()
        {
            var response = await Client.GetAsync("/");
            AssertStatusCode(response, HttpStatusCode.OK);
            Assert.That(ReadString(response.Content, "status"), Is.EqualTo("ok"));
        }

        [Test]
        public async Task OpenApi_Schema_Is_Published()
        {
            var docs = await Client.GetAsync("/docs");
            AssertStatusCode(docs, HttpStatusCode.OK);

            var schema = await Client.GetAsync("/openapi.json");
            AssertValidJsonResponse(schema.Content, "openapi", "paths");
        }

        [Test]
        public async Task Child_Tokens_Service_Is_Healthy()
        {
            var response = await Client.GetAsync("/child-tokens/health");
            var json = AssertValidJsonResponse(response.Content, "service", "status");
            Assert.That(json.GetProperty("service").GetString(), Is.EqualTo("child-tokens"));
            Assert.That(json.GetProperty("status").GetString(), Is.AnyOf("healthy", "degraded"));
        }

        [Test]
        public async Task Main_Endpoints_Never_Return_5xx()
        {
            var failures = new List<string>();
            foreach (var path in new[] { "/", "/docs", "/openapi.json", "/family-profiles/", "/parent-profiles/", "/wallet/", "/child-tokens/health" })
            {
                var response = await Client.GetAsync(path);
                if ((int)response.StatusCode >= 500 || response.StatusCode == 0)
                {
                    failures.Add($"GET {path}: {(int)response.StatusCode} {response.ErrorMessage}");
                }
            }
            Assert.That(failures, Is.Empty, string.Join("\n", failures));
        }
    }
}
