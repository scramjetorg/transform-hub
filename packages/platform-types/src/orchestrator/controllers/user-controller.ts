import { IAuthenticationClient } from "../../authenticaton-client";

export type UserControllerParams = {
    authenticationClient: IAuthenticationClient,
}
export type UserControllerMetadataOnboarding = { addSequence?: {ended?: boolean}}

export type UserControllerMetadata = {
    acceptedTermsOfServiceVersion?: string,
    acceptedTermsOfServiceTimestamp?: number,
    newsletter?: boolean
    onboarding?: UserControllerMetadataOnboarding
}

export type UserControllerProfile = {
    email?: string;
    user_metadata?: UserControllerMetadata
}

export type UserUpdateParams = {
    user_metadata: Pick<UserControllerMetadata, "newsletter" | "onboarding">
}

export interface IUserController {
    getUser: (userId: string) => Promise<UserControllerProfile>;
    updateUser: (userId: string, params: UserUpdateParams) => Promise<UserControllerProfile>;
    deleteUser: (userId: string) => Promise<any>;
}
