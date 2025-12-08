using AutoGen.Core;
using AutoGen.OpenAI;

namespace Core.Agents;

public class TestCaseAgent
{
    private readonly IAgent _agent;

    public TestCaseAgent()
    {
        _agent = null!;
    }

    public async Task<string> GenerateTestCase(string requirement)
    {
        await Task.CompletedTask;
        return $"Generated test case for: {requirement}";
    }
}