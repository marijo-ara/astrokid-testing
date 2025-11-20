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
        Assert.Pass(result);
        Assert.IsNotEmpty(result);
        Assert.IsNotNull(result);
        Assert.IsTrue(result.Length > 0);
        Assert.That(result, Is.Not.Empty);
    }
}