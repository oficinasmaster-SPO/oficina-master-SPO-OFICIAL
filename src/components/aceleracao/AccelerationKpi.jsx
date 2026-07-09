import React from "react";

function AccelerationKpi({ icon: Icon, value, label, tone = "text-gray-700", iconTone = "text-gray-400" }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-2xl font-bold leading-none ${tone}`}>{value}</p>
          <p className="mt-2 text-xs font-medium text-gray-500">{label}</p>
        </div>
        {Icon && <Icon className={`h-4 w-4 ${iconTone}`} />}
      </div>
    </div>
  );
}

export default React.memo(AccelerationKpi);