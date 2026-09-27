#!/usr/bin/env node
/**
 * Ejecuta el CLI de Prisma apuntando al schema del motor activo
 * (DB_PROVIDER=postgresql|mysql, por defecto postgresql), para poder
 * mantener dos schemas/migraciones (prisma/postgresql, prisma/mysql)
 * seleccionables por variable de entorno sin duplicar los scripts de npm.
 */
const { spawnSync } = require('node:child_process');

const VALID_PROVIDERS = ['postgresql', 'mysql'];
const provider = (process.env.DB_PROVIDER || 'postgresql').toLowerCase();

if (!VALID_PROVIDERS.includes(provider)) {
  console.error(`DB_PROVIDER invalido: "${provider}". Usa "postgresql" o "mysql".`);
  process.exit(1);
}

const schema = `prisma/${provider}/schema.prisma`;
const args = [...process.argv.slice(2), '--schema', schema];

console.log(`[run-prisma] DB_PROVIDER=${provider} -> npx prisma ${args.join(' ')}`);
const result = spawnSync('npx', ['prisma', ...args], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
