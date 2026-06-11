import { IObjectLogger } from "@scramjet/types";
import { GetTokenResult } from "./authentication-get-token";

export type AuthenticationClientUserMetadata = {
    acceptedTermsOfServiceVersion?: string,
    acceptedTermsOfServiceTimestamp?: string,
    newsletter?: string
    onboarding?: { addSequence?: { ended: boolean } }
}

export type AuthenticationClientUserProfile = {
    email?: string;
    user_metadata?: AuthenticationClientUserMetadata;
}

export type UserMetadata = Partial<AuthenticationClientUserMetadata & AuthenticationClientUserProfile>;

export interface IAuthenticationClient {
    initialize(): Promise<void>;
    get logger(): IObjectLogger | undefined;
    getWebhookSecret: () => string;
    getToken: (username: string, password: string) => Promise<GetTokenResult>;
    emailVerification: (userId: string) => Promise<any>;
    resetPassword: (userId: string) => Promise<any>;
    getUser: (userId: string) => Promise<AuthenticationClientUserProfile>
    updateUserMetadata: (userId: string, metadata: UserMetadata) => Promise<AuthenticationClientUserProfile>
    deleteUser: (userId: string) => Promise<any>;
}

export interface IManagementClient {
    initialize(): Promise<void>;
    deleteUser(arg0: { id: string; }): Promise<any>;
    updateUserMetadata(arg0: { id: string; }, metadata: UserMetadata): Promise<AuthenticationClientUserProfile>;
    getUser(options: { id: string }): Promise<AuthenticationClientUserProfile>;
    sendEmailVerification(options: { user_id: string }): Promise<any>;
}
