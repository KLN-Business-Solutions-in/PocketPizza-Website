This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Copy `.env.example` to `.env.local` and run the customer UI against the local backend menu API:

```bash
cp .env.example .env.local
npm run dev
```

This starts both the frontend (http://localhost:3000) and backend (http://localhost:4000) concurrently from the repository root. To run them separately, open two terminals:
- Terminal 1: `npm run dev:frontend`
- Terminal 2: `npm run dev:backend`

The app is then available at [http://localhost:3000/menu](http://localhost:3000/menu). To switch back to the local MSW fixtures, set `NEXT_PUBLIC_USE_MOCKS=true` in `.env.local` and restart the dev server.

You can also use `yarn dev`, `pnpm dev`, or `bun dev` if that is your preferred package manager.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
