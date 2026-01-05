import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { differenceInDays, parseISO } from "date-fns";

export const useDocumentNotifications = (user, workshop) => {
  useEffect(() => {
    if (!user?.id || !workshop?.id) return;

    const checkNotifications = async () => {
      try {
        const preferences = await base44.entities.DocumentNotificationPreference.filter({
          user_id: user.id,
          workshop_id: workshop.id
        });

        if (!preferences || preferences.length === 0) return;
        const prefs = preferences[0];

        if (!prefs.in_app_notifications) return;

        const documents = await base44.entities.CompanyDocument.filter({
          workshop_id: workshop.id
        });

        await checkExpiringDocuments(documents, prefs, user);
        await checkHighImpactDocuments(documents, prefs, user);
      } catch (error) {
        console.error("Error checking document notifications:", error);
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 3600000); // Check hourly

    return () => clearInterval(interval);
  }, [user?.id, workshop?.id]);
};

const checkExpiringDocuments = async (documents, prefs, user) => {
  if (!prefs.expiring_documents_enabled) return;

  const today = new Date();
  const notificationDays = prefs.expiring_documents_days || [7, 15, 30];

  for (const doc of documents) {
    if (!doc.next_review_date) continue;

    const reviewDate = parseISO(doc.next_review_date);
    const daysUntil = differenceInDays(reviewDate, today);

    if (daysUntil > 0 && notificationDays.includes(daysUntil)) {
      const existingNotifications = await base44.entities.Notification.filter({
        user_id: user.id,
        type: "document_expiring"
      });

      const alreadyNotified = existingNotifications.some(
        n => n.message.includes(doc.document_id) && !n.is_read
      );

      if (!alreadyNotified) {
        await base44.entities.Notification.create({
          user_id: user.id,
          type: "document_expiring",
          title: "Documento próximo do vencimento",
          message: `O documento "${doc.title}" (${doc.document_id}) vence em ${daysUntil} dias`,
          is_read: false
        });
      }
    }
  }
};

const checkHighImpactDocuments = async (documents, prefs, user) => {
  if (!prefs.high_legal_impact_enabled) return;

  const highImpactDocs = documents.filter(
    d => d.legal_impact === "alto" && d.status === "em_revisao"
  );

  for (const doc of highImpactDocs) {
    const existingNotifications = await base44.entities.Notification.filter({
      user_id: user.id,
      type: "high_legal_impact"
    });

    const alreadyNotified = existingNotifications.some(
      n => n.message.includes(doc.document_id) && !n.is_read
    );

    if (!alreadyNotified) {
      await base44.entities.Notification.create({
        user_id: user.id,
        type: "high_legal_impact",
        title: "Documento de alto impacto jurídico em revisão",
        message: `"${doc.title}" (${doc.document_id}) requer atenção imediata - Alto impacto jurídico`,
        is_read: false
      });
    }
  }
};

export const notifyNewDocument = async (document, workshopId) => {
  try {
    const preferences = await base44.entities.DocumentNotificationPreference.filter({
      workshop_id: workshopId
    });

    for (const pref of preferences) {
      if (!pref.new_documents_enabled || !pref.in_app_notifications) continue;

      const categories = pref.interested_categories || [];
      if (categories.length > 0 && !categories.includes(document.category)) continue;

      await base44.entities.Notification.create({
        user_id: pref.user_id,
        type: "new_document",
        title: "Novo documento adicionado",
        message: `"${document.title}" foi adicionado na categoria ${document.category}`,
        is_read: false
      });
    }
  } catch (error) {
    console.error("Error notifying new document:", error);
  }
};