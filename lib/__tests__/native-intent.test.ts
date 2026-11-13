import { redirectSystemPath } from "../../app/+native-intent";
import {
  consumeLaunchLink,
  discardAccountLaunchLink,
  discardLaunchLink,
} from "../launch-link";

const mockGetSession = jest.fn();

jest.mock("../supabase", () => ({
  supabase: { auth: { getSession: () => mockGetSession() } },
}));

const mockSetPendingInviteCode = jest.fn();
const mockFlushPendingInvite = jest.fn();

jest.mock("../pending-invite", () => ({
  setPendingInviteCode: (code: string) => mockSetPendingInviteCode(code),
  flushPendingInvite: () => mockFlushPendingInvite(),
}));

const RECIPIENT = "0b6f3c2e-8a4d-4f1b-9c7e-2d5a6b8c9e01";
const OCCASION = "7c1e9a4b-3d2f-4e6a-8b0c-1f2e3d4c5b6a";
const ORIGIN = "https://begifted.vercel.app";

async function warm(path: string) {
  return redirectSystemPath({ path, initial: false });
}

beforeEach(() => {
  jest.clearAllMocks();
  discardLaunchLink();
  mockGetSession.mockResolvedValue({ data: { session: { user: {} } } });
});

describe("redirectSystemPath", () => {
  it.each([
    ["/open/add-person", "/contacts/add"],
    [
      `/open/add-moment?recipient_id=${RECIPIENT}`,
      `/contacts/${RECIPIENT}?addOccasion=true`,
    ],
    [
      `/open/gift-ideas?recipient_id=${RECIPIENT}`,
      `/contacts/${RECIPIENT}?tab=gifts`,
    ],
    [
      `/open/gift-ideas?recipient_id=${RECIPIENT}&occasion_id=${OCCASION}`,
      `/contacts/${RECIPIENT}?tab=gifts&occasionId=${OCCASION}`,
    ],
    ["/open/billing", "/settings/billing"],
    ["/open/home", "/dashboard"],
    ["/open/home/", "/dashboard"],
    ["/open/invite-friends", "/settings/invite"],
  ])("routes %s to %s", async (path, expected) => {
    expect(await warm(`${ORIGIN}${path}`)).toBe(expected);
    expect(await warm(`begifted://${path}`)).toBe(expected);
  });

  it.each([
    "/open/add-moment",
    "/open/add-moment?recipient_id=",
    "/open/add-moment?recipient_id={{event.recipient_id}}",
    "/open/gift-ideas?occasion_id=" + OCCASION,
  ])("sends %s to Home when the person id is missing or invalid", async (p) => {
    expect(await warm(`${ORIGIN}${p}`)).toBe("/dashboard");
  });

  it("drops an invalid occasion id but keeps the person", async () => {
    expect(
      await warm(
        `${ORIGIN}/open/gift-ideas?recipient_id=${RECIPIENT}&occasion_id=nope`
      )
    ).toBe(`/contacts/${RECIPIENT}?tab=gifts`);
  });

  it("parks the target behind the auth gate on a cold launch", async () => {
    const result = await redirectSystemPath({
      path: `${ORIGIN}/open/add-moment?recipient_id=${RECIPIENT}`,
      initial: true,
    });
    expect(result).toBe("/");
    expect(consumeLaunchLink()).toBe(`/contacts/${RECIPIENT}?addOccasion=true`);
  });

  it("does not park Home on a cold launch", async () => {
    const result = await redirectSystemPath({
      path: `${ORIGIN}/open/home`,
      initial: true,
    });
    expect(result).toBe("/");
    expect(consumeLaunchLink()).toBeNull();
  });

  it("stays put when a running app has no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    expect(await warm(`${ORIGIN}/open/billing`)).toBeNull();
  });

  it("parks Invite Friends for after sign-in when a running app has no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    expect(await warm(`${ORIGIN}/open/invite-friends`)).toBeNull();
    discardAccountLaunchLink();
    expect(consumeLaunchLink()).toBe("/settings/invite");
  });

  it("keeps a cold-launch Invite Friends link through the signed-out gate", async () => {
    await redirectSystemPath({
      path: `${ORIGIN}/open/invite-friends`,
      initial: true,
    });
    discardAccountLaunchLink();
    expect(consumeLaunchLink()).toBe("/settings/invite");
  });

  it("drops a parked Invite Friends link once the sign-in window has passed", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const now = Date.now();
    const spy = jest.spyOn(Date, "now").mockReturnValue(now);
    await warm(`${ORIGIN}/open/invite-friends`);
    spy.mockReturnValue(now + 16 * 60 * 1000);
    expect(consumeLaunchLink()).toBeNull();
    spy.mockRestore();
  });

  it("drops an account-specific link at the signed-out gate", async () => {
    await redirectSystemPath({
      path: `${ORIGIN}/open/add-moment?recipient_id=${RECIPIENT}`,
      initial: true,
    });
    discardAccountLaunchLink();
    expect(consumeLaunchLink()).toBeNull();
  });

  it("passes unrelated paths through", async () => {
    expect(await warm(`${ORIGIN}/auth/callback?code=x`)).toBe(
      `${ORIGIN}/auth/callback?code=x`
    );
  });

  it("stores an invite code and lets the gate redeem it on a cold launch", async () => {
    const result = await redirectSystemPath({
      path: `${ORIGIN}/open/invite?code=ABC123`,
      initial: true,
    });
    expect(result).toBe("/");
    expect(mockSetPendingInviteCode).toHaveBeenCalledWith("ABC123");
    expect(mockFlushPendingInvite).not.toHaveBeenCalled();
  });

  it("redeems an invite right away in a signed-in running app", async () => {
    expect(await warm("begifted:///open/invite?code=ABC123")).toBeNull();
    expect(mockSetPendingInviteCode).toHaveBeenCalledWith("ABC123");
    expect(mockFlushPendingInvite).toHaveBeenCalled();
  });
});
