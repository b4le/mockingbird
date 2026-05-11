import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock `fs/promises` before importing the module under test so the module's
// `import fs from "fs/promises"` binds to the mock. We only need to stub the
// two surfaces the opt-in loaders touch: `access` (presence check) and
// `readFile` (only reached on the ENOENT-narrow happy path; not exercised in
// the EACCES re-throw cases below).
vi.mock("fs/promises", () => ({
  default: {
    access: vi.fn(),
    readFile: vi.fn(),
  },
}));

import fs from "fs/promises";
import { getSnippets, getTranscripts } from "@/lib/data";

const mockedAccess = fs.access as unknown as ReturnType<typeof vi.fn>;
const mockedReadFile = fs.readFile as unknown as ReturnType<typeof vi.fn>;

function makeErrnoError(code: string): NodeJS.ErrnoException {
  const err = new Error(`mock ${code}`) as NodeJS.ErrnoException;
  err.code = code;
  return err;
}

describe("getTranscripts — ENOENT narrow", () => {
  beforeEach(() => {
    mockedAccess.mockReset();
    mockedReadFile.mockReset();
  });

  it("returns [] when fs.access rejects with ENOENT (opt-in collection absent)", async () => {
    mockedAccess.mockRejectedValueOnce(makeErrnoError("ENOENT"));
    await expect(getTranscripts("any")).resolves.toEqual([]);
    expect(mockedReadFile).not.toHaveBeenCalled();
  });

  it("re-throws when fs.access rejects with EACCES (real infra failure)", async () => {
    const err = makeErrnoError("EACCES");
    mockedAccess.mockRejectedValueOnce(err);
    await expect(getTranscripts("any")).rejects.toBe(err);
    expect(mockedReadFile).not.toHaveBeenCalled();
  });
});

describe("getSnippets — ENOENT narrow", () => {
  beforeEach(() => {
    mockedAccess.mockReset();
    mockedReadFile.mockReset();
  });

  it("returns [] when fs.access rejects with ENOENT (opt-in collection absent)", async () => {
    mockedAccess.mockRejectedValueOnce(makeErrnoError("ENOENT"));
    await expect(getSnippets("any")).resolves.toEqual([]);
    expect(mockedReadFile).not.toHaveBeenCalled();
  });

  it("re-throws when fs.access rejects with EACCES (real infra failure)", async () => {
    const err = makeErrnoError("EACCES");
    mockedAccess.mockRejectedValueOnce(err);
    await expect(getSnippets("any")).rejects.toBe(err);
    expect(mockedReadFile).not.toHaveBeenCalled();
  });
});
