using System.Net;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.Licenses
{
    /// <summary>
    /// A regular parent cannot draft or activate a school. The signed-packet
    /// flow itself is covered in the backend integration tests, because it
    /// would create a school on the shared QA database.
    /// </summary>
    [TestFixture]
    [Category("API")]
    [Category("Licenses")]
    public class SchoolAgreementContractTests : BaseApiTest
    {
        [Test]
        public async Task Regular_Parent_Cannot_Send_Or_Validate_A_School_Agreement()
        {
            var family = await CreateConsentedFamilyAsync("school-packet");

            var send = await Client.PostAsync(
                "/admin/schools/send-agreement",
                new
                {
                    school_name = "Colegio No Admin",
                    contact_email = "coord@colegio.edu",
                    seats = 40,
                    student_count = 100
                },
                family.ParentToken
            );
            AssumeBackendAvailable(send);
            Assert.That(
                send.StatusCode,
                Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden)
            );

            var validate = await Client.PostAsync(
                "/admin/licenses/00000000-0000-0000-0000-000000000001/validate-packet",
                new
                {
                    agreement_received = true,
                    payment_received = true,
                    payment_reference = "TRX-1"
                },
                family.ParentToken
            );
            AssumeBackendAvailable(validate);
            Assert.That(
                validate.StatusCode,
                Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden)
            );
        }
    }
}
