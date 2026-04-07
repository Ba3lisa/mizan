import { redirect } from "next/navigation";

export default function GovernoratePage() {
  redirect("/government?tab=governorates");
}
