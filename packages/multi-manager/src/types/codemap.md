# packages/multi-manager/src/types/

## Responsibility

Type definitions for the Multi-Manager package. Defines the configuration shape (`MultiManagerOptions`, `MultiManagerServerOptions`), CLI command option shape (`MultiManagerCommandOptions` with full verser2 CLI flags), and API request parameter types (`StartManagerRequestParams`).

## Design/Patterns

- **`MultiManagerServerOptions`**: Typed API server sub-config (url path, host, port, API version).
- **`MultiManagerOptions`**: Full merged configuration interface extending `LoadCheckRequirements`. Includes log settings, server config, optional Manager pre-configuration, S3 credentials, optional monitoring server config, and verser2 configuration (`ManagerVerser2Config`).
- **`MultiManagerCommandOptions`**: Flat CLI flag shape after `parseCliOptions()`. All fields are optional or have defaults; includes verser2-specific flags (`verser2Enabled`, `verser2HostBindHost`, `verser2HostBindPort`, `verser2HostPublicUrl`, `verser2HostCertFile`, `verser2HostKeyFile`, `verser2RegistrationToken`, `verser2AllowLocalPeers`, `verser2LocalBrokerPeerId`, `verser2LocalGuestRouteDomain`, etc.).
- **`StartManagerRequestParams`**: `DeepPartial<ManagerConfiguration>` for the `POST /v1/start` body.

## Integration Points

- Used by `src/config/`, `src/lib/`, `src/lib/api/`, and `src/bin/` modules.
- References `@scramjet/types` (`ApiVersion`, `DeepPartial`, `IdString`, `LoadCheckRequirements`, `LogLevel`, `ManagerConfiguration`, `ManagerVerser2Config`, `Port`, `UrlPath`).
