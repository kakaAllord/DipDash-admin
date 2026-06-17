import { Card } from "@/components/ui/Card";
import { RingtoneSettings } from "@/components/RingtoneSettings";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-sm text-muted">Per-device preferences for this admin.</p>
      </div>

      <Card className="flex max-w-md flex-col gap-3">
        <p className="font-bold">Notification sounds</p>
        <p className="text-xs text-muted">
          Choose the ringtone that plays for key events on this device.
        </p>
        <RingtoneSettings
          events={[
            { id: "new_order", label: "New order" },
            { id: "order_update", label: "Order updates" },
          ]}
        />
      </Card>
    </div>
  );
}
