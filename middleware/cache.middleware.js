const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // Cache 5 phút

const cacheMiddleware = (duration) => (req, res, next) => {
    if (req.method !== 'GET') {
        return next();
    }

    const key = req.originalUrl;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
        return res.json(cachedResponse);
    }

    res.originalJson = res.json;
    res.json = (body) => {
        cache.set(key, body, duration);
        res.originalJson(body);
    };
    next();
};

module.exports = cacheMiddleware; 