import { redirect } from "next/navigation";

/** @deprecated Use /login — kept for existing links */
export default function SignInRedirectPage() {
  redirect("/login");
}
