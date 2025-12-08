public class Example{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public static Example DemoAnonymousType
    {
        var kid = new
        {
            Nombre = "Juan",
            Edad = 10,
            Nivel = "Begginer";

        };
        Console.WriteLine($"Nombre: {kid.Nombre}, Edad: {kid.Edad}, Nivel: {kid.Nivel}");
    }

}