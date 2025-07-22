"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Dictionary } from "../dictionaries";
import { FormState } from "./actions";

type LoginPageDict = Dictionary["loginPage"];
type LoginPageMessageKey = keyof LoginPageDict;

function SubmitButton({ dict }: { dict: Dictionary }) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" type="submit" disabled={pending}>
      {pending ? "..." : dict.loginPage.signInButton}
    </Button>
  );
}

export function LoginForm({
  action,
  dict,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  dict: Dictionary;
}) {
  const [state, formAction] = useActionState(action, {
    success: false,
    message: "",
  });

  return (
    <form action={formAction}>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{dict.loginPage.title}</CardTitle>
          <CardDescription>{dict.loginPage.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="token">{dict.loginPage.tokenLabel}</Label>
            <Input id="token" name="token" type="password" required />
          </div>
          {state && !state.success && state.message && (
            <p className="text-sm text-red-500">
              {dict.loginPage[state.message as LoginPageMessageKey] ||
                state.message}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <SubmitButton dict={dict} />
        </CardFooter>
      </Card>
    </form>
  );
}
