# Keycloak Authentication

The API uses Keycloak as an OIDC provider. Keycloak owns passwords, MFA, and
the browser login. The API only accepts a signed access token and resolves the
user's roles from its own database.

## Local instance

Docker is required. From `server/keycloak`, run:

```powershell
docker compose up -d
```

For a VPS accessed through a public IP, create `server/keycloak/.env` with:

```dotenv
KEYCLOAK_HOSTNAME=http://45.127.7.141:8080
```

This makes the OIDC issuer use the same public hostname as the browser. This
HTTP setup is for testing only; production must use a DNS name and HTTPS.

Keycloak will be available at `http://localhost:8080`. The imported realm is
`house-of-wealth`; the temporary demo user is `demo-admin` with password
`ChangeMe-123!`. Change that password on first login and never use this realm
configuration in production.

## Realm and client

Create:

- Realm: `house-of-wealth`
- Client: `house-of-wealth-web`
- Client type: public client
- Standard flow: enabled
- Valid redirect URI: the frontend URL
- Web origins: the frontend URL
- Audience mapper: add `house-of-wealth-api` to the access token audience

The API is not a client secret holder. Do not put a Keycloak client secret in
the browser or commit one to this repository.

## MFA policy

In the realm authentication flow, require a configured OTP or WebAuthn step for
administrators and other sensitive users. Keycloak performs the challenge and
verifies the factor. The API must not accept a six-digit code directly from the
browser.

## Tenant claims

Configure protocol mappers on the client for the user's active context:

- `country_node_id` -> string claim
- `organisation_id` -> string claim

These values must be issued by a trusted Keycloak mapper or selected through a
server-controlled context flow. They must not be accepted as arbitrary browser
input. The API additionally requires a matching active database role
assignment for both claims.

## API configuration

Copy the repository `.env.example` values into `server/.env` and set:

```dotenv
AUTH_MODE=oidc
OIDC_ISSUER=http://localhost:8080/realms/house-of-wealth
OIDC_AUDIENCE=house-of-wealth-api
OIDC_JWKS_URI=http://localhost:8080/realms/house-of-wealth/protocol/openid-connect/certs
```

For production, use HTTPS for Keycloak and the API. The issuer is compared
exactly with the token `iss` claim, and the API requires a non-expired token,
the configured audience, and a valid signature from the matching JWKS key.
