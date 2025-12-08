using NUnit.Framework;

namespace API.Tests.Learning;

/// <summary>
/// EJERCICIOS BÁSICOS DE NUNIT
/// 
/// Este archivo contiene ejercicios para aprender los conceptos fundamentales de NUnit:
/// - Attributes básicos ([Test], [SetUp], [TearDown])
/// - Assertions básicas (Assert.That, Assert.AreEqual, etc.)
/// - Organización de tests
/// </summary>
[TestFixture]
public class EjerciciosBasicosNUnit
{
    private int _contador;
    private List<string> _lista;

    /// <summary>
    /// [SetUp] se ejecuta ANTES de cada test
    /// Útil para inicializar variables o preparar el entorno
    /// </summary>
    [SetUp]
    public void Setup()
    {
        _contador = 0;
        _lista = new List<string>();
        Console.WriteLine("Setup ejecutado - Preparando el test");
    }

    /// <summary>
    /// [TearDown] se ejecuta DESPUÉS de cada test
    /// Útil para limpiar recursos o resetear estado
    /// </summary>
    [TearDown]
    public void TearDown()
    {
        _contador = 0;
        _lista.Clear();
        Console.WriteLine("TearDown ejecutado - Limpiando después del test");
    }

    // ============================================
    // EJERCICIO 1: Assertions Básicas
    // ============================================

    [Test]
    public void Ejercicio1_AssertThat_Igualdad()
    {
        // Assert.That es la forma moderna y recomendada en NUnit
        // Sintaxis: Assert.That(actual, constraint)
        
        int resultado = 2 + 2;
        Assert.That(resultado, Is.EqualTo(4));
        
        // TODO: Completa la assertion usando Assert.That
        // Assert.That(resultado, ???);
        
        // Forma alternativa (más antigua pero válida):
        // Nota: En NUnit 4, Assert.AreEqual ya no está disponible, usa Assert.That
        // Assert.That(resultado, Is.EqualTo(4));
    }

    [Test]
    public void Ejercicio2_AssertThat_MayorQue()
    {
        int edad = 25;
        Assert.That(edad, Is.GreaterThan(18));
        
        // TODO: Verifica que la edad sea mayor que 18
        // Assert.That(edad, ???);
    }

    [Test]
    public void Ejercicio3_AssertThat_Contiene()
    {
        string mensaje = "Hola mundo desde NUnit";
        Assert.That(mensaje, Does.Contain("NUnit"));
        
        // TODO: Verifica que el mensaje contenga la palabra "NUnit"
        // Assert.That(mensaje, ???);
    }

    [Test]
    public void Ejercicio4_AssertThat_EsNull()
    {
        string? texto = null;
        Assert.That(texto, Is.Null);
        
        // TODO: Verifica que texto sea null
        // Assert.That(texto, ???);
        
        // TODO: Verifica que texto NO sea null (descomenta y completa)
        string texto2 = "Hola";
        Assert.That(texto2, Is.Not.Null);
    }

    [Test]
    public void Ejercicio5_AssertThat_EsVerdadero()
    {
        bool esValido = true;
        Assert.That(esValido, Is.True);
        
        // TODO: Verifica que esValido sea true
        // Assert.That(esValido, ???);
    }

    [Test]
    public void Ejercicio6_AssertThat_Excepciones()
    {
        // TODO: Verifica que se lance una excepción de tipo ArgumentNullException
        // cuando se pasa null a un método
        
        // Ejemplo:
        // Assert.That(() => MetodoQueLanzaExcepcion(null), ???);
        
        // Método de ejemplo (puedes crear uno):
        void LanzarExcepcion(string? valor)
        {
            if (valor == null)
                throw new ArgumentNullException(nameof(valor));
        }
        
        // TODO: Completa la assertion
        Assert.That(()=> LanzarExcepcion(null), Throws.ArgumentNullException);
        // Assert.That(() => LanzarExcepcion(null), ???);
    }

    // ============================================
    // EJERCICIO 2: Múltiples Assertions
    // ============================================

    [Test]
    public void Ejercicio7_MultiplesAssertions()
    {
        var persona = new { Nombre = "Juan", Edad = 30, Email = "juan@example.com" };
        
        // Puedes hacer múltiples assertions en un mismo test
        // TODO: Verifica que:
        // 1. El nombre sea "Juan"
        // 2. La edad sea mayor que 18
        // 3. El email contenga "@"
        Assert.That(persona.Nombre, Is.EqualTo("Juan"));
        Assert.That(persona.Edad, Is.GreaterThan(18));
        Assert.That(persona.Email, Does.Contain("@"));

        
        // Assert.That(persona.Nombre, ???);
        // Assert.That(persona.Edad, ???);
        // Assert.That(persona.Email, ???);
    }

    // ============================================
    // EJERCICIO 3: Assertions con Colecciones
    // ============================================

    [Test]
    public void Ejercicio8_AssertThat_Colecciones()
    {
        var numeros = new[] { 1, 2, 3, 4, 5 };
        
        // TODO: Verifica que:
        // 1. La colección tenga 5 elementos
        // 2. La colección contenga el número 3
        // 3. La colección NO esté vacía
        
        Assert.That(numeros, Has.Length.EqualTo(5));
        Assert.That(numeros, Contains.Item(3));
        Assert.That(numeros, Is.Not.Empty);
        // Assert.That(numeros, ???);
        // Assert.That(numeros, ???);
        // Assert.That(numeros, ???);
    }

    [Test]
    public void Ejercicio9_AssertThat_ListaContiene()
    {
        _lista.Add("Manzana");
        _lista.Add("Banana");
        _lista.Add("Naranja");
        
        // TODO: Verifica que la lista contenga "Banana"
        Assert.That(_lista, Contains.Item("Banana"));
        // Assert.That(_lista, ???);
    }

    // ============================================
    // EJERCICIO 4: Assertions con Strings
    // ============================================

    [Test]
    public void Ejercicio10_AssertThat_Strings()
    {
        string texto = "  Hola Mundo  ";
        
        // TODO: Verifica que:
        // 1. El texto (sin espacios) sea igual a "Hola Mundo"
        // 2. El texto empiece con "Hola"
        // 3. El texto termine con "Mundo"
        // 4. El texto tenga una longitud mayor que 5

        Assert.That(texto.Trim(), Is.EqualTo("Hola Mundo"));
        Assert.That(texto, Does.StartWith("Hola"));
        Assert.That(texto, Does.EndWith("Mundo"));
        Assert.That(texto.Length, Is.GreaterThan(5));
        // Assert.That(texto.Trim(), ???);
        // Assert.That(texto, ???);
        // Assert.That(texto, ???);
        // Assert.That(texto.Length, ???);
    }

    // ============================================
    // EJERCICIO 5: Assertions con Números
    // ============================================

    [Test]
    public void Ejercicio11_AssertThat_Numeros()
    {
        double precio = 99.99;
        int cantidad = 10;
        
        // TODO: Verifica que:
        // 1. El precio esté entre 50 y 100
        // 2. La cantidad sea mayor o igual a 10
        // 3. El precio sea aproximadamente 100 (con tolerancia de 0.1)
        Assert.That(precio, Is.InRange(50, 100));
        Assert.That(cantidad, Is.GreaterThanOrEqualTo(10));
        Assert.That(precio, Is.EqualTo(100).Within(0.1));

        
        // Assert.That(precio, ???);
        // Assert.That(cantidad, ???);
        // Assert.That(precio, ???);
    }

    // ============================================
    // EJERCICIO 6: Assert.Pass y Assert.Fail
    // ============================================

    [Test]
    public void Ejercicio12_AssertPassFail()
    {
        bool condicion = true;
        
        // Assert.Pass() marca el test como exitoso inmediatamente
        // Assert.Fail() marca el test como fallido inmediatamente
        
        // TODO: Usa Assert.Pass() si la condición es true
        // TODO: Usa Assert.Fail() si la condición es false
        
        if (condicion)
        {
            Assert.Pass("Se cumplió la condición");
        }
        else
        {
            Assert.Fail("La condición no se cumplió");
        }
    }

    // ============================================
    // EJERCICIO 7: Assertions con Objetos
    // ============================================

    [Test]
    public void Ejercicio13_AssertThat_Objetos()
    {
        var producto1 = new { Id = 1, Nombre = "Laptop", Precio = 999.99 };
        var producto2 = new { Id = 1, Nombre = "Laptop", Precio = 999.99 };
        
        // Para comparar objetos, necesitas comparar sus propiedades
        // TODO: Verifica que ambos productos tengan el mismo Id y Nombre

        Assert.That(producto1.Id, Is.EqualTo(producto2.Id));
        Assert.That(producto1.Nombre, Is.EqualTo(producto2.Nombre));
        
        // Assert.That(producto1.Id, ???);
        // Assert.That(producto1.Nombre, ???);
    }

    // ============================================
    // SOLUCIONES (Descomenta para ver las respuestas)
    // ============================================

    /*
    [Test]
    public void Solucion_Ejercicio1()
    {
        int resultado = 2 + 2;
        Assert.That(resultado, Is.EqualTo(4));
    }

    [Test]
    public void Solucion_Ejercicio2()
    {
        int edad = 25;
        Assert.That(edad, Is.GreaterThan(18));
    }

    [Test]
    public void Solucion_Ejercicio3()
    {
        string mensaje = "Hola mundo desde NUnit";
        Assert.That(mensaje, Does.Contain("NUnit"));
    }

    [Test]
    public void Solucion_Ejercicio4()
    {
        string? texto = null;
        Assert.That(texto, Is.Null);
        
        string texto2 = "Hola";
        Assert.That(texto2, Is.Not.Null);
    }

    [Test]
    public void Solucion_Ejercicio5()
    {
        bool esValido = true;
        Assert.That(esValido, Is.True);
    }

    [Test]
    public void Solucion_Ejercicio6()
    {
        void LanzarExcepcion(string? valor)
        {
            if (valor == null)
                throw new ArgumentNullException(nameof(valor));
        }
        
        Assert.That(() => LanzarExcepcion(null), 
            Throws.ArgumentNullException);
    }

    [Test]
    public void Solucion_Ejercicio7()
    {
        var persona = new { Nombre = "Juan", Edad = 30, Email = "juan@example.com" };
        
        Assert.That(persona.Nombre, Is.EqualTo("Juan"));
        Assert.That(persona.Edad, Is.GreaterThan(18));
        Assert.That(persona.Email, Does.Contain("@"));
    }

    [Test]
    public void Solucion_Ejercicio8()
    {
        var numeros = new[] { 1, 2, 3, 4, 5 };
        
        Assert.That(numeros, Has.Length.EqualTo(5));
        Assert.That(numeros, Contains.Item(3));
        Assert.That(numeros, Is.Not.Empty);
    }

    [Test]
    public void Solucion_Ejercicio9()
    {
        _lista.Add("Manzana");
        _lista.Add("Banana");
        _lista.Add("Naranja");
        
        Assert.That(_lista, Contains.Item("Banana"));
    }

    [Test]
    public void Solucion_Ejercicio10()
    {
        string texto = "  Hola Mundo  ";
        
        Assert.That(texto.Trim(), Is.EqualTo("Hola Mundo"));
        Assert.That(texto, Does.StartWith("Hola"));
        Assert.That(texto, Does.EndWith("Mundo"));
        Assert.That(texto.Length, Is.GreaterThan(5));
    }

    [Test]
    public void Solucion_Ejercicio11()
    {
        double precio = 99.99;
        int cantidad = 10;
        
        Assert.That(precio, Is.InRange(50, 100));
        Assert.That(cantidad, Is.GreaterThanOrEqualTo(10));
        Assert.That(precio, Is.EqualTo(100).Within(0.1));
    }

    [Test]
    public void Solucion_Ejercicio12()
    {
        bool condicion = true;
        
        if (condicion)
        {
            Assert.Pass();
        }
        else
        {
            Assert.Fail("La condición no se cumplió");
        }
    }

    [Test]
    public void Solucion_Ejercicio13()
    {
        var producto1 = new { Id = 1, Nombre = "Laptop", Precio = 999.99 };
        var producto2 = new { Id = 1, Nombre = "Laptop", Precio = 999.99 };
        
        Assert.That(producto1.Id, Is.EqualTo(producto2.Id));
        Assert.That(producto1.Nombre, Is.EqualTo(producto2.Nombre));
    }
    */
}

