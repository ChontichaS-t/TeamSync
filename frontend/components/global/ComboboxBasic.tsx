"use client";

import React, { useState } from "react";
import { Combobox } from "@/components/ui/combobox";

const frameworks = [
  "Next.js",
  "SvelteKit",
  "Nuxt.js",
  "Remix",
  "Astro",
] as const;

export function ComboboxBasic() {
  const [selected, setSelected] = useState<string>("");

  return (
    <Combobox
      options={frameworks}
      value={selected}
      onChange={setSelected}
      placeholder="Select a framework"
    />
  );
}
