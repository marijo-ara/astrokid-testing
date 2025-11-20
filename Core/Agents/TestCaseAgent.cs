using AutoGen;

namespace Core.Agents;

public class TestCaseAgent
{
    private readonly AutoGenAgent _agent;

    public TestCaseAgent()
    {
        _agent = new AutoGenAgent("TestAgent", new OpenAIConfig
        {
            Model = "gpt-4o-mini",
            Temperature = 0.0,
            MaxTokens = 1000,
            TopP = 1.0,
            FrequencyPenalty = 0.0,
            PresencePenalty = 0.0,
        });
    }

    public async Task<string> GenerateTestCase(string requirement)
    {
        var reply = await _agent.SendAsync(new UserMessage(requirement));
        return reply.Message?.Content ?? string.Empty;
    }
}