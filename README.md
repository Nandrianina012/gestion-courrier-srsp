This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Tester depuis un téléphone sur le même Wi-Fi

Connectez le PC et le téléphone au même réseau Wi-Fi. Démarrez PostgreSQL,
puis le backend depuis le dossier `backend` :

```powershell
..\backend-env\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Dans un autre terminal à la racine du projet, démarrez le frontend :

```powershell
npm run dev
```

Sur le téléphone, ouvrez `http://ADRESSE_IPV4_DU_PC:3000`. Pour trouver l'adresse
actuelle du PC, exécutez `ipconfig` et lisez l'Adresse IPv4 de la carte Wi-Fi.
Cette adresse change selon le réseau; après avoir connecté le PC à un autre
Wi-Fi, relisez `ipconfig` et utilisez la nouvelle adresse. Le téléphone et le PC
doivent toujours être sur le même Wi-Fi. Si Windows le demande, autorisez Node.js
et Python sur le réseau privé.

Quand l'application sera déployée sur un serveur accessible sur Internet avec
HTTPS, les appareils pourront être sur des réseaux différents.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
