import { Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, fullName, initials } from "@/lib/utils";

export function ClientAvatar({
  client,
  className,
  showVip = true,
}: {
  client: { first_name?: string | null; last_name?: string | null; avatar_url?: string | null; is_vip?: boolean } | null;
  className?: string;
  showVip?: boolean;
}) {
  const name = fullName(client);
  return (
    <div className="relative shrink-0">
      <Avatar className={cn("h-10 w-10", className)}>
        {client?.avatar_url && <AvatarImage src={client.avatar_url} alt={name} />}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      {showVip && client?.is_vip && (
        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-champagne text-rosegold-700 ring-2 ring-card" title="VIP">
          <Crown className="h-2.5 w-2.5" />
        </span>
      )}
    </div>
  );
}
