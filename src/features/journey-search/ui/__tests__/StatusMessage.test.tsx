import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { StatusMessage } from "../StatusMessage.tsx";

describe("StatusMessage", () => {
  it("is a status region even while empty", () => {
    render(<StatusMessage message="" />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("announces the message and hides the spinner from assistive tech", async () => {
    const { container } = render(
      <StatusMessage message="Searching for journeys" busy />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Searching for journeys",
    );
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
