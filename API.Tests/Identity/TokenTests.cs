using System.Net;
using System.Threading.Tasks;
using Core.Clients;
using NUnit.Framework;

namespace API.Tests.Identity
{
    [TestFixture]
    public class TokenTests
    {
        private AstroKidClient _client;

        [SetUp]
        public void Setup()
        {
            _client = new AstroKidClient();
        }

        [Test]
        public async Task Should_Get_Token_Successfully()
        {
            var body = new
            {
                email = "test-parent@example.com",
                password = "Password123!"
            };

            var response = await _client.PostAsync("/auth/token", body);

            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
            Assert.That(response.Content, Does.Contain("access_token"));
        }
    }
}
