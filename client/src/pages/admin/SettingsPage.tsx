import BusinessDetails from "../../components/admin/BusinessDetails";
import TakeawaySettings from "../../components/admin/TakeawaySettings";
import Settings from "./Settings";

export default function SettingsPage() {
  return (
    <>
      <Settings />
      <TakeawaySettings />
      <BusinessDetails />
    </>
  );
}