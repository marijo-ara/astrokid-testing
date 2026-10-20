using System.Net;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.FamilyProfiles
{
    /// <summary>
    /// Family erasure completes over HTTP. Firebase deletion is a side effect
    /// of that request and is asserted in the backend integration test.
    /// </summary>
    [TestFixture]
    [Category("API")]
    [Category("Coppa")]
    public class FamilyErasureContractTests : BaseApiTest
    {
        [Test]
        public async Task Deleting_The_Family_Removes_It()
        {
            var family = await CreateConsentedFamilyAsync("erase-family");

            var removed = await Client.DeleteAsync(
                $"/family-profiles/{family.FamilyId}",
                family.ParentToken
            );
            AssumeBackendAvailable(removed);
            Assert.That(removed.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));

            var gone = await Client.GetAsync(
                $"/family-profiles/{family.FamilyId}",
                family.ParentToken
            );
            Assert.That(gone.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
        }
    }
}
