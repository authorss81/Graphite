import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Editor } from "./Editor";

describe("Editor component", () => {
  it("mounts and renders the toolbar with formatting controls", () => {
    render(<Editor docId="doc-test" initialState="" />);
    expect(screen.getByTitle("Bold Ctrl+B")).toBeInTheDocument();
    expect(screen.getByTitle("Italic Ctrl+I")).toBeInTheDocument();
    expect(screen.getByTitle("Insert Drawing Canvas")).toBeInTheDocument();
  });

  it("renders the empty-state placeholder", () => {
    render(<Editor docId="doc-test" initialState="" />);
    expect(
      screen.getByText(/Start writing something amazing/i),
    ).toBeInTheDocument();
  });

  it("restores a serialized editor state without crashing", () => {
    const state = JSON.stringify({
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: "Hello world",
                type: "text",
                version: 1,
              },
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
    });
    render(<Editor docId="doc-test" initialState={state} />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });
});
