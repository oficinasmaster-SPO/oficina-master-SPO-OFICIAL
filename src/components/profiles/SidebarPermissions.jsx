import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { sidebarStructure } from "@/components/lib/sidebarStructure";

export default function SidebarPermissions({ profile, onChange }) {
  const permissions = profile.sidebar_permissions || {};
  const [search, setSearch] = useState("");

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
        edit: value,
        create: value,
        delete: value,
        export: value,
        approve: value,
      };
    });

    onChange({
      ...profile,
      sidebar_permissions: updated,
    });
  };

  const searchLower = search.toLowerCase().trim();

  const filteredStructure = sidebarStructure.map((group) => ({
    ...group,
    items: (group.items || []).filter(
      (item) =>
        !searchLower ||
        item.name.toLowerCase().includes(searchLower) ||
        (item.description || "").toLowerCase().includes(searchLower) ||
        group.label.toLowerCase().includes(searchLower)
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-4">
      {/* Campo de pesquisa */}
      <div className="relative w-[280px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar função ou módulo..."
          className="pl-8 h-8 text-sm"
        />
      </div>

      {filteredStructure.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-6">Nenhuma função encontrada para "{search}"</p>
      )}

      {filteredStructure.map((group) => {
        const groupItems = group.items || [];
        const allChecked = groupItems.length > 0 && groupItems.every((item) => {
          const itemKey = `${group.id}_${item.name}`;
          const p = permissions[itemKey] || {};
          return p.view && p.edit && p.create && p.delete && p.export && p.approve;
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