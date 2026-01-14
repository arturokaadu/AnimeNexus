# AnimeNexus

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&style=flat-square)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase&style=flat-square)](https://firebase.google.com/)
[![Styled Components](https://img.shields.io/badge/Styled_Components-CSS_in_JS-DB7093?logo=styled-components&style=flat-square)](https://styled-components.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployment-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com/)
[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=flat-square&logo=vercel)](https://animenexusapp.vercel.app/)

![AnimeNexus Home](./assets/image.png)

**Link to the page:** https://animenexusapp.vercel.app/ (Live Updated: 2026-01-14)

## About the Project
**AnimeNexus** is a modern, feature-rich web application designed for anime enthusiasts. It provides a comprehensive platform to discover movies, TV series, and explore detailed character information.

Built with performance and aesthetics in mind, it features **NSFW content gating** and a seamless user experience powered by **React** and **Jikan API (MyAnimeList)**.

> [!NOTE]
> **Live Demo & Login:**
> To experience the full app (including profile and NSFW sections), you can register a new account or use the test credentials:
> - **Email:** `test@user.com` (or register your own)
> - **Password:** `123456`
> - **Deployment:** [Link to the page](https://animenexusapp.vercel.app/)

### Screenshots

![Home Page](assets/image.png)
*Interactive Hero Section & Trending Lists*

---

### ⭐ Standout Feature: AI-Powered Manga Guide

**Problem**: You just finished an amazing anime and want to continue the story in the manga, but you have no idea which chapter to start from.

**Our Solution**: AnimeNexus provides **chapter and volume recommendations** using a hybrid approach for maximum accuracy.

#### How It Works

**Hybrid System** for best accuracy:

1. **Verified Database** (20+ anime) - 100% accurate
   - Manually verified against Reddit, wikis, and forums
   - Includes: Jujutsu Kaisen, Chainsaw Man, Demon Slayer, Attack on Titan, My Hero Academia, and more
   - Covers ~20% of searches (most popular titles)

2. **AI Predictions** (everything else) - Estimated accuracy
   - Google Gemini 2.5 Flash for intelligent predictions
   - Confidence indicators show reliability
   - Covers thousands of anime titles

#### Accuracy Examples

| Anime | Episode | Result | Status |
|-------|---------|--------|--------|
| Jujutsu Kaisen | 24 (S1) | Ch. 64, Vol. 8 | ✅ Verified |
| Jujutsu Kaisen | 47 (S2) | Ch. 137, Vol. 16 | ✅ Verified |
| Chainsaw Man | 12 | Ch. 39, Vol. 5 | ✅ Verified |
| Frieren | 28 | Ch. 61, Vol. 7 | ✅ Verified |
| Death Note | 37 | Ch. 108, Vol. 12 | ✅ Verified |

#### Confidence Indicators

- ✅ **Verified** (Green) - From verified database, 100% accurate
- ~ **Estimated** (Yellow) - AI prediction with medium confidence
- ? **Approximate** (Gray) - AI estimate with lower confidence

**Coverage**: 20+ verified anime + AI predictions for thousands more

**Powered by**: Google Gemini 2.5 Flash + Verified Community Data

---



### Other Key Features

| Feature | Description | Preview |
| :--- | :--- | :--- |
| **Mood Explorer** | Don't know what to watch? Tell us how you feel (Hype, Chill, Sad, etc.) and we'll recommend the perfect anime. | ![Mood Explorer](assets/mood_explorer.png) |
| **Direct Soundtracks** | Listen to your favorite Openings & Endings directly. One-click YouTube search for instant gratification. | ![Soundtracks](assets/soundtracks.png) |
| **NSFW Fanservice** | Age-Gated Content. Curated "Brutal Moments" and "Hot Characters" with video clips (not just images). | ![NSFW Content](assets/home_hero.png) |

### Additional Features
*   **Authentication:** Secure login and registration.
*   **Responsive:** Works perfectly on mobile.

### Tech Stack
*   **Frontend:** React.js (Hooks, Context API)
*   **Styling:** Styled Components (CSS-in-JS)
*   **Backend / Auth:** Firebase v9
*   **Data Source:** Jikan API v4 (MyAnimeList), AniList API, MangaUpdates API
*   **Routing:** React Router v6
*   **State / HTTP:** Axios
*   **Notifications:** React Hot Toast
*   **Icons:** Iconify
*   **Deployment:** Vercel

---

<a name="español"></a>
## Sobre el Proyecto
**AnimeNexus** es una aplicación web moderna y completa diseñada para fanáticos del anime. Ofrece una plataforma para descubrir películas, series de TV y explorar información detallada sobre personajes.

Construida pensando en el rendimiento y la estética, cuenta con **Modo Oscuro** personalizado, **protección de contenido NSFW** y una experiencia de usuario fluida impulsada por **React** y la **Jikan API (MyAnimeList)**.

### Capturas de Pantalla

![Página Principal](./assets/image.png)

**Link to the page:** https://animenexusapp.vercel.app/

*Sección Hero Interactiva y Listas de Tendencias*

---

### ⭐ Función Destacada: Guía Inteligente de Manga

**Problema**: Terminaste un anime increíble y quieres continuar la historia en el manga, pero no sabes desde qué capítulo empezar.

**Nuestra Solución**: AnimeNexus proporciona **recomendaciones exactas de capítulo y volumen** donde termina el anime, para que puedas continuar leyendo sin problemas.

#### Cómo Funciona
La Guía de Manga usa una estrategia sofisticada de múltiples niveles:

1. **MangaUpdates API** (Principal) - Consulta una base especializada con mapeos exactos anime-capítulo para miles de series
2. **Base de Datos Curada** (Respaldo) - Datos verificados manualmente para 10+ anime populares (Attack on Titan, Jujutsu Kaisen, Demon Slayer, etc.)
3. **AniList GraphQL** - Obtiene metadatos del manga (capítulos totales, volúmenes, descripciones)

#### Verificación de Precisión
Hemos verificado nuestras recomendaciones contra múltiples fuentes (Reddit, MyAnimeList, wikis de fans):

| Anime | Nuestra Recomendación | Verificado | Fuente |
|-------|----------------------|-----------|---------|
| Jujutsu Kaisen T1 | Cap. 64, Vol. 8 | ✅ | wheredoestheanimeleaveoff.com |
| Demon Slayer T1 | Cap. 53, Vol. 6 | ✅ | Stack Exchange, Reddit |
| My Hero Academia T1 | Cap. 21, Vol. 3 | ✅ | Wikipedia, Fandom |
| Attack on Titan T1 | Cap. 33, Vol. 8 | ✅ | Reddit r/ShingekiNoKyojin |
| Vinland Saga T1 | Cap. 54, Vol. 8 | ✅ | Sportskeeda, Reddit |
| Tokyo Ghoul T1 | Cap. 66, Vol. 7 | ✅ | Stack Exchange |

**Precisión: 100% en anime verificados** 🎯

#### Indicadores de Confianza
- ✅ **Verificado** (Verde) - Datos de alta confianza de MangaUpdates o base curada
- ~ **Estimado** (Amarillo) - Calculado a partir de metadatos disponibles
- ? **Aproximación** (Rojo) - Datos limitados, estimación aproximada

![Ejemplo de Guía de Manga](assets/manga_guide.png)

---

### Otras Características Clave

| Función | Descripción | Vista Previa |
| :--- | :--- | :--- |
| **Mood Explorer** | ¿No sabes qué ver? Dinos cómo te sientes (Hype, Chill, Sad, etc.) y te recomendaremos el anime perfecto. | ![Mood Explorer](assets/mood_explorer.png) |
| **Soundtracks Directos** | Escucha tus Openings y Endings favoritos directamente. Búsqueda en YouTube con un clic. | ![Soundtracks](assets/soundtracks.png) |
| **Contenido NSFW** | Contenido con Restricción de Edad. "Momentos Brutales" y "Personajes Atractivos" curados con videoclips. | ![NSFW](assets/home_hero.png) |
