import { getDictionary } from "../../dictionaries";
import { createLoginAction } from "../actions";
import { LoginForm } from "../login-form";

type PageProps = {
  params: Promise<{ lang: "en" | "zh" }>;
};

export default async function LoginPage({ params }: PageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const loginAction = createLoginAction.bind(null, lang);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <LoginForm action={loginAction} dict={dict} />
    </div>
  );
}
