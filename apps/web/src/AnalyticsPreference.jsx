import { useState } from 'react';
import { analyticsDisabled, setAnalyticsDisabled } from './analyticsTracking';

export function AnalyticsPreference() {
  const [disabled,setDisabled]=useState(analyticsDisabled);
  const change=value=>{setAnalyticsDisabled(value);setDisabled(value);};
  return <div className="insight-privacy-setting">
    <label className="check-line">
      <input type="checkbox" checked={disabled} onChange={event=>change(event.target.checked)}/>
      Do not include my browsing and shopping-interest actions in the store analytics reports
    </label>
    <p>Optional first-party interaction events are retained for up to 90 days. Opting out does not affect shopping, orders or essential account records. Previous activity expires under the normal retention policy; contact store support to request an earlier deletion where applicable.</p>
  </div>;
}
