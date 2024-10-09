import { ElementType } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../shared/ui/tooltip";
import { ComponentIcon, Inspect, TableProperties } from "lucide-react";
import { Page, usePage } from "@/usePage";
import clsx from "clsx";
import { useWs } from "@/websocket/useWs";

export function SideBar() {
  const { readyState } = useWs();
  return (
    <div className="flex flex-col items-center gap-y-1   bg-background w-14 border-r border-muted">
      <SideBarItem icon={TableProperties} label="Inspector" name="inspector" />
      <SideBarItem icon={ComponentIcon} label="Components" name="component" />
      <SideBarItem icon={Inspect} label="UI" name="ui" />
      <div>
        <span>state</span>
        {readyState}
      </div>
    </div>
  );
}

function SideBarItem({
  icon: Icon,
  label,
  name,
}: {
  icon: ElementType<any>;
  label: string;
  name: Page;
}) {
  const { currentPage, setPage } = usePage();
  const isActive = currentPage === name;
  const handleClick = () => {
    setPage(name);
  };
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div
            onClick={handleClick}
            className={clsx(
              "flex w-full py-3 items-center justify-center transition-colors hover:text-foreground",
              {
                "text-accent-foreground bg-muted": isActive,
                "text-muted-foreground hover:bg-muted": !isActive,
              },
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
