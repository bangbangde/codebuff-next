"use client";

import {
  ChevronDownIcon,
  LogOutIcon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/toast";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSignOut } from "@/features/account/use-sign-out";

type AdminAccountMenuProps = {
  email: string;
  name: string;
};

export function AdminAccountMenu({ email, name }: AdminAccountMenuProps) {
  const { isPending, signOut } = useSignOut();

  async function handleSignOut() {
    const signedOut = await signOut();

    if (!signedOut) {
      toast.add({
        description: "暂时无法退出，请重试。",
        type: "error",
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`打开 ${name} 的账号菜单`}
        className="group inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-1.5 text-sm outline-none transition-[color,background-color] duration-(--motion-duration) ease-(--motion-easing) hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground motion-reduce:transition-none"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground group-data-popup-open:border-ring group-data-popup-open:text-foreground">
          <UserRoundIcon aria-hidden="true" className="size-4" />
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className="size-3.5 text-muted-foreground transition-transform group-data-popup-open:rotate-180 motion-reduce:transition-none"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 border border-border shadow-lg"
        sideOffset={6}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-2">
            <span className="block truncate text-sm font-medium text-foreground">
              {name}
            </span>
            <span className="mt-0.5 block truncate font-normal text-muted-foreground">
              {email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="min-h-11 px-2"
            render={<Link href="/admin/account" />}
          >
            <SettingsIcon aria-hidden="true" />
            Account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="min-h-11 px-2"
          closeOnClick={false}
          disabled={isPending}
          onClick={handleSignOut}
          variant="destructive"
        >
          <LogOutIcon aria-hidden="true" />
          {isPending ? "正在退出…" : "退出登录"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
