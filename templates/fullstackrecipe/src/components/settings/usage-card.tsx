import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface UsageCardProps {
  chatRequests: number;
  chatLimit: number;
  planName: string;
}

export function UsageCard({
  chatRequests,
  chatLimit,
  planName,
}: UsageCardProps) {
  const usagePercentage = Math.min((chatRequests / chatLimit) * 100, 100);
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = chatRequests >= chatLimit;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage</CardTitle>
        <CardDescription>
          Your monthly usage for the {planName} plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Monthly Chat Requests</span>
            <span className="font-medium">
              {chatRequests} / {chatLimit}
            </span>
          </div>
          <Progress
            value={usagePercentage}
            className={`h-2 ${isAtLimit ? "[&>div]:bg-red-500" : isNearLimit ? "[&>div]:bg-yellow-500" : ""}`}
          />
        </div>

        {isAtLimit && (
          <p className="text-sm text-red-600">
            You've reached your monthly limit. Upgrade to PRO for more requests.
          </p>
        )}

        {isNearLimit && !isAtLimit && (
          <p className="text-sm text-yellow-600">
            You're approaching your monthly limit.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
