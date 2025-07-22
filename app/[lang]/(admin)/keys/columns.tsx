"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { apiKeys } from "@/lib/db/schema";
import { ColumnDef } from "@tanstack/react-table";

export const columns: ColumnDef<typeof apiKeys.$inferSelect>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "key",
    header: "API Key",
    cell: ({ row }) => {
      const key = row.getValue("key") as string;
      return (
        <div className="font-mono">{`${key.substring(0, 8)}...${key.substring(
          key.length - 4
        )}`}</div>
      );
    },
  },
  {
    accessorKey: "failureCount",
    header: "Failure Count",
  },
  {
    accessorKey: "isEnabled",
    header: "Enabled",
  },
  {
    accessorKey: "lastUsedAt",
    header: "Last Used",
    cell: ({ row }) => {
      const date = row.getValue("lastUsedAt") as Date | null;
      return date ? new Date(date).toLocaleString() : "Never";
    },
  },
];
