---
title: "Installation"
type: tutorial
status: draft
order: 1
---

# Installation

Open the sample workspace in VS Code with Pinake Editor installed.

## Prerequisites

| Requirement | Notes |
| --- | --- |
| VS Code | Open the `examples/sample-pinake-workspace` folder directly |
| Pinake Editor | Install or run the extension development host |
| Repository checkout | Use the sample files already committed with the project |

## Verify

Run `Pinake: Validate` from the Command Palette.

## Expected Result

- The validation report passes.
- The Pinake sidebar shows Overview, Installation, and ADR-0001.
- Generated `.pinake/.state` files remain ignored by the sample `.pinake/.gitignore`.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Pinake view is empty | The sample folder was not opened as the workspace root | Reopen this example folder directly |
| Validation command is missing | The extension is not active | Start the extension host or install Pinake Editor |
