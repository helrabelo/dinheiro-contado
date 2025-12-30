import { redirect } from "next/navigation";

export default function UncategorizedTransactionsPage() {
  redirect("/dashboard/transactions?categoryId=UNCATEGORIZED");
}
