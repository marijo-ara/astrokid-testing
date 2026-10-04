using System.Collections.Generic;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using NUnit.Framework;
using RestSharp;

namespace API.Tests.Coppa
{
    /// <summary>
    /// COPPA black-box checks against a deployed backend.
    /// Requirement IDs (COPPA-xx) are defined in docs/COPPA_REQUIREMENTS.md.
    /// The email-plus cases need COPPA_EMAIL_PLUS_EXPOSE_TOKEN=true on QA (never in production);
    /// without it they end Inconclusive instead of failing.
    /// </summary>
    [TestFixture]
    [Category("API")]
    [Category("Coppa")]
    public class CoppaTests : BaseApiTest
    {
        private const string AiNoticeVersion = "2026-10-03";

        private static object ChildPayload(string email) => new
        {
            parent = new { parent_name = "Coppa Parent", parent_email = email },
            child = new
            {
                name = "Coppa Child",
                birthdate = System.DateTime.UtcNow.AddYears(-8).ToString("yyyy-MM-dd"),
                age = 8,
                interests = new[] { "space" },
                avatarId = "nova",
                parental_consent_acknowledged = true,
                selectedAdjectives = new[]
                {
                    new { id = "1", word = "curious", category = "personality", emoji = "🤔" },
                    new { id = "2", word = "brave", category = "personality", emoji = "🦁" },
                    new { id = "3", word = "creative", category = "personality", emoji = "🎨" }
                }
            }
        };

        private async Task<(string Email, string Token)> FreshParentWithoutConsentAsync(string label)
        {
            var email = QaEmail(label);
            var token = await LoginParentAsync(email, "Coppa Parent");
            var status = await Client.GetAsync(EmailPlusPath, token);
            if (status.StatusCode == HttpStatusCode.NotFound)
            {
                Assert.Inconclusive("El backend desplegado no tiene el gate email-plus.");
            }
            AssertSuccessStatusCode(status);
            if (ReadString(status.Content, "status") == "confirmed")
            {
                Assert.Inconclusive("COPPA_EMAIL_PLUS_REQUIRED=false en este entorno.");
            }
            return (email, token);
        }

        private async Task<string> StartEmailPlusAsync(string token)
        {
            var start = await Client.PostAsync($"{EmailPlusPath}/start", new { locale = "es" }, token);
            AssertSuccessStatusCode(start, $"start: {start.StatusCode} {start.Content}");
            var link = ReadString(start.Content, "token");
            if (link == null)
            {
                Assert.Inconclusive("Activa COPPA_EMAIL_PLUS_EXPOSE_TOKEN=true solo en QA.");
            }
            return link!;
        }

        private Task<RestResponse> ConsumeAsync(string link) =>
            Client.PostAsync($"{EmailPlusPath}/consume", new { token = link, locale = "es" });

        private static void AssertDetail(RestResponse response, HttpStatusCode code, string detail)
        {
            Assert.That(response.StatusCode, Is.EqualTo(code), response.Content);
            Assert.That(ReadString(response.Content, "detail"), Is.EqualTo(detail));
        }

        // ---- Email-plus before any child data (COPPA-01..03) ----

        [Test]
        [Category("Smoke")]
        public async Task COPPA_01_Child_Profile_Is_Blocked_Until_Email_Plus_Is_Complete()
        {
            var (email, token) = await FreshParentWithoutConsentAsync("coppa-blocked");

            var response = await Client.PostAsync("/family-profiles/", ChildPayload(email), token);

            AssertDetail(response, HttpStatusCode.Forbidden, "EMAIL_PLUS_REQUIRED");
        }

        [Test]
        public async Task COPPA_02_Notice_Link_Alone_Does_Not_Unlock_Child_Profiles()
        {
            var (email, token) = await FreshParentWithoutConsentAsync("coppa-half");
            var first = await ConsumeAsync(await StartEmailPlusAsync(token));
            AssertSuccessStatusCode(first);
            Assert.That(ReadString(first.Content, "status"), Is.EqualTo("confirm_sent"));

            var response = await Client.PostAsync("/family-profiles/", ChildPayload(email), token);

            AssertDetail(response, HttpStatusCode.Forbidden, "EMAIL_PLUS_REQUIRED");
        }

        [Test]
        public async Task COPPA_02_Links_Are_Single_Use_And_Forged_Links_Fail()
        {
            var (_, token) = await FreshParentWithoutConsentAsync("coppa-reuse");
            var link = await StartEmailPlusAsync(token);

            AssertSuccessStatusCode(await ConsumeAsync(link));
            AssertDetail(await ConsumeAsync(link), HttpStatusCode.BadRequest, "INVALID_CONSENT_TOKEN");
            AssertDetail(await ConsumeAsync("forged-token-forged-token-forged"), HttpStatusCode.BadRequest, "INVALID_CONSENT_TOKEN");
        }

        [Test]
        public async Task COPPA_03_Child_Profile_Is_Created_After_Both_Confirmations()
        {
            var email = QaEmail("coppa-ok");
            var token = await LoginParentWithConsentAsync(email, "Coppa Parent");

            var status = await Client.GetAsync(EmailPlusPath, token);
            Assert.That(ReadString(status.Content, "status"), Is.EqualTo("confirmed"));

            var response = await Client.PostAsync("/family-profiles/", ChildPayload(email), token);
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Created).Or.EqualTo(HttpStatusCode.OK), response.Content);
        }

        [Test]
        public async Task COPPA_02_Consent_Status_Requires_Parent_Auth()
        {
            var response = await Client.GetAsync(EmailPlusPath);
            Assert.That(response.StatusCode, Is.AnyOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden, HttpStatusCode.NotFound));
        }

        // ---- Separate consent before any disclosure to the AI provider (COPPA-04..06) ----

        private async Task<JsonElement> AiConsentAsync(ConsentedFamily family)
        {
            var response = await Client.GetAsync($"/ai-consent/children/{family.ChildId}?locale=es", family.ParentToken);
            if (response.StatusCode == HttpStatusCode.NotFound && ReadString(response.Content, "detail") == "Not Found")
            {
                Assert.Inconclusive("El backend desplegado no tiene /ai-consent.");
            }
            return AssertValidJsonResponse(response.Content, "active", "status", "notice", "amount_cents");
        }

        [Test]
        [Category("Smoke")]
        public async Task COPPA_04_Ai_Is_Off_By_Default_And_Notice_Says_What_Is_Not_Sent()
        {
            var family = await CreateConsentedFamilyAsync("coppa-ai-off");

            var json = await AiConsentAsync(family);

            Assert.That(json.GetProperty("active").GetBoolean(), Is.False);
            Assert.That(json.GetProperty("status").GetString(), Is.EqualTo("off"));
            var notice = json.GetProperty("notice");
            Assert.That(notice.GetProperty("version").GetString(), Is.EqualTo(AiNoticeVersion));
            foreach (var key in new[] { "what", "not_sent", "to_whom", "why", "training", "retention", "charge", "revoke" })
            {
                Assert.That(notice.TryGetProperty(key, out _), Is.True, $"notice.{key}");
            }
        }

        [Test]
        public async Task COPPA_04_Ai_Consent_Requires_Auth_And_Ownership()
        {
            var family = await CreateConsentedFamilyAsync("coppa-ai-owner");

            var anonymous = await Client.GetAsync($"/ai-consent/children/{family.ChildId}");
            Assert.That(anonymous.StatusCode, Is.AnyOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden));

            var other = await LoginParentAsync(QaEmail("coppa-other"), "Other Parent");
            var foreign = await Client.GetAsync($"/ai-consent/children/{family.ChildId}", other);
            AssertStatusCode(foreign, HttpStatusCode.NotFound);

            var foreignRevoke = await Client.PostAsync<object>($"/ai-consent/children/{family.ChildId}/revoke", null, other);
            AssertStatusCode(foreignRevoke, HttpStatusCode.NotFound);
        }

        [Test]
        public async Task COPPA_05_Checkout_With_An_Old_Notice_Is_Rejected()
        {
            var family = await CreateConsentedFamilyAsync("coppa-ai-old");
            await AiConsentAsync(family);

            var response = await Client.PostAsync($"/ai-consent/children/{family.ChildId}/checkout", new
            {
                success_url = "https://example.com/ok",
                cancel_url = "https://example.com/cancel",
                locale = "es",
                notice_version = "2020-01-01"
            }, family.ParentToken);

            AssertDetail(response, HttpStatusCode.Conflict, "AI_NOTICE_OUTDATED");
        }

        [Test]
        public async Task COPPA_05_Forged_Stripe_Webhook_Does_Not_Turn_Ai_On()
        {
            var family = await CreateConsentedFamilyAsync("coppa-ai-forged");
            await AiConsentAsync(family);

            var forged = new
            {
                type = "checkout.session.completed",
                data = new
                {
                    @object = new
                    {
                        id = "cs_forged",
                        payment_status = "paid",
                        metadata = new Dictionary<string, string>
                        {
                            ["product"] = "astrokid_ai_consent",
                            ["child_id"] = family.ChildId,
                            ["notice_version"] = AiNoticeVersion
                        }
                    }
                }
            };
            var response = await Client.SendAsync(Method.Post, "/billing/stripe/webhook", forged,
                headers: new Dictionary<string, string> { ["Stripe-Signature"] = "t=1,v1=forged" });

            Assert.That(response.IsSuccessStatusCode, Is.False, $"Forged webhook accepted: {response.StatusCode}");
            Assert.That((await AiConsentAsync(family)).GetProperty("active").GetBoolean(), Is.False);
        }

        [Test]
        public async Task COPPA_06_Parent_Can_Turn_Ai_Off_At_Any_Time()
        {
            var family = await CreateConsentedFamilyAsync("coppa-ai-revoke");
            await AiConsentAsync(family);

            var response = await Client.PostAsync<object>($"/ai-consent/children/{family.ChildId}/revoke", null, family.ParentToken);

            AssertSuccessStatusCode(response, $"revoke: {response.StatusCode} {response.Content}");
            Assert.That((await AiConsentAsync(family)).GetProperty("active").GetBoolean(), Is.False);
        }

        // ---- No disclosure without consent (COPPA-09, COPPA-10) ----

        [Test]
        public async Task COPPA_09_Parent_Insights_Stay_Local_Without_Ai_Consent()
        {
            var family = await CreateConsentedFamilyAsync("coppa-insights");

            var response = await Client.PostAsync($"/parent-insights/{family.ChildId}", new
            {
                child_name = "Coppa Child",
                child_age = 8,
                locale = "es",
                insights = new[] { new { type = "gettingStarted" } }
            }, family.ParentToken);

            var json = AssertValidJsonResponse(response.Content, "ai_generated");
            Assert.That(json.GetProperty("ai_generated").GetBoolean(), Is.False);
        }

        [Test]
        public async Task COPPA_10_Child_Voice_Is_Never_Processed()
        {
            var family = await CreateConsentedFamilyAsync("coppa-voice");

            var response = await Client.SendAsync(Method.Post, "/empathy/child-input", new
            {
                audioBase64 = "dGVzdA==",
                language = "es-ES",
                agent_key = "empathy",
                mission_id = 1,
                mission_source = "map_voice"
            }, headers: family.ChildHeaders);

            Assert.That(response.IsSuccessStatusCode, Is.False, $"Voice was processed: {response.Content}");
            Assert.That((int)response.StatusCode, Is.LessThan(500), response.Content);
        }
    }
}
