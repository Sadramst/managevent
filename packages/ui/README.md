# @managevent/ui

Design tokens (Celebration and Memorial palettes), the 6 invitation themes (`WEBSITE.md` §B4), CSS variables, `ExperienceModeProvider`, RTL-safe base components (`Button`, `Panel`, `Input`, `Badge`), and the `ArchFrame` motif.

## Usage

```tsx
import { ExperienceModeProvider, ArchFrame, Panel, Button } from "@managevent/ui";

export function Hero() {
  return (
    <ExperienceModeProvider ceremonyOrRoute="engagement-party" dir="rtl">
      <ArchFrame>
        <Panel layered>
          <Button variant="primary">Plan my ceremony</Button>
        </Panel>
      </ArchFrame>
    </ExperienceModeProvider>
  );
}
```
