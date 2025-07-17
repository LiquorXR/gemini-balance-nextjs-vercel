"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiCallStatsDetail } from "./ApiCallStatsDetail";
import { KeyStatsDetail } from "./KeyStatsDetail";

interface KeyStats {
  total: number;
  enabled: number;
  invalid: number;
}

interface ApiCallStats {
  lastMinute: number;
  lastHour: number;
  last24Hours: number;
}

import { Dictionary } from "@/lib/dictionaries";

interface DashboardStatsProps {
  keyStats: KeyStats;
  apiCallStats: ApiCallStats;
  dictionary: Dictionary["dashboard"] & {
    keyDetails: Dictionary["keyDetails"];
    apiCallDetails: Dictionary["apiCallDetails"];
  };
}

export function DashboardStats({
  keyStats,
  apiCallStats,
  dictionary,
}: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Dialog>
        <DialogTrigger asChild>
          <Card className="cursor-pointer transition-all hover:bg-muted/50 hover:shadow-md">
            <CardHeader>
              <CardTitle>{dictionary.keyStatsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{keyStats.total}</p>
                <p className="text-sm text-muted-foreground">
                  {dictionary.totalKeys}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {keyStats.enabled}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dictionary.activeKeys}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {keyStats.invalid}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dictionary.inactiveKeys}
                </p>
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{dictionary.detailedKeyStats}</DialogTitle>
          </DialogHeader>
          <KeyStatsDetail dictionary={dictionary.keyDetails} />
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Card className="cursor-pointer transition-all hover:bg-muted/50 hover:shadow-md">
            <CardHeader>
              <CardTitle>{dictionary.apiCallStatsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{apiCallStats.lastMinute}</p>
                <p className="text-sm text-muted-foreground">
                  {dictionary.last1m}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">{apiCallStats.lastHour}</p>
                <p className="text-sm text-muted-foreground">
                  {dictionary.last1h}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">{apiCallStats.last24Hours}</p>
                <p className="text-sm text-muted-foreground">
                  {dictionary.last24h}
                </p>
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{dictionary.detailedApiCallStats}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="24h" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="1m">{dictionary.last1mTab}</TabsTrigger>
              <TabsTrigger value="1h">{dictionary.last1hTab}</TabsTrigger>
              <TabsTrigger value="24h">{dictionary.last24hTab}</TabsTrigger>
            </TabsList>
            <TabsContent value="1m">
              <ApiCallStatsDetail
                timeframe="1m"
                dictionary={dictionary.apiCallDetails}
              />
            </TabsContent>
            <TabsContent value="1h">
              <ApiCallStatsDetail
                timeframe="1h"
                dictionary={dictionary.apiCallDetails}
              />
            </TabsContent>
            <TabsContent value="24h">
              <ApiCallStatsDetail
                timeframe="24h"
                dictionary={dictionary.apiCallDetails}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
