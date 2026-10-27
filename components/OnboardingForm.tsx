"use client";
import { useActionState, useState } from "react";
import { completeOnboarding, type FormState } from "@/app/actions/auth";
import { CLASSIFICATIONS, REGIONS } from "@/lib/domain";

export function OnboardingForm({ initialKind, name }: { initialKind: "contractor" | "agency"; name: string }) {
  const [kind, setKind] = useState(initialKind);
  const [state, action, pending] = useActionState<FormState, FormData>(completeOnboarding, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="seg">
        <label><input type="radio" name="kind" value="contractor" checked={kind === "contractor"} onChange={() => setKind("contractor")} />אני קבלן</label>
        <label><input type="radio" name="kind" value="agency" checked={kind === "agency"} onChange={() => setKind("agency")} />אני תאגיד</label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">{kind === "agency" ? "שם התאגיד" : "שם החברה"}</label><input className="input" name="company" required /></div>
        <div><label className="label">{kind === "agency" ? "מספר היתר תאגיד (רשות האוכלוסין)" : "מספר רישום ברשם הקבלנים"}</label><input className="input" name="number" required dir="ltr" /></div>
        {kind === "contractor" && (
          <div>
            <label className="label">סיווג קבלני</label>
            <select className="input" name="classification" defaultValue=""><option value="">לא ידוע</option>{CLASSIFICATIONS.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
        )}
        <div><label className="label">שם מלא</label><input className="input" name="name" required defaultValue={name} /></div>
        <div><label className="label">טלפון נייד</label><input className="input" name="phone" required dir="ltr" inputMode="tel" /></div>
        <div>
          <label className="label">עיר</label>
          <select className="input" name="city" required defaultValue="">
            <option value="" disabled>בחירה…</option>
            {REGIONS.map((r) => <optgroup key={r.key} label={r.label}>{r.cities.map((c) => <option key={c}>{c}</option>)}</optgroup>)}
          </select>
        </div>
      </div>
      {kind === "agency" && (
        <fieldset>
          <legend className="label">אזורי פעילות</legend>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <label key={r.key} className="chip-muted cursor-pointer px-3 py-1.5 text-xs has-[:checked]:bg-ink has-[:checked]:text-white">
                <input type="checkbox" name="regions" value={r.key} className="sr-only" />{r.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <p className="text-xs text-muted">
        {kind === "agency"
          ? "נאמת את ההיתר מול רשימת התאגידים המורשים. עד האימות אפשר להעלות עובדים (כולל מאקסל) ולהגדיר הכול — הפרופיל יופיע בחיפוש אחרי האימות."
          : "עובד זר מותר להצבה רק אצל קבלן רשום. נאמת את מספר הרישום מול פנקס הקבלנים. עד האימות אפשר לחפש ולראות מחירים."}
      </p>
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "שומר…" : "המשך"}</button>
    </form>
  );
}
