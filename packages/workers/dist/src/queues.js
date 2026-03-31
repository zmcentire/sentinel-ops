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
const redisConnection = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379')
};
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
