import type { Metadata } from "next";
import Landing from "./landing";

export const metadata: Metadata = {
  title: "Engineering in the AI era",
  description:
    "面向 AI 时代前端工程师的技术写作、可运行实验与系统性思考。",
};

export default function Home() {
  return <Landing />;
}
