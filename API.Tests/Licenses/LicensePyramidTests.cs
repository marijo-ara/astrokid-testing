using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using NUnit.Framework;
using RestSharp;

namespace API.Tests.Licenses
{
    /// <summary>
    /// Black-box contract for licenses. Business rules (seat math, payment gate,
    /// restore-on-activate) live in astro-kid-backend/tests/unit and tests/integration.
    /// A brand-new family on QA is Free: 10 missions. School 100 and revoke are
    /// admin operations and are not created against the shared deployed backend.
    /// </summary>
    [TestFixture]
    [Category("API")]
    [Category("Licenses")]
    public class LicensePyramidTests : BaseApiTest
    {
        [Test]
        public async Task Entitlements_Require_A_Parent_Token()
        {
            var response = await Client.GetAsync("/entitlements/me");
            AssumeBackendAvailable(response);
            Assert.That(
                response.StatusCode,
                Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden)
            );
        }

        [Test]
        public async Task New_Family_Is_Free_With_Ten_Missions_For_Parent_And_Child()
        {
            var family = await CreateConsentedFamilyAsync("license-free");

            var me = await Client.GetAsync("/entitlements/me", family.ParentToken);
            AssumeBackendAvailable(me);
            AssertSuccessStatusCode(me, $"entitlements/me: {me.StatusCode} {me.Content}");

            var quota = JsonSerializer.Deserialize<JsonElement>(me.Content!).GetProperty("mission_quota");
            Assert.That(quota.GetProperty("plan").GetString(), Is.EqualTo("free_capped"));
            Assert.That(quota.GetProperty("limit").GetInt32(), Is.EqualTo(10));
            Assert.That(quota.GetProperty("free_cap").GetInt32(), Is.EqualTo(10));
            Assert.That(quota.GetProperty("institutional_cap").GetInt32(), Is.EqualTo(100));
            Assert.That(ReadBool(me.Content, "school_license_revoked"), Is.False);

            var child = quota.GetProperty("children")[0];
            Assert.That(child.GetProperty("child_id").GetString(), Is.EqualTo(family.ChildId));
            Assert.That(child.GetProperty("limit").GetInt32(), Is.EqualTo(10));

            var journey = await Client.SendAsync(
                Method.Get,
                "/child-tokens/journey-access",
                token: "",
                headers: family.ChildHeaders
            );
            AssumeBackendAvailable(journey);
            AssertSuccessStatusCode(journey, $"journey-access: {journey.StatusCode} {journey.Content}");
            var access = JsonSerializer.Deserialize<JsonElement>(journey.Content!);
            Assert.That(access.GetProperty("mission_plan").GetString(), Is.EqualTo("free_capped"));
            Assert.That(access.GetProperty("limit").GetInt32(), Is.EqualTo(10));
            Assert.That(access.GetProperty("school_license_revoked").GetBoolean(), Is.False);
            Assert.That(access.GetProperty("can_complete_mission").GetBoolean(), Is.True);

            var arc = await Client.SendAsync(
                Method.Get,
                $"/dpe/free-arc/{family.ChildId}/progress",
                token: "",
                headers: family.ChildHeaders
            );
            AssumeBackendAvailable(arc);
            AssertSuccessStatusCode(arc, $"free-arc: {arc.StatusCode} {arc.Content}");
            var progress = JsonSerializer.Deserialize<JsonElement>(arc.Content!);
            Assert.That(progress.GetProperty("active").GetBoolean(), Is.True);
            Assert.That(progress.GetProperty("horizon").GetInt32(), Is.EqualTo(10));
        }

        [Test]
        public async Task Unknown_Invite_Is_Rejected()
        {
            var family = await CreateConsentedFamilyAsync("license-bad-code");
            var redeem = await Client.PostAsync(
                "/entitlements/redeem",
                new { code = "NO-SUCH-SCHOOL" },
                family.ParentToken
            );
            AssumeBackendAvailable(redeem);
            Assert.That(
                redeem.StatusCode,
                Is.EqualTo(HttpStatusCode.NotFound).Or.EqualTo(HttpStatusCode.BadRequest)
            );
        }

        [Test]
        public async Task School_Admin_Routes_Reject_A_Regular_Parent()
        {
            var family = await CreateConsentedFamilyAsync("license-not-admin");
            var createOrg = await Client.PostAsync(
                "/admin/organizations",
                new { name = "Colegio No Admin" },
                family.ParentToken
            );
            AssumeBackendAvailable(createOrg);
            Assert.That(
                createOrg.StatusCode,
                Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden)
            );

            var anonymous = await Client.GetAsync("/admin/organizations");
            Assert.That(
                anonymous.StatusCode,
                Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden)
            );
        }

        private static bool ReadBool(string? content, string property)
        {
            var json = JsonSerializer.Deserialize<JsonElement>(content!);
            return json.TryGetProperty(property, out var value) && value.GetBoolean();
        }
    }
}
