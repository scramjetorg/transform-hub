export type AuthenticationConfigBase = {
    driver: "auth0" | "keycloak";
}

export type Auth0AuthenticationConfig = {
    driver: "auth0";
    domain: string;
    audience: string;
    // eslint-disable-next-line camelcase
    client_id: string;
    // eslint-disable-next-line camelcase
    client_secret: string;
    webhookSecret: string;
};

export type KeycloakAuthenticationConfig = {
    driver: "keycloak";
    baseUrl: string;
    realm: string;
    grantType: "client_credentials" | "password" | "refresh_token",
    username?: string;
    password?: string;
    clientId: string;
    webhookSecret: string;
    clientSecret?: string;
    totp?: string;
    offlineToken?: boolean;
    refreshToken?: string;
    scopes?: string[];
};

export type AuthenticationConfig = Auth0AuthenticationConfig | KeycloakAuthenticationConfig;
