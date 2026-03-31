"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get checksQueue () {
        return checksQueue;
    },
    get evaluationsQueue () {
        return evaluationsQueue;
    },
    get notificationsQueue () {
        return notificationsQueue;
    },
    get redisConnection () {
        return redisConnection;
    }
});
const _bullmq = require("bullmq");
const _url = require("url");
function getRedisConnection() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const parsed = new _url.URL(redisUrl);
    return {
        host: parsed.hostname,
        port: parseInt(parsed.port ?? '6379'),
        password: parsed.password || undefined,
        username: parsed.username || undefined
    };
}
const redisConnection = getRedisConnection();
const checksQueue = new _bullmq.Queue('checks', {
    connection: redisConnection,
    defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 2,
        backoff: {
            type: 'exponential',
            delay: 2000
        }
    }
});
const evaluationsQueue = new _bullmq.Queue('evaluations', {
    connection: redisConnection,
    defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100
    }
});
const notificationsQueue = new _bullmq.Queue('notifications', {
    connection: redisConnection,
    defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        }
    }
});
