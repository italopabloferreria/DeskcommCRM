# I Can't Believe CRM

CRM autohospedado de **!AI (I Can't Believe It's AI)** para atención, ventas y automatización con agentes de IA.

![I Can't Believe CRM](docs/brand/ai-logo-dark.svg)

## Qué es

I Can't Believe CRM es el producto CRM propio de !AI. Conserva la base open source: CRM multi-tenant, WhatsApp como canal principal, agentes de IA, Supabase, privacidad, auditoría e instalación autohospedada.

## Tecnologías

- Next.js 16, React 19 y TypeScript
- Supabase Postgres, Auth, Storage y Realtime
- Tailwind CSS 4 y sistema de diseño white-label
- WAHA para WhatsApp
- Vercel AI SDK y proveedores de IA configurables
- Docker para instalación autohospedada

## Instalación local

```bash
git clone https://github.com/italopabloferreria/icantbelievecrm.git
cd icantbelievecrm
pnpm install
pnpm dev
```

## Docker

Usa los archivos `docker-compose*.yml` como base para entornos locales y de producción. Antes de publicar imágenes, configura GitHub Container Registry para `italopabloferreria/icantbelievecrm`.

## Arquitectura

- `app/`: interfaz, rutas públicas, área autenticada y APIs Next.js
- `components/`: componentes compartidos
- `lib/`: dominio, autenticación, branding, integraciones y agentes
- `workers/`: workers y rutinas de cola
- `supabase/`: esquema, migraciones y baseline
- `docs/`: documentación técnica y operativa

## Roadmap

- Finalizar la identidad visual oficial de !AI
- Publicar imágenes Docker propias
- Renombrar el repositorio de GitHub a `icantbelievecrm`
- Completar el rebranding !AI de la documentación operativa de VPS
- Añadir funciones específicas de !AI sin romper la compatibilidad con la base open source

## Capturas de pantalla

Las capturas finales se añadirán después de validar visualmente el producto con la marca !AI.

## Contribución

Usa ramas pequeñas, conserva las reglas de negocio existentes y ejecuta lint, comprobación de tipos, pruebas y build de producción antes de enviar cambios.

## Based on the amazing work from DeskcommCRM.

Este proyecto se basa en el trabajo original de [DeskcommCRM](https://github.com/melgarafael/DeskcommCRM), distribuido bajo la licencia MIT. El aviso de copyright y la licencia original se conservan en `LICENSE`.

## Licencia

MIT.
