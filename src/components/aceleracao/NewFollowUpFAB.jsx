import React, { memo } from "react";
import { Plus } from "lucide-react";

const NewFollowUpFAB = memo(({ onClick }) => (
  <button
    onClick={onClick}
    className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
    title="Novo Follow-up"
    aria-label="Novo Follow-up"
  >
    <Plus className="w-6 h-6" />
  </button>
));

NewFollowUpFAB.displayName = "NewFollowUpFAB";

export default NewFollowUpFAB;