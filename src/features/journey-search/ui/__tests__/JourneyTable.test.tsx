import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import type { JourneyRow } from "../../model/toJourneyRows.ts";
import { JourneyTable } from "../JourneyTable.tsx";

const rows: readonly JourneyRow[] = [
  {
    id: "a",
    departure: { text: "9:00 AM", dateTime: "2026-10-21T07:00:00.000Z" },
    arrival: { text: "9:10 AM", dateTime: "2026-10-21T07:10:00.000Z" },
    duration: { text: "10 min", dateTime: "PT10M" },
    price: "€12.00",
  },
  {
    id: "b",
    departure: { text: "2:00 PM", dateTime: "2026-10-21T12:00:00.000Z" },
    arrival: { text: "2:15 PM", dateTime: "2026-10-21T12:15:00.000Z" },
    duration: { text: "15 min", dateTime: "PT15M" },
    price: "€10.00",
  },
];

describe("JourneyTable", () => {
  it("renders a captioned table with four column headers", () => {
    render(
      <JourneyTable
        caption="Enschede to Hengelo on Wednesday"
        rows={rows}
        passengers={2}
      />,
    );
    const table = screen.getByRole("table", {
      name: "Enschede to Hengelo on Wednesday",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Departure", "Arrival", "Duration", "Total for 2 passengers"]);
    expect(within(table).getAllByRole("row")).toHaveLength(3);
  });

  it("uses the singular heading for one passenger", () => {
    render(<JourneyTable caption="c" rows={rows} passengers={1} />);
    expect(
      screen.getByRole("columnheader", { name: "Total for 1 passenger" }),
    ).toBeInTheDocument();
  });

  it("wraps every time value in <time> with its machine-readable twin", () => {
    render(<JourneyTable caption="c" rows={rows} passengers={2} />);
    const first = screen.getAllByRole("row")[1];
    expect(first).toBeDefined();
    const times = first?.querySelectorAll("time") ?? [];
    expect([...times].map((t) => t.getAttribute("datetime"))).toEqual([
      "2026-10-21T07:00:00.000Z",
      "2026-10-21T07:10:00.000Z",
      "PT10M",
    ]);
    expect(first).toHaveTextContent("€12.00");
  });

  it("is reachable by keyboard as a named scroll region", () => {
    render(<JourneyTable caption="c" rows={rows} passengers={2} />);
    expect(
      screen.getByRole("region", { name: "Journey results" }),
    ).toHaveAttribute("tabindex", "0");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <JourneyTable caption="c" rows={rows} passengers={2} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
