import { useAnalytics } from "./analytics-context";

export function AnalyticsConsentBanner() {
  const { consentGranted, setConsentGranted } = useAnalytics();

  if (consentGranted) {
    return null;
  }

  return (
    <div className="analytics-banner">
      <div className="analytics-banner__copy">
        <strong>Cho phep analytics để cải thiện hệ thống.</strong>
        <span>Chỉ theo dõi khi bạn đồng ý và không đưa thông tin nhạy cảm vào analytíc.</span>
      </div>
      <div className="analytics-banner__actions">
        <button className="button-outline" type="button" onClick={() => setConsentGranted(false)}>
          Từ chối
        </button>
        <button className="button-primary" type="button" onClick={() => setConsentGranted(true)}>
          Đồng ý
        </button>
      </div>
    </div>
  );
}
