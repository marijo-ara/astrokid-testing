using NUnit.Framework;
using System.Collections;

namespace API.Tests.Learning;

/// <summary>
/// EJERCICIOS AVANZADOS DE NUNIT
/// 
/// Este archivo contiene ejercicios para conceptos avanzados:
/// - Custom Attributes
/// - Parallel Execution
/// - Test Data Builders
/// - Theory y Datapoints
/// - Fixtures personalizados
/// </summary>

// ============================================
// EJERCICIO 1: Custom Attributes
// ============================================

/// <summary>
/// Crea un atributo personalizado para marcar tests como "Smoke Tests"
/// </summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public class SmokeTestAttribute : CategoryAttribute
{
    public SmokeTestAttribute() : base("SmokeTest")
    {
    }
}

/// <summary>
/// Crea un atributo personalizado para tests de regresión
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
public class RegressionTestAttribute : CategoryAttribute
{
    public RegressionTestAttribute() : base("Regression")
    {
    }
}

[TestFixture]
public class EjerciciosAvanzadosNUnit
{
    // ============================================
    // EJERCICIO 1: Usar Custom Attributes
    // ============================================

    [Test]
    [SmokeTest]
    public void Ejercicio1_CustomAttribute_SmokeTest()
    {
        // TODO: Este test debe estar marcado como SmokeTest
        // Ya está usando el atributo [SmokeTest] definido arriba
        Assert.That(true, Is.True);
    }

    [Test]
    [RegressionTest]
    public void Ejercicio2_CustomAttribute_Regression()
    {
        // TODO: Verifica que este test esté en la categoría "Regression"
        Assert.That(true, Is.True);
    }

    // ============================================
    // EJERCICIO 2: Parallel Execution
    // ============================================

    /// <summary>
    /// [Parallelizable] permite ejecutar tests en paralelo
    /// Útil para acelerar la ejecución de suites grandes
    /// </summary>

    [Test]
    [Parallelizable(ParallelScope.Self)]
    public void Ejercicio3_Parallel_Self()
    {
        // Este test puede ejecutarse en paralelo con otros
        Thread.Sleep(100); // Simula trabajo
        Assert.That(true, Is.True);
    }

    [Test]
    [Parallelizable(ParallelScope.Self)]
    public void Ejercicio4_Parallel_Self()
    {
        // Nota: ParallelScope.Children solo funciona con tests parametrizados
        // Para tests simples, usa ParallelScope.Self
        Assert.That(true, Is.True);
    }

    [Test]
    [NonParallelizable]
    public void Ejercicio5_NonParallel()
    {
        // Este test NO se ejecutará en paralelo
        // Útil para tests que comparten recursos
        Assert.That(true, Is.True);
    }

    // ============================================
    // EJERCICIO 3: Theory y Datapoints
    // =summary>

    /// <summary>
    /// [Theory] es como [Test] pero está diseñado para trabajar con datos
    /// [Datapoint] proporciona valores para teorías
    /// </summary>

    [Datapoint] public int valor1 = 1;
    [Datapoint] public int valor2 = 2;
    [Datapoint] public int valor3 = 3;

    [Theory]
    public void Ejercicio6_Theory_SumaEsPositiva(int a, int b)
    {
        // TODO: Esta teoría se ejecutará con todas las combinaciones de Datapoints
        // Verifica que la suma de a + b sea positiva
        // int suma = ???;
        // Assert.That(suma, ???);
    }

    // ============================================
    // EJERCICIO 4: Test Data Builders
    // ============================================

    /// <summary>
    /// Test Data Builder es un patrón para construir objetos de prueba
    /// Facilita la creación de objetos complejos con valores por defecto
    /// </summary>

    public class UsuarioBuilder
    {
        private string _nombre = "Usuario";
        private string _email = "usuario@example.com";
        private int _edad = 25;
        private bool _activo = true;

        public UsuarioBuilder ConNombre(string nombre)
        {
            _nombre = nombre;
            return this;
        }

        public UsuarioBuilder ConEmail(string email)
        {
            _email = email;
            return this;
        }

        public UsuarioBuilder ConEdad(int edad)
        {
            _edad = edad;
            return this;
        }

        public UsuarioBuilder Inactivo()
        {
            _activo = false;
            return this;
        }

        public Usuario Build()
        {
            return new Usuario
            {
                Nombre = _nombre,
                Email = _email,
                Edad = _edad,
                Activo = _activo
            };
        }
    }

    public class Usuario
    {
        public string Nombre { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int Edad { get; set; }
        public bool Activo { get; set; }
    }

    [Test]
    public void Ejercicio7_TestDataBuilder_UsuarioBasico()
    {
        // TODO: Usa UsuarioBuilder para crear un usuario con valores por defecto
        // var usuario = new UsuarioBuilder().Build();
        // Assert.That(usuario.Nombre, ???);
    }

    [Test]
    public void Ejercicio8_TestDataBuilder_UsuarioPersonalizado()
    {
        // TODO: Crea un usuario personalizado usando el builder
        // var usuario = new UsuarioBuilder()
        //     .ConNombre("Juan")
        //     .ConEmail("juan@test.com")
        //     .ConEdad(30)
        //     .Build();
        // 
        // Assert.That(usuario.Nombre, ???);
        // Assert.That(usuario.Email, ???);
    }

    // ============================================
    // EJERCICIO 5: Fixtures Personalizados
    // ============================================

    /// <summary>
    /// Puedes crear clases base para compartir setup/teardown entre múltiples clases de test
    /// </summary>

    [TestFixture]
    public class Ejercicio9_FixturePersonalizado : BaseTestFixture
    {
        [Test]
        public void TestConFixturePersonalizado()
        {
            // TODO: Este test hereda de BaseTestFixture
            // Verifica que la propiedad Configuracion esté disponible
            // Assert.That(Configuracion, Is.Not.Null);
        }
    }

    public class BaseTestFixture
    {
        protected string Configuracion { get; private set; } = string.Empty;

        [SetUp]
        public virtual void SetUp()
        {
            Configuracion = "Configurado";
        }

        [TearDown]
        public virtual void TearDown()
        {
            Configuracion = string.Empty;
        }
    }

    // ============================================
    // EJERCICIO 6: Assertions Avanzadas con Constraints
    // ============================================

    [Test]
    public void Ejercicio10_Constraints_AndOr()
    {
        int numero = 15;
        
        // TODO: Verifica que el número esté entre 10 y 20 Y sea impar
        // Assert.That(numero, ???);
    }

    [Test]
    public void Ejercicio11_Constraints_Not()
    {
        string texto = "Hola";
        
        // TODO: Verifica que el texto NO sea null Y NO esté vacío
        // Assert.That(texto, ???);
    }

    [Test]
    public void Ejercicio12_Constraints_AllItems()
    {
        var numeros = new[] { 2, 4, 6, 8, 10 };
        
        // TODO: Verifica que TODOS los números sean pares
        // Assert.That(numeros, ???);
    }

    [Test]
    public void Ejercicio13_Constraints_SomeItems()
    {
        var numeros = new[] { 1, 2, 3, 4, 5 };
        
        // TODO: Verifica que AL MENOS UN número sea mayor que 4
        // Assert.That(numeros, ???);
    }

    // ============================================
    // EJERCICIO 7: Assertions con Excepciones Avanzadas
    // ============================================

    [Test]
    public void Ejercicio14_Exception_ConMensaje()
    {
        // TODO: Verifica que se lance una excepción con un mensaje específico
        // Assert.That(() => LanzarExcepcion(), 
        //     Throws.Exception.With.Message.Contains("mensaje esperado"));
        
        void LanzarExcepcion()
        {
            throw new InvalidOperationException("Este es el mensaje esperado");
        }
        
        // TODO: Completa la assertion
    }

    [Test]
    public void Ejercicio15_Exception_ConPropiedad()
    {
        // TODO: Verifica que se lance ArgumentNullException con el parámetro correcto
        // Assert.That(() => ValidarParametro(null), 
        //     Throws.ArgumentNullException.With.Property("ParamName").EqualTo("parametro"));
        
        void ValidarParametro(string? parametro)
        {
            if (parametro == null)
                throw new ArgumentNullException(nameof(parametro));
        }
        
        // TODO: Completa la assertion
    }

    // ============================================
    // EJERCICIO 8: TestContext Avanzado
    // ============================================

    [Test]
    public void Ejercicio16_TestContext_WorkDirectory()
    {
        // TODO: Obtén el directorio de trabajo del test
        // string workDir = TestContext.CurrentContext.WorkDirectory;
        // TestContext.WriteLine($"Directorio de trabajo: {workDir}");
        
        Assert.That(true, Is.True);
    }

    [Test]
    public void Ejercicio17_TestContext_TestParameters()
    {
        // TODO: Escribe información sobre los parámetros del test
        // var test = TestContext.CurrentContext.Test;
        // TestContext.WriteLine($"Test: {test.Name}");
        // TestContext.WriteLine($"FullName: {test.FullName}");
        
        Assert.That(true, Is.True);
    }

    // ============================================
    // EJERCICIO 9: Async/Await en Tests
    // ============================================

    [Test]
    public async Task Ejercicio18_Async_Await()
    {
        // Los tests pueden ser async
        // TODO: Crea una tarea asíncrona y espera su resultado
        // var resultado = await Task.Run(() => "Completado");
        // Assert.That(resultado, ???);
    }

    [Test]
    public async Task Ejercicio19_Async_Timeout()
    {
        // TODO: Combina async con timeout
        // [Timeout(2000)] // 2 segundos
        // var resultado = await Task.Delay(1000);
        // Assert.That(true, Is.True);
        
        await Task.Delay(100);
        Assert.That(true, Is.True);
    }

    // ============================================
    // EJERCICIO 10: Test Data desde Archivos
    // ============================================

    private static IEnumerable<object[]> DatosDesdeMetodo()
    {
        // Puedes leer datos desde archivos, bases de datos, etc.
        yield return new object[] { "dato1", "resultado1" };
        yield return new object[] { "dato2", "resultado2" };
        yield return new object[] { "dato3", "resultado3" };
    }

    [Test]
    [TestCaseSource(nameof(DatosDesdeMetodo))]
    public void Ejercicio20_TestData_DesdeMetodo(string dato, string resultadoEsperado)
    {
        // TODO: Procesa el dato y verifica el resultado
        // string resultado = ProcesarDato(dato);
        // Assert.That(resultado, ???);
        
        string ProcesarDato(string d) => $"resultado{d.Last()}";
        
        // TODO: Completa el test
    }

    // ============================================
    // SOLUCIONES (Descomenta para ver las respuestas)
    // ============================================

    /*
    [Theory]
    public void Solucion_Ejercicio6(int a, int b)
    {
        int suma = a + b;
        Assert.That(suma, Is.GreaterThan(0));
    }

    [Test]
    public void Solucion_Ejercicio7()
    {
        var usuario = new UsuarioBuilder().Build();
        Assert.That(usuario.Nombre, Is.EqualTo("Usuario"));
        Assert.That(usuario.Email, Is.EqualTo("usuario@example.com"));
        Assert.That(usuario.Edad, Is.EqualTo(25));
        Assert.That(usuario.Activo, Is.True);
    }

    [Test]
    public void Solucion_Ejercicio8()
    {
        var usuario = new UsuarioBuilder()
            .ConNombre("Juan")
            .ConEmail("juan@test.com")
            .ConEdad(30)
            .Build();
        
        Assert.That(usuario.Nombre, Is.EqualTo("Juan"));
        Assert.That(usuario.Email, Is.EqualTo("juan@test.com"));
        Assert.That(usuario.Edad, Is.EqualTo(30));
    }

    [Test]
    public void Solucion_Ejercicio10()
    {
        int numero = 15;
        Assert.That(numero, Is.InRange(10, 20).And.Matches<int>(n => n % 2 == 1));
    }

    [Test]
    public void Solucion_Ejercicio11()
    {
        string texto = "Hola";
        Assert.That(texto, Is.Not.Null.And.Not.Empty);
    }

    [Test]
    public void Solucion_Ejercicio12()
    {
        var numeros = new[] { 2, 4, 6, 8, 10 };
        Assert.That(numeros, Is.All.Matches<int>(n => n % 2 == 0));
    }

    [Test]
    public void Solucion_Ejercicio13()
    {
        var numeros = new[] { 1, 2, 3, 4, 5 };
        Assert.That(numeros, Has.Some.GreaterThan(4));
    }

    [Test]
    public void Solucion_Ejercicio14()
    {
        void LanzarExcepcion()
        {
            throw new InvalidOperationException("Este es el mensaje esperado");
        }
        
        Assert.That(() => LanzarExcepcion(), 
            Throws.InvalidOperationException.With.Message.Contains("mensaje esperado"));
    }

    [Test]
    public void Solucion_Ejercicio15()
    {
        void ValidarParametro(string? parametro)
        {
            if (parametro == null)
                throw new ArgumentNullException(nameof(parametro));
        }
        
        Assert.That(() => ValidarParametro(null), 
            Throws.ArgumentNullException.With.Property("ParamName").EqualTo("parametro"));
    }

    [Test]
    public void Solucion_Ejercicio16()
    {
        string workDir = TestContext.CurrentContext.WorkDirectory;
        TestContext.WriteLine($"Directorio de trabajo: {workDir}");
        Assert.That(workDir, Is.Not.Empty);
    }

    [Test]
    public void Solucion_Ejercicio17()
    {
        var test = TestContext.CurrentContext.Test;
        TestContext.WriteLine($"Test: {test.Name}");
        TestContext.WriteLine($"FullName: {test.FullName}");
        Assert.That(test.Name, Is.Not.Empty);
    }

    [Test]
    public async Task Solucion_Ejercicio18()
    {
        var resultado = await Task.Run(() => "Completado");
        Assert.That(resultado, Is.EqualTo("Completado"));
    }

    [Test]
    [Timeout(2000)]
    public async Task Solucion_Ejercicio19()
    {
        await Task.Delay(1000);
        Assert.That(true, Is.True);
    }

    [Test]
    [TestCaseSource(nameof(DatosDesdeMetodo))]
    public void Solucion_Ejercicio20(string dato, string resultadoEsperado)
    {
        string ProcesarDato(string d) => $"resultado{d.Last()}";
        string resultado = ProcesarDato(dato);
        Assert.That(resultado, Is.EqualTo(resultadoEsperado));
    }
    */
}

