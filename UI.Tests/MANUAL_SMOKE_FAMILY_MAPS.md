# Smoke manual — Mapas familiares (papá) · ~5 minutos

**Repo:** AstroKid.Tests (checklist) + UI en `astro-kid-web`  
**Automatizado (parcial):** `UI.Tests/FamilyMapsSmokeTests.cs` + `API.Tests/Expression` + `API.Tests/Safety`  
**Ambiente:** local o `BASE_URL` (default `https://astro-kid-web-dev.vercel.app`)  

### Credenciales (obligatorio para UI automáticos)

```powershell
$env:ASTROKID_UI_EMAIL = "tu-cuenta-qa@ejemplo.com"
$env:ASTROKID_UI_PASSWORD = "***"   # nunca commits
$env:ASTROKID_BASE_URL = "https://tu-backend"   # API
$env:BASE_URL = "https://astro-kid-web-dev.vercel.app"
```

**Cuenta:** papá con al menos 1 hijo seleccionado

---

## Pasos (marcar)

### 1. Dashboard — pregunta pendiente (~1 min)

- [ ] Login → `/dashboard`
- [ ] Tras Brief/seguridad, aparece tarjeta `[data-testid=family-map-pending-prompt]` **o** ambos mapas ya están completos (tarjeta ausente = OK)
- [ ] Si hay pregunta: elige **1 opción**
- [ ] Ves mensaje de impacto (priorizar / Saved) sin lenguaje clínico ni promesas
- [ ] Barra de la tarjeta Empatía o Resiliencia sube (`family-map-survey-progress`, p.ej. `0/13` → `1/13`)

### 2. Abrir mapa Empatía (~2 min)

- [ ] Click tarjeta Empatía → URL `/adventure/bg-red-500` (o equivalente)
- [ ] Título tipo “Mapa familiar · Empatía”
- [ ] Sección `#family-map-questions` con estaciones
- [ ] Responde **1 estación más** → impacto → avanza (~1–2 s)
- [ ] Sección `#family-map-missions` (“Viaje de misiones…”) visible (carril completo)

### 3. Mapa Resiliencia — viaje compartido (~1 min)

- [ ] Volver dashboard → abrir Resiliencia
- [ ] Estaciones propias de resiliencia
- [ ] Viaje en **preview compacto** (o nota de viaje compartido), no un segundo historial inventado

### 4. Persistencia + copy (~1 min)

- [ ] Refresh `/dashboard` → progreso de observaciones se mantiene
- [ ] Copy no dice “diagnóstico”, “garantizamos”, “IA conversa con tu hijo”
- [ ] “Más tarde” en pending oculta la tarjeta en la sesión (si aplica)

---

## Fallo rápido → qué mirar

| Síntoma | Pista |
|---------|--------|
| Pending no aparece | Perfiles ya 13/13 + 14/14, o expression API falló |
| Progreso no sube en tarjetas | `familyMapAnswers` no se guardó / PUT expression |
| Adventure muestra AdaptiveMap viejo | Color no mapeado a Empatía/Resiliencia |
| Viaje vacío | Sin misiones diarias aún — vacío esperado |

---

## Comando UI smoke (NUnit)

```powershell
cd UI.Tests
$env:ASTROKID_UI_EMAIL = "..."
$env:ASTROKID_UI_PASSWORD = "..."
# opcional: $env:BASE_URL = "http://localhost:3000"
dotnet test --filter "Category=Smoke"
```

API Smoke (sin Learning):

```powershell
$env:ASTROKID_BASE_URL = "http://localhost:8000"
dotnet test API.Tests --filter "Category=Smoke&FullyQualifiedName!~Learning"
```

Unit (lógica compartida, en `astro-kid-web`):

```powershell
cd packages/shared
npx vitest run src/__tests__/familyMapProfile.test.ts src/__tests__/parentDevelopmentProfile.test.ts
```
