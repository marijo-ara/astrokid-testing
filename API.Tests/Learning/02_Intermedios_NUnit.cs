using NUnit.Framework;

namespace API.Tests.Learning;

/// <summary>
/// EJERCICIOS INTERMEDIOS DE NUNIT
/// 
/// Este archivo contiene ejercicios para conceptos intermedios:
/// - Test Cases parametrizados ([TestCase], [TestCaseSource])
/// - Categories ([Category])
/// - OneTimeSetUp y OneTimeTearDown
/// - Ignore y Skip
/// - Timeout
/// </summary>
[TestFixture]
public class EjerciciosIntermediosNUnit
{
    private static int _contadorGlobal = 0;

    [OneTimeSetUp]
    public void OneTimeSetUp()
    {
        // Se ejecuta UNA SOLA VEZ antes de todos los tests de esta clase
        _contadorGlobal = 0;
        Console.WriteLine("OneTimeSetUp - Inicialización global");
    }

    [OneTimeTearDown]
    public void OneTimeTearDown()
    {
        // Se ejecuta UNA SOLA VEZ después de todos los tests de esta clase
        Console.WriteLine($"OneTimeTearDown - Contador final: {_contadorGlobal}");
    }

    // ============================================
    // EJERCICIO 1: Test Cases Parametrizados
    // ============================================

    /// <summary>
    /// [TestCase] permite ejecutar el mismo test con diferentes valores
    /// Cada [TestCase] se ejecuta como un test separado
    /// </summary>
    [Test]
    [TestCase(2, 2, 4)]
    [TestCase(3, 5, 8)]
    [TestCase(10, 20, 30)]
    public void Ejercicio1_TestCase_Suma(int a, int b, int resultadoEsperado)
    {
        // TODO: Implementa la suma y verifica el resultado
        // int resultado = ???;
        // Assert.That(resultado, ???);
    }

    [Test]
    [TestCase("hola", "HOLA")]
    [TestCase("mundo", "MUNDO")]
    [TestCase("nUnit", "NUNIT")]
    public void Ejercicio2_TestCase_ToUpper(string entrada, string esperado)
    {
        // TODO: Convierte la entrada a mayúsculas y verifica
        // string resultado = ???;
        // Assert.That(resultado, ???);
    }

    [Test]
    [TestCase(5, true)]   // 5 es mayor que 0
    [TestCase(0, false)]  // 0 no es mayor que 0
    [TestCase(-5, false)] // -5 no es mayor que 0
    public void Ejercicio3_TestCase_EsPositivo(int numero, bool esperado)
    {
        // TODO: Verifica si el número es positivo (> 0)
        // bool esPositivo = ???;
        // Assert.That(esPositivo, ???);
    }

    // ============================================
    // EJERCICIO 2: TestCaseSource
    // ============================================

    /// <summary>
    /// [TestCaseSource] permite obtener datos de una propiedad o método
    /// Útil cuando tienes muchos casos de prueba o datos complejos
    /// </summary>
    
    private static object[] CasosDePruebaSuma = new[]
    {
        new object[] { 1, 1, 2 },
        new object[] { 2, 3, 5 },
        new object[] { 10, 15, 25 },
        new object[] { -5, 5, 0 }
    };

    [Test]
    [TestCaseSource(nameof(CasosDePruebaSuma))]
    public void Ejercicio4_TestCaseSource_Suma(int a, int b, int esperado)
    {
        // TODO: Implementa la suma usando los datos del TestCaseSource
        // int resultado = ???;
        // Assert.That(resultado, ???);
    }

    // Método que retorna casos de prueba
    private static IEnumerable<object[]> CasosDePruebaDivision()
    {
        yield return new object[] { 10, 2, 5 };
        yield return new object[] { 15, 3, 5 };
        yield return new object[] { 20, 4, 5 };
    }

    [Test]
    [TestCaseSource(nameof(CasosDePruebaDivision))]
    public void Ejercicio5_TestCaseSource_Metodo(int dividendo, int divisor, int esperado)
    {
        // TODO: Implementa la división
        // int resultado = ???;
        // Assert.That(resultado, ???);
    }

    // ============================================
    // EJERCICIO 3: Categories (Categorías)
    // ============================================

    /// <summary>
    /// [Category] permite agrupar tests para ejecutarlos selectivamente
    /// Útil para separar tests rápidos, lentos, de integración, etc.
    /// </summary>

    [Test]
    [Category("Rapido")]
    public void Ejercicio6_Category_Rapido()
    {
        // Este test es rápido
        Assert.That(1 + 1, Is.EqualTo(2));
    }

    [Test]
    [Category("Lento")]
    [Category("Integracion")]
    public void Ejercicio7_Category_Lento()
    {
        // TODO: Agrega un delay simulado de 100ms
        // Thread.Sleep(100);
        Assert.That(true, Is.True);
    }

    [Test]
    [Category("API")]
    public void Ejercicio8_Category_API()
    {
        // TODO: Este test sería para pruebas de API
        // Por ahora solo verifica que el test funciona
        Assert.That(true, Is.True);
    }

    // ============================================
    // EJERCICIO 4: Ignore y Skip
    // ============================================

    /// <summary>
    /// [Ignore] marca un test para que no se ejecute
    /// Útil para tests que están en desarrollo o temporalmente deshabilitados
    /// </summary>

    [Test]
    [Ignore("Este test está en desarrollo")]
    public void Ejercicio9_Ignore_EnDesarrollo()
    {
        // Este test no se ejecutará
        Assert.That(true, Is.True);
    }

    [Test]
    public void Ejercicio10_Skip_Condicional()
    {
        // Skip permite saltar un test condicionalmente
        bool condicion = false; // Simula una condición
        
        // TODO: Si la condición es false, salta el test con un mensaje
        // if (!condicion)
        // {
        //     Assert.Ignore("La condición no se cumplió");
        // }
        
        Assert.That(true, Is.True);
    }

    // ============================================
    // EJERCICIO 5: Timeout
    // ============================================

    /// <summary>
    /// [Timeout] establece un tiempo máximo para ejecutar un test
    /// Si el test tarda más, se marca como fallido
    /// </summary>

    [Test]
    [Timeout(1000)] // 1 segundo
    public void Ejercicio11_Timeout_Rapido()
    {
        // Este test debe completarse en menos de 1 segundo
        Thread.Sleep(100);
        Assert.That(true, Is.True);
    }

    [Test]
    [Timeout(5000)] // 5 segundos
    public void Ejercicio12_Timeout_Lento()
    {
        // TODO: Simula una operación que tarda 2 segundos
        // Thread.Sleep(2000);
        Assert.That(true, Is.True);
    }

    // ============================================
    // EJERCICIO 6: Values y Range
    // ============================================

    /// <summary>
    /// [Values] ejecuta el test con cada valor especificado
    /// [Range] ejecuta el test con un rango de valores
    /// </summary>

    [Test]
    public void Ejercicio13_Values_MultiplesValores([Values(1, 2, 3, 4, 5)] int numero)
    {
        // Este test se ejecutará 5 veces, una por cada valor
        // TODO: Verifica que el número sea mayor que 0
        // Assert.That(numero, ???);
    }

    [Test]
    public void Ejercicio14_Range_RangoDeValores([Range(1, 10, 2)] int numero)
    {
        // Este test se ejecutará con valores: 1, 3, 5, 7, 9
        // (inicio, fin, paso)
        // TODO: Verifica que el número sea impar
        // Assert.That(numero % 2, ???);
    }

    // ============================================
    // EJERCICIO 7: Combinaciones de Attributes
    // ============================================

    [Test]
    [Category("Matematicas")]
    [TestCase(2, 2, 4)]
    [TestCase(3, 3, 9)]
    public void Ejercicio15_Combinacion_Attributes(int numero, int potencia, int esperado)
    {
        // TODO: Calcula numero^potencia y verifica
        // Puedes usar Math.Pow
        // double resultado = ???;
        // Assert.That(resultado, ???);
    }

    // ============================================
    // EJERCICIO 8: Retry
    // ============================================

    /// <summary>
    /// [Retry] permite reintentar un test si falla
    /// Útil para tests que pueden fallar intermitentemente
    /// </summary>

    [Test]
    [Retry(3)] // Reintenta hasta 3 veces si falla
    public void Ejercicio16_Retry_Reintentar()
    {
        // Simula un test que puede fallar aleatoriamente
        var random = new Random();
        var numero = random.Next(1, 10);
        
        // TODO: Este test fallará si el número es mayor que 5
        // Modifica para que siempre pase o use retry correctamente
        // Assert.That(numero, Is.LessThanOrEqualTo(5));
    }

    // ============================================
    // EJERCICIO 9: TestContext
    // ============================================

    /// <summary>
    /// TestContext proporciona información sobre el test actual
    /// Útil para logging y debugging
    /// </summary>

    [Test]
    public void Ejercicio17_TestContext_Informacion()
    {
        // TODO: Usa TestContext para escribir información
        // TestContext.WriteLine($"Nombre del test: {TestContext.CurrentContext.Test.Name}");
        // TestContext.WriteLine($"Estado: {TestContext.CurrentContext.Result.Outcome}");
        
        Assert.That(true, Is.True);
    }

    // ============================================
    // EJERCICIO 10: Order (Orden de ejecución)
    // ============================================

    /// <summary>
    /// [Order] permite especificar el orden de ejecución de los tests
    /// Útil cuando los tests tienen dependencias entre sí
    /// </summary>

    [Test]
    [Order(1)]
    public void Ejercicio18_Order_Primero()
    {
        _contadorGlobal++;
        TestContext.WriteLine($"Ejecutando primero. Contador: {_contadorGlobal}");
        Assert.That(_contadorGlobal, Is.EqualTo(1));
    }

    [Test]
    [Order(2)]
    public void Ejercicio19_Order_Segundo()
    {
        _contadorGlobal++;
        // TODO: Verifica que el contador sea 2
        // Assert.That(_contadorGlobal, ???);
    }

    [Test]
    [Order(3)]
    public void Ejercicio20_Order_Tercero()
    {
        _contadorGlobal++;
        // TODO: Verifica que el contador sea 3
        // Assert.That(_contadorGlobal, ???);
    }

    // ============================================
    // SOLUCIONES (Descomenta para ver las respuestas)
    // ============================================

    /*
    [Test]
    [TestCase(2, 2, 4)]
    [TestCase(3, 5, 8)]
    public void Solucion_Ejercicio1(int a, int b, int resultadoEsperado)
    {
        int resultado = a + b;
        Assert.That(resultado, Is.EqualTo(resultadoEsperado));
    }

    [Test]
    [TestCase("hola", "HOLA")]
    public void Solucion_Ejercicio2(string entrada, string esperado)
    {
        string resultado = entrada.ToUpper();
        Assert.That(resultado, Is.EqualTo(esperado));
    }

    [Test]
    [TestCase(5, true)]
    [TestCase(0, false)]
    public void Solucion_Ejercicio3(int numero, bool esperado)
    {
        bool esPositivo = numero > 0;
        Assert.That(esPositivo, Is.EqualTo(esperado));
    }

    [Test]
    [TestCaseSource(nameof(CasosDePruebaSuma))]
    public void Solucion_Ejercicio4(int a, int b, int esperado)
    {
        int resultado = a + b;
        Assert.That(resultado, Is.EqualTo(esperado));
    }

    [Test]
    [TestCaseSource(nameof(CasosDePruebaDivision))]
    public void Solucion_Ejercicio5(int dividendo, int divisor, int esperado)
    {
        int resultado = dividendo / divisor;
        Assert.That(resultado, Is.EqualTo(esperado));
    }

    [Test]
    public void Solucion_Ejercicio10()
    {
        bool condicion = false;
        
        if (!condicion)
        {
            Assert.Ignore("La condición no se cumplió");
        }
        
        Assert.That(true, Is.True);
    }

    [Test]
    [Timeout(5000)]
    public void Solucion_Ejercicio12()
    {
        Thread.Sleep(2000);
        Assert.That(true, Is.True);
    }

    [Test]
    public void Solucion_Ejercicio13([Values(1, 2, 3, 4, 5)] int numero)
    {
        Assert.That(numero, Is.GreaterThan(0));
    }

    [Test]
    public void Solucion_Ejercicio14([Range(1, 10, 2)] int numero)
    {
        Assert.That(numero % 2, Is.EqualTo(1)); // Número impar
    }

    [Test]
    [TestCase(2, 2, 4)]
    [TestCase(3, 3, 9)]
    public void Solucion_Ejercicio15(int numero, int potencia, int esperado)
    {
        double resultado = Math.Pow(numero, potencia);
        Assert.That(resultado, Is.EqualTo(esperado));
    }

    [Test]
    [Retry(3)]
    public void Solucion_Ejercicio16()
    {
        // Para que siempre pase, simplemente verifica true
        Assert.That(true, Is.True);
        
        // O si quieres usar retry con lógica:
        var random = new Random();
        var numero = random.Next(1, 10);
        // El retry hará que se reintente si falla
        Assert.That(numero, Is.LessThanOrEqualTo(10)); // Siempre pasará
    }

    [Test]
    public void Solucion_Ejercicio17()
    {
        TestContext.WriteLine($"Nombre del test: {TestContext.CurrentContext.Test.Name}");
        TestContext.WriteLine($"Estado: {TestContext.CurrentContext.Result.Outcome}");
        Assert.That(true, Is.True);
    }

    [Test]
    [Order(2)]
    public void Solucion_Ejercicio19()
    {
        _contadorGlobal++;
        Assert.That(_contadorGlobal, Is.EqualTo(2));
    }

    [Test]
    [Order(3)]
    public void Solucion_Ejercicio20()
    {
        _contadorGlobal++;
        Assert.That(_contadorGlobal, Is.EqualTo(3));
    }
    */
}

