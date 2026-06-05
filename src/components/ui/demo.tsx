import { Database } from "lucide-react"; // Using lucide-react for icons
import { UsageBadge } from "@/components/ui/bubble-button"; // Adjust the import path as needed

export default function UsageBadgeDemo() {
  return (
    <div className="flex min-h-[200px] w-full items-center justify-center bg-background p-4">
      <UsageBadge
        icon={<Database className="h-4 w-4" />}
        planName="Free"
        usage={20}
        limit={20}
        tooltipContent={
          <p>
            You are on the free plan.
            <br />
            20/20 generations left.
          </p>
        }
      />
    </div>
  );
}
