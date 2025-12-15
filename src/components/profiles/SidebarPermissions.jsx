import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { sidebarStructure } from "@/components/lib/sidebarStructure";

export default function SidebarPermissions({ profile, onChange }) {
  const permissions = profile.sidebar_permissions || {};

  const updatePermission = (itemKey, permissionType, value) => {
    const updated = {
      ...permissions,
      [itemKey]: {
        ...(permissions[itemKey] || {}),
        [permissionType]: value,
      },
    };

    onChange({
      ...profile,
      sidebar_permissions: updated,
    });
  };

  const toggleGroupPermissions = (groupId, items, value) => {
    const updated = { ...permissions };
    items.forEach((item) => {
      const itemKey = `${groupId}_${item.name}`;
      updated[itemKey] = {
        view: value,
        edit: false,
        create: false,
        delete: false,
        export: false,
        approve: false,
      };
    });

    onChange({
      ...profile,
      sidebar_permissions: updated,
    });
  };

  return (
    <div className="space-y-4">
      {sidebarStructure.map((group) => {
        const groupItems = group.items || [];
        const allChecked = groupItems.every((item) => {
          const itemKey = `${group.id}_${item.name}`;
          return permissions[itemKey]?.view;
        });

        return (
          <Card key={group.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{group.label}</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`group_${group.id}`}
                    checked={allChecked}
                    onCheckedChange={(checked) =>
                      toggleGroupPermissions(group.id, groupItems, checked)
                    }
                  />
                  <Label htmlFor={`group_${group.id}`} className="text-sm">
                    Selecionar todos
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groupItems.map((item) => {
                  const itemKey = `${group.id}_${item.name}`;
                  const itemPerms = permissions[itemKey] || {};

                  return (
                    <div
                      key={itemKey}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {item.name}
                        </h4>
                        {item.description && (
                          <p className="text-sm text-gray-600">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <PermissionCheckbox
                          id={`${itemKey}_view`}
                          label="Visualizar"
                          checked={itemPerms.view || false}
                          onChange={(checked) =>
                            updatePermission(itemKey, "view", checked)
                          }
                        />
                        <PermissionCheckbox
                          id={`${itemKey}_edit`}
                          label="Editar"
                          checked={itemPerms.edit || false}
                          onChange={(checked) =>
                            updatePermission(itemKey, "edit", checked)
                          }
                          disabled={!itemPerms.view}
                        />
                        <PermissionCheckbox
                          id={`${itemKey}_create`}
                          label="Criar"
                          checked={itemPerms.create || false}
                          onChange={(checked) =>
                            updatePermission(itemKey, "create", checked)
                          }
                          disabled={!itemPerms.view}
                        />
                        <PermissionCheckbox
                          id={`${itemKey}_delete`}
                          label="Excluir"
                          checked={itemPerms.delete || false}
                          onChange={(checked) =>
                            updatePermission(itemKey, "delete", checked)
                          }
                          disabled={!itemPerms.view}
                        />
                        <PermissionCheckbox
                          id={`${itemKey}_export`}
                          label="Exportar"
                          checked={itemPerms.export || false}
                          onChange={(checked) =>
                            updatePermission(itemKey, "export", checked)
                          }
                          disabled={!itemPerms.view}
                        />
                        <PermissionCheckbox
                          id={`${itemKey}_approve`}
                          label="Aprovar"
                          checked={itemPerms.approve || false}
                          onChange={(checked) =>
                            updatePermission(itemKey, "approve", checked)
                          }
                          disabled={!itemPerms.view}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PermissionCheckbox({ id, label, checked, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
      <Label
        htmlFor={id}
        className={`text-sm ${disabled ? "text-gray-400" : ""}`}
      >
        {label}
      </Label>
    </div>
  );
}