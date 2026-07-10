import type { ComponentType } from "react";

import { FoundationBaseline } from "./foundation-baseline";

type ExperimentDefinition = {
  Component: ComponentType;
  description: string;
  id: string;
  label: string;
  status: "Baseline" | "In progress";
  title: string;
};

export const experiments = [
  {
    id: "foundation-baseline",
    label: "Experiment 001",
    status: "Baseline",
    title: "Foundation primitives",
    description:
      "A deliberately small comparison of reading and interaction surfaces using the shared visual foundation.",
    Component: FoundationBaseline,
  },
] satisfies readonly ExperimentDefinition[];
