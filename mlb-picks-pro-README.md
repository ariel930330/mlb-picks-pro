# ⚾ MLB Picks Pro

Dashboard de predicciones de béisbol en tiempo real. Conecta a la **MLB Stats API** oficial, clima real y un modelo estadístico propio para generar picks diarios con probabilidades calibradas.

![MLB Picks Pro Screenshot](https://i.imgur.com/placeholder.png)

## 🚀 Demo en vivo

👉 **[Tu URL aquí después de publicar en GitHub Pages]**

---

## ✨ Funcionalidades

| Pestaña | Descripción |
|---|---|
| **Picks del Día** | Todos los partidos con 3 picks ordenados por confianza (🟢🟡🔴) |
| **Parlays** | Combos automáticos usando solo picks de Alta Confianza |
| **Pitchers K** | Proyección de strikeouts para cada abridor |
| **Bateadores** | P(Hit) y Total Bases por jugador con datos individuales reales |
| **Historial** | Registro de picks + resultados. Vista personal y comunidad |
| **Analytics** | Calibración del modelo, Win%, ROI, rendimiento diario |

### Qué calcula el modelo
- **Money Line** — Modelo logístico: FIP + OPS + bullpen + rachas
- **Run Line (-1.5)** — Distribución normal de diferencia esperada de carreras  
- **Over/Under** — Proyección Poisson × park factor × clima × altitud
- **Total por equipo** — Carreras esperadas individuales
- **F5 ML y Total** — Primeras 5 innings (54.5% del total empírico)
- **Pitcher Ks** — K/9 × innings esperados vs línea estándar
- **Bateadores** — P(hit) = 1-(1-BA)^4.2 por jugador

---

## 🛠️ Setup (5 minutos)

### Opción A — Uso personal (sin base de datos)
1. Descarga `index.html`
2. Ábrelo con doble clic en Chrome/Firefox/Edge
3. (Opcional) Ingresa tu **Gemini API Key** para análisis profundo

### Opción B — Con base de datos Supabase (recomendado)

#### 1. Crear cuenta en Supabase
1. Ve a [supabase.com](https://supabase.com) → **Start for free**
2. Crea un nuevo proyecto (el free tier es suficiente: 500MB)
3. Anota tu **Project URL** y **anon public key**

#### 2. Crear las tablas
1. En Supabase → **SQL Editor** → **New query**
2. Copia y pega el contenido de `schema.sql`
3. Clic en **Run**

#### 3. Conectar en la app
1. Abre el dashboard → pestaña **Historial**
2. Ingresa tu **Project URL** y **Anon Key**
3. Clic en **Conectar** — los datos se sincronizan automáticamente

---

## 🌐 Publicar en GitHub Pages

### Paso 1 — Fork del repositorio
1. Ve a la URL de este repo en GitHub
2. Clic en **Fork** → **Create fork**

### Paso 2 — Activar GitHub Pages
1. En tu fork → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** → folder: **/ (root)**
4. Clic en **Save**

### Paso 3 — Tu URL
Después de 1-2 minutos tu app estará en:
```
https://TU_USUARIO.github.io/mlb-picks-pro/
```

### Paso 4 — Subir desde cero (sin fork)
```bash
git init
git add index.html schema.sql README.md
git commit -m "MLB Picks Pro - initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/mlb-picks-pro.git
git push -u origin main
```
Luego activa Pages en Settings como en el Paso 2.

---

## 🔑 API Keys necesarias

| Key | Para qué | Cómo obtener | Costo |
|---|---|---|---|
| **Gemini API Key** | Análisis profundo IA | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Gratis (1,500 req/día) |
| **Supabase URL + Key** | Base de datos compartida | [supabase.com](https://supabase.com) | Gratis (500MB) |

> Las keys de MLB Stats API y clima (wttr.in) son **100% públicas** — no necesitan configuración.

---

## 📊 Fuentes de datos

| Fuente | Datos | Auth |
|---|---|---|
| [statsapi.mlb.com](https://statsapi.mlb.com) | Schedule, pitchers, equipos, bateadores | Ninguna |
| [wttr.in](https://wttr.in) | Clima en tiempo real por coordenadas | Ninguna |
| Park Factors | Integrados en el código (30 estadios) | N/A |

---

## ⚠️ Disclaimer

> Este dashboard es **solo para entretenimiento e investigación**. Las predicciones son estimaciones estadísticas y no garantizan resultados. Apuesta con responsabilidad.

---

## 🤝 Contribuciones

Pull requests bienvenidos. Si encuentras un bug o tienes una mejora, abre un issue.

---

## 📄 Licencia

MIT License — úsalo libremente.
