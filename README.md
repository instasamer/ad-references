# AdRef - Buscador de Referencias Publicitarias

Herramienta para creativos que permite buscar, organizar y gestionar referencias de publicidad.
- **Sigue marcas top** y sincroniza sus videos de YouTube automáticamente
- **Importa automáticamente** desde Ads of the World y Love The Work More

## Inicio Rápido

```bash
cd C:\Users\insta\ad-references
start.bat
```

O manualmente:
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
cd client && npm run dev
```

Abre: **http://localhost:5173**

## Características

### 1. Seguimiento de Marcas (YouTube) - NUEVO
Sigue las marcas más importantes y detecta automáticamente sus anuncios:

- **10 marcas top preconfiguradas**: Nike, Apple, Coca-Cola, McDonald's, Samsung, Google, Amazon, Mercedes-Benz, BMW, Adidas
- **Sincronización automática** de sus canales de YouTube
- **Detección de anuncios**: el sistema marca qué videos son probablemente ads
- **Guardar en biblioteca**: añade los mejores a tu colección personal

**Cómo usarlo:**
1. Ve a "Marcas" en el menú
2. Configura tu YouTube API Key (gratis, instrucciones en la página)
3. Añade marcas con un clic
4. Haz clic en "Sync" para traer sus videos
5. Marca los que son anuncios y guárdalos

### 2. Importación desde Portales
- **Ads of the World** - La biblioteca más grande de anuncios creativos
- **Love The Work More** - Ganadores de Cannes Lions (1954-presente)

### 3. Cuestionario de Búsqueda
- Responde preguntas sobre tu proyecto (sector, tono, formato, etc.)
- El sistema sugiere referencias que coinciden

### 4. Gestión Manual
- Sube imágenes y videos
- Guarda links de anuncios
- Añade tags, marca, año y descripción

## YouTube API Key (Gratuita)

Para sincronizar videos de marcas necesitas una API key:

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un proyecto
3. Habilita "YouTube Data API v3"
4. Ve a Credenciales → Crear credencial → API Key
5. Pégala en la app (sección Marcas)

**Límite gratuito:** ~10,000 peticiones/día (suficiente para uso personal)

## Marcas Preconfiguradas

| Marca | Canales disponibles |
|-------|---------------------|
| Nike | Global, Football, Running |
| Apple | Global |
| Coca-Cola | Global |
| McDonald's | Global |
| Samsung | Global |
| Google | Global |
| Amazon | Global |
| Mercedes-Benz | Global |
| BMW | Global |
| Adidas | Global, Football |

## Tags del Sistema

| Categoría | Tags |
|-----------|------|
| Sectores | alimentación, tecnología, moda, automoción, belleza, finanzas, salud, entretenimiento, viajes, hogar, deportes, educación |
| Tonos | humor, emocional, serio, inspirador, provocador, minimalista, lujoso, juvenil, nostálgico, irreverente |
| Formatos | spot-tv, reel, story, carousel, print, outdoor, banner, video-largo, video-corto |
| Épocas | vintage, retro-80s, retro-90s, 2000s, 2010s, actual |
| Técnicas | animación, live-action, stop-motion, mixed-media, ugc, influencer, celebrity, ilustración, fotografía |
| Objetivos | branding, performance, lanzamiento, awareness, conversión, engagement |

## Estructura

```
ad-references/
├── server/
│   ├── index.js              # API Backend
│   └── scrapers/
│       ├── youtube.js        # Integración YouTube + Marcas
│       ├── adsoftheworld.js  # Scraper AotW
│       └── lovetheworkmore.js
├── client/src/pages/
│   ├── Brands.jsx            # Gestión de marcas
│   ├── Import.jsx            # Importación de portales
│   ├── Search.jsx            # Cuestionario
│   ├── Library.jsx           # Biblioteca
│   └── ...
├── database.sqlite
└── start.bat
```

## Tecnologías

- React 18, Vite, Tailwind CSS
- Node.js, Express
- SQLite (sql.js)
- YouTube Data API v3
- Puppeteer (scraping)
