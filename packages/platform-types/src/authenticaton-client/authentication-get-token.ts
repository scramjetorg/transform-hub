/* eslint-disable camelcase */
export type GetTokenResultSuccess = {
    access_token: string;
    token_type: string;
    expires_in: number;
};

export type GetTokenResultError = {
    error: "authorization_pending" | "slow_down" | "access_denied" | "invalid_grant";
    error_description: string;
};

export type GetTokenResult = GetTokenResultSuccess | GetTokenResultError;
