using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using NUnit.Framework;
using RestSharp;

namespace API.Tests.Wallet
{
    /// <summary>
    /// Wallet on a deployed backend: earn → persist → read → spend, plus access rules.
    /// Ported from astro-kid-backend tests/integration/test_qa_endpoints.py (TestWalletEndpoints).
    /// </summary>
    [TestFixture]
    [Category("API")]
    [Category("Wallet")]
    public class WalletTests : BaseApiTest
    {
        private ConsentedFamily? _family;
        private string? _familyProblem;

        [SetUp]
        public override async Task SetUp()
        {
            await base.SetUp();
            _family = null;
            _familyProblem = null;
            try
            {
                _family = await CreateConsentedFamilyAsync("wallet");
            }
            catch (ResultStateException ex)
            {
                // NUnit still runs the test body after a skip raised in an overridden async SetUp.
                _familyProblem = ex.Message;
            }
        }

        private ConsentedFamily Family
        {
            get
            {
                if (_family == null)
                {
                    Assert.Inconclusive(_familyProblem ?? "No se pudo crear la familia de prueba.");
                }
                return _family!;
            }
        }

        private Task<RestResponse> AsParent(Method method, string path, object? body = null) =>
            Client.SendAsync(method, path, body, Family.ParentToken);

        private Task<RestResponse> AsChild(Method method, string path, object? body = null) =>
            Client.SendAsync(method, path, body, headers: Family.ChildHeaders);

        private async Task<int> TotalCoinsAsync()
        {
            var wallet = await AsParent(Method.Get, $"/wallet/{Family.ChildId}");
            AssertSuccessStatusCode(wallet, $"GET wallet: {wallet.StatusCode} {wallet.Content}");
            return JsonSerializer.Deserialize<JsonElement>(wallet.Content!).GetProperty("total_coins").GetInt32();
        }

        private async Task<string> EarnAsync(int coins)
        {
            var created = await AsChild(Method.Post, $"/wallet/{Family.ChildId}/activities", new
            {
                child_id = Family.ChildId,
                activity_type = "mission",
                title = "QA Mission",
                description = "QA wallet persistence",
                agent_name = "AstroKid",
                map_title = "QA",
                age = 8,
                reward_type = "coins",
                reward_amount = coins,
                reward_description = $"{coins} coins"
            });
            AssertSuccessStatusCode(created, $"POST activity: {created.StatusCode} {created.Content}");
            return ReadString(created.Content, "id")!;
        }

        [Test]
        [Category("Smoke")]
        public async Task Wallet_Requires_Auth()
        {
            var response = await Client.GetAsync($"/wallet/{Family.ChildId}");
            AssertStatusCode(response, HttpStatusCode.Unauthorized);
        }

        [Test]
        public async Task Earned_Coins_Persist_And_Activity_Is_Readable()
        {
            var start = await TotalCoinsAsync();
            var activityId = await EarnAsync(10);

            var wallet = await AsParent(Method.Get, $"/wallet/{Family.ChildId}");
            var json = JsonSerializer.Deserialize<JsonElement>(wallet.Content!);
            Assert.That(json.GetProperty("total_coins").GetInt32(), Is.EqualTo(start + 10), "earned coins were not persisted");
            Assert.That(
                json.GetProperty("activities").EnumerateArray().Any(a => a.GetProperty("id").GetString() == activityId),
                Is.True);

            var one = await AsChild(Method.Get, $"/wallet/{Family.ChildId}/activities/{activityId}");
            AssertSuccessStatusCode(one);
        }

        [Test]
        public async Task Summary_Activities_And_Stats_Are_Available()
        {
            await EarnAsync(5);

            var summary = await AsParent(Method.Get, $"/wallet/{Family.ChildId}/summary");
            AssertValidJsonResponse(summary.Content, "recent_activities");

            var activities = await AsChild(Method.Get, $"/wallet/{Family.ChildId}/activities");
            AssertSuccessStatusCode(activities);
            Assert.That(JsonSerializer.Deserialize<JsonElement>(activities.Content!).ValueKind, Is.EqualTo(JsonValueKind.Array));

            var stats = await AsParent(Method.Get, $"/wallet/{Family.ChildId}/stats");
            AssertValidJsonResponse(stats.Content, "activities_by_type");
        }

        [Test]
        public async Task Spend_Debits_Coins()
        {
            await EarnAsync(10);
            var start = await TotalCoinsAsync();

            var spent = await AsChild(Method.Post, $"/wallet/{Family.ChildId}/spend", new
            {
                amount = 5,
                title = "QA",
                description = "QA spend",
                reason = "save"
            });

            AssertSuccessStatusCode(spent, $"spend: {spent.StatusCode} {spent.Content}");
            Assert.That(JsonSerializer.Deserialize<JsonElement>(spent.Content!).GetProperty("total_coins").GetInt32(), Is.EqualTo(start - 5));
        }

        [Test]
        public async Task Child_Cannot_Set_Totals()
        {
            var response = await AsChild(Method.Put, $"/wallet/{Family.ChildId}", new { total_coins = 99999 });
            AssertStatusCode(response, HttpStatusCode.Forbidden);
        }

        [Test]
        public async Task Listing_All_Wallets_Is_Admin_Only()
        {
            AssertStatusCode(await Client.GetAsync("/wallet/"), HttpStatusCode.Unauthorized);
            AssertStatusCode(await AsParent(Method.Get, "/wallet/"), HttpStatusCode.Forbidden);
        }
    }
}
