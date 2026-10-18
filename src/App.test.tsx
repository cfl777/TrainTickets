import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import App from "./App.tsx";

describe("App", () => {
  it("renders the page heading", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Train journeys" }),
    ).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<App />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
