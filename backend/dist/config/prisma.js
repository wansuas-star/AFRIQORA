"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertTestDatabaseIsolation = assertTestDatabaseIsolation;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rawPrismaModule = require('@prisma/client');
const OriginalPrismaClient = rawPrismaModule.PrismaClient;
const dbUrl = process.env.DATABASE_URL;
const isTestMode = process.env.NODE_ENV === 'test' || process.env.AFRIQORA_TEST_ISOLATION === 'true';
function assertTestDatabaseIsolation(candidateUrl) {
    const url = candidateUrl ?? process.env.DATABASE_URL;
    if (isTestMode &&
        (!url ||
            url.includes('prisma/dev.db') ||
            url.includes('prisma\\dev.db') ||
            url === 'file:./dev.db' ||
            url.toLowerCase().includes('backups'))) {
        throw new Error('FATAL TEST ISOLATION ERROR: Tests must use an isolated test database via DATABASE_URL and must never connect to backend/prisma/dev.db or backend/backups/');
    }
}
assertTestDatabaseIsolation(dbUrl);
if (isTestMode && dbUrl) {
    const GuardedPrismaClient = new Proxy(OriginalPrismaClient, {
        construct(target, args, newTarget) {
            assertTestDatabaseIsolation(process.env.DATABASE_URL || dbUrl);
            const effectiveUrl = process.env.DATABASE_URL || dbUrl;
            const firstArg = (args[0] && typeof args[0] === 'object') ? args[0] : {};
            const patchedArg = {
                ...firstArg,
                datasources: {
                    ...(firstArg.datasources || {}),
                    db: { url: effectiveUrl },
                },
            };
            return Reflect.construct(target, [patchedArg], newTarget);
        },
    });
    try {
        Object.defineProperty(rawPrismaModule, 'PrismaClient', {
            value: GuardedPrismaClient,
            writable: true,
            configurable: true,
        });
    }
    catch {
        rawPrismaModule.PrismaClient = GuardedPrismaClient;
    }
    console.log(`[DB-ISOLATION-GUARD] Active -> Exclusively bound to: ${dbUrl}`);
}
const prisma = new OriginalPrismaClient(dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined);
exports.default = prisma;
