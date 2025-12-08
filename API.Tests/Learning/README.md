# Guía de Aprendizaje de NUnit y Testing en .NET

Esta carpeta contiene ejercicios progresivos para aprender testing en .NET usando NUnit.

## 📚 Estructura de Archivos

### 1. `01_Basicos_NUnit.cs`
**Conceptos básicos:**
- Attributes básicos: `[Test]`, `[SetUp]`, `[TearDown]`
- Assertions básicas: `Assert.That`, `Is.EqualTo`, `Does.Contain`, etc.
- Assertions con colecciones, strings y números
- Manejo de excepciones en tests

**Recomendado para:** Principiantes en testing con NUnit

### 2. `02_Intermedios_NUnit.cs`
**Conceptos intermedios:**
- Test Cases parametrizados: `[TestCase]`, `[TestCaseSource]`
- Categories: `[Category]` para agrupar tests
- `[OneTimeSetUp]` y `[OneTimeTearDown]`
- `[Ignore]`, `[Skip]`, `[Timeout]`
- `[Values]`, `[Range]` para múltiples valores
- `[Retry]` para reintentos
- `[Order]` para orden de ejecución

**Recomendado para:** Desarrolladores con conocimiento básico de NUnit

### 3. `03_Avanzados_NUnit.cs`
**Conceptos avanzados:**
- Custom Attributes (atributos personalizados)
- Parallel Execution (`[Parallelizable]`, `[NonParallelizable]`)
- Theory y Datapoints (`[Theory]`, `[Datapoint]`)
- Test Data Builders (patrón Builder)
- Fixtures personalizados
- Constraints avanzados (And, Or, Not, AllItems, SomeItems)
- Excepciones avanzadas con propiedades
- Async/Await en tests

**Recomendado para:** Desarrolladores con experiencia en NUnit

### 4. `04_MejoresPracticas.cs`
**Mejores prácticas y patrones:**
- Nomenclatura clara de tests
- Patrón Arrange-Act-Assert (AAA)
- Organización de tests
- Helper methods
- Test Data Builders
- Test Fixtures y Setup
- Organización por características
- Manejo de excepciones
- Async/Await correcto
- Logging en tests
- Clean Code en tests

**Recomendado para:** Todos los niveles

## 🚀 Cómo Usar Estos Ejercicios

### Paso 1: Lee el código
Cada archivo contiene ejercicios con comentarios `TODO` que indican qué debes completar.

### Paso 2: Completa los ejercicios
- Descomenta los `TODO` y completa el código
- Intenta resolverlos sin ver las soluciones primero

### Paso 3: Verifica tus respuestas
Al final de cada archivo hay una sección de soluciones comentadas. Descoméntalas para comparar.

### Paso 4: Ejecuta los tests
```bash
dotnet test
```

O ejecuta tests específicos:
```bash
dotnet test --filter "FullyQualifiedName~EjerciciosBasicosNUnit"
```

## 📖 Conceptos Clave

### Assertions en NUnit

```csharp
// Forma moderna (recomendada)
Assert.That(actual, Is.EqualTo(expected));
Assert.That(actual, Is.GreaterThan(5));
Assert.That(actual, Does.Contain("texto"));

// Forma clásica (también válida)
Assert.AreEqual(expected, actual);
Assert.IsTrue(condition);
```

### Test Attributes

```csharp
[Test]              // Marca un método como test
[SetUp]             // Se ejecuta antes de cada test
[TearDown]          // Se ejecuta después de cada test
[OneTimeSetUp]      // Se ejecuta una vez antes de todos los tests
[OneTimeTearDown]   // Se ejecuta una vez después de todos los tests
[TestCase(1, 2, 3)] // Test parametrizado
[Category("Fast")]  // Categoría para agrupar tests
[Ignore]            // Ignora el test
[Timeout(1000)]     // Timeout en milisegundos
```

### Ejecutar Tests por Categoría

```bash
# Solo tests rápidos
dotnet test --filter "Category=Fast"

# Excluir tests lentos
dotnet test --filter "Category!=Slow"

# Múltiples categorías
dotnet test --filter "Category=Smoke|Category=API"
```

## 🎯 Próximos Pasos

1. **Completa los ejercicios básicos** antes de pasar a los intermedios
2. **Practica con tu código real** - Aplica estos conceptos a tus tests existentes
3. **Lee la documentación oficial**: https://docs.nunit.org/
4. **Explora otros frameworks**: xUnit, MSTest (para comparar)

## 💡 Tips

- **Nombres descriptivos**: `Should_Return_Token_When_Valid_Credentials`
- **Un test, una cosa**: Evita tests que verifican múltiples cosas no relacionadas
- **AAA Pattern**: Arrange (preparar) → Act (ejecutar) → Assert (verificar)
- **Tests independientes**: Cada test debe poder ejecutarse solo
- **Usa helpers**: Evita duplicación de código en tests

## 📝 Notas

- Estos ejercicios están diseñados para .NET 9.0 y NUnit 4.4.0
- Algunos ejercicios pueden requerir configuración adicional (variables de entorno, etc.)
- Las soluciones están comentadas al final de cada archivo

## 🔗 Recursos Adicionales

- [Documentación oficial de NUnit](https://docs.nunit.org/)
- [NUnit GitHub](https://github.com/nunit/nunit)
- [Testing Best Practices](https://docs.nunit.org/articles/nunit/writing-tests/attributes.html)

---

¡Feliz testing! 🧪

