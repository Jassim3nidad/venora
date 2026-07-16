"use client";

import { InquiryConversation, Message } from "@/src/features/suppliers/ui/InquiryConversation";
import { sendSupplierInquiryMessageAction } from "@/src/features/suppliers/application/dashboard-actions";

export function InquiryMessageThread({
  inquiryId,
  messages,
  supplierUserId,
  customerName,
  supplierName,
  originalRequest,
}: {
  inquiryId: string;
  messages: Message[];
  supplierUserId: string;
  customerName?: string;
  supplierName?: string;
  originalRequest?: {
    message: string;
    createdAt: string;
  };
}) {
  return (
    <div className="h-[600px]">
      <InquiryConversation
        currentUserId={supplierUserId}
        role="supplier"
        messages={messages}
        originalRequest={originalRequest}
        header={{
          role: "supplier",
          customerName: customerName,
          statusLabel: "Active", // Or pass this from page.tsx if needed
        }}
        isReadOnly={false} // Depending on supplier requirements, you might want to pass this down
        onSendMessage={async (formData) => {
          const message = formData.get("message") as string;
          return sendSupplierInquiryMessageAction({
            inquiryId,
            message,
          });
        }}
      />
    </div>
  );
}
