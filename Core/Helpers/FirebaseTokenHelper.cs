using System;
using System.Text;
using System.Text.Json;

namespace Core.Helpers
{
    /// <summary>
    /// Helper para generar tokens de Firebase de prueba para tests.
    /// Estos tokens tienen la estructura correcta pero no están verificados por Firebase.
    /// Requiere que el backend tenga ALLOW_UNVERIFIED_FIREBASE=true en desarrollo.
    /// </summary>
    public static class FirebaseTokenHelper
    {
        /// <summary>
        /// Genera un token JWT de prueba compatible con Firebase.
        /// El token tiene la estructura correcta pero no está firmado por Firebase.
        /// </summary>
        /// <param name="userId">ID del usuario (sub claim)</param>
        /// <param name="email">Email del usuario</param>
        /// <param name="expirationMinutes">Minutos hasta la expiración (default: 60)</param>
        /// <returns>Token JWT de prueba</returns>
        public static string GenerateTestFirebaseToken(
            string userId = "test-user-123",
            string email = "test@example.com",
            int expirationMinutes = 60)
        {
            // Header típico de Firebase
            var header = new
            {
                alg = "HS256",
                typ = "JWT",
                kid = "test-key-id"
            };

            // Payload compatible con Firebase
            var exp = DateTimeOffset.UtcNow.AddMinutes(expirationMinutes).ToUnixTimeSeconds();
            var iat = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var authTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            var payload = new
            {
                iss = "https://securetoken.google.com/test-project",
                aud = "test-project",
                auth_time = authTime,
                user_id = userId,
                sub = userId,
                iat = iat,
                exp = exp,
                email = email,
                email_verified = true,
                firebase = new
                {
                    identities = new
                    {
                        email = new[] { email }
                    },
                    sign_in_provider = "password"
                }
            };

            // Codificar header y payload en base64url
            var headerJson = JsonSerializer.Serialize(header);
            var payloadJson = JsonSerializer.Serialize(payload);

            var headerBase64 = Base64UrlEncode(Encoding.UTF8.GetBytes(headerJson));
            var payloadBase64 = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));

            // Crear una firma simple (no es una firma real de Firebase, pero tiene el formato correcto)
            // El backend con ALLOW_UNVERIFIED_FIREBASE=true aceptará tokens con estructura correcta
            var signature = Base64UrlEncode(Encoding.UTF8.GetBytes("test-signature"));

            return $"{headerBase64}.{payloadBase64}.{signature}";
        }

        /// <summary>
        /// Codifica bytes en base64url (sin padding, con caracteres URL-safe)
        /// </summary>
        private static string Base64UrlEncode(byte[] input)
        {
            var base64 = Convert.ToBase64String(input);
            return base64.TrimEnd('=').Replace('+', '-').Replace('/', '_');
        }
    }
}

