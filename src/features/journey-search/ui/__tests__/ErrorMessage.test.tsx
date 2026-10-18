import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { ErrorMessage } from "../ErrorMessage.tsx";

describe("ErrorMessage", () => {
  it("is an alert that takes focus and offers a retry", async () => {
    const onRetry = vi.fn();
    const { container } = render(
      <ErrorMessage
        message="Something went wrong while searching for journeys."
        onRetry={onRetry}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveFocus();
    expect(alert).toHaveTextContent(
      "Something went wrong while searching for journeys.",
    );

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(await axe(container)).toHaveNoViolations();
  });
});
