using System.Text.Json;

namespace API.Tests
{
  internal static class JsonTestHelpers
  {
    public static bool TryGetProperty(JsonElement element, string camelName, out JsonElement value)
    {
      if (element.TryGetProperty(camelName, out value))
      {
        return true;
      }

      var snakeName = ToSnakeCase(camelName);
      return element.TryGetProperty(snakeName, out value);
    }

    public static JsonElement GetProperty(JsonElement element, string camelName)
    {
      if (TryGetProperty(element, camelName, out var value))
      {
        return value;
      }

      throw new KeyNotFoundException($"Property '{camelName}' (or snake_case) not found in JSON.");
    }

    private static string ToSnakeCase(string name)
    {
      if (string.IsNullOrEmpty(name))
      {
        return name;
      }

      var chars = new System.Text.StringBuilder();
      for (var i = 0; i < name.Length; i++)
      {
        var c = name[i];
        if (char.IsUpper(c) && i > 0)
        {
          chars.Append('_');
        }
        chars.Append(char.ToLowerInvariant(c));
      }
      return chars.ToString();
    }
  }
}
