import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import GoogleCalendarConfig from "./GoogleCalendarConfig";
import GoogleMeetConfig from "./GoogleMeetConfig";
import EduzzConfig from "./EduzzConfig";
import AsasConfig from "./AsasConfig";
import WebhookConfig from "./WebhookConfig";
import ClickSignConfig from "./ClickSignConfig";
import SerasaConfig from "./SerasaConfig";

export default function IntegrationModal({ open, onClose, integration, user }) {
  if (!integration) return null;

  const Icon = integration.icon;

  const getConfigComponent = () => {
    switch (integration.id) {
      case "google_calendar":
        return <GoogleCalendarConfig user={user} />;
      case "google_meet":
        return <GoogleMeetConfig user={user} />;
      case "kiwify":
        return <EduzzConfig user={user} />;
      case "asas":
        return <AsasConfig user={user} />;
      case "webhook":
        return <WebhookConfig user={user} />;
      case "clicksign":
        return <ClickSignConfig user={user} />;
      case "serasa":
        return <SerasaConfig user={user} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Icon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle>{integration.name}</DialogTitle>
              <DialogDescription>{integration.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Recursos:</p>
            <ul className="space-y-1">
              {integration.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {getConfigComponent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}