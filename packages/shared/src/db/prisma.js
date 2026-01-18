"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.checkPostgresConnection = checkPostgresConnection;
exports.disconnectPrisma = disconnectPrisma;
exports.connectPrisma = connectPrisma;

const prisma_1 = require("../generated/prisma");

const prismaClientSingleton = () => {
    return new prisma_1.PrismaClient({
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
};

exports.prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = exports.prisma;
}

function checkPostgresConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exports.prisma.$queryRaw`SELECT 1`;
            return true;
        }
        catch (error) {
            console.error('PostgreSQL connection check failed:', error);
            return false;
        }
    });
}

function disconnectPrisma() {
    return __awaiter(this, void 0, void 0, function* () {
        yield exports.prisma.$disconnect();
    });
}

function connectPrisma() {
    return __awaiter(this, void 0, void 0, function* () {
        yield exports.prisma.$connect();
    });
}
