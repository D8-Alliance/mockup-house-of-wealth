# Production Redis secrets

Do not commit files in `server/ops/secrets/` or `server/ops/redis/certs/`.

Required files:

- `server/ops/secrets/redis_password`
- `server/ops/redis/certs/ca.crt`
- `server/ops/redis/certs/redis.crt`
- `server/ops/redis/certs/redis.key`

Generate the password with a secret manager or a cryptographically secure generator. Issue the Redis certificate for the DNS name `redis` used by the compose network. The production compose file refuses to start correctly until these files exist.
