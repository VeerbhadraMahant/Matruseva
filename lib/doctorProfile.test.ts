import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateDoctorProfile } from "@/app/(app)/settings/actions";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/i18n/server", () => ({ getT: async () => ({ t: (key: string) => key }) }));

const doctor = { userId: "doctor-1", clinicId: "clinic-1", clinicName: "Test Clinic", fullName: "Dr. Test", role: "doctor" } as const;
const query = {
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
};
const from = vi.fn().mockReturnValue(query);

function submit(degree: string, years: string) {
  const form = new FormData();
  form.set("degree", degree);
  form.set("yearsOfExperience", years);
  form.set("id", "another-user");
  return updateDoctorProfile({ error: null }, form);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(doctor);
  vi.mocked(createClient).mockResolvedValue({ from } as unknown as Awaited<ReturnType<typeof createClient>>);
  query.maybeSingle.mockResolvedValue({ data: { id: doctor.userId }, error: null });
});

describe("updateDoctorProfile", () => {
  it("updates only the signed-in doctor's profile and preserves zero years", async () => {
    await expect(submit("  MBBS, MD  ", "0")).resolves.toEqual({ error: null });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(query.update).toHaveBeenCalledWith({ degree: "MBBS, MD", years_of_experience: 0 });
    expect(query.eq).toHaveBeenCalledWith("id", doctor.userId);
    expect(query.eq).toHaveBeenCalledWith("clinic_id", doctor.clinicId);
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("clears either optional field when blank", async () => {
    await expect(submit("  ", "")).resolves.toEqual({ error: null });
    expect(query.update).toHaveBeenCalledWith({ degree: null, years_of_experience: null });
  });

  it.each(["-1", "2.5", "unknown"])("rejects invalid experience %s before updating", async (years) => {
    await expect(submit("MD", years)).resolves.toEqual({ error: "settings.profile.invalid" });
    expect(query.update).not.toHaveBeenCalled();
  });

  it("reports a failed save if no row was updated", async () => {
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(submit("MD", "12")).resolves.toEqual({ error: "settings.profile.saveFailed" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...doctor, isDemo: true }, "settings.error.demo"],
    [{ ...doctor, role: "staff" as const }, "settings.error.doctorOnly"],
  ])("blocks writes for demo and staff accounts", async (user, error) => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(user);
    await expect(submit("MD", "12")).resolves.toEqual({ error });
    expect(createClient).not.toHaveBeenCalled();
  });
});
