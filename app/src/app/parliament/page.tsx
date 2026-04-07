import { redirect } from "next/navigation";

export default function ParliamentPage() {
  redirect("/government?tab=parliament");
}
