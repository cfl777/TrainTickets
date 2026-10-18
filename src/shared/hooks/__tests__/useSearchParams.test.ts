import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSearchParams } from "../useSearchParams.ts";

describe("useSearchParams", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("starts with the current query string", () => {
    window.history.replaceState(null, "", "/?origin=Enschede");
    const { result } = renderHook(() => useSearchParams());
    expect(result.current.search).toBe("?origin=Enschede");
  });

  it("pushes a history entry and updates when setSearch is called", () => {
    const { result } = renderHook(() => useSearchParams());
    const before = window.history.length;

    act(() => {
      result.current.setSearch("origin=Enschede&destination=Hengelo");
    });

    expect(window.location.search).toBe("?origin=Enschede&destination=Hengelo");
    expect(result.current.search).toBe("?origin=Enschede&destination=Hengelo");
    expect(window.history.length).toBe(before + 1);
  });

  it("accepts a leading ? without doubling it", () => {
    const { result } = renderHook(() => useSearchParams());
    act(() => {
      result.current.setSearch("?origin=Enschede");
    });
    expect(window.location.search).toBe("?origin=Enschede");
  });

  it("does not push an entry when the query string is unchanged", () => {
    const { result } = renderHook(() => useSearchParams());
    act(() => {
      result.current.setSearch("origin=Enschede");
    });
    const after = window.history.length;
    act(() => {
      result.current.setSearch("origin=Enschede");
    });
    expect(window.history.length).toBe(after);
  });

  it("clears the query string with an empty search", () => {
    window.history.replaceState(null, "", "/?origin=Enschede");
    const { result } = renderHook(() => useSearchParams());
    act(() => {
      result.current.setSearch("");
    });
    expect(window.location.search).toBe("");
    expect(window.location.pathname).toBe("/");
  });

  it("follows Back and Forward through popstate", () => {
    const { result } = renderHook(() => useSearchParams());
    act(() => {
      window.history.replaceState(null, "", "/?origin=Hengelo");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current.search).toBe("?origin=Hengelo");
  });

  it("shares one source of truth between instances", () => {
    const first = renderHook(() => useSearchParams());
    const second = renderHook(() => useSearchParams());
    act(() => {
      first.result.current.setSearch("origin=Almelo");
    });
    expect(second.result.current.search).toBe("?origin=Almelo");
  });

  it("unsubscribes on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useSearchParams());
    unmount();
    const removed = remove.mock.calls.map(([type]) => type);
    expect(removed).toContain("popstate");
    expect(removed).toContain("train-journeys:searchchange");
    remove.mockRestore();
  });
});
