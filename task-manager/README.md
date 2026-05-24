This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# DSO101 Final Project - CI/CD Pipeline

**Application:** PERN Stack Task Manager

## Live URLs
| Service | URL |
|---------|-----|
| Frontend | https://fe-taskmanager.onrender.com |
| Backend API | https://be-taskmanager.onrender.com |
| GitHub Repo | https://github.com/AshisRai503/web101-web102-group-1 |
| DockerHub | https://hub.docker.com/u/bishalwaiba |

## Tools Used
| Tool | Purpose |
|------|---------|
| GitHub Actions | CI/CD automation |
| Docker | Containerization |
| DockerHub | Container registry |
| Render.com | Cloud hosting |
| Neon PostgreSQL | Cloud database |

## Security
- All credentials stored as GitHub Secrets
- No hardcoded passwords or tokens in code
- .env files in .gitignore
- SSL enabled for database connection
