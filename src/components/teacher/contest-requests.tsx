import { Check, UserCheck, X } from "lucide-react";
import { decideContestRequests } from "@/lib/contest-actions";
import { pendingClasses } from "@/lib/contest-access";
import { formatDateTime } from "@/lib/datetime";
import type { ContestRequest } from "@/lib/db/contests";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function RequestRow({
  contestId,
  request,
  actions,
}: {
  contestId: string;
  request: ContestRequest;
  actions: ("approved" | "rejected")[];
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className="min-w-0">
        <span className="font-medium">{request.name ?? request.email}</span>
        {request.class_name && <span className="ml-1.5 text-muted-foreground">{request.class_name}</span>}
        <span className="ml-2 text-xs text-muted-foreground">{request.email}</span>
        <span className="ml-2 text-xs text-muted-foreground tabular-nums">
          {formatDateTime(request.requested_at)}
        </span>
      </span>
      <span className="flex gap-1.5">
        {actions.map((decision) => (
          <form key={decision} action={decideContestRequests.bind(null, contestId, decision)}>
            <input type="hidden" name="uid" value={request.uid} />
            <Button type="submit" size="sm" variant={decision === "approved" ? "outline" : "ghost"}>
              {decision === "approved" ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              {decision === "approved" ? "Зөвшөөрөх" : "Татгалзах"}
            </Button>
          </form>
        ))}
      </span>
    </li>
  );
}

/** Pending and rejected «Оролцох» requests for one contest, with bulk approval. */
export function ContestRequests({
  contestId,
  requests,
  requiresApproval,
}: {
  contestId: string;
  requests: ContestRequest[];
  requiresApproval: boolean;
}) {
  const pending = requests.filter((r) => r.status === "pending");
  const rejected = requests.filter((r) => r.status === "rejected");
  const approve = decideContestRequests.bind(null, contestId, "approved");

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="size-4" />
          Хүсэлтүүд
        </CardTitle>
        {pending.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <form action={approve}>
              <input type="hidden" name="scope" value="all" />
              <Button type="submit" size="sm">
                Бүгдийг зөвшөөрөх ({pending.length})
              </Button>
            </form>
            {pendingClasses(requests).map(({ className, count }) => (
              <form key={className} action={approve}>
                <input type="hidden" name="scope" value={`class:${className}`} />
                <Button type="submit" size="sm" variant="outline">
                  {className} ({count}) зөвшөөрөх
                </Button>
              </form>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!requiresApproval && pending.length > 0 && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Энэ тэмцээн зөвшөөрөл шаардахгүй болсон — хүлээгдэж буй хүсэлтүүдийг «Бүгдийг зөвшөөрөх»-өөр
            оруулна уу.
          </p>
        )}
        {pending.length === 0 ? (
          <p className="text-muted-foreground">Хүлээгдэж буй хүсэлт алга.</p>
        ) : (
          <ul className="divide-y">
            {pending.map((r) => (
              <RequestRow key={r.uid} contestId={contestId} request={r} actions={["approved", "rejected"]} />
            ))}
          </ul>
        )}
        {rejected.length > 0 && (
          <div>
            <p className="font-medium text-muted-foreground">Татгалзсан</p>
            <ul className="divide-y">
              {rejected.map((r) => (
                <RequestRow key={r.uid} contestId={contestId} request={r} actions={["approved"]} />
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
