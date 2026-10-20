using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using NUnit.Framework;
using RestSharp;

namespace API.Tests.Safety
{
    /// <summary>
    /// Live contract for the emotion side channel. The bus itself is not
    /// observable from outside. What is observable: a high-risk phrase stops
    /// the task, the phrase is not echoed, and the emotion diary stays empty.
    /// </summary>
    [TestFixture]
    [Category("API")]
    [Category("Safety")]
    public class EmotionSignalContractTests : BaseApiTest
    {
        const string HighRisk = "quiero matarme";

        [Test]
        public async Task High_Risk_Task_Is_Blocked_And_Does_Not_Echo_The_Phrase()
        {
            var family = await CreateConsentedFamilyAsync("emotion-gate");

            var task = await Client.SendAsync(
                Method.Post,
                "/a2a/tasks",
                new
                {
                    type = "emotion_event",
                    sourceAgent = "empathy",
                    childText = HighRisk,
                    locale = "es"
                },
                headers: family.ChildHeaders
            );
            AssumeBackendAvailable(task);
            if (task.StatusCode == HttpStatusCode.ServiceUnavailable)
            {
                Assert.Ignore("A2A orchestrator is disabled on this environment.");
            }
            AssertSuccessStatusCode(task, $"a2a/tasks: {task.StatusCode} {task.Content}");

            var body = JsonSerializer.Deserialize<JsonElement>(task.Content!);
            Assert.That(body.GetProperty("status").GetString(), Is.EqualTo("blocked"));
            Assert.That(task.Content, Does.Not.Contain(HighRisk));

            var diary = await Client.SendAsync(
                Method.Get,
                $"/emotion-detections/{family.ChildId}",
                headers: family.ChildHeaders
            );
            AssumeBackendAvailable(diary);
            AssertSuccessStatusCode(diary, $"emotion-detections: {diary.StatusCode} {diary.Content}");
            var detections = JsonSerializer.Deserialize<JsonElement>(diary.Content!);
            Assert.That(detections.GetProperty("detections").GetArrayLength(), Is.EqualTo(0));
        }

        [Test]
        public async Task Child_Voice_Is_Refused_Before_Any_Reply()
        {
            var family = await CreateConsentedFamilyAsync("emotion-voice");
            var audio = await Client.SendAsync(
                Method.Post,
                "/empathy/child-input",
                new
                {
                    audioBase64 = "dGVzdA==",
                    language = "es-ES",
                    agentKey = "Capitán Empatía",
                    missionId = 1,
                    missionSource = "map_voice"
                },
                headers: family.ChildHeaders
            );
            AssumeBackendAvailable(audio);
            Assert.That(
                audio.StatusCode,
                Is.EqualTo(HttpStatusCode.Forbidden),
                $"child voice should stay off: {audio.StatusCode} {audio.Content}"
            );
        }
    }
}
