using NUnit.Framework;
using Core.Clients;
using RestSharp;

namespace API.Tests.Learning;

/// <summary>
/// MEJORES PRÁCTICAS Y PATRONES DE TESTING EN .NET
/// 
/// Este archivo contiene ejemplos de mejores prácticas:
/// - Nomenclatura de tests (Arrange-Act-Assert)
/// - Organización de tests
/// - Patrones comunes (Given-When-Then, Builder, Factory)
/// - Manejo de datos de prueba
/// - Tests de integración vs unitarios
/// </summary>

[TestFixture]
public class MejoresPracticasTesting
{
    // ============================================
    // MEJORA PRÁCTICA 1: Nomenclatura Clara
    // ============================================

    /// <summary>
    /// BUENO: Nombre descriptivo que explica qué se está probando
    /// Formato recomendado: Should_[Accion]_When_[Condicion]
    /// </summary>
    [Test]
    public void Should_Return_Token_When_Valid_Credentials_Provided()
    {
        // Arrange - Preparar
        var client = new AstroKidClient();
        var credentials = new { email = "test@example.com", password = "Password123!" };

        // Act - Ejecutar
        var response = client.PostAsync("/auth/token", credentials).Result;

        // Assert - Verificar
        Assert.That(response.StatusCode, Is.EqualTo(System.Net.HttpStatusCode.OK));
    }

    /// <summary>
    /// MALO: Nombre genérico que no explica nada
    /// </summary>
    [Test]
    public void Test1() // ❌ MALO
    {
        // ...
    }

    // ============================================
    // MEJORA PRÁCTICA 2: Arrange-Act-Assert (AAA)
    // ============================================

    [Test]
    public void Ejemplo_AAA_Patron()
    {
        // ARRANGE - Preparar el escenario
        int numero1 = 5;
        int numero2 = 3;
        int resultadoEsperado = 8;

        // ACT - Ejecutar la acción
        int resultado = numero1 + numero2;

        // ASSERT - Verificar el resultado
        Assert.That(resultado, Is.EqualTo(resultadoEsperado));
    }

    // ============================================
    // MEJORA PRÁCTICA 3: Un Test = Una Aserción
    // ============================================

    /// <summary>
    /// BUENO: Un test verifica una cosa específica
    /// </summary>
    [Test]
    public void Should_Return_200_When_Request_Is_Valid()
    {
        // Arrange
        var client = new AstroKidClient();
        
        // Act
        var response = client.GetAsync("/health").Result;
        
        // Assert
        Assert.That(response.StatusCode, Is.EqualTo(System.Net.HttpStatusCode.OK));
    }

    [Test]
    public void Should_Return_Valid_Json_When_Request_Is_Valid()
    {
        // Arrange
        var client = new AstroKidClient();
        
        // Act
        var response = client.GetAsync("/health").Result;
        
        // Assert
        Assert.That(response.Content, Is.Not.Null);
        Assert.That(response.ContentType, Does.Contain("json"));
    }

    /// <summary>
    /// A veces está bien tener múltiples assertions relacionadas
    /// si todas verifican el mismo concepto
    /// </summary>
    [Test]
    public void Should_Return_Valid_Response_When_Request_Is_Valid()
    {
        // Arrange
        var client = new AstroKidClient();
        
        // Act
        var response = client.GetAsync("/health").Result;
        
        // Assert - Múltiples assertions sobre el mismo concepto (respuesta válida)
        Assert.That(response.StatusCode, Is.EqualTo(System.Net.HttpStatusCode.OK));
        Assert.That(response.Content, Is.Not.Null);
        Assert.That(response.ContentType, Does.Contain("json"));
    }

    // ============================================
    // MEJORA PRÁCTICA 4: Tests Independientes
    // ============================================

    /// <summary>
    /// BUENO: Cada test es independiente y puede ejecutarse en cualquier orden
    /// </summary>
    [TestFixture]
    public class TestsIndependientes
    {
        private int _contador;

        [SetUp]
        public void SetUp()
        {
            // Cada test comienza con un estado limpio
            _contador = 0;
        }

        [Test]
        public void Test1_Incrementa_Contador()
        {
            _contador++;
            Assert.That(_contador, Is.EqualTo(1));
        }

        [Test]
        public void Test2_Incrementa_Contador()
        {
            _contador++;
            Assert.That(_contador, Is.EqualTo(1)); // Siempre 1, no depende de Test1
        }
    }

    // ============================================
    // MEJORA PRÁCTICA 5: Helper Methods
    // ============================================

    /// <summary>
    /// Usa métodos helper para evitar duplicación de código
    /// </summary>
    [TestFixture]
    public class TestsConHelpers
    {
        private AstroKidClient _client = null!;

        [SetUp]
        public void SetUp()
        {
            _client = new AstroKidClient();
        }

        // Helper method para crear credenciales de prueba
        private object CrearCredenciales(string email = "test@example.com", string password = "Password123!")
        {
            return new { email, password };
        }

        // Helper method para verificar respuesta exitosa
        private void VerificarRespuestaExitosa(RestResponse response)
        {
            Assert.That(response.StatusCode, Is.EqualTo(System.Net.HttpStatusCode.OK));
            Assert.That(response.Content, Is.Not.Null);
        }

        [Test]
        public void Should_Authenticate_With_Valid_Credentials()
        {
            // Arrange
            var credentials = CrearCredenciales();

            // Act
            var response = _client.PostAsync("/auth/token", credentials).Result;

            // Assert
            VerificarRespuestaExitosa(response);
        }
    }

    // ============================================
    // MEJORA PRÁCTICA 6: Test Data Builders
    // ============================================

    /// <summary>
    /// Usa el patrón Builder para crear objetos de prueba complejos
    /// </summary>
    public class UsuarioTestBuilder
    {
        private string _nombre = "Usuario Test";
        private string _email = "test@example.com";
        private int _edad = 25;
        private bool _activo = true;

        public UsuarioTestBuilder ConNombre(string nombre)
        {
            _nombre = nombre;
            return this;
        }

        public UsuarioTestBuilder ConEmail(string email)
        {
            _email = email;
            return this;
        }

        public UsuarioTestBuilder ConEdad(int edad)
        {
            _edad = edad;
            return this;
        }

        public UsuarioTestBuilder Inactivo()
        {
            _activo = false;
            return this;
        }

        public object Build()
        {
            return new
            {
                nombre = _nombre,
                email = _email,
                edad = _edad,
                activo = _activo
            };
        }
    }

    [Test]
    public void Ejemplo_Uso_TestDataBuilder()
    {
        // Arrange - Usando builder para crear datos de prueba
        var usuario = new UsuarioTestBuilder()
            .ConNombre("Juan")
            .ConEmail("juan@test.com")
            .ConEdad(30)
            .Build();

        // Act & Assert
        Assert.That(usuario, Is.Not.Null);
    }

    // ============================================
    // MEJORA PRÁCTICA 7: Test Fixtures y Setup
    // ============================================

    /// <summary>
    /// Usa clases base para compartir setup común
    /// </summary>
    [TestFixture]
    public class TestsConFixtureBase : BaseApiTestFixture
    {
        [Test]
        public void Should_Use_Base_Client()
        {
            // El cliente ya está configurado en la clase base
            Assert.That(Client, Is.Not.Null);
        }
    }

    public class BaseApiTestFixture
    {
        protected AstroKidClient Client { get; private set; } = null!;

        [SetUp]
        public virtual void SetUp()
        {
            Client = new AstroKidClient();
        }

        [TearDown]
        public virtual void TearDown()
        {
            // Limpiar recursos si es necesario
        }
    }

    // ============================================
    // MEJORA PRÁCTICA 8: Organización por Características
    // ============================================

    /// <summary>
    /// Organiza tus tests por características/funcionalidades
    /// Ejemplo de estructura:
    /// - API.Tests/
    ///   - Identity/
    ///     - TokenTests.cs
    ///     - LoginTests.cs
    ///   - Children/
    ///     - ChildrenTests.cs
    ///   - Parents/
    ///     - ParentsTests.cs
    /// </summary>

    // ============================================
    // MEJORA PRÁCTICA 9: Categories para Organización
    // ============================================

    [Test]
    [Category("Smoke")]
    [Category("Fast")]
    public void Smoke_Test_Rapido()
    {
        // Tests críticos que deben ejecutarse primero
        Assert.That(true, Is.True);
    }

    [Test]
    [Category("Integration")]
    [Category("Slow")]
    public void Integration_Test_Lento()
    {
        // Tests de integración que pueden tardar más
        Assert.That(true, Is.True);
    }

    // ============================================
    // MEJORA PRÁCTICA 10: Manejo de Excepciones
    // ============================================

    [Test]
    public void Should_Throw_Exception_When_Invalid_Input()
    {
        // Arrange
        string? input = null;

        // Act & Assert
        Assert.That(() => ProcesarInput(input),
            Throws.ArgumentNullException);
    }

    private void ProcesarInput(string? input)
    {
        if (input == null)
            throw new ArgumentNullException(nameof(input));
    }

    // ============================================
    // MEJORA PRÁCTICA 11: Tests Parametrizados
    // ============================================

    [Test]
    [TestCase("test@example.com", true)]
    [TestCase("invalid-email", false)]
    [TestCase("", false)]
    [TestCase(null, false)]
    public void Should_Validate_Email_Correctly(string? email, bool esperado)
    {
        // Arrange & Act
        bool esValido = ValidarEmail(email);

        // Assert
        Assert.That(esValido, Is.EqualTo(esperado));
    }

    private bool ValidarEmail(string? email)
    {
        if (string.IsNullOrEmpty(email))
            return false;
        
        return email.Contains("@") && email.Contains(".");
    }

    // ============================================
    // MEJORA PRÁCTICA 12: Async/Await Correcto
    // ============================================

    [Test]
    public async Task Should_Handle_Async_Operations_Correctly()
    {
        // Arrange
        var client = new AstroKidClient();

        // Act - Usa await, no .Result
        var response = await client.GetAsync("/health");

        // Assert
        Assert.That(response.StatusCode, Is.EqualTo(System.Net.HttpStatusCode.OK));
    }

    // ============================================
    // MEJORA PRÁCTICA 13: Test Data Externo
    // ============================================

    private static IEnumerable<object[]> CasosDePruebaExternos()
    {
        // Puedes leer desde archivos JSON, CSV, base de datos, etc.
        yield return new object[] { "caso1", "resultado1" };
        yield return new object[] { "caso2", "resultado2" };
    }

    [Test]
    [TestCaseSource(nameof(CasosDePruebaExternos))]
    public void Should_Process_External_Test_Data(string caso, string resultadoEsperado)
    {
        // Arrange & Act
        string resultado = ProcesarCaso(caso);

        // Assert
        Assert.That(resultado, Is.EqualTo(resultadoEsperado));
    }

    private string ProcesarCaso(string caso) => $"resultado{caso.Last()}";

    // ============================================
    // MEJORA PRÁCTICA 14: Logging en Tests
    // ============================================

    [Test]
    public void Should_Log_Test_Information()
    {
        // Usa TestContext para logging
        TestContext.WriteLine("Iniciando test...");
        
        // Arrange
        var datos = "datos de prueba";
        TestContext.WriteLine($"Datos: {datos}");

        // Act
        var resultado = ProcesarDatos(datos);
        TestContext.WriteLine($"Resultado: {resultado}");

        // Assert
        Assert.That(resultado, Is.Not.Null);
        TestContext.WriteLine("Test completado exitosamente");
    }

    private string ProcesarDatos(string datos) => datos.ToUpper();

    // ============================================
    // MEJORA PRÁCTICA 15: Clean Code en Tests
    // ============================================

    /// <summary>
    /// BUENO: Código limpio y legible
    /// </summary>
    [Test]
    public void Should_Calculate_Total_Price_Correctly()
    {
        // Arrange
        var precioUnitario = 10.50m;
        var cantidad = 3;
        var descuento = 0.10m; // 10%
        var precioEsperado = 28.35m; // (10.50 * 3) * 0.90

        // Act
        var precioTotal = CalcularPrecioTotal(precioUnitario, cantidad, descuento);

        // Assert
        Assert.That(precioTotal, Is.EqualTo(precioEsperado));
    }

    private decimal CalcularPrecioTotal(decimal precioUnitario, int cantidad, decimal descuento)
    {
        var subtotal = precioUnitario * cantidad;
        return subtotal * (1 - descuento);
    }

    // ============================================
    // RESUMEN DE MEJORES PRÁCTICAS
    // ============================================

    /*
     * 1. ✅ Nombres descriptivos: Should_[Accion]_When_[Condicion]
     * 2. ✅ Usa el patrón AAA (Arrange-Act-Assert)
     * 3. ✅ Un test verifica una cosa (o conceptos relacionados)
     * 4. ✅ Tests independientes y ejecutables en cualquier orden
     * 5. ✅ Usa helper methods para evitar duplicación
     * 6. ✅ Usa Test Data Builders para objetos complejos
     * 7. ✅ Organiza tests por características/funcionalidades
     * 8. ✅ Usa Categories para agrupar tests
     * 9. ✅ Maneja excepciones correctamente en tests
     * 10. ✅ Usa tests parametrizados para múltiples casos
     * 11. ✅ Usa async/await correctamente (no .Result)
     * 12. ✅ Usa TestContext para logging
     * 13. ✅ Mantén el código de tests limpio y legible
     * 14. ✅ Evita lógica compleja en tests (mueve a helpers)
     * 15. ✅ Tests rápidos y determinísticos
     */
}

