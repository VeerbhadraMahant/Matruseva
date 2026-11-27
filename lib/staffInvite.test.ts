import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { inviteStaff } from "@/app/(app)/settings/actions";
import { acceptStaffInvite } from "@/app/auth/staff-invite/actions";
import { RECOVERY_COOKIE, verifyRecoveryProof } from "@/lib/passwordRecovery";

const mocks = vi.hoisted(() => ({ setCookie: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ origin: "https://clinic.example" }), cookies: async () => ({ set: mocks.setCookie }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(path); } }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/demo", () => ({ isDemoSession: () => false, isSupabaseConfigured: () => true }));
vi.mock("@/lib/i18n/server", () => ({ getT: async () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/demo-data", () => ({ setDemoDoctorProfile: vi.fn() }));

const doctor = { userId: "doctor-1", clinicId: "clinic-1", clinicName: "Clinic", fullName: "Dr. Test", role: "doctor" } as const;
const recipient = "staff@example.com";
const staffId = "staff-1";
const delivery = vi.fn();
const deleteUser = vi.fn();
const insert = vi.fn();
const verifyOtp = vi.fn();
const signOut = vi.fn();
const getClaims = vi.fn();
const profileQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn() };

function submitInvite() {
  const form = new FormData();
  form.set("fullName", " Clinic Nurse ");
  form.set("email", recipient);
  return inviteStaff({ error: null }, form);
}

function acceptInvite() {
  const form = new FormData();
  form.set("tokenHash", "example-token-hash");
  return acceptStaffInvite(form);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://clinic.example");
  vi.mocked(getCurrentUser).mockResolvedValue(doctor);
  vi.mocked(createAdminClient).mockReturnValue({
    auth: { admin: { inviteUserByEmail: delivery, deleteUser } },
    from: () => ({ insert }),
  } as unknown as ReturnType<typeof createAdminClient>);
  vi.mocked(createClient).mockResolvedValue({
    auth: { verifyOtp, getClaims, signOut },
    from: () => profileQuery,
  } as unknown as Awaited<ReturnType<typeof createClient>>);
  delivery.mockImplementation(async (_email, options) => ({
    data: { user: { id: staffId, user_metadata: options.data } },
    error: null,
  }));
  insert.mockResolvedValue({ error: null });
  verifyOtp.mockResolvedValue({ data: { user: { id: staffId }, session: { access_token: "invite-session-token" } }, error: null });
  getClaims.mockResolvedValue({ data: { claims: { session_id: "invite-session" } } });
  profileQuery.maybeSingle.mockResolvedValue({ data: { id: staffId } });
});

afterEach(() => vi.unstubAllEnvs());

describe("staff invitation delivery", () => {
  it("emails the invite and files the new staff profile under the doctor's clinic", async () => {
    await expect(submitInvite()).resolves.toEqual({ error: null });
    expect(delivery).toHaveBeenCalledWith(recipient, {
      redirectTo: "https://clinic.example/auth/staff-invite",
      data: { matrusetu_staff_invite: expect.any(String) },
    });
    expect(insert).toHaveBeenCalledWith({ id: staffId, clinic_id: doctor.clinicId, full_name: "Clinic Nurse", role: "staff" });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("leaves profiles alone when delivery fails", async () => {
    delivery.mockResolvedValueOnce({ data: { user: null }, error: { message: "SMTP unavailable" } });
    await expect(submitInvite()).resolves.toEqual({ error: "SMTP unavailable" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("does not send an invitation when the configured app URL is invalid", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "invalid");
    await expect(submitInvite()).resolves.toEqual({ error: "settings.error.inviteUnavailable" });
    expect(delivery).not.toHaveBeenCalled();
  });

  it("does not attach or remove an existing unconfirmed account", async () => {
    delivery.mockResolvedValueOnce({ data: { user: { id: "existing", user_metadata: {} } }, error: null });
    await expect(submitInvite()).resolves.toEqual({ error: "settings.error.inviteExisting" });
    expect(insert).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("cleans up an account created by this request if profile creation fails", async () => {
    insert.mockResolvedValueOnce({ error: { message: "Profile insert failed" } });
    await expect(submitInvite()).resolves.toEqual({ error: "Profile insert failed" });
    expect(deleteUser).toHaveBeenCalledWith(staffId);
  });

  it("blocks demo sessions before sending an invitation", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ ...doctor, isDemo: true });
    await expect(submitInvite()).resolves.toEqual({ error: "settings.error.demo" });
    expect(delivery).not.toHaveBeenCalled();
  });
});

describe("staff invitation acceptance", () => {
  it("sets a session-bound password proof after verifying an invite and staff profile", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "unit-test-key");
    try {
      await expect(acceptInvite()).rejects.toThrow("/reset-password");
      expect(verifyOtp).toHaveBeenCalledWith({ type: "invite", token_hash: "example-token-hash" });
      expect(profileQuery.eq).toHaveBeenCalledWith("id", staffId);
      expect(profileQuery.eq).toHaveBeenCalledWith("role", "staff");
      const [name, proof, options] = mocks.setCookie.mock.calls[0];
      expect(name).toBe(RECOVERY_COOKIE);
      expect(options.httpOnly).toBe(true);
      expect(verifyRecoveryProof(proof, "invite-session")).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("rejects a verified token without a staff profile", async () => {
    profileQuery.maybeSingle.mockResolvedValueOnce({ data: null });
    await expect(acceptInvite()).rejects.toThrow("/auth/staff-invite?expired=1");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.setCookie).not.toHaveBeenCalled();
  });
});
