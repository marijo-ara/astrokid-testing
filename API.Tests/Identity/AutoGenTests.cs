using Core.Agents;
using NUnit.Framework;

namespace API.Tests.Identity;

[TestFixture]
public class AutoGenTests
{
    [Test]
    public async Task Should_Generate_TestCase_Successfully()
    {
        var agent = new TestCaseAgent();
        var result = await agent.GenerateTestCase("Generate a test cases for OAuth2 token endpoint");
        Console.WriteLine(result);
        TestContext.WriteLine(result);
        Assert.That(result, Is.Not.Null);
        Assert.That(result, Is.Not.Empty);
        Assert.That(result.Length, Is.GreaterThan(0));
    }
}