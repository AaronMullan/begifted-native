import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import {
  addUnfinishedPeople,
  clearUnfinishedPeople,
  removeRefusedUnfinishedPerson,
  claimUnfinishedWriteToken,
  clearUnfinishedProgress,
  readUnfinishedPeople,
  removeUnfinishedPerson,
  saveUnfinishedProgress,
  UNFINISHED_PHOTO_DIR,
} from "../pending-contact-queue";
import type { PendingContactProgress } from "../pending-contact-queue";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock"
  )
);
jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///docs/",
  deleteAsync: jest.fn(async () => undefined),
}));

const USER = "user-1";

function progress(reply: string): PendingContactProgress {
  return {
    messages: [
      { id: "1", role: "assistant", content: "Hello!" },
      { id: "2", role: "user", content: reply },
    ],
    conversationContext: "gathering",
    shouldShowNextStepButton: false,
    extractedData: null,
    showDataReview: false,
    showOccasionsSelection: false,
  };
}

describe("unfinished people store", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("remembers picks per account, in pick order", async () => {
    const picked = await addUnfinishedPeople(USER, [
      { name: "Maya", address: {} },
      { name: "Sam", address: {} },
    ]);
    expect(picked.map((p) => p.seed.name)).toEqual(["Maya", "Sam"]);
    expect((await readUnfinishedPeople(USER)).map((p) => p.id)).toEqual(
      picked.map((p) => p.id)
    );
    expect(await readUnfinishedPeople("someone-else")).toEqual([]);
  });

  it("reuses a waiting entry, with its progress, when the same name is picked again", async () => {
    const [maya] = await addUnfinishedPeople(USER, [
      { name: "Maya", address: {} },
    ]);
    const token = claimUnfinishedWriteToken(maya.id);
    await saveUnfinishedProgress(USER, maya.id, progress("my sister"), token);

    const again = await addUnfinishedPeople(USER, [
      { name: " maya ", address: {} },
      { name: "Sam", address: {} },
    ]);
    expect(again[0].id).toBe(maya.id);
    expect(again[0].progress?.messages[1].content).toBe("my sister");
    expect(await readUnfinishedPeople(USER)).toHaveLength(2);
  });

  it("drops a write from a superseded flow", async () => {
    const [maya] = await addUnfinishedPeople(USER, [
      { name: "Maya", address: {} },
    ]);
    const stale = claimUnfinishedWriteToken(maya.id);
    const current = claimUnfinishedWriteToken(maya.id);
    await saveUnfinishedProgress(USER, maya.id, progress("newer"), current);
    await saveUnfinishedProgress(USER, maya.id, progress("older"), stale);

    const [entry] = await readUnfinishedPeople(USER);
    expect(entry.progress?.messages[1].content).toBe("newer");
  });

  it("start fresh clears progress and revokes earlier writers", async () => {
    const [maya] = await addUnfinishedPeople(USER, [
      { name: "Maya", address: {} },
    ]);
    const token = claimUnfinishedWriteToken(maya.id);
    await saveUnfinishedProgress(USER, maya.id, progress("first"), token);
    await clearUnfinishedProgress(USER, maya.id);
    await saveUnfinishedProgress(USER, maya.id, progress("late"), token);

    const [entry] = await readUnfinishedPeople(USER);
    expect(entry.progress).toBeUndefined();
  });

  it("a late write can't bring back a removed person", async () => {
    const [maya] = await addUnfinishedPeople(USER, [
      { name: "Maya", address: {} },
    ]);
    const token = claimUnfinishedWriteToken(maya.id);
    const write = saveUnfinishedProgress(
      USER,
      maya.id,
      progress("late"),
      token
    );
    await removeUnfinishedPerson(USER, maya.id);
    await write;
    expect(await readUnfinishedPeople(USER)).toEqual([]);
  });

  it("deletes the stored photo only from its own folder", async () => {
    const [maya, sam] = await addUnfinishedPeople(USER, [
      {
        name: "Maya",
        address: {},
        photoUri: `${UNFINISHED_PHOTO_DIR}contact-photo-1.jpg`,
      },
      { name: "Sam", address: {}, photoUri: "file:///tmp/original.jpg" },
    ]);
    await removeUnfinishedPerson(USER, maya.id);
    await removeUnfinishedPerson(USER, sam.id);
    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(1);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      `${UNFINISHED_PHOTO_DIR}contact-photo-1.jpg`,
      { idempotent: true }
    );
  });

  it("keeps two same-named contacts picked in one batch", async () => {
    const picked = await addUnfinishedPeople(USER, [
      { name: "Chris", address: { city: "Austin" } },
      { name: "Chris", address: { city: "Boston" } },
    ]);
    expect(picked).toHaveLength(2);
    expect(await readUnfinishedPeople(USER)).toHaveLength(2);
  });

  it("drops the new photo copy when a waiting person is picked again", async () => {
    await addUnfinishedPeople(USER, [{ name: "Maya", address: {} }]);
    await addUnfinishedPeople(USER, [
      {
        name: "Maya",
        address: {},
        photoUri: `${UNFINISHED_PHOTO_DIR}contact-photo-2.jpg`,
      },
    ]);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      `${UNFINISHED_PHOTO_DIR}contact-photo-2.jpg`,
      { idempotent: true }
    );
  });

  it("stores photo paths relative to the photo folder", async () => {
    await addUnfinishedPeople(USER, [
      {
        name: "Maya",
        address: {},
        photoUri: `${UNFINISHED_PHOTO_DIR}contact-photo-1.jpg`,
      },
    ]);
    const raw = await AsyncStorage.getItem(
      `@begifted/unfinished_people:${USER}`
    );
    expect(raw).not.toContain("file:///docs/");
    const [entry] = await readUnfinishedPeople(USER);
    expect(entry.seed.photoUri).toBe(
      `${UNFINISHED_PHOTO_DIR}contact-photo-1.jpg`
    );
  });

  it("a refusal of an older conversation keeps a person restarted fresh", async () => {
    const [maya] = await addUnfinishedPeople(USER, [
      { name: "Maya", address: {} },
    ]);
    const fresh = claimUnfinishedWriteToken(maya.id);
    await saveUnfinishedProgress(USER, maya.id, progress("new chat"), fresh);
    await removeRefusedUnfinishedPerson(USER, maya.id, ["old-user-message"]);
    expect(await readUnfinishedPeople(USER)).toHaveLength(1);

    await removeRefusedUnfinishedPerson(USER, maya.id, ["2"]);
    expect(await readUnfinishedPeople(USER)).toEqual([]);
  });

  it("forgets everyone for a deleted account", async () => {
    await addUnfinishedPeople(USER, [
      { name: "Maya", address: {} },
      { name: "Sam", address: {} },
    ]);
    await clearUnfinishedPeople(USER);
    expect(await readUnfinishedPeople(USER)).toEqual([]);
  });
});
