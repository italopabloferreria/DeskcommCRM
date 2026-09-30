# I Can't Believe CRM

Self-hosted **!AI (I Can't Believe It's AI)** CRM for support, sales, and automation with AI agents.

![I Can't Believe CRM](docs/brand/ai-logo-dark.svg)

## What it is

I Can't Believe CRM is !AI's own CRM product. It preserves the open source foundation: multi-tenant CRM, WhatsApp as the primary channel, AI agents, Supabase, privacy controls, auditing, and self-hosted deployment.

## Technology

- Next.js 16, React 19, and TypeScript
- Supabase Postgres, Auth, Storage, and Realtime
- Tailwind CSS 4 and a white-label design system
- WAHA for WhatsApp
- Vercel AI SDK and configurable AI providers
- Docker for self-hosted deployment

## Local installation

```bash
git clone https://github.com/italopabloferreria/icantbelievecrm.git
cd icantbelievecrm
pnpm install
pnpm dev
```

## Docker

Use the `docker-compose*.yml` files as a starting point for local and production environments. Before publishing images, configure GitHub Container Registry for `italopabloferreria/icantbelievecrm`.

## Architecture

- `app/`: UI, public routes, authenticated area, and Next.js APIs
- `components/`: shared components
- `lib/`: domain logic, authentication, branding, integrations, and agents
- `workers/`: workers and queue routines
- `supabase/`: schema, migrations, and baseline
- `docs/`: technical and operational documentation

## Roadmap

- Finalize the official !AI visual identity
- Publish !AI Docker images
- Rename the GitHub repository to `icantbelievecrm`
- Complete the !AI rebrand of operational VPS documentation
- Add !AI-specific features while preserving compatibility with the open source foundation

## Screenshots

Final screenshots will be added after visual validation of the !AI-branded product.

## Contributing

Use small branches, preserve existing business rules, and run lint, type checks, tests, and the production build before submitting changes.

## Based on the amazing work from DeskcommCRM.

This project is based on the original [DeskcommCRM](https://github.com/melgarafael/DeskcommCRM), distributed under the MIT License. The original copyright notice and license are preserved in `LICENSE`.

## License

MIT.
