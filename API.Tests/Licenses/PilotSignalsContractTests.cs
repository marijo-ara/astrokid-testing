using System;
using System.Net;
using System.Threading.Tasks;
using NUnit.Framework;
using RestSharp;

namespace API.Tests.Licenses
{
    /// <summary>
    /// Black-box gates for the school desk and the coded pilot answers.
    /// Seat math and the admin aggregate live in the backend unit tests.
    /// This suite does not create a school or write a check-in on shared QA.
    /// </summary>
    [TestFixture]
    [Category("API")]
    [Category("Licenses")]
    public class PilotSignalsContractTests : BaseApiTest
    {
        private static void AssumeRouteDeployed(RestResponse response, string path)
        {
            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                Assert.Inconclusive($"El backend desplegado no tiene {path}.");
            }
        }

        [Test]
        public async Task School_Desk_And_Pilot_Summary_Require_A_Session()
        {
            var desk = await Client.GetAsync("/entitlements/school-desk");
            AssumeBackendAvailable(desk);
            AssumeRouteDeployed(desk, "/entitlements/school-desk");
            Assert.That(
                desk.StatusCode,
                Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden)
            );

            var summary = await Client.GetAsync("/admin/pilot-summary");
            AssumeBackendAvailable(summary);
            AssumeRouteDeployed(summary, "/admin/pilot-summary");
            Assert.That(
                summary.StatusCode,
                Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden)
            );

            var seat = await Client.PostAsync(
                "/entitlements/school-seat",
                new
                {
                    organization_id = Guid.NewGuid(),
                    license_id = Guid.NewGuid(),
                    family_id = Guid.NewGuid(),
                    action = "revoke"
                }
            );
            AssumeBackendAvailable(seat);
            AssumeRouteDeployed(seat, "/entitlements/school-seat");
            Assert.That(
                seat.StatusCode,
                Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden)
            );

            var checkin = await Client.PostAsync(
                "/entitlements/pilot-checkin",
                new
                {
                    child_id = Guid.NewGuid().ToString(),
                    safety = "none",
                    skill_fit = "fit",
                    returned = "alone",
                    mission_plan = "free_capped",
                    answer_day = DateTime.UtcNow.ToString("yyyy-MM-dd")
                }
            );
            AssumeBackendAvailable(checkin);
            AssumeRouteDeployed(checkin, "/entitlements/pilot-checkin");
            Assert.That(
                checkin.StatusCode,
                Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden)
            );
        }

        [Test]
        public async Task Regular_Parent_Cannot_Read_The_School_Desk_Or_The_Pilot_Summary()
        {
            var family = await CreateConsentedFamilyAsync("pilot-desk-denied");

            var desk = await Client.GetAsync("/entitlements/school-desk", family.ParentToken);
            AssumeBackendAvailable(desk);
            AssumeRouteDeployed(desk, "/entitlements/school-desk");
            Assert.That(desk.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden));
            Assert.That(desk.Content ?? "", Does.Not.Contain("parent_email"));
            Assert.That(desk.Content ?? "", Does.Not.Contain(family.ParentEmail));

            var summary = await Client.GetAsync("/admin/pilot-summary", family.ParentToken);
            AssumeBackendAvailable(summary);
            AssumeRouteDeployed(summary, "/admin/pilot-summary");
            Assert.That(
                summary.StatusCode,
                Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden)
            );
            Assert.That(summary.Content ?? "", Does.Not.Contain(family.ParentEmail));

            var seat = await Client.PostAsync(
                "/entitlements/school-seat",
                new
                {
                    organization_id = Guid.NewGuid(),
                    license_id = Guid.NewGuid(),
                    family_id = Guid.NewGuid(),
                    action = "revoke"
                },
                family.ParentToken
            );
            AssumeBackendAvailable(seat);
            AssumeRouteDeployed(seat, "/entitlements/school-seat");
            Assert.That(seat.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden));
            Assert.That(seat.Content ?? "", Does.Not.Contain(family.ParentEmail));
        }

        [Test]
        public async Task Parent_Cannot_Save_A_Pilot_Answer_For_Another_Child()
        {
            var family = await CreateConsentedFamilyAsync("pilot-checkin-foreign");
            var otherChild = Guid.NewGuid().ToString();

            var checkin = await Client.PostAsync(
                "/entitlements/pilot-checkin",
                new
                {
                    child_id = otherChild,
                    safety = "none",
                    skill_fit = "fit",
                    returned = "alone",
                    mission_plan = "free_capped",
                    answer_day = DateTime.UtcNow.ToString("yyyy-MM-dd")
                },
                family.ParentToken
            );
            AssumeBackendAvailable(checkin);
            AssumeRouteDeployed(checkin, "/entitlements/pilot-checkin");
            Assert.That(
                checkin.StatusCode,
                Is.EqualTo(HttpStatusCode.Forbidden).Or.EqualTo(HttpStatusCode.BadRequest)
            );
            Assert.That(checkin.Content ?? "", Does.Not.Contain(family.ParentEmail));
            Assert.That(checkin.Content ?? "", Does.Not.Contain("child_name"));
        }
    }
}
