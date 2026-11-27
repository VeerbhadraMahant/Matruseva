import { describe, it, expect, vi, beforeEach } from "vitest";

const revalidatePathMock = vi.fn();
const getCurrentUserMock = vi.fn();
const createClientMock = vi.fn();
const deleteDemoDocumentMock = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClientMock(),
}));
vi.mock("@/lib/i18n/server", () => ({
  getT: async () => ({
    locale: "en",
    t: (key: string) => key,
  }),
}));
vi.mock("@/lib/demo-data", () => ({
  addDemoDocument: vi.fn(),
  assignDemoDocument: vi.fn(),
  deleteDemoDocument: (id: string) => deleteDemoDocumentMock(id),
  getDemoPatientDetail: vi.fn(),
  getDemoStore: vi.fn(),
  updateDemoDocumentOcr: vi.fn(),
}));

import { deleteDocument } from "@/app/(app)/documents/actions";

describe("deleteDocument server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks non-doctor roles from deleting documents", async () => {
    getCurrentUserMock.mockResolvedValue({
      userId: "staff-1",
      clinicId: "clinic-1",
      clinicName: "Clinic",
      fullName: "Staff",
      role: "staff",
      isDemo: false,
    });

    const res = await deleteDocument("doc-123");
    expect(res.error).toBe("documents.error.doctorOnly");
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("deletes document from demo store when in demo mode", async () => {
    getCurrentUserMock.mockResolvedValue({
      userId: "demo-doctor-id",
      clinicId: "demo-clinic-id",
      clinicName: "Demo",
      fullName: "Dr. Demo",
      role: "doctor",
      isDemo: true,
    });
    deleteDemoDocumentMock.mockReturnValue({ patientId: "p-1", docType: "report" });

    const res = await deleteDocument("doc-demo-1");
    expect(res).toEqual({ error: null });
    expect(deleteDemoDocumentMock).toHaveBeenCalledWith("doc-demo-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/documents");
    expect(revalidatePathMock).toHaveBeenCalledWith("/opd");
    expect(revalidatePathMock).toHaveBeenCalledWith("/patients/p-1");
  });

  it("deletes document record and storage object from Supabase", async () => {
    getCurrentUserMock.mockResolvedValue({
      userId: "doc-user-1",
      clinicId: "clinic-1",
      clinicName: "Clinic",
      fullName: "Dr. Rao",
      role: "doctor",
      isDemo: false,
    });

    const removeMock = vi.fn().mockResolvedValue({ data: [{ name: "file.jpg" }], error: null });
    const deleteSelectMock = vi.fn().mockResolvedValue({ data: [{ id: "doc-uuid-1" }], error: null });
    const deleteEqMock = vi.fn().mockReturnValue({ select: deleteSelectMock });
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: "doc-uuid-1",
        patient_id: "patient-uuid-1",
        storage_path: "clinic-1/patient-uuid-1/file.jpg",
      },
      error: null,
    });
    const selectEqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });

    createClientMock.mockResolvedValue({
      from: (table: string) => {
        expect(table).toBe("documents");
        return {
          select: () => ({ eq: selectEqMock }),
          delete: () => ({ eq: deleteEqMock }),
        };
      },
      storage: {
        from: (bucket: string) => {
          expect(bucket).toBe("documents");
          return { remove: removeMock };
        },
      },
    });

    const res = await deleteDocument("doc-uuid-1");
    expect(res).toEqual({ error: null });
    expect(selectEqMock).toHaveBeenCalledWith("id", "doc-uuid-1");
    expect(deleteEqMock).toHaveBeenCalledWith("id", "doc-uuid-1");
    expect(removeMock).toHaveBeenCalledWith(["clinic-1/patient-uuid-1/file.jpg"]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/documents");
    expect(revalidatePathMock).toHaveBeenCalledWith("/opd");
    expect(revalidatePathMock).toHaveBeenCalledWith("/patients/patient-uuid-1");
  });

  it("returns notFound when document does not exist in Supabase", async () => {
    getCurrentUserMock.mockResolvedValue({
      userId: "doc-user-1",
      clinicId: "clinic-1",
      clinicName: "Clinic",
      fullName: "Dr. Rao",
      role: "doctor",
      isDemo: false,
    });

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    createClientMock.mockResolvedValue({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: maybeSingleMock }) }),
      }),
    });

    const res = await deleteDocument("missing-id");
    expect(res.error).toBe("documents.error.notFound");
  });

  it("revalidates and surfaces storage error if DB delete succeeds but storage remove fails", async () => {
    getCurrentUserMock.mockResolvedValue({
      userId: "doc-user-1",
      clinicId: "clinic-1",
      clinicName: "Clinic",
      fullName: "Dr. Rao",
      role: "doctor",
      isDemo: false,
    });

    const removeMock = vi.fn().mockResolvedValue({ data: null, error: { message: "Bucket permission denied" } });
    const deleteSelectMock = vi.fn().mockResolvedValue({ data: [{ id: "doc-uuid-2" }], error: null });
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: "doc-uuid-2",
        patient_id: null,
        storage_path: "clinic-1/inbox/file2.jpg",
      },
      error: null,
    });

    createClientMock.mockResolvedValue({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: maybeSingleMock }) }),
        delete: () => ({ eq: () => ({ select: deleteSelectMock }) }),
      }),
      storage: {
        from: () => ({ remove: removeMock }),
      },
    });

    const res = await deleteDocument("doc-uuid-2");
    expect(res.error).toBe("Bucket permission denied");
    expect(revalidatePathMock).toHaveBeenCalledWith("/documents");
    expect(revalidatePathMock).toHaveBeenCalledWith("/opd");
  });
});
