"use client";

import { useActionState } from "react";
import { Printer, UserPlus } from "lucide-react";
import { createUsersAction, type CreateUsersState } from "@/lib/account-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const EXAMPLE = "bat.bold@shineue.edu.mn\tБат Болд\t11A\nsaraa.d@shineue.edu.mn\tСараа Дорж\t11B";

export function CreateUsersForm({ isAdmin, siteUrl }: { isAdmin: boolean; siteUrl: string }) {
  const [state, action, pending] = useActionState<CreateUsersState, FormData>(createUsersAction, {
    status: "idle",
  });

  return (
    <>
      <div className="space-y-6 print:hidden">
        <form action={action} className="space-y-4 rounded-xl border bg-background p-4">
          <div className="space-y-1.5">
            <Label htmlFor="list">Жагсаалт — мөр бүрт «имэйл, нэр, анги»</Label>
            <Textarea
              id="list"
              name="list"
              rows={10}
              required
              placeholder={EXAMPLE}
              defaultValue={state.status === "error" ? state.list : ""}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Excel эсвэл Google Sheets-ээс имэйл, нэр, анги гэсэн баганаа хуулж буулгана (анги заавал
              биш, жишээ нь 11A). Таслал эсвэл цэг таслалаар тусгаарласан мөр ч болно. Нэг удаад 200
              хүртэл.
            </p>
          </div>
          {isAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="role">Эрх</Label>
              {/* React applies a select's defaultValue only on mount, so remount
                  it with the submitted role before the post-action form reset. */}
              <select
                key={state.status === "idle" ? "student" : state.role}
                id="role"
                name="role"
                defaultValue={state.status === "idle" ? "student" : state.role}
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value="student">Сурагч</option>
                <option value="teacher">Багш</option>
              </select>
            </div>
          )}
          {state.status === "error" && (
            <ul
              role="alert"
              className="space-y-1 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <Button type="submit" disabled={pending}>
            <UserPlus className="size-4" />
            {pending ? "Нэмж байна…" : "Нэмэх"}
          </Button>
        </form>

        {state.status === "done" && (
          <div className="space-y-3 rounded-xl border bg-background p-4">
            <p className="font-medium">
              {state.created.length} {state.role === "teacher" ? "багш" : "сурагч"} нэмэгдлээ
              {state.skipped.length > 0 &&
                `, ${state.skipped.length} нь аль хэдийн бүртгэлтэй тул алгаслаа`}
              .
            </p>
            {state.skipped.length > 0 && (
              <p className="text-sm text-muted-foreground">Алгассан: {state.skipped.join(", ")}</p>
            )}
            {state.created.length > 0 && (
              <>
                <p className="rounded-md bg-amber-500/15 p-3 text-sm text-amber-900">
                  Түр нууц үгүүд зөвхөн одоо харагдана — хуудсыг хаахаас өмнө хэвлэж аваарай.
                  Хэрэглэгч анх нэвтрэхдээ өөрийн нууц үгийг тохируулна.
                </p>
                <Button type="button" variant="outline" onClick={() => window.print()}>
                  <Printer className="size-4" />
                  Хэвлэх
                </Button>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Нэр</TableHead>
                      <TableHead>Имэйл</TableHead>
                      <TableHead>Түр нууц үг</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.created.map((u) => (
                      <TableRow key={u.email}>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell className="font-mono">{u.tempPassword}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        )}
      </div>

      {/* Printed only: one cut-out slip per person. */}
      {state.status === "done" && (
        <div className="hidden print:block">
          {state.created.map((u) => (
            <div key={u.email} className="break-inside-avoid border-b border-dashed py-4 text-black">
              <p className="text-sm">IBDP Computer Science — {siteUrl}</p>
              <p className="text-lg font-semibold">{u.name}</p>
              <p>
                Имэйл: <span className="font-mono">{u.email}</span>
              </p>
              <p>
                Түр нууц үг: <span className="font-mono text-lg">{u.tempPassword}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
