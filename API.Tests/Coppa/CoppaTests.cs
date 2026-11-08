using System;
using System.Collections.Generic;
using System.Net;
using System.Security.Cryptography;
using System.Text;
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
        private const string AiNoticeVersion = "2026-10-15";

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
                household_country = "CR",
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

        // ---- Premium paid by card verifies the parent; disclosure still needs the notice box (COPPA-18, COPPA-19) ----

        private static readonly string[] PlatformAiReasons =
        {
            "ai_disabled", "provider_contract_pending", "provider_zero_retention_pending"
        };

        private static bool PipelineRequiresTheStripeSecret()
        {
            var ci = Environment.GetEnvironmentVariable("CI");
            var azure = Environment.GetEnvironmentVariable("TF_BUILD");
            return string.Equals(ci, "true", StringComparison.OrdinalIgnoreCase)
                || string.Equals(azure, "true", StringComparison.OrdinalIgnoreCase);
        }

        private static string StripeWebhookSecret()
        {
            var secret = Environment.GetEnvironmentVariable("QA_STRIPE_WEBHOOK_SECRET");
            if (!string.IsNullOrWhiteSpace(secret))
            {
                return secret.Trim();
            }

            const string message =
                "Define QA_STRIPE_WEBHOOK_SECRET con el STRIPE_WEBHOOK_SECRET del backend QA (modo test).";
            if (PipelineRequiresTheStripeSecret())
            {
                Assert.Fail(message);
            }

            Assert.Inconclusive(message);
            return "";
        }

        private async Task SendSignedStripeEventAsync(object stripeEvent)
        {
            var secret = StripeWebhookSecret();
            var json = JsonSerializer.Serialize(stripeEvent);
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var signature = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes($"{timestamp}.{json}"))).ToLowerInvariant();

            var response = await Client.PostRawJsonAsync("/billing/stripe/webhook", json,
                new Dictionary<string, string> { ["Stripe-Signature"] = $"t={timestamp},v1={signature}" });

            AssertSuccessStatusCode(response, $"webhook: {response.StatusCode} {response.Content}");
        }

        /// <summary>Same event Stripe sends when Premium checkout is paid by card.</summary>
        private async Task<string> PayPremiumByCardAsync(ConsentedFamily family)
        {
            var subscriptionId = $"sub_qa_{Guid.NewGuid():N}";
            await SendSignedStripeEventAsync(new
            {
                id = $"evt_qa_{Guid.NewGuid():N}",
                type = "checkout.session.completed",
                data = new
                {
                    @object = new
                    {
                        id = $"cs_qa_{Guid.NewGuid():N}",
                        mode = "subscription",
                        payment_status = "paid",
                        customer = $"cus_qa_{Guid.NewGuid():N}",
                        subscription = subscriptionId,
                        client_reference_id = family.FamilyId,
                        metadata = new Dictionary<string, string>
                        {
                            ["product"] = "astrokid_premium",
                            ["family_id"] = family.FamilyId,
                            ["parent_email"] = family.ParentEmail,
                            ["billing_interval"] = "month",
                            ["upgrade_from"] = "free"
                        }
                    }
                }
            });
            return subscriptionId;
        }

        private Task CancelPremiumAsync(ConsentedFamily family, string subscriptionId) =>
            SendSignedStripeEventAsync(new
            {
                id = $"evt_qa_{Guid.NewGuid():N}",
                type = "customer.subscription.deleted",
                data = new
                {
                    @object = new
                    {
                        id = subscriptionId,
                        status = "canceled",
                        metadata = new Dictionary<string, string>
                        {
                            ["product"] = "astrokid_premium",
                            ["family_id"] = family.FamilyId
                        }
                    }
                }
            });

        private Task<RestResponse> PremiumActivateAsync(ConsentedFamily family, string noticeVersion, bool accepted) =>
            Client.PostAsync($"/ai-consent/children/{family.ChildId}/premium-activate", new
            {
                locale = "es",
                notice_version = noticeVersion,
                accepted
            }, family.ParentToken);

        /// <summary>Free family, AI providers ready on QA: the only thing missing is the plan.</summary>
        private async Task<ConsentedFamily> FreeFamilyReadyForAiAsync(string label)
        {
            var family = await CreateConsentedFamilyAsync(label);
            var status = await AiConsentAsync(family);
            var reason = status.GetProperty("unavailable_reason").GetString();
            if (Array.IndexOf(PlatformAiReasons, reason) >= 0)
            {
                Assert.Inconclusive($"IA apagada en este entorno ({reason}). En QA: AI_PROVIDER_DPA_ACCEPTED=true, AI_PROVIDER_ZDR_APPROVED=true, XAI_CHILD_MODEL y la IA generativa encendida.");
            }
            Assert.That(status.GetProperty("plan").GetString(), Is.EqualTo("free"));
            Assert.That(reason, Is.EqualTo("plan_free"), "Free nunca tiene IA");
            Assert.That(status.GetProperty("active").GetBoolean(), Is.False);
            return family;
        }

        private async Task<JsonElement> PremiumStatusAfterPaymentAsync(ConsentedFamily family)
        {
            var status = await AiConsentAsync(family);
            Assert.That(status.GetProperty("plan").GetString(), Is.EqualTo("premium"));
            Assert.That(status.GetProperty("verification").GetString(), Is.EqualTo("premium_subscription"),
                "El pago de Premium con tarjeta es la verificación; no pide el cargo de US$0.50");
            Assert.That(status.GetProperty("available").GetBoolean(), Is.True, status.ToString());
            Assert.That(status.GetProperty("active").GetBoolean(), Is.False, "Pagar no enciende la IA sin el aviso aceptado");
            Assert.That(status.GetProperty("status").GetString(), Is.EqualTo("off"));
            return status;
        }

        [Test]
        public async Task COPPA_18_Premium_Paid_By_Card_And_Notice_Accepted_Turns_Ai_On()
        {
            var family = await FreeFamilyReadyForAiAsync("coppa-premium-yes");

            await PayPremiumByCardAsync(family);
            var status = await PremiumStatusAfterPaymentAsync(family);
            var noticeVersion = status.GetProperty("notice").GetProperty("version").GetString()!;

            var response = await PremiumActivateAsync(family, noticeVersion, accepted: true);

            AssertSuccessStatusCode(response, $"premium-activate: {response.StatusCode} {response.Content}");
            var after = await AiConsentAsync(family);
            Assert.That(after.GetProperty("active").GetBoolean(), Is.True);
            Assert.That(after.GetProperty("status").GetString(), Is.EqualTo("active"));
            Assert.That(after.GetProperty("activated_at").GetString(), Is.Not.Null.And.Not.Empty);
            Assert.That(after.GetProperty("refunded").GetBoolean(), Is.False, "Sin cargo de verificación no hay reembolso");
        }

        [Test]
        public async Task COPPA_18_Premium_Paid_By_Card_Without_Accepting_The_Notice_Keeps_Ai_Off()
        {
            var family = await FreeFamilyReadyForAiAsync("coppa-premium-no");

            await PayPremiumByCardAsync(family);
            var status = await PremiumStatusAfterPaymentAsync(family);
            var noticeVersion = status.GetProperty("notice").GetProperty("version").GetString()!;

            var response = await PremiumActivateAsync(family, noticeVersion, accepted: false);

            AssertDetail(response, HttpStatusCode.BadRequest, "AI_NOTICE_NOT_ACCEPTED");
            var after = await AiConsentAsync(family);
            Assert.That(after.GetProperty("active").GetBoolean(), Is.False);
            Assert.That(after.GetProperty("status").GetString(), Is.EqualTo("off"));
            Assert.That(after.GetProperty("plan").GetString(), Is.EqualTo("premium"), "Rechazar la IA no quita Premium");
        }

        [Test]
        public async Task COPPA_18_Premium_Activation_With_An_Old_Notice_Is_Rejected()
        {
            var family = await FreeFamilyReadyForAiAsync("coppa-premium-old");
            await PayPremiumByCardAsync(family);
            await PremiumStatusAfterPaymentAsync(family);

            var response = await PremiumActivateAsync(family, "2020-01-01", accepted: true);

            AssertDetail(response, HttpStatusCode.Conflict, "AI_NOTICE_OUTDATED");
            Assert.That((await AiConsentAsync(family)).GetProperty("active").GetBoolean(), Is.False);
        }

        [Test]
        public async Task COPPA_18_Free_Plan_Cannot_Turn_Ai_On_Even_With_The_Notice_Accepted()
        {
            var family = await FreeFamilyReadyForAiAsync("coppa-free-yes");
            var noticeVersion = (await AiConsentAsync(family)).GetProperty("notice").GetProperty("version").GetString()!;

            var response = await PremiumActivateAsync(family, noticeVersion, accepted: true);

            AssertDetail(response, HttpStatusCode.Conflict, "AI_CONSENT_UNAVAILABLE:plan_free");
            Assert.That((await AiConsentAsync(family)).GetProperty("active").GetBoolean(), Is.False);
        }

        [Test]
        public async Task COPPA_19_Ai_Turns_Off_When_Premium_Ends()
        {
            var family = await FreeFamilyReadyForAiAsync("coppa-premium-ends");
            var subscriptionId = await PayPremiumByCardAsync(family);
            var status = await PremiumStatusAfterPaymentAsync(family);
            var noticeVersion = status.GetProperty("notice").GetProperty("version").GetString()!;
            AssertSuccessStatusCode(await PremiumActivateAsync(family, noticeVersion, accepted: true));
            Assert.That((await AiConsentAsync(family)).GetProperty("active").GetBoolean(), Is.True);

            await CancelPremiumAsync(family, subscriptionId);

            var after = await AiConsentAsync(family);
            Assert.That(after.GetProperty("active").GetBoolean(), Is.False);
            Assert.That(after.GetProperty("status").GetString(), Is.EqualTo("ended"));
            Assert.That(after.GetProperty("plan").GetString(), Is.EqualTo("free"));
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
        public async Task COPPA_16_Parent_Insights_Require_The_Childs_Own_Parent()
        {
            var family = await CreateConsentedFamilyAsync("coppa-insights-owner");
            var body = new { child_name = "Coppa Child", child_age = 8, locale = "es", insights = new[] { new { type = "gettingStarted" } } };

            var anonymous = await Client.PostAsync($"/parent-insights/{family.ChildId}", body);
            Assert.That(anonymous.StatusCode, Is.AnyOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden), anonymous.Content);

            var other = await LoginParentAsync(QaEmail("coppa-insights-other"), "Other Parent");
            var foreign = await Client.PostAsync($"/parent-insights/{family.ChildId}", body, other);
            AssertStatusCode(foreign, HttpStatusCode.NotFound);
        }

        // ---- Parent can review, export and delete the child's data (COPPA-14) ----

        private static string ChildPath(ConsentedFamily family) =>
            $"/family-profiles/{family.FamilyId}/children/{family.ChildId}";

        [Test]
        [Category("Smoke")]
        public async Task COPPA_14_Parent_Can_Export_The_Childs_Data()
        {
            var family = await CreateConsentedFamilyAsync("coppa-export");

            var response = await Client.GetAsync($"{ChildPath(family)}/export", family.ParentToken);

            AssertSuccessStatusCode(response, $"export: {response.StatusCode} {response.Content}");
            var json = AssertValidJsonResponse(response.Content,
                "exportVersion", "childId", "profile", "missionProgress", "dailyMissions", "parentalConsents");
            Assert.That(json.GetProperty("childId").GetString(), Is.EqualTo(family.ChildId));
            Assert.That(json.GetProperty("profile").GetProperty("name").GetString(), Is.EqualTo("QA Child"));
        }

        [Test]
        public async Task COPPA_14_Export_Requires_Auth_And_Ownership()
        {
            var family = await CreateConsentedFamilyAsync("coppa-export-owner");

            var anonymous = await Client.GetAsync($"{ChildPath(family)}/export");
            Assert.That(anonymous.StatusCode, Is.AnyOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden));

            var other = await LoginParentAsync(QaEmail("coppa-export-other"), "Other Parent");
            var foreign = await Client.GetAsync($"{ChildPath(family)}/export", other);
            Assert.That(foreign.StatusCode, Is.AnyOf(HttpStatusCode.Forbidden, HttpStatusCode.NotFound), foreign.Content);

            var foreignDelete = await Client.DeleteAsync(ChildPath(family), other);
            Assert.That(foreignDelete.StatusCode, Is.AnyOf(HttpStatusCode.Forbidden, HttpStatusCode.NotFound), foreignDelete.Content);
        }

        [Test]
        public async Task COPPA_14_Parent_Can_Delete_The_Child_And_Its_Data_Is_Gone()
        {
            var family = await CreateConsentedFamilyAsync("coppa-delete");

            var delete = await Client.DeleteAsync(ChildPath(family), family.ParentToken);
            AssertSuccessStatusCode(delete, $"delete: {delete.StatusCode} {delete.Content}");

            var remaining = AssertValidJsonResponse(delete.Content, "children").GetProperty("children");
            foreach (var child in remaining.EnumerateArray())
            {
                Assert.That(child.GetProperty("id").GetString(), Is.Not.EqualTo(family.ChildId));
            }

            var export = await Client.GetAsync($"{ChildPath(family)}/export", family.ParentToken);
            AssertStatusCode(export, HttpStatusCode.NotFound);
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
