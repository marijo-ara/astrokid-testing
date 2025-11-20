using System;

namespace Core.Config
{
    public static class ConfigManager
    {
        private static TestSettings? _cachedSettings;

        public static TestSettings Settings
        {
            get
            {
                if (_cachedSettings != null)
                    return _cachedSettings;

                var baseUrl = Environment.GetEnvironmentVariable("ASTROKID_BASE_URL");
                var environment = Environment.GetEnvironmentVariable("ASTROKID_ENV") ?? "QA";

                if (string.IsNullOrWhiteSpace(baseUrl))
                    throw new InvalidOperationException("ASTROKID_BASE_URL no está configurada.");

                _cachedSettings = new TestSettings
                {
                    BaseUrl = baseUrl,
                    Environment = environment
                };

                return _cachedSettings;
            }
        }
    }
}
