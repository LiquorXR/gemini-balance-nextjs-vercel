"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActionState } from "react";
import { updateSettings } from "./actions";

type SettingsData = Record<string, string>;

export function SettingsForm({ initialData }: { initialData: SettingsData }) {
  const [, formAction] = useActionState(updateSettings, {
    success: false,
    message: "",
  });

  return (
    <form action={formAction}>
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="AUTH_TOKEN">Auth Token</Label>
              <Input
                id="AUTH_TOKEN"
                name="AUTH_TOKEN"
                defaultValue={initialData.AUTH_TOKEN || ""}
                className="col-span-3"
                type="password"
              />
            </div>
            {/* Add other general settings here */}
          </div>
        </TabsContent>
        <TabsContent value="models">
          <div className="grid gap-4 py-4">{/* Add model settings here */}</div>
        </TabsContent>
        <TabsContent value="logs">
          <div className="grid gap-4 py-4">{/* Add log settings here */}</div>
        </TabsContent>
      </Tabs>
      <div className="flex justify-end mt-4">
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
}
