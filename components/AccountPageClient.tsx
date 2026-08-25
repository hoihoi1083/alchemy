"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { LandingFloatingCta } from "@/components/landing/LandingFloatingCta";
import { LandingNav } from "@/components/landing/LandingNav";
import { useLocale } from "@/components/LocaleProvider";
import type { CreditReason } from "@/lib/billing/ledger";
import type { UserPlan } from "@/lib/billing/plans";
import { CREDITS_EVENT } from "@/lib/credits-client";

type MeUser = {
  creditBalance?: number | null;
  ownCreditBalance?: number | null;
  plan?: UserPlan | string | null;
  effectivePlan?: UserPlan | string | null;
  planRenewsAt?: string | Date | null;
  pendingPlan?: "light" | "standard" | "pro" | "master" | "custom" | null;
  pendingPlanEffectiveAt?: string | Date | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  hasUsedProTrial?: boolean;
  proTrialEndsAt?: string | Date | null;
  email?: string | null;
  name?: string | null;
};

type TxRow = {
  id: string;
  delta: number;
  reason: CreditReason;
  ref: string | null;
  meta: Record<string, unknown> | null;
  balanceAfter: number;
  createdAt: string;
};

type TeamDashboard = {
  teamId: string;
  ownerClerkId: string;
  seatLimit: number;
  seatsUsed: number;
  seatsHeld: number;
  pendingInviteCount: number;
  seatsAvailable: number;
  plan: string;
  members: Array<{
    clerkId: string;
    role: "owner" | "member";
    status: "active" | "removed";
    email: string | null;
    name: string | null;
    createdAt: string;
  }>;
  invites: Array<{
    id: string;
    inviteEmail: string;
    createdAt: string;
    expiresAt: string;
  }>;
};

type TeamMembershipSummary = {
  role: "owner" | "member";
  teamId: string;
  ownerClerkId: string;
  billingPooled: boolean;
  ownerLabel: string | null;
};

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(
    locale === "zh-cn"
      ? "zh-CN"
      : locale === "zh-tw"
        ? "zh-TW"
        : locale === "zh"
          ? "zh-HK"
          : "en-US",
    {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AccountPageClient() {
  const { m, locale } = useLocale();
  const a = m.account;
  const { isSignedIn, isLoaded } = useAuth();
  const [user, setUser] = useState<MeUser | null>(null);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [team, setTeam] = useState<TeamDashboard | null>(null);
  const [teamMembership, setTeamMembership] = useState<TeamMembershipSummary | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamNotice, setTeamNotice] = useState<string | null>(null);
  const [teamBusy, setTeamBusy] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const [meRes, txRes] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/me/transactions?limit=40"),
      ]);
      if (meRes.status === 401 || txRes.status === 401) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/account")}`;
        return;
      }
      if (!meRes.ok) throw new Error(a.loadError);
      const meData = (await meRes.json()) as {
        user?: MeUser | null;
        teamMembership?: TeamMembershipSummary | null;
      };
      setUser(meData.user ?? null);
      setTeamMembership(meData.teamMembership ?? null);

      if (txRes.ok) {
        const txData = (await txRes.json()) as { transactions?: TxRow[] };
        setTxs(txData.transactions ?? []);
      } else {
        setTxs([]);
      }
      if ((meData.user?.plan ?? "free") === "custom") {
        const teamRes = await fetch("/api/team");
        if (teamRes.ok) {
          const teamData = (await teamRes.json()) as { team?: TeamDashboard };
          setTeam(teamData.team ?? null);
          setTeamError(null);
        } else {
          const e = (await teamRes.json().catch(() => ({}))) as { error?: string };
          setTeam(null);
          setTeamError(e.error ?? "Failed to load team seats.");
        }
      } else {
        setTeam(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : a.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/account")}`;
      return;
    }
    void load();
    const onCredits = () => void load();
    window.addEventListener(CREDITS_EVENT, onCredits);
    return () => window.removeEventListener(CREDITS_EVENT, onCredits);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on auth only
  }, [isLoaded, isSignedIn]);

  async function openPortal() {
    setPortalBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? a.portalError);
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : a.portalError);
      setPortalBusy(false);
    }
  }

  async function cancelSubscription() {
    const planNow = ((user?.effectivePlan ?? user?.plan) as UserPlan) || "free";
    const trialLikely =
      planNow === "pro" &&
      Boolean(user?.proTrialEndsAt) &&
      new Date(user!.proTrialEndsAt as string).getTime() > Date.now();
    const ok = window.confirm(
      trialLikely ? a.cancelConfirmTrial : a.cancelConfirmPaid,
    );
    if (!ok) return;
    setCancelBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/cancel-subscription", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? a.cancelError);
      setError(null);
      window.alert(data.message ?? a.cancelSuccess);
      window.dispatchEvent(new Event(CREDITS_EVENT));
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : a.cancelError);
      setCancelBusy(false);
    }
  }

  const teamCopy = a.team;
  const planKey = ((user?.effectivePlan ?? user?.plan) as UserPlan) || "free";
  const planLabel =
    planKey === "light"
      ? m.pricing.plans.light.name
      : planKey === "standard"
      ? m.pricing.plans.standard.name
      : planKey === "pro"
        ? m.pricing.plans.pro.name
        : planKey === "master"
          ? m.pricing.plans.master.name
          : planKey === "custom"
            ? m.pricing.plans.custom.name
            : m.pricing.plans.free.name;

  const balance = typeof user?.creditBalance === "number" ? user.creditBalance : null;
  const renewsAt =
    user?.planRenewsAt != null
      ? formatDate(
          typeof user.planRenewsAt === "string"
            ? user.planRenewsAt
            : new Date(user.planRenewsAt).toISOString(),
          locale,
        )
      : null;

  const pendingPlanKey = user?.pendingPlan ?? null;
  const pendingPlanLabel =
    pendingPlanKey === "light"
      ? m.pricing.plans.light.name
      : pendingPlanKey === "standard"
      ? m.pricing.plans.standard.name
      : pendingPlanKey === "pro"
        ? m.pricing.plans.pro.name
        : pendingPlanKey === "master"
          ? m.pricing.plans.master.name
          : pendingPlanKey === "custom"
            ? m.pricing.plans.custom.name
            : null;
  const pendingAt =
    user?.pendingPlanEffectiveAt != null
      ? formatDate(
          typeof user.pendingPlanEffectiveAt === "string"
            ? user.pendingPlanEffectiveAt
            : new Date(user.pendingPlanEffectiveAt).toISOString(),
          locale,
        )
      : null;

  function reasonLabel(reason: CreditReason): string {
    return a.reasons[reason] ?? reason;
  }

  async function copyText(text: string): Promise<boolean> {
    try {
      if (!navigator?.clipboard?.writeText) return false;
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function inviteNotice(emailSent: boolean | undefined, copied: boolean): string {
    if (emailSent === false) {
      return copied ? teamCopy.inviteCreatedCopiedNoEmail : teamCopy.inviteCreatedNoEmailNoCopy;
    }
    return copied ? teamCopy.inviteCreatedCopied : teamCopy.inviteCreatedNoCopy;
  }

  async function createInvite() {
    const email = inviteEmail.trim();
    if (!email || !email.includes("@")) return;
    if (team && team.seatsAvailable <= 0) {
      setTeamError(teamCopy.seatsFull);
      return;
    }
    setTeamBusy("invite");
    setTeamError(null);
    setTeamNotice(null);
    try {
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as {
        inviteUrl?: string;
        emailSent?: boolean;
        emailSkipped?: string;
        emailError?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? teamCopy.inviteFailed);
      setInviteEmail("");
      const copied = data.inviteUrl ? await copyText(data.inviteUrl) : false;
      const extra =
        data.emailSent === false && (data.emailError || data.emailSkipped)
          ? ` ${data.emailError ?? data.emailSkipped}`
          : "";
      setTeamNotice(`${inviteNotice(data.emailSent, copied)}${extra}`);
      await load();
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : teamCopy.inviteFailed);
    } finally {
      setTeamBusy(null);
    }
  }

  async function revokeInvite(inviteId: string, email: string) {
    if (!window.confirm(teamCopy.revokeConfirm.replace("{email}", email))) return;
    setTeamBusy(`revoke:${inviteId}`);
    setTeamError(null);
    setTeamNotice(null);
    try {
      const res = await fetch("/api/team/invites/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? teamCopy.revokeFailed);
      await load();
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : teamCopy.revokeFailed);
    } finally {
      setTeamBusy(null);
    }
  }

  async function removeMember(memberClerkId: string, label: string) {
    if (!window.confirm(teamCopy.removeConfirm.replace("{name}", label))) return;
    setTeamBusy(`remove:${memberClerkId}`);
    setTeamError(null);
    setTeamNotice(null);
    try {
      const res = await fetch("/api/team/members/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberClerkId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? teamCopy.removeFailed);
      await load();
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : teamCopy.removeFailed);
    } finally {
      setTeamBusy(null);
    }
  }

  async function resendInvite(inviteId: string) {
    setTeamBusy(`resend:${inviteId}`);
    setTeamError(null);
    setTeamNotice(null);
    try {
      const res = await fetch("/api/team/invites/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      const data = (await res.json()) as {
        inviteUrl?: string;
        emailSent?: boolean;
        emailSkipped?: string;
        emailError?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? teamCopy.resendFailed);
      const copied = data.inviteUrl ? await copyText(data.inviteUrl) : false;
      if (data.emailSent === false) {
        const extra = data.emailError || data.emailSkipped || "";
        setTeamNotice(
          `${inviteNotice(false, copied)}${extra ? ` ${extra}` : ""}`,
        );
      } else {
        setTeamNotice(
          copied ? teamCopy.inviteResentCopied : teamCopy.inviteResentNoCopy,
        );
      }
      await load();
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : teamCopy.resendFailed);
    } finally {
      setTeamBusy(null);
    }
  }

  async function leaveEnterpriseTeam() {
    if (!window.confirm(teamCopy.leaveConfirm)) return;
    setTeamBusy("leave");
    setTeamError(null);
    setTeamNotice(null);
    try {
      const res = await fetch("/api/team/leave", { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? teamCopy.leaveFailed);
      await load();
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : teamCopy.leaveFailed);
    } finally {
      setTeamBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <LandingNav />

      <div className="marketing-page mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-5 sm:pt-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{a.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{a.subtitle}</p>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="mt-10 text-sm text-slate-500">{a.loading}</p>
        ) : (
          <>
            <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{a.planLabel}</p>
                  <p className="mt-1 text-2xl font-semibold">{planLabel}</p>
                  {renewsAt ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {a.renewsLabel}: {renewsAt}
                    </p>
                  ) : null}
                  {pendingPlanLabel && pendingAt ? (
                    <p className="mt-2 text-sm text-amber-800">
                      {a.pendingDowngradeLabel}:{" "}
                      {a.pendingDowngradeBody
                        .replace("{plan}", pendingPlanLabel)
                        .replace("{date}", pendingAt)}
                    </p>
                  ) : null}
                  {user?.email ? (
                    <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                  ) : null}
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {teamMembership?.billingPooled ? teamCopy.pooledBalance : a.balanceLabel}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {balance != null ? balance.toLocaleString() : "—"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{a.tokensUnit}</p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void openPortal()}
                  disabled={portalBusy || !user?.stripeCustomerId}
                  className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  title={!user?.stripeCustomerId ? a.portalNeedSubscribe : undefined}
                >
                  {portalBusy ? a.portalRedirecting : a.manageBilling}
                </button>
                {user?.stripeSubscriptionId ? (
                  <button
                    type="button"
                    onClick={() => void cancelSubscription()}
                    disabled={cancelBusy}
                    className="rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancelBusy
                      ? a.cancelBusy
                      : planKey === "pro" && user?.proTrialEndsAt
                        ? a.cancelTrial
                        : a.cancelSubscription}
                  </button>
                ) : null}
                <Link
                  href="/pricing"
                  className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  {a.viewPlans}
                </Link>
                <Link
                  href="/library"
                  className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  {m.auth.libraryMenu}
                </Link>
              </div>
              {user?.proTrialEndsAt && planKey === "pro" ? (
                <p className="mt-3 text-xs text-violet-700">
                  {a.trialActiveNote.replace(
                    "{date}",
                    formatDate(
                      typeof user.proTrialEndsAt === "string"
                        ? user.proTrialEndsAt
                        : new Date(user.proTrialEndsAt).toISOString(),
                      locale,
                    ),
                  )}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">{a.tokenExpiryNote}</p>
              {!user?.stripeCustomerId ? (
                <p className="mt-3 text-xs text-slate-500">{a.portalNeedSubscribe}</p>
              ) : null}
            </section>

            {teamMembership?.role === "member" && !team ? (
              <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <h2 className="text-xl font-semibold tracking-tight">{teamCopy.memberTitle}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {teamMembership.ownerLabel
                    ? teamCopy.memberBody.replace("{owner}", teamMembership.ownerLabel)
                    : teamCopy.memberBodyGeneric}
                </p>
                {teamError ? (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {teamError}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={Boolean(teamBusy)}
                  onClick={() => void leaveEnterpriseTeam()}
                  className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                >
                  {teamCopy.leave}
                </button>
              </section>
            ) : null}

            {team ? (
              <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">{teamCopy.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {teamCopy.seatsUsed
                        .replace("{held}", String(team.seatsHeld ?? team.seatsUsed))
                        .replace("{limit}", String(team.seatLimit))}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {teamCopy.seatsUsedHint
                        .replace("{members}", String(team.seatsUsed))
                        .replace("{pending}", String(team.pendingInviteCount ?? team.invites.length))}
                    </p>
                  </div>
                </div>

                {teamError ? (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {teamError}
                  </p>
                ) : null}
                {teamNotice ? (
                  <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {teamNotice}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={teamCopy.invitePlaceholder}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
                  />
                  <button
                    type="button"
                    disabled={Boolean(teamBusy) || (team.seatsAvailable ?? 0) <= 0}
                    onClick={() => void createInvite()}
                    className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
                  >
                    {teamCopy.invite}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {(team.seatsAvailable ?? 0) <= 0 ? teamCopy.seatsFull : teamCopy.inviteHint}
                </p>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-900">{teamCopy.membersTitle}</h3>
                  <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {team.members.map((member) => {
                      const label = member.name || member.email || member.clerkId;
                      return (
                      <li key={member.clerkId} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {label}
                            {member.role === "owner" ? ` ${teamCopy.ownerSuffix}` : ""}
                          </p>
                          <p className="truncate text-xs text-slate-500">{member.email ?? member.clerkId}</p>
                        </div>
                        {member.role !== "owner" ? (
                          <button
                            type="button"
                            onClick={() => void removeMember(member.clerkId, label)}
                            disabled={Boolean(teamBusy)}
                            className="w-full shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
                          >
                            {teamCopy.remove}
                          </button>
                        ) : null}
                      </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-900">{teamCopy.pendingTitle}</h3>
                  <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {team.invites.length ? (
                      team.invites.map((invite) => (
                        <li key={invite.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-slate-900">{invite.inviteEmail}</p>
                            <p className="text-xs text-slate-500">
                              {teamCopy.expires.replace("{date}", formatDate(invite.expiresAt, locale))}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void resendInvite(invite.id)}
                              disabled={Boolean(teamBusy)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              {teamCopy.resend}
                            </button>
                            <button
                              type="button"
                              onClick={() => void revokeInvite(invite.id, invite.inviteEmail)}
                              disabled={Boolean(teamBusy)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              {teamCopy.revoke}
                            </button>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-3 text-sm text-slate-500">{teamCopy.noPending}</li>
                    )}
                  </ul>
                </div>
              </section>
            ) : null}

            <section className="mt-12">
              <h2 className="text-xl font-semibold tracking-tight">{a.historyTitle}</h2>
              <p className="mt-2 text-sm text-slate-600">{a.historySubtitle}</p>

              {txs.length === 0 ? (
                <p className="mt-8 rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center text-sm text-slate-500">
                  {a.historyEmpty}
                </p>
              ) : (
                <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {txs.map((row) => {
                    const positive = row.delta > 0;
                    return (
                      <li key={row.id} className="flex items-start justify-between gap-4 px-5 py-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{reasonLabel(row.reason)}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatDate(row.createdAt, locale)}</p>
                          {typeof row.meta?.invoiceId === "string" ? (
                            <p className="mt-1 text-[11px] text-slate-400">
                              {a.invoiceRef}: {row.meta.invoiceId}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={`text-sm font-semibold tabular-nums ${
                              positive ? "text-emerald-700" : "text-slate-800"
                            }`}
                          >
                            {positive ? "+" : ""}
                            {row.delta.toLocaleString()}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {a.balanceAfter}: {row.balanceAfter.toLocaleString()}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
      <LandingFloatingCta />
    </main>
  );
}
