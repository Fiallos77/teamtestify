import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";

export default async function Home() {
  redirect((await isAuthenticated()) ? "/dashboard" : "/sign-in");
}
