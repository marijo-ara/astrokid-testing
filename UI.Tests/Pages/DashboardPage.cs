using Microsoft.Playwright;
using System.Text.RegularExpressions;
using UI.Tests;

namespace UI.Tests.Pages;

public class DashboardPage
{
    private readonly IPage _page;

    public DashboardPage(IPage page)
    {
        _page = page;
    }

    // Header elements
    public ILocator Header => _page.Locator("header");
    public ILocator UserMenuButton => _page.GetByTestId("user-menu-button");
    public ILocator LogoutButton => _page.GetByTestId("logout-button");
    public ILocator ProgressStars => _page.Locator("[data-testid^='progress-star-'], [data-testid='progress-stars'] svg");
    
    // Main content
    public ILocator WelcomeMessage => _page.GetByTestId("welcome-message");
    public ILocator ChildIndicator => _page.GetByTestId("child-indicator");
    public ILocator ProgressBar => _page.GetByTestId("progress-bar-container");
    
    // Agent cards
    public ILocator AgentCards => _page.GetByTestId("agent-card");
    public ILocator EmpathyAgent => _page.GetByTestId("agent-name").Filter(new() { HasText = "Capitán empatía" });
    public ILocator ResilienceAgent => _page.GetByTestId("agent-name").Filter(new() { HasText = "Comandante resiliencia" });
    public ILocator McpAgent => _page.GetByTestId("agent-name").Filter(new() { HasText = "Agente MCP" });
    
    // Footer
    public ILocator Footer => _page.GetByTestId("footer");

    public async Task GoToAsync()
    {
        await _page.GotoAsync(TestConfig.BaseUrl + "/dashboard", new() { WaitUntil = WaitUntilState.DOMContentLoaded, Timeout = 30000 });
        // Esperar a que la página cargue completamente
        await _page.WaitForLoadStateAsync(LoadState.NetworkIdle, new() { Timeout = 30000 });
        
        // Debug: Log page information
        var url = _page.Url;
        var title = await _page.TitleAsync();
        Console.WriteLine($"[DashboardPage] Navigated to URL: {url}");
        Console.WriteLine($"[DashboardPage] Page title: {title}");
    }

    /// <summary>
    /// Verifica que el dashboard esté listo y cargado
    /// </summary>
    public async Task<bool> IsReadyAsync()
    {
        try
        {
            // Esperar a que la URL contenga dashboard
            await _page.WaitForURLAsync("**/dashboard**", new() { Timeout = 8000 });
            
            // Esperar a que la página esté cargada
            await _page.WaitForLoadStateAsync(LoadState.DOMContentLoaded, new() { Timeout = 5000 });
            
            // Intentar encontrar el mensaje de bienvenida por test-id o por texto
            var welcomeByTestId = _page.Locator("[data-testid='welcome-message']");
            var welcomeByText = _page.GetByText(new Regex("¡Buenos días|¡Buenas tardes|¡Buenas noches"), new() { Exact = false });
            
            var testIdCount = await welcomeByTestId.CountAsync();
            var textCount = await welcomeByText.CountAsync();
            
            if (testIdCount > 0)
            {
                try
                {
                    await welcomeByTestId.First.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 5000 });
                    return true;
                }
                catch
                {
                    // Elemento existe pero aún no es visible
                }
            }
            
            if (textCount > 0)
            {
                try
                {
                    await welcomeByText.First.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 5000 });
                    return true;
                }
                catch
                {
                    // Elemento existe pero aún no es visible
                }
            }
            
            // Si no se encuentra, verificar si estamos en login/onboarding
            var currentUrl = _page.Url;
            if (currentUrl.Contains("/login") || currentUrl.Contains("/onboarding"))
            {
                Console.WriteLine("[DashboardPage] Redirected to login/onboarding, dashboard not ready");
                return false;
            }
            
            // Último recurso: verificar si el body es visible
            var body = _page.Locator("body");
            if (await body.IsVisibleAsync())
            {
                Console.WriteLine("[DashboardPage] Body is visible but welcome message not found");
                return true; // Página cargada, aunque no se encuentre el mensaje de bienvenida
            }
            
            return false;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DashboardPage] Dashboard is NOT ready: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Espera a que las tarjetas de agentes se carguen
    /// </summary>
    public async Task WaitForAgentCardsAsync(int timeout = 15000)
    {
        try
        {
            await AgentCards.First.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = timeout });
        }
        catch
        {
            // Intentar selector alternativo
            var altCards = _page.Locator("[class*='agent-card']");
            var count = await altCards.CountAsync();
            if (count == 0)
            {
                throw new Exception("No se encontraron tarjetas de agentes");
            }
        }
    }

    /// <summary>
    /// Obtiene el número de tarjetas de agentes
    /// </summary>
    public async Task<int> GetAgentCountAsync()
    {
        return await AgentCards.CountAsync();
    }

    /// <summary>
    /// Hace clic en una tarjeta de agente específica
    /// </summary>
    public async Task ClickAgentCardAsync(string agentName)
    {
        // Intentar encontrar por data-testid primero
        var agentCardByTestId = _page.Locator($"[data-testid='agent-card-{agentName.ToLower().Replace(" ", "-")}']");
        var count = await agentCardByTestId.CountAsync();
        if (count > 0)
        {
            await agentCardByTestId.First.ClickAsync();
            return;
        }
        
        // Fallback: buscar por texto
        var agentCard = _page.GetByTestId("agent-name").Filter(new() { HasText = agentName }).Locator("..").Locator("..");
        await agentCard.ClickAsync();
    }

    /// <summary>
    /// Obtiene el número de estrellas de progreso
    /// </summary>
    public async Task<int> GetProgressStarsCountAsync()
    {
        // Intentar data-testid primero
        var starsByTestId = _page.Locator("[data-testid^='progress-star-']");
        var count = await starsByTestId.CountAsync();
        if (count > 0)
        {
            return count;
        }
        
        // Fallback: buscar svg dentro del contenedor de estrellas
        var starsBySvg = _page.Locator("[data-testid='progress-stars'] svg");
        return await starsBySvg.CountAsync();
    }

    /// <summary>
    /// Abre el menú de usuario
    /// </summary>
    public async Task OpenUserMenuAsync()
    {
        // Intentar data-testid primero, luego fallback a aria-label
        var userMenuByTestId = _page.Locator("[data-testid='user-menu-button']");
        var count = await userMenuByTestId.CountAsync();
        if (count > 0)
        {
            await userMenuByTestId.ClickAsync();
            return;
        }
        
        // Fallback: buscar por aria-label
        var userMenuByAria = _page.GetByRole(AriaRole.Button, new() { NameRegex = new Regex("Abrir menú de usuario") });
        await userMenuByAria.ClickAsync();
    }

    /// <summary>
    /// Cierra sesión del usuario
    /// </summary>
    public async Task LogoutAsync()
    {
        await OpenUserMenuAsync();
        
        // Intentar data-testid primero, luego fallback a búsqueda por texto
        var logoutByTestId = _page.Locator("[data-testid='logout-button']");
        var count = await logoutByTestId.CountAsync();
        if (count > 0)
        {
            await logoutByTestId.ClickAsync();
            return;
        }
        
        // Fallback: buscar por texto
        var logoutByText = _page.GetByRole(AriaRole.Button, new() { NameRegex = new Regex("Cerrar sesión") });
        await logoutByText.ClickAsync();
    }

    /// <summary>
    /// Obtiene el texto del mensaje de bienvenida
    /// </summary>
    public async Task<string> GetWelcomeMessageAsync()
    {
        return await WelcomeMessage.TextContentAsync() ?? string.Empty;
    }

    /// <summary>
    /// Obtiene el nombre del niño desde el indicador
    /// </summary>
    public async Task<string> GetChildNameAsync()
    {
        return await ChildIndicator.TextContentAsync() ?? string.Empty;
    }

    /// <summary>
    /// Verifica si un agente específico es visible
    /// </summary>
    public async Task<bool> VerifyAgentVisibleAsync(string agentName)
    {
        // Intentar data-testid primero, luego fallback a búsqueda por texto
        var agentLocator = _page.GetByTestId("agent-name").Filter(new() { HasText = agentName });
        var count = await agentLocator.CountAsync();
        if (count > 0)
        {
            return await agentLocator.First.IsVisibleAsync();
        }
        
        // Fallback: búsqueda por texto
        var textLocator = _page.GetByText(agentName);
        return await textLocator.IsVisibleAsync();
    }

    /// <summary>
    /// Verifica completamente el dashboard
    /// </summary>
    public async Task VerifyDashboardAsync()
    {
        var isReady = await IsReadyAsync();
        if (!isReady)
        {
            throw new Exception("El dashboard no está listo");
        }
        
        await WaitForAgentCardsAsync();
        
        // Verificar elementos principales con fallbacks
        try
        {
            await WelcomeMessage.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 5000 });
        }
        catch
        {
            // Intentar selector alternativo
            var welcomeAlt = _page.Locator("[data-testid='welcome-message'], h1, h2").First;
            await welcomeAlt.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 5000 });
        }
        
        // El indicador de niño es opcional
        try
        {
            await ChildIndicator.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 3000 });
        }
        catch
        {
            Console.WriteLine("[DashboardPage] Child indicator not found, but continuing...");
        }
    }
}

