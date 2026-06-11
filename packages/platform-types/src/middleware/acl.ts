export interface IAccessControlList<
    RoleType extends string,
    ResourceType extends string,
    PermissionType extends string
> {
    allow(
        roles: RoleType | RoleType[],
        resources: ResourceType | ResourceType[],
        permissions: PermissionType | PermissionType[]
    ): void;
    isAllowed(role: RoleType | RoleType[], resource: ResourceType, permission: PermissionType): boolean;
    getAllRoles(): RoleType[];
    getAllResources(): ResourceType[];
    getAllPermissions(): PermissionType[];
}

export type AccessControlListDefinition<RoleType, ResourceType, PermissionType> = {
    roles: RoleType[];
    allows: { resources: ResourceType[]; permissions: PermissionType[] };
};
