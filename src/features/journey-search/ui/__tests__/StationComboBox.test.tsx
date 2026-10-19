import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { createSearchJourneys } from "../../api/searchJourneys.ts";
import {
  createSuggestStations,
  type SuggestStations,
} from "../../api/stations.ts";
import { ApiProvider } from "../../model/useSearchApi.tsx";
import { StationComboBox } from "../StationComboBox.tsx";

type Props = Partial<Parameters<typeof StationComboBox>[0]>;

/** The popup is portalled to the body; checking the body means waiving the landmark rule, which the page itself satisfies. */
const axeWithPopup = () =>
  axe(document.body, { rules: { region: { enabled: false } } });

function renderBox(
  props: Props = {},
  suggest: SuggestStations = createSuggestStations({ delayMs: 0 }),
) {
  const utils = render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiProvider api={createSearchJourneys({ delayMs: 0 })} suggest={suggest}>
        <form>
          <StationComboBox
            id="origin"
            label="Origin"
            placeholder="Enschede"
            defaultValue=""
            {...props}
          />
        </form>
      </ApiProvider>
    </QueryClientProvider>,
  );
  const input = screen.getByRole("combobox", {
    name: props.label ?? "Origin",
  });
  const formData = () => new FormData(input.closest("form") ?? undefined);
  return { ...utils, input, formData, user: userEvent.setup() };
}

describe("StationComboBox", () => {
  it("is a named combobox carrying the field's id, name and placeholder", () => {
    const { input, formData } = renderBox({ defaultValue: "Almelo" });
    expect(input).toHaveAttribute("id", "origin");
    expect(input).toHaveAttribute("placeholder", "Enschede");
    expect(input).toBeRequired();
    expect(input).toHaveValue("Almelo");
    expect(formData().get("origin")).toBe("Almelo");
  });

  it("suggests stations by prefix, with the typed part in bold and a count", async () => {
    const { input, user } = renderBox();
    await user.type(input, "en");

    const option = await screen.findByRole("option", { name: "Enschede" });
    expect(option.querySelector("strong")).toHaveTextContent("En");
    expect(screen.getByText("1 station")).toBeInTheDocument();
    expect(await axeWithPopup()).toHaveNoViolations();
  });

  it("fills the input with the chosen station on ArrowDown and Enter", async () => {
    const { input, user, formData } = renderBox();
    await user.type(input, "h");
    await screen.findByRole("option", { name: "Hengelo" });
    await user.keyboard("{ArrowDown}{Enter}");

    expect(input).toHaveValue("Hengelo");
    expect(formData().get("origin")).toBe("Hengelo");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens the whole list from the toggle and selects by click", async () => {
    const { input, user } = renderBox();
    // React Aria names the toggle "Show stations Origin": its label plus the field's.
    await user.click(screen.getByRole("button", { name: /^Show stations/ }));
    expect(await screen.findAllByRole("option")).toHaveLength(3);
    expect(screen.getByText("3 stations")).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Almelo" }));
    expect(input).toHaveValue("Almelo");
  });

  it("says when nothing matches and keeps the typed text", async () => {
    const { input, user, formData } = renderBox();
    await user.type(input, "Zwolle");
    // React Aria renders the empty state as the listbox's only option.
    const listbox = await screen.findByRole("listbox");
    expect(listbox).toHaveTextContent("No stations match");
    expect(
      screen.queryByText(/Enschede|Hengelo|Almelo/),
    ).not.toBeInTheDocument();
    await user.tab();
    expect(input).toHaveValue("Zwolle");
    expect(formData().get("origin")).toBe("Zwolle");
  });

  it("says it is searching while the first lookup is pending", async () => {
    const never: SuggestStations = () => new Promise(() => undefined);
    const { input, user } = renderBox({}, never);
    await user.type(input, "e");
    expect(await screen.findByText("Searching stations")).toBeInTheDocument();
  });

  it("marks and describes the field with the error it is given", async () => {
    const { input, container } = renderBox({ error: "Enter an origin" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => {
      expect(input).toHaveAccessibleDescription("Enter an origin");
    });
    expect(screen.getByText("Enter an origin")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("is clean without an error", () => {
    const { input } = renderBox();
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAccessibleDescription();
  });

  it("hands its input element to inputRef", () => {
    const inputRef = vi.fn();
    const { input } = renderBox({ inputRef });
    expect(inputRef).toHaveBeenCalledWith(input);
  });

  it("greys the taken station out, says whose it is, and skips it with the arrow keys", async () => {
    const { input, user } = renderBox({
      id: "destination",
      label: "Destination",
      takenStation: " enschede",
    });
    await user.click(screen.getByRole("button", { name: /^Show stations/ }));

    const taken = await screen.findByRole("option", {
      name: "Enschede Origin",
    });
    expect(taken).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("3 stations")).toBeInTheDocument();
    expect(await axeWithPopup()).toHaveNoViolations();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: "Almelo" })).toHaveAttribute(
      "data-focused",
    );
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: "Hengelo" })).toHaveAttribute(
      "data-focused",
    );
    expect(taken).not.toHaveAttribute("data-focused");

    await user.click(taken);
    expect(input).toHaveValue("");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("marks the destination in the origin list, and follows the taken station", async () => {
    const { user, rerender } = renderBox({ takenStation: "Hengelo" });
    await user.click(screen.getByRole("button", { name: /^Show stations/ }));
    expect(
      await screen.findByRole("option", { name: "Hengelo Destination" }),
    ).toHaveAttribute("aria-disabled", "true");

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ApiProvider
          api={createSearchJourneys({ delayMs: 0 })}
          suggest={createSuggestStations({ delayMs: 0 })}
        >
          <form>
            <StationComboBox
              id="origin"
              label="Origin"
              placeholder="Enschede"
              defaultValue=""
              takenStation="Almelo"
            />
          </form>
        </ApiProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByRole("option", { name: "Hengelo" })).not.toHaveAttribute(
      "aria-disabled",
    );
    expect(
      screen.getByRole("option", { name: "Almelo Destination" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("reports its text as it is typed and when a station is chosen", async () => {
    const onValueChange = vi.fn();
    const { input, user } = renderBox({ onValueChange });
    await user.type(input, "h");
    expect(onValueChange).toHaveBeenLastCalledWith("h");
    await screen.findByRole("option", { name: "Hengelo" });
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith("Hengelo");
  });

  it("shares one lookup between prefixes already seen", async () => {
    const suggest = vi.fn(createSuggestStations({ delayMs: 0 }));
    const { input, user } = renderBox({}, suggest);
    await user.type(input, "A");
    await screen.findByRole("option", { name: "Almelo" });
    await user.clear(input);
    await user.type(input, "a");
    await screen.findByRole("option", { name: "Almelo" });
    expect(suggest.mock.calls).toEqual([[""], ["a"]]);
  });
});
